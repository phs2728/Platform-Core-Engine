/**
 * Confirm Password Reset UseCase (Epic 2 — Password)
 *
 * 사용자가 이메일 링크 클릭 후 새 비밀번호 입력 → 호출.
 * - raw Token → SHA256 hash → DB 조회
 * - 새 비밀번호 정책 검증
 * - Password History 재사용 체크
 * - 모든 기존 Session 강제 종료
 * - Token 사용 처리
 *
 * Result<T,E> 반환 · EventEnvelope 발행 · Audit 기록
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  NotFoundError,
  z,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import { hashToken } from '../../infrastructure/InMemoryVerificationTokenRepository.js';
import type {
  IClock,
  IIdGenerator,
  IPasswordHasher,
  IAccountRepository,
  IPasswordHistoryRepository,
  IVerificationTokenRepository,
  ISessionRepository,
  IEventBus,
  IAuditLogRepository,
  IdentityPolicy,
} from '../../interfaces/index.js';

export interface ConfirmPasswordResetInput {
  rawToken: string;
  newPassword: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConfirmPasswordResetOutput {
  accountId: string;
  resetAt: string;
  passwordExpiresAt: string | null;
  sessionsRevoked: number;
}

export interface ConfirmPasswordResetDeps {
  accountRepository: IAccountRepository;
  passwordHasher: IPasswordHasher;
  passwordHistoryRepository: IPasswordHistoryRepository;
  verificationTokenRepository: IVerificationTokenRepository;
  sessionRepository: ISessionRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: IdentityPolicy;
}

function buildPasswordSchema(policy: IdentityPolicy['password']) {
  let s = z.string().min(policy.minLength).max(1024);
  if (policy.requireUppercase) s = s.regex(/[A-Z]/, 'Need uppercase');
  if (policy.requireLowercase) s = s.regex(/[a-z]/, 'Need lowercase');
  if (policy.requireNumber) s = s.regex(/[0-9]/, 'Need number');
  if (policy.requireSpecial) s = s.regex(/[^A-Za-z0-9]/, 'Need special character');
  return s;
}

export async function confirmPasswordResetUseCase(
  input: ConfirmPasswordResetInput,
  deps: ConfirmPasswordResetDeps,
): Promise<Result<ConfirmPasswordResetOutput, ValidationError | NotFoundError>> {
  // 1. 새 비밀번호 정책 검증
  const schema = buildPasswordSchema(deps.policy.password);
  const parseResult = schema.safeParse(input.newPassword);
  if (!parseResult.success) {
    return Err(
      new ValidationError('Password does not meet policy', {
        details: { issues: parseResult.error.errors },
      }),
    );
  }

  // 2. Token 검증 (raw → hash → DB)
  const tokenHash = hashToken(input.rawToken);
  const record = await deps.verificationTokenRepository.findByHash(tokenHash);
  if (!record || record.purpose !== 'password_reset') {
    await recordAudit(deps.auditLogRepository, {
      accountId: record?.accountId ?? null,
      tenantId: input.tenantId,
      eventType: 'verification_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason: 'invalid_or_expired_reset_token' },
    });
    return Err(
      new ValidationError('Invalid or expired reset token', {
        details: { reason: 'invalid_or_expired' },
      }),
    );
  }

  // 3. Password History 재사용 체크
  const newPasswordHash = await deps.passwordHasher.hash(input.newPassword);
  const isReused = await deps.passwordHistoryRepository.checkReuse(
    record.accountId,
    newPasswordHash,
    deps.policy.password.historyCount,
  );
  if (isReused) {
    await recordAudit(deps.auditLogRepository, {
      accountId: record.accountId,
      tenantId: input.tenantId,
      eventType: 'password_reuse_blocked',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { method: 'reset', historyCount: deps.policy.password.historyCount },
    });
    return Err(
      new ValidationError('Password was used recently. Choose a different password.', {
        details: { reason: 'password_reuse', historyCount: deps.policy.password.historyCount },
      }),
    );
  }

  // 4. 비밀번호 업데이트
  const now = deps.clock.now();
  const passwordExpiresAt =
    deps.policy.password.expirationDays > 0
      ? new Date(now.getTime() + deps.policy.password.expirationDays * 86_400_000).toISOString()
      : null;

  await deps.accountRepository.update(record.accountId, {
    passwordHash: newPasswordHash,
    passwordChangedAt: now.toISOString(),
    passwordExpiresAt,
    forcePasswordChange: false,
    failedAttempts: 0,
    lockedUntil: null,
    updatedAt: now.toISOString(),
  });

  // 5. Password History 저장
  await deps.passwordHistoryRepository.insert({
    id: deps.idGenerator.generate(),
    accountId: record.accountId,
    tenantId: input.tenantId,
    passwordHash: newPasswordHash,
    changedAt: now.toISOString(),
  });

  // 6. 모든 기존 Session 강제 종료
  const sessionsRevoked = await deps.sessionRepository.deleteByAccountId(record.accountId);

  // 7. Token 사용 처리
  await deps.verificationTokenRepository.markUsed(tokenHash);

  // 8. Event
  const envelope: EventEnvelope<{
    accountId: string;
    sessionsRevoked: number;
  }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: record.accountId,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'password.reset.confirmed',
    schemaRef: 'password.reset.confirmed.v1',
    payload: { accountId: record.accountId, sessionsRevoked },
  });
  await deps.eventBus.emit(envelope);

  // 9. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: record.accountId,
    tenantId: input.tenantId,
    eventType: 'password_reset',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { phase: 'confirmed', resetAt: now.toISOString() },
  });

  await recordAudit(deps.auditLogRepository, {
    accountId: record.accountId,
    tenantId: input.tenantId,
    eventType: 'password_changed',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { method: 'reset', resetAt: now.toISOString() },
  });

  if (sessionsRevoked > 0) {
    await recordAudit(deps.auditLogRepository, {
      accountId: record.accountId,
      tenantId: input.tenantId,
      eventType: 'session_revoked',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason: 'password_reset', all: true, count: sessionsRevoked },
    });
  }

  return Ok({
    accountId: record.accountId,
    resetAt: now.toISOString(),
    passwordExpiresAt,
    sessionsRevoked,
  });
}
