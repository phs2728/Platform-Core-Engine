/**
 * Confirm Phone Verification UseCase (Epic 1 — Verification)
 *
 * 사용자가 SMS로 받은 OTP code 입력 → phoneVerified = true
 *
 * Result<T,E> 반환 · EventEnvelope 발행 · Audit 기록
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IAccountRepository,
  IVerificationTokenRepository,
  IEventBus,
  IAuditLogRepository,
} from '../../interfaces/index.js';

export interface ConfirmPhoneVerificationInput {
  phone: string;
  code: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConfirmPhoneVerificationOutput {
  accountId: string;
  phone: string;
  verifiedAt: string;
}

export interface ConfirmPhoneVerificationDeps {
  accountRepository: IAccountRepository;
  verificationTokenRepository: IVerificationTokenRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
}

export async function confirmPhoneVerificationUseCase(
  input: ConfirmPhoneVerificationInput,
  deps: ConfirmPhoneVerificationDeps,
): Promise<Result<ConfirmPhoneVerificationOutput, ValidationError>> {
  const otpRecord = await deps.verificationTokenRepository.findByOtp(
    input.phone,
    'phone_verification',
  );

  if (!otpRecord) {
    await recordAudit(deps.auditLogRepository, {
      accountId: null,
      tenantId: input.tenantId,
      eventType: 'verification_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { channel: 'phone', reason: 'invalid_or_expired' },
    });
    return Err(
      new ValidationError('Invalid or expired verification code', {
        details: { reason: 'invalid_or_expired' },
      }),
    );
  }

  // 시도 횟수 증가 + 초과 체크
  const attempts = await deps.verificationTokenRepository.incrementAttempts(otpRecord.tokenHash);
  if (attempts > otpRecord.maxAttempts) {
    await recordAudit(deps.auditLogRepository, {
      accountId: otpRecord.accountId,
      tenantId: input.tenantId,
      eventType: 'verification_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { channel: 'phone', reason: 'max_attempts' },
    });
    return Err(
      new ValidationError('Max verification attempts exceeded', {
        details: { reason: 'max_attempts' },
      }),
    );
  }

  // Code 검증 — Security: timing-safe comparison (Sprint 2C-4 fix)
  const { timingSafeEqual } = await import('node:crypto');
  let codeMatch = false;
  try {
    const a = Buffer.from(String(otpRecord.code));
    const b = Buffer.from(String(input.code));
    if (a.length === b.length) codeMatch = timingSafeEqual(a, b);
  } catch { codeMatch = false; }
  if (!codeMatch) {
    await recordAudit(deps.auditLogRepository, {
      accountId: otpRecord.accountId,
      tenantId: input.tenantId,
      eventType: 'verification_failed',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { channel: 'phone', reason: 'invalid_code' },
    });
    return Err(
      new ValidationError('Invalid verification code', {
        details: { reason: 'invalid_code' },
      }),
    );
  }

  // 인증 처리
  const verifiedAt = deps.clock.now().toISOString();
  await deps.accountRepository.update(otpRecord.accountId, { phoneVerified: true });
  await deps.verificationTokenRepository.markUsed(otpRecord.tokenHash);

  // Event
  const envelope: EventEnvelope<{ accountId: string; phone: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: otpRecord.accountId,
    occurredAt: verifiedAt,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'verification.phone.confirmed',
    schemaRef: 'verification.phone.confirmed.v1',
    payload: { accountId: otpRecord.accountId, phone: input.phone },
  });
  await deps.eventBus.emit(envelope);

  // Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: otpRecord.accountId,
    tenantId: input.tenantId,
    eventType: 'phone_verified',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { verifiedAt },
  });

  return Ok({
    accountId: otpRecord.accountId,
    phone: input.phone,
    verifiedAt,
  });
}
