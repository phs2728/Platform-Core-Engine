/**
 * Login UseCase — Enterprise Grade (Epic 5, 6, 10)
 * 
 * 사장님 Engineering Manager 확립 (2026-07-11):
 * - Rate Limit (Epic 6)
 * - Account Lock (Epic 6)
 * - Risk Hook (Epic 10): BeforeLogin → Allow / Challenge MFA / Deny
 * - MFA Challenge (Epic 4)
 * - Device Trust (Epic 9)
 * - Session Rotation (Epic 5)
 * - Audit (Epic 7)
 */

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
  IMfaRepository,
  IRateLimitRepository,
  IDeviceRepository,
  IRiskHook,
  ICaptchaVerifier,
  SessionPayload,
  SessionRecord,
  RiskDecision,
  AccountRecord,
} from '../interfaces/index.js';

export interface LoginInput {
  email: string;
  password: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  deviceName?: string;
  captchaToken?: string;
}

export type LoginOutput =
  | { status: 'success'; accountId: string; sessionToken: string; expiresAt: string }
  | { status: 'mfa_required'; accountId: string; challengeToken: string; methods: string[] }
  | { status: 'captcha_required' };

export interface LoginDeps {
  accountRepository: IAccountRepository;
  passwordHasher: IPasswordHasher;
  sessionSigner: ISessionSigner;
  sessionRepository: ISessionRepository;
  mfaRepository: IMfaRepository;
  rateLimitRepository: IRateLimitRepository;
  deviceRepository: IDeviceRepository;
  auditLogRepository: IAuditLogRepository;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
  riskHook: IRiskHook | null;
  captchaVerifier: ICaptchaVerifier | null;
  policy: {
    maxLoginFailures: number;
    lockDurationMinutes: number;
    sessionDurationHours: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    captchaThreshold: number;
    ipLockDurationMinutes: number;
  };
}

export async function loginUseCase(
  input: LoginInput,
  deps: LoginDeps,
): Promise<Result<LoginOutput, AuthenticationError>> {
  const normalizedEmail = input.email.toLowerCase().trim();
  const now = deps.clock.now();

  // === Epic 6: IP Rate Limit ===
  const rateLimitKey = `login:${input.ipAddress ?? 'unknown'}:${input.tenantId}`;
  const rateCheck = await deps.rateLimitRepository.increment(
    rateLimitKey,
    deps.policy.rateLimitWindowMs,
  );
  if (rateCheck.blocked) {
    await recordAudit(deps.auditLogRepository, {
      accountId: null,
      tenantId: input.tenantId,
      eventType: 'rate_limit_exceeded',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { key: rateLimitKey, count: rateCheck.count },
    });
    return Err(new AuthenticationError('Rate limit exceeded', {
      details: { reason: 'rate_limited' },
    }));
  }

  // === Epic 6: Brute Force Detection ===
  if (rateCheck.count > deps.policy.captchaThreshold && deps.captchaVerifier && input.captchaToken) {
    const captchaOk = await deps.captchaVerifier.verify(input.captchaToken);
    if (!captchaOk) {
      await recordAudit(deps.auditLogRepository, {
        accountId: null,
        tenantId: input.tenantId,
        eventType: 'captcha_failed',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      return Err(new AuthenticationError('CAPTCHA verification failed', {
        details: { reason: 'captcha_failed' },
      }));
    }
  } else if (rateCheck.count > deps.policy.captchaThreshold) {
    return Ok({ status: 'captcha_required' });
  }

  // === Account 조회 ===
  const accountResult = await deps.accountRepository.findByEmail(input.tenantId, normalizedEmail);
  if (!accountResult.ok) {
    return Err(new AuthenticationError('Invalid credentials', {
      details: { reason: 'invalid_credentials' },
    }));
  }
  let account = accountResult.value;

  // === Account Disabled ===
  if (account.disabled) {
    return Err(new AuthenticationError('Account disabled', {
      details: { reason: 'account_disabled' },
    }));
  }

  // === Epic 6: Account Lock ===
  if (account.lockedUntil && new Date(account.lockedUntil) > now) {
    await recordAudit(deps.auditLogRepository, {
      accountId: account.id,
      tenantId: input.tenantId,
      eventType: 'login_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason: 'account_locked', lockedUntil: account.lockedUntil },
    });
    return Err(new AuthenticationError('Account locked', {
      details: { reason: 'account_locked', lockedUntil: account.lockedUntil },
    }));
  }

  // === Password verify ===
  const passwordOk = await deps.passwordHasher.verify(input.password, account.passwordHash);
  if (!passwordOk) {
    const failedAttempts = await deps.accountRepository.incrementFailedAttempts(account.id);
    if (failedAttempts >= deps.policy.maxLoginFailures) {
      const lockEnd = new Date(now.getTime() + deps.policy.lockDurationMinutes * 60_000);
      await deps.accountRepository.update(account.id, { lockedUntil: lockEnd.toISOString() });

      await recordAudit(deps.auditLogRepository, {
        accountId: account.id,
        tenantId: input.tenantId,
        eventType: 'account_locked',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { failedAttempts, lockedUntil: lockEnd.toISOString() },
      });
    }

    const failEnvelope: EventEnvelope<{ reason: string }> = createEnvelope({
      eventId: deps.idGenerator.generate(),
      aggregateId: account.id,
      occurredAt: now.toISOString(),
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      causationId: '',
      engine: 'identity',
      eventType: 'auth.login.failure',
      schemaRef: 'auth.login.failure.v1',
      payload: { reason: 'invalid_credentials' },
    });
    await deps.eventBus.emit(failEnvelope);

    await recordAudit(deps.auditLogRepository, {
      accountId: account.id,
      tenantId: input.tenantId,
      eventType: 'login_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason: 'invalid_credentials', failedAttempts },
    });
    return Err(new AuthenticationError('Invalid credentials', {
      details: { reason: 'invalid_credentials' },
    }));
  }

  // Password OK → reset failures
  await deps.accountRepository.resetFailedAttempts(account.id);

  // === Epic 10: Risk Hook ===
  if (deps.riskHook) {
    const riskDecision: RiskDecision = await deps.riskHook.evaluate({
      accountId: account.id,
      tenantId: input.tenantId,
      email: normalizedEmail,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      deviceFingerprint: input.deviceFingerprint ?? null,
    });

    if (riskDecision === 'deny') {
      await recordAudit(deps.auditLogRepository, {
        accountId: account.id,
        tenantId: input.tenantId,
        eventType: 'risk_deny',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      return Err(new AuthenticationError('Access denied by risk engine', {
        details: { reason: 'risk_deny' },
      }));
    }

    if (riskDecision === 'challenge_mfa') {
      const enrollments = await deps.mfaRepository.findEnrollments(account.id);
      if (enrollments.length > 0) {
        const challengeToken = deps.idGenerator.generate();
        await recordAudit(deps.auditLogRepository, {
          accountId: account.id,
          tenantId: input.tenantId,
          eventType: 'risk_challenge',
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: { challengeToken, methods: enrollments.map((e: { method: string }) => e.method) },
        });
        return Ok({
          status: 'mfa_required',
          accountId: account.id,
          challengeToken,
          methods: enrollments.map((e: { method: string }) => e.method),
        });
      }
    }
  }

  // === Epic 4: MFA (enrolled → require) ===
  const mfaEnrollments = await deps.mfaRepository.findEnrollments(account.id);
  if (mfaEnrollments.length > 0) {
    const challengeToken = deps.idGenerator.generate();
    await recordAudit(deps.auditLogRepository, {
      accountId: account.id,
      tenantId: input.tenantId,
      eventType: 'mfa_challenged',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { challengeToken, methods: mfaEnrollments.map((e: { method: string }) => e.method) },
    });
    return Ok({
      status: 'mfa_required',
      accountId: account.id,
      challengeToken,
      methods: mfaEnrollments.map((e: { method: string }) => e.method),
    });
  }

  // === Epic 9: Device Trust ===
  if (input.deviceFingerprint) {
    let device = await deps.deviceRepository.findByFingerprint(account.id, input.deviceFingerprint);
    if (!device) {
      const deviceId = deps.idGenerator.generate();
      device = {
        id: deviceId,
        accountId: account.id,
        tenantId: input.tenantId,
        fingerprint: input.deviceFingerprint,
        name: input.deviceName ?? 'Unknown',
        platform: 'unknown',
        trusted: false,
        firstSeenAt: now.toISOString(),
        lastSeenAt: now.toISOString(),
        revokedAt: null,
      };
      await deps.deviceRepository.insert(device);
    } else {
      await deps.deviceRepository.updateLastSeen(device.id);
    }
  }

  // === Session 발급 ===
  const sessionResult = await createSession(deps, account, input, now);
  if (!sessionResult.ok) return sessionResult;

  // === Rate limit reset (성공) ===
  await deps.rateLimitRepository.reset(rateLimitKey);

  // === Login Success Event ===
  const successEnvelope: EventEnvelope<{ sessionId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'auth.login.success',
    schemaRef: 'auth.login.success.v1',
    payload: { sessionId: sessionResult.value.accountId },
  });
  await deps.eventBus.emit(successEnvelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'login_success',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { sessionId: sessionResult.value.accountId },
  });

  return Ok({
    status: 'success',
    accountId: account.id,
    sessionToken: sessionResult.value.sessionToken,
    expiresAt: sessionResult.value.expiresAt,
  });
}

async function createSession(
  deps: LoginDeps,
  account: AccountRecord,
  input: LoginInput,
  now: Date,
): Promise<Result<{ sessionToken: string; expiresAt: string; accountId: string }, AuthenticationError>> {
  const sessionId = deps.idGenerator.generate();
  const expiresAt = new Date(now.getTime() + deps.policy.sessionDurationHours * 3_600_000);

  const payload: SessionPayload = {
    accountId: account.id,
    sessionId,
    tenantId: input.tenantId,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const sessionToken = await deps.sessionSigner.sign(payload);

  const record: SessionRecord = {
    id: sessionId,
    accountId: account.id,
    tenantId: input.tenantId,
    token: sessionToken,
    refreshToken: null,
    type: 'web',
    deviceFingerprint: input.deviceFingerprint ?? null,
    deviceName: input.deviceName ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastUsedAt: now.toISOString(),
  };
  await deps.sessionRepository.insert(record);

  return Ok({ sessionToken, expiresAt: expiresAt.toISOString(), accountId: account.id });
}
