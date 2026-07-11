/**
 * Request Password Reset UseCase (Epic 2 — Password)
 *
 * 사장님 확립 (Sprint 2C-3):
 * - Token → SHA256 hash → DB 저장 (raw ❌)
 * - 원본 Token은 이메일로만 발송
 * - **이메일 enumeration 방지**: 계정 존재 여부와 무관하게 항상 동일한 응답
 *
 * Result<T,E> 반환 · EventEnvelope 발행 · Audit 기록
 */

import {
  Ok,
  type Result,
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

export interface RequestPasswordResetInput {
  email: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RequestPasswordResetOutput {
  /**
   * 보안: 이메일 존재 여부와 무관하게 항상 success: true.
   * 호스트는 이 값만 클라이언트에 반환 (enumeration 방지).
   */
  success: true;
}

export interface RequestPasswordResetDeps {
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

export async function requestPasswordResetUseCase(
  input: RequestPasswordResetInput,
  deps: RequestPasswordResetDeps,
): Promise<Result<RequestPasswordResetOutput, never>> {
  const normalizedEmail = input.email.toLowerCase().trim();

  // 1. Account 조회 (없어도 같은 응답 — enumeration 방지)
  const accountResult = await deps.accountRepository.findByEmail(input.tenantId, normalizedEmail);

  if (!accountResult.ok) {
    // 존재하지 않아도 동일 응답 + Audit (계정 없음)
    await recordAudit(deps.auditLogRepository, {
      accountId: null,
      tenantId: input.tenantId,
      eventType: 'password_reset',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { phase: 'requested', email_not_found: true },
    });
    return Ok({ success: true });
  }

  const account = accountResult.value;
  const now = deps.clock.now();
  const ttlMs = deps.policy.verification.tokenTtlMinutes * 60_000;
  const expiresAt = new Date(now.getTime() + ttlMs);

  // 2. 기존 reset 토큰 무효화 + 새 raw Token 생성
  await deps.verificationTokenRepository.invalidateForAccount(account.id, 'password_reset');
  const rawToken = deps.random.bytes(32);

  await deps.verificationTokenRepository.insert({
    rawToken,
    accountId: account.id,
    tenantId: input.tenantId,
    channel: 'email',
    purpose: 'password_reset',
    code: null,
    target: account.email,
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    maxAttempts: deps.policy.verification.maxAttempts,
    usedAt: null,
    createdAt: now.toISOString(),
  });

  // 3. Email 발송 (raw Token 포함 URL)
  const resetUrl = `https://app.example.com/reset-password?token=${rawToken}`;
  await deps.emailSender.send({
    to: account.email,
    subject: 'Reset your password',
    body: `Reset link: ${resetUrl}\n\nExpires: ${expiresAt.toISOString()}\n`,
  });

  // 4. Event
  const envelope: EventEnvelope<{ accountId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'password.reset.requested',
    schemaRef: 'password.reset.requested.v1',
    payload: { accountId: account.id },
  });
  await deps.eventBus.emit(envelope);

  // 5. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'password_reset',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { phase: 'requested' },
  });

  // 보안: 이메일 enumeration 방지를 위해 항상 동일한 응답.
  return Ok({ success: true });
}
