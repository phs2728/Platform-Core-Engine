import {
  Ok,
  Err,
  type Result,
  AuthenticationError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IPasswordHasher,
  ISessionSigner,
  IAccountRepository,
  ISessionRepository,
  IEventBus,
  IAuditLogRepository,
  SessionRecord,
} from '../interfaces/index.js';

/**
 * LoginUseCase With Account Lock (Sprint 2C-2-3)
 *
 * 사장님 확립: 로그인 실패 N회 → 계정 잠금.
 *
 * 흐름:
 * 1) Password 잘못 → failedAttempts++
 * 2) failedAttempts >= maxFailures → account.lockedUntil = now + lockDuration
 * 3) Lock된 계정은 로그인 자체 차단 (AuthenticationError reason: account_locked)
 * 4) Login 성공 → failedAttempts 리셋, lockedUntil = null
 */

export interface LoginInput {
  email: string;
  password: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginOutput {
  accountId: string;
  sessionToken: string;
  expiresAt: string;
}

export interface LoginSuccessPayload {
  accountId: string;
  sessionId: string;
  loginAt: string;
}

export interface LoginFailurePayload {
  email: string;
  reason: string;
  failedAt: string;
}

export interface LoginDeps {
  accountRepository: IAccountRepository & {
    incrementFailedAttempts(id: string): Promise<number>;
    resetFailedAttempts(id: string): Promise<void>;
  };
  passwordHasher: IPasswordHasher;
  sessionSigner: ISessionSigner;
  sessionRepository: ISessionRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: {
    maxFailures: number;
    lockDurationMinutes: number;
    sessionDurationHours: number;
  };
}

export async function loginWithEmailUseCase(
  input: LoginInput,
  deps: LoginDeps,
): Promise<Result<LoginOutput, AuthenticationError>> {
  const normalizedEmail = input.email.toLowerCase().trim();

  // 1. Account 조회
  const accountResult = await deps.accountRepository.findByEmail(input.tenantId, normalizedEmail);
  if (!accountResult.ok) {
    // 존재하지 않아도 같은 응답 (enumeration 방지)
    return Err(
      new AuthenticationError('Invalid credentials', {
        details: { reason: 'invalid_credentials' },
      }),
    );
  }
  const account = accountResult.value;

  // 2. Account Lock 체크 (Sprint 2C-2-3)
  const lockedUntil = (account as any).lockedUntil as string | null | undefined;
  if (lockedUntil && new Date(lockedUntil) > deps.clock.now()) {
    await recordAudit(deps.auditLogRepository, {
      accountId: account.id,
      tenantId: input.tenantId,
      eventType: 'login_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason: 'account_locked', lockedUntil },
    });
    return Err(
      new AuthenticationError('Account temporarily locked', {
        details: { reason: 'account_locked', lockedUntil },
      }),
    );
  }

  // 3. Password verify
  const passwordOk = await deps.passwordHasher.verify(input.password, account.passwordHash);

  if (!passwordOk) {
    // 실패: failedAttempts++, 임계치 초과 시 lock
    const failedAttempts = await deps.accountRepository.incrementFailedAttempts(account.id);
    let lockedUntilTime: string | null = null;
    let reason = 'invalid_credentials';

    if (failedAttempts >= deps.policy.maxFailures) {
      const lockEnd = new Date(
        deps.clock.now().getTime() + deps.policy.lockDurationMinutes * 60 * 1000,
      );
      await deps.accountRepository.setLocked(account.id, lockEnd.toISOString());
      lockedUntilTime = lockEnd.toISOString();
      reason = 'account_locked';

      await recordAudit(deps.auditLogRepository, {
        accountId: account.id,
        tenantId: input.tenantId,
        eventType: 'account_locked',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { failedAttempts, lockedUntil: lockedUntilTime },
      });
    }

    // Event
    const failureEnvelope: EventEnvelope<LoginFailurePayload> = createEnvelope({
      eventId: deps.idGenerator.generate(),
      aggregateId: account.id,
      occurredAt: deps.clock.now().toISOString(),
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      causationId: '',
      engine: 'identity',
      eventType: 'auth.login.failure',
      schemaRef: 'auth.login.failure.v1',
      payload: {
        email: normalizedEmail,
        reason,
        failedAt: deps.clock.now().toISOString(),
      },
    });
    await deps.eventBus.emit(failureEnvelope);

    // Audit
    await recordAudit(deps.auditLogRepository, {
      accountId: account.id,
      tenantId: input.tenantId,
      eventType: 'login_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason, failedAttempts, lockedUntil: lockedUntilTime },
    });

    return Err(
      new AuthenticationError(
        reason === 'account_locked' ? 'Account temporarily locked' : 'Invalid credentials',
        { details: { reason, lockedUntil: lockedUntilTime } },
      ),
    );
  }

  // 4. Login 성공: failedAttempts 리셋
  await deps.accountRepository.resetFailedAttempts(account.id);

  // 5. Session 생성
  const sessionId = deps.idGenerator.generate();
  const issuedAt = deps.clock.now();
  const expiresAt = new Date(issuedAt.getTime() + deps.policy.sessionDurationHours * 3600 * 1000);

  const sessionToken = await deps.sessionSigner.sign({
    accountId: account.id,
    sessionId,
    tenantId: input.tenantId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  const sessionRecord: SessionRecord = {
    id: sessionId,
    accountId: account.id,
    tenantId: input.tenantId,
    token: sessionToken,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  await deps.sessionRepository.insert(sessionRecord);

  // 6. Event
  const successEnvelope: EventEnvelope<LoginSuccessPayload> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: issuedAt.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'auth.login.success',
    schemaRef: 'auth.login.success.v1',
    payload: {
      accountId: account.id,
      sessionId,
      loginAt: issuedAt.toISOString(),
    },
  });
  await deps.eventBus.emit(successEnvelope);

  // 7. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'login_success',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { sessionId },
  });

  return Ok({
    accountId: account.id,
    sessionToken,
    expiresAt: expiresAt.toISOString(),
  });
}
