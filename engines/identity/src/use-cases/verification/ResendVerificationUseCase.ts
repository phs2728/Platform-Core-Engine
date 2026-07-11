/**
 * Resend Verification UseCase (Epic 1 — Verification)
 *
 * 사장님 확립: 재전송 쿨다운(resendCooldownSeconds) 적용.
 * - 직전 발송 후 쿨다운 내 재요청 → ValidationError (rate limit)
 * - 쿨다운 경과 → 새 토큰/OTP 발급 + 재전송
 *
 * Email link token 또는 Phone OTP 모두 지원 (channel로 구분).
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
  VerificationChannel,
  IdentityPolicy,
} from '../../interfaces/index.js';

export interface ResendVerificationInput {
  accountId: string;
  channel: VerificationChannel;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ResendVerificationOutput {
  channel: VerificationChannel;
  /** link token (email) — 호스트가 URL에 포함 */
  rawToken?: string;
  verificationUrl?: string;
  /** OTP code (phone) — 테스트/개발용 */
  code?: string;
  expiresAt: string;
}

export interface ResendVerificationDeps {
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
  /** 직전 발송 시각 (accountId:channel 키) — 쿨다운 체크용 */
  lastSentAt?: (accountId: string, channel: VerificationChannel) => Date | null;
}

export async function resendVerificationUseCase(
  input: ResendVerificationInput,
  deps: ResendVerificationDeps,
): Promise<Result<ResendVerificationOutput, NotFoundError | ValidationError>> {
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

  const now = deps.clock.now();
  const purpose = input.channel === 'email' ? 'email_verification' : 'phone_verification';

  // 2. 쿨다운 체크
  if (deps.lastSentAt) {
    const lastSent = deps.lastSentAt(account.id, input.channel);
    if (lastSent) {
      const elapsedSec = (now.getTime() - lastSent.getTime()) / 1000;
      if (elapsedSec < deps.policy.verification.resendCooldownSeconds) {
        await recordAudit(deps.auditLogRepository, {
          accountId: account.id,
          tenantId: input.tenantId,
          eventType: 'rate_limit_exceeded',
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: {
            channel: input.channel,
            reason: 'resend_cooldown',
            cooldownSeconds: deps.policy.verification.resendCooldownSeconds,
          },
        });
        return Err(
          new ValidationError('Resend cooldown active. Please wait before requesting again.', {
            details: {
              reason: 'resend_cooldown',
              cooldownSeconds: deps.policy.verification.resendCooldownSeconds,
            },
          }),
        );
      }
    }
  }

  // 3. 기존 토큰 무효화
  await deps.verificationTokenRepository.invalidateForAccount(account.id, purpose);

  if (input.channel === 'email') {
    // Email link token
    const ttlMs = deps.policy.verification.tokenTtlMinutes * 60_000;
    const expiresAt = new Date(now.getTime() + ttlMs);
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

    const verificationUrl = `https://app.example.com/verify-email?token=${rawToken}`;
    await deps.emailSender.send({
      to: account.email,
      subject: 'Verify your email',
      body: `Click to verify your email: ${verificationUrl}\n\nExpires: ${expiresAt.toISOString()}\n`,
    });

    const envelope: EventEnvelope<{ accountId: string; email: string }> = createEnvelope({
      eventId: deps.idGenerator.generate(),
      aggregateId: account.id,
      occurredAt: now.toISOString(),
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      causationId: '',
      engine: 'identity',
      eventType: 'verification.email.resent',
      schemaRef: 'verification.email.resent.v1',
      payload: { accountId: account.id, email: account.email },
    });
    await deps.eventBus.emit(envelope);

    await recordAudit(deps.auditLogRepository, {
      accountId: account.id,
      tenantId: input.tenantId,
      eventType: 'verification_resent',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { channel: 'email', purpose },
    });

    return Ok({ channel: 'email', rawToken, verificationUrl, expiresAt: expiresAt.toISOString() });
  }

  // Phone OTP
  if (!account.phone) {
    return Err(
      new ValidationError('Account has no phone number', {
        details: { accountId: account.id },
      }),
    );
  }

  const otpTtlMs = deps.policy.verification.otpTtlMinutes * 60_000;
  const otpExpiresAt = new Date(now.getTime() + otpTtlMs);
  const code = deps.random.digits(6);

  await deps.verificationTokenRepository.insertOtp({
    accountId: account.id,
    tenantId: input.tenantId,
    channel: 'phone',
    purpose: 'phone_verification',
    code,
    target: account.phone,
    expiresAt: otpExpiresAt.toISOString(),
    attempts: 0,
    maxAttempts: deps.policy.verification.maxAttempts,
    usedAt: null,
    createdAt: now.toISOString(),
  });

  await deps.smsSender.send({
    to: account.phone,
    body: `Your verification code is: ${code}. It expires in ${deps.policy.verification.otpTtlMinutes} minutes.`,
  });

  const envelope: EventEnvelope<{ accountId: string; phone: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'verification.phone.resent',
    schemaRef: 'verification.phone.resent.v1',
    payload: { accountId: account.id, phone: account.phone },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'verification_resent',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { channel: 'phone', purpose },
  });

  return Ok({ channel: 'phone', code, expiresAt: otpExpiresAt.toISOString() });
}
