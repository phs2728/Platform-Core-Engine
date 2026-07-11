/**
 * Confirm Email Verification UseCase (Epic 1 — Verification)
 *
 * 사용자가 이메일 링크 클릭 후 호출.
 * raw Token → SHA256 hash → DB 조회 → emailVerified = true
 *
 * Result<T,E> 반환 · EventEnvelope 발행 · Audit 기록
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  NotFoundError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import { hashToken } from '../../infrastructure/InMemoryVerificationTokenRepository.js';
import type {
  IClock,
  IIdGenerator,
  IAccountRepository,
  IVerificationTokenRepository,
  IEmailSender,
  IEventBus,
  IAuditLogRepository,
} from '../../interfaces/index.js';

export interface ConfirmEmailVerificationInput {
  rawToken: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConfirmEmailVerificationOutput {
  accountId: string;
  email: string;
  verifiedAt: string;
}

export interface ConfirmEmailVerificationDeps {
  accountRepository: IAccountRepository;
  verificationTokenRepository: IVerificationTokenRepository;
  emailSender: IEmailSender;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
}

export async function confirmEmailVerificationUseCase(
  input: ConfirmEmailVerificationInput,
  deps: ConfirmEmailVerificationDeps,
): Promise<Result<ConfirmEmailVerificationOutput, ValidationError | NotFoundError>> {
  const tokenHash = hashToken(input.rawToken);
  const record = await deps.verificationTokenRepository.findByHash(tokenHash);

  if (!record) {
    await recordAudit(deps.auditLogRepository, {
      accountId: null,
      tenantId: input.tenantId,
      eventType: 'verification_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { channel: 'email', reason: 'invalid_or_expired' },
    });
    return Err(
      new ValidationError('Invalid or expired verification token', {
        details: { reason: 'invalid_or_expired' },
      }),
    );
  }

  // 시도 횟수 초과 체크
  const attempts = await deps.verificationTokenRepository.incrementAttempts(tokenHash);
  if (attempts > record.maxAttempts) {
    await recordAudit(deps.auditLogRepository, {
      accountId: record.accountId,
      tenantId: input.tenantId,
      eventType: 'verification_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { channel: 'email', reason: 'max_attempts' },
    });
    return Err(
      new ValidationError('Max verification attempts exceeded', {
        details: { reason: 'max_attempts' },
      }),
    );
  }

  // 인증 처리
  const verifiedAt = deps.clock.now().toISOString();
  await deps.accountRepository.update(record.accountId, { emailVerified: true });
  await deps.verificationTokenRepository.markUsed(tokenHash);

  // Account 정보 조회 (이메일 확인 알림용)
  const accountLookup = await deps.accountRepository.findById(input.tenantId, record.accountId);
  if (accountLookup.ok) {
    await deps.emailSender.send({
      to: accountLookup.value.email,
      subject: 'Email verified',
      body: 'Your email has been successfully verified.',
    });
  }

  // Event
  const envelope: EventEnvelope<{ accountId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: record.accountId,
    occurredAt: verifiedAt,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'verification.email.confirmed',
    schemaRef: 'verification.email.confirmed.v1',
    payload: { accountId: record.accountId },
  });
  await deps.eventBus.emit(envelope);

  // Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: record.accountId,
    tenantId: input.tenantId,
    eventType: 'email_verified',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { verifiedAt },
  });

  return Ok({
    accountId: record.accountId,
    email: accountLookup.ok ? accountLookup.value.email : record.target,
    verifiedAt,
  });
}
