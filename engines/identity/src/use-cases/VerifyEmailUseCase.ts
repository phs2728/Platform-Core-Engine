import {
  Ok,
  Err,
  type Result,
  ValidationError,
  NotFoundError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IAccountRepository,
  IVerificationTokenRepository,
  IEmailSender,
  IAuditLogRepository,
} from '../interfaces/index.js';
import type { EmailMessage } from '../interfaces/IEmailSender.js';

/**
 * Verify Email UseCase (Sprint 2C-2-1)
 *
 * 흐름:
 * 1) Host 가 생성된 raw Token + URL을 이메일에 삽입해 발송
 * 2) 사용자가 링크 클릭 → raw Token을 받아 VerifyEmailUseCase 호출
 * 3) UseCase: raw Token을 SHA256 해시 → DB 조회 → emailVerified = true
 *
 * 사장님 확립:
 * - DB에는 Token Hash만 저장 (raw ❌)
 * - raw Token은 이메일로만
 */

export interface RequestEmailVerificationInput {
  accountId: string;
  tenantId: string;
  correlationId: string;
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
  clock: IClock;
  auditLogRepository: IAuditLogRepository;
}

const VERIFICATION_TOKEN_TTL_HOURS = 24;

export async function requestEmailVerificationUseCase(
  input: RequestEmailVerificationInput,
  deps: RequestEmailVerificationDeps,
): Promise<Result<RequestEmailVerificationOutput, NotFoundError | ValidationError>> {
  // 1. Account 조회
  const accountResult = await deps.accountRepository.findById(input.tenantId, input.accountId);
  if (!accountResult.ok) return accountResult;

  const account = accountResult.value;
  const rawToken = deps.idGenerator.generate();
  const now = deps.clock.now();
  const expiresAt = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_HOURS * 3600 * 1000);

  // 2. Token 저장 (Hash만)
  await deps.verificationTokenRepository.insert({
    rawToken,
    accountId: account.id,
    tenantId: input.tenantId,
    type: 'email_verification',
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    createdAt: now.toISOString(),
  });

  // 3. Email 발송 (raw Token 포함)
  const verificationUrl = `https://app.example.com/verify-email?token=${rawToken}`;
  await deps.emailSender.send({
    to: account.email,
    subject: 'Verify your email',
    body: `Click to verify: ${verificationUrl}\n\nExpires: ${expiresAt.toISOString()}\n`,
  });

  // 4. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'email_verified', // REQUESTED phase
    metadata: { phase: 'requested' },
  });

  return Ok({ rawToken, verificationUrl, expiresAt: expiresAt.toISOString() });
}

/**
 * Confirm Verification UseCase
 * 사용자가 이메일 링크 클릭 후 호출
 */
export interface ConfirmEmailVerificationInput {
  rawToken: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConfirmEmailVerificationOutput {
  accountId: string;
  verifiedAt: string;
}

export interface ConfirmEmailVerificationDeps {
  accountRepository: IAccountRepository;
  verificationTokenRepository: IVerificationTokenRepository;
  emailSender: IEmailSender; // for invalidation confirmation
  clock: IClock;
  auditLogRepository: IAuditLogRepository;
}

import { hashToken } from '../infrastructure/InMemoryVerificationTokenRepository.js';

export async function confirmEmailVerificationUseCase(
  input: ConfirmEmailVerificationInput,
  deps: ConfirmEmailVerificationDeps,
): Promise<Result<ConfirmEmailVerificationOutput, ValidationError>> {
  const tokenHash = hashToken(input.rawToken);
  const record = await deps.verificationTokenRepository.findByHash(tokenHash, 'email_verification');
  if (!record) {
    await recordAudit(deps.auditLogRepository, {
      accountId: null,
      tenantId: input.tenantId,
      eventType: 'email_verified',
      metadata: { phase: 'failed', reason: 'invalid_or_expired' },
    });
    return Err(new ValidationError('Invalid or expired verification token'));
  }

  // Account의 emailVerified = true
  await deps.accountRepository.setEmailVerified(record.accountId, true);

  // Token 사용 처리
  await deps.verificationTokenRepository.markUsed(tokenHash);

  const verifiedAt = deps.clock.now().toISOString();

  const accountLookup = await deps.accountRepository.findById(input.tenantId, record.accountId);
  if (accountLookup.ok) {
    await deps.emailSender.send({
      to: accountLookup.value.email,
      subject: 'Email verified',
      body: 'Your email has been successfully verified.',
    });
  }

  // Success audit (overwrite)
  await recordAudit(deps.auditLogRepository, {
    accountId: record.accountId,
    tenantId: record.tenantId,
    eventType: 'email_verified',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { phase: 'confirmed', verifiedAt },
  });

  return Ok({ accountId: record.accountId, verifiedAt });
}
