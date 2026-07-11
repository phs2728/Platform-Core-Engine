/**
 * Send OTP UseCase (Epic 1 — Verification, Epic 4 MFA 연동)
 *
 * MFA Email OTP / SMS OTP 발송.
 * - purpose: 'mfa_email' (Email OTP) 또는 'mfa_sms' (SMS OTP)
 * - MFA 챌린지 시 사용자에게 OTP code 발송
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
  ISmsSender,
  IEventBus,
  IAuditLogRepository,
  IdentityPolicy,
} from '../../interfaces/index.js';

export type SendOtpChannel = 'email' | 'sms';

export interface SendOtpInput {
  accountId: string;
  channel: SendOtpChannel;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SendOtpOutput {
  channel: SendOtpChannel;
  /** 생성된 OTP code (테스트/개발용 — 운영에서는 전송만) */
  code: string;
  target: string;
  expiresAt: string;
}

export interface SendOtpDeps {
  accountRepository: IAccountRepository;
  verificationTokenRepository: IVerificationTokenRepository;
  emailSender: IEmailSender;
  smsSender: ISmsSender;
  idGenerator: IIdGenerator;
  random: IRandom;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: IdentityPolicy;
}

/**
 * MFA Email OTP 또는 SMS OTP 발송.
 */
export async function sendOtpUseCase(
  input: SendOtpInput,
  deps: SendOtpDeps,
): Promise<Result<SendOtpOutput, NotFoundError | ValidationError>> {
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

  // 2. Channel + target 결정
  let target: string;
  let purpose: 'mfa_email' | 'mfa_sms';
  if (input.channel === 'email') {
    target = account.email;
    purpose = 'mfa_email';
  } else {
    if (!account.phone) {
      return Err(
        new ValidationError('Account has no phone number for SMS OTP', {
          details: { accountId: account.id },
        }),
      );
    }
    target = account.phone;
    purpose = 'mfa_sms';
  }

  const now = deps.clock.now();
  const ttlMs = deps.policy.verification.otpTtlMinutes * 60_000;
  const expiresAt = new Date(now.getTime() + ttlMs);

  // 3. 기존 OTP 무효화 + 새 OTP code 생성
  await deps.verificationTokenRepository.invalidateForAccount(account.id, purpose);
  const code = deps.random.digits(6);

  await deps.verificationTokenRepository.insertOtp({
    accountId: account.id,
    tenantId: input.tenantId,
    channel: input.channel === 'email' ? 'email' : 'phone',
    purpose,
    code,
    target,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    maxAttempts: deps.policy.verification.maxAttempts,
    usedAt: null,
    createdAt: now.toISOString(),
  });

  // 4. 발송
  if (input.channel === 'email') {
    await deps.emailSender.send({
      to: target,
      subject: 'Your verification code',
      body: `Your verification code is: ${code}. It expires in ${deps.policy.verification.otpTtlMinutes} minutes.`,
    });
  } else {
    await deps.smsSender.send({
      to: target,
      body: `Your verification code is: ${code}. It expires in ${deps.policy.verification.otpTtlMinutes} minutes.`,
    });
  }

  // 5. Event
  const envelope: EventEnvelope<{ accountId: string; channel: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'verification.otp.sent',
    schemaRef: 'verification.otp.sent.v1',
    payload: { accountId: account.id, channel: input.channel },
  });
  await deps.eventBus.emit(envelope);

  // 6. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'verification_resent',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { channel: input.channel, purpose, phase: 'otp_sent' },
  });

  return Ok({ channel: input.channel, code, target, expiresAt: expiresAt.toISOString() });
}
