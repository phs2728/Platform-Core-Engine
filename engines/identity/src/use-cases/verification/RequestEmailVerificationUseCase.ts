/**
 * Request Email Verification UseCase (Epic 1 — Verification)
 *
 * 사장님 확립 (Sprint 2C-3):
 * - Email Verification은 **link token** (random bytes → SHA256 hash)
 * - DB에는 Token Hash만 저장 (raw ❌)
 * - 원본 Token은 이메일로 발송, 사용자가 링크 클릭 → ConfirmEmailVerification
 *
 * Result<T,E> 반환 · EventEnvelope 발행 · Audit 기록
 */

import {
  Ok,
  Err,
  type Result,
  NotFoundError,
  ValidationError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IRandom,
  IAccountRepository,
  IVerificationTokenRepository,
  IEmailSender,
  IEventBus,
  IAuditLogRepository,
  IdentityPolicy,
} from '../../interfaces/index.js';

export interface RequestEmailVerificationInput {
  accountId: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RequestEmailVerificationOutput {
  /** 발송된 raw Token (호스트가 이메일 URL에 포함) */
  rawToken: string;
  verificationUrl: string;
  expiresAt: string;
}

export interface RequestEmailVerificationDeps {
  accountRepository: IAccountRepository;
  verificationTokenRepository: IVerificationTokenRepository;
  emailSender: IEmailSender;
  idGenerator: IIdGenerator;
  random: IRandom;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: IdentityPolicy;
}

/**
 * Email Verification 링크 토큰 발급 + 이메일 발송.
 */
export async function requestEmailVerificationUseCase(
  input: RequestEmailVerificationInput,
  deps: RequestEmailVerificationDeps,
): Promise<Result<RequestEmailVerificationOutput, NotFoundError | ValidationError>> {
  // 1. Account 조회
  const accountResult = await deps.accountRepository.findById(input.tenantId, input.accountId);
  if (!accountResult.ok) {
    return Err(
      new NotFoundError('Account not found', {
        details: { resource: 'account', id: input.accountId, tenantId: input.tenantId },
      }),
    );
  }

  const account = accountResult.value;

  // 이미 인증된 경우 → ValidationError (idempotent 재요청 방지)
  if (account.emailVerified) {
    return Err(
      new ValidationError('Email already verified', {
        details: { resource: 'account', email: account.email },
      }),
    );
  }

  const now = deps.clock.now();
  const ttlMs = deps.policy.verification.tokenTtlMinutes * 60_000;
  const expiresAt = new Date(now.getTime() + ttlMs);

  // 2. 기존 토큰 무효화 + 새 raw Token 생성
  await deps.verificationTokenRepository.invalidateForAccount(account.id, 'email_verification');
  const rawToken = deps.random.bytes(32);

  await deps.verificationTokenRepository.insert({
    rawToken,
    accountId: account.id,
    tenantId: input.tenantId,
    channel: 'email',
    purpose: 'email_verification',
    code: null,
    target: account.email,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    maxAttempts: deps.policy.verification.maxAttempts,
    usedAt: null,
    createdAt: now.toISOString(),
  });

  // 3. Email 발송 (raw Token 포함 URL)
  const verificationUrl = `https://app.example.com/verify-email?token=${rawToken}`;
  await deps.emailSender.send({
    to: account.email,
    subject: 'Verify your email',
    body: `Click to verify your email: ${verificationUrl}\n\nExpires: ${expiresAt.toISOString()}\n`,
  });

  // 4. Event
  const envelope: EventEnvelope<{ accountId: string; email: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'verification.email.requested',
    schemaRef: 'verification.email.requested.v1',
    payload: { accountId: account.id, email: account.email },
  });
  await deps.eventBus.emit(envelope);

  // 5. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'verification_resent',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { channel: 'email', purpose: 'email_verification', phase: 'requested' },
  });

  return Ok({ rawToken, verificationUrl, expiresAt: expiresAt.toISOString() });
}
