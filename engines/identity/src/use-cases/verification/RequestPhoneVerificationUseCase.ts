/**
 * Request Phone Verification UseCase (Epic 1 — Verification)
 *
 * 사장님 확립 (Sprint 2C-3):
 * - Phone Verification은 **OTP code** (6자리 숫자)
 * - DB에는 code를 포함한 record 저장 (otpIndex로 target:purpose 매핑)
 * - 원본 code는 SMS로 발송
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
  ISmsSender,
  IEventBus,
  IAuditLogRepository,
  IdentityPolicy,
} from '../../interfaces/index.js';

export interface RequestPhoneVerificationInput {
  accountId: string;
  phone: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RequestPhoneVerificationOutput {
  /** 생성된 OTP code (테스트/개발용 반환 — 운영에서는 SMS로만 전송) */
  code: string;
  expiresAt: string;
}

export interface RequestPhoneVerificationDeps {
  accountRepository: IAccountRepository;
  verificationTokenRepository: IVerificationTokenRepository;
  smsSender: ISmsSender;
  idGenerator: IIdGenerator;
  random: IRandom;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: IdentityPolicy;
}

/**
 * Phone Verification OTP 발급 + SMS 발송.
 */
export async function requestPhoneVerificationUseCase(
  input: RequestPhoneVerificationInput,
  deps: RequestPhoneVerificationDeps,
): Promise<Result<RequestPhoneVerificationOutput, NotFoundError | ValidationError>> {
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

  // Phone이 account에 등록되어 있는지 확인
  if (!account.phone) {
    return Err(
      new ValidationError('Account has no phone number', {
        details: { accountId: account.id },
      }),
    );
  }

  const now = deps.clock.now();
  const ttlMs = deps.policy.verification.otpTtlMinutes * 60_000;
  const expiresAt = new Date(now.getTime() + ttlMs);

  // 2. 기존 OTP 무효화 + 새 OTP code 생성
  await deps.verificationTokenRepository.invalidateForAccount(account.id, 'phone_verification');
  const code = deps.random.digits(6);

  await deps.verificationTokenRepository.insertOtp({
    accountId: account.id,
    tenantId: input.tenantId,
    channel: 'phone',
    purpose: 'phone_verification',
    code,
    target: account.phone,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    maxAttempts: deps.policy.verification.maxAttempts,
    usedAt: null,
    createdAt: now.toISOString(),
  });

  // 3. SMS 발송
  await deps.smsSender.send({
    to: account.phone,
    body: `Your verification code is: ${code}. It expires in ${deps.policy.verification.otpTtlMinutes} minutes.`,
  });

  // 4. Event
  const envelope: EventEnvelope<{ accountId: string; phone: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'verification.phone.requested',
    schemaRef: 'verification.phone.requested.v1',
    payload: { accountId: account.id, phone: account.phone },
  });
  await deps.eventBus.emit(envelope);

  // 5. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'verification_resent',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { channel: 'phone', purpose: 'phone_verification', phase: 'requested' },
  });

  return Ok({ code, expiresAt: expiresAt.toISOString() });
}
