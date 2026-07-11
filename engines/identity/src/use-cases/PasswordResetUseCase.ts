import {
  Ok,
  Err,
  type Result,
  Password,
  ValidationError,
  NotFoundError,
  AuthenticationError,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import { hashToken } from '../infrastructure/InMemoryVerificationTokenRepository.js';
import type {
  IClock,
  IIdGenerator,
  IPasswordHasher,
  IAccountRepository,
  IVerificationTokenRepository,
  IEmailSender,
  IAuditLogRepository,
  ISessionRepository,
} from '../interfaces/index.js';
import type { EmailMessage } from '../interfaces/IEmailSender.js';

/**
 * Password Reset Request UseCase (Sprint 2C-2-2)
 *
 * 사장님 확립: Token → SHA256 Hash → DB 저장 (raw Token ❌)
 * 원본은 이메일로만 발송.
 */

export interface PasswordResetRequestInput {
  email: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
}

export interface PasswordResetRequestOutput {
  /** 보안: 이메일 존재 여부와 무관하게 항상 동일한 응답. */
  success: true;
}

export interface PasswordResetRequestDeps {
  accountRepository: IAccountRepository;
  verificationTokenRepository: IVerificationTokenRepository;
  emailSender: IEmailSender;
  idGenerator: IIdGenerator;
  clock: IClock;
  auditLogRepository: IAuditLogRepository;
}

const PASSWORD_RESET_TTL_MINUTES = 30;

export async function requestPasswordResetUseCase(
  input: PasswordResetRequestInput,
  deps: PasswordResetRequestDeps,
): Promise<Result<PasswordResetRequestOutput, never>> {
  // 1. Email 정규화
  const normalizedEmail = input.email.toLowerCase().trim();

  // 2. Account 조회 (없어도 같은 응답 — enumeration 방지)
  const accountResult = await deps.accountRepository.findByEmail(input.tenantId, normalizedEmail);

  if (!accountResult.ok) {
    // 존재하지 않아도 동일 응답
    await recordAudit(deps.auditLogRepository, {
      accountId: null,
      tenantId: input.tenantId,
      eventType: 'password_reset',
      ipAddress: input.ipAddress,
      metadata: { phase: 'requested', email_not_found: true },
    });
    return Ok({ success: true });
  }

  const account = accountResult.value;

  // 3. 기존 토큰 무효화
  await deps.verificationTokenRepository.invalidateForAccount(account.id, 'password_reset');

  // 4. 새 Token 생성 + Hash 저장
  const rawToken = deps.idGenerator.generate();
  const expiresAt = new Date(
    deps.clock.now().getTime() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
  );
  await deps.verificationTokenRepository.insert({
    rawToken,
    accountId: account.id,
    tenantId: input.tenantId,
    type: 'password_reset',
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    createdAt: deps.clock.now().toISOString(),
  });

  // 5. Email 발송 (raw Token 포함)
  const resetUrl = `https://app.example.com/reset-password?token=${rawToken}`;
  const message: EmailMessage = {
    to: account.email,
    subject: 'Reset your password',
    body: `Reset link: ${resetUrl}\n\nExpires: ${expiresAt.toISOString()}\n`,
  };
  await deps.emailSender.send(message);

  // 6. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'password_reset',
    ipAddress: input.ipAddress,
    metadata: { phase: 'requested' },
  });

  // 보안: 이메일 enumeration 방지를 위해 항상 동일한 응답.
  return Ok({ success: true });
}

/**
 * Password Reset Confirm UseCase
 */

export interface PasswordResetConfirmInput {
  rawToken: string;
  newPassword: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PasswordResetConfirmOutput {
  accountId: string;
  resetAt: string;
}

export interface PasswordResetConfirmDeps {
  accountRepository: IAccountRepository;
  verificationTokenRepository: IVerificationTokenRepository;
  passwordHasher: IPasswordHasher;
  sessionRepository: ISessionRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  auditLogRepository: IAuditLogRepository;
}

import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(12)
  .regex(/[A-Z]/, 'Need uppercase')
  .regex(/[a-z]/, 'Need lowercase')
  .regex(/[0-9]/, 'Need number')
  .regex(/[^A-Za-z0-9]/, 'Need special');

export async function confirmPasswordResetUseCase(
  input: PasswordResetConfirmInput,
  deps: PasswordResetConfirmDeps,
): Promise<Result<PasswordResetConfirmOutput, ValidationError | NotFoundError>> {
  // 1. New Password 검증
  const passwordValidation = passwordSchema.safeParse(input.newPassword);
  if (!passwordValidation.success) {
    return Err(
      new ValidationError('Password does not meet policy', {
        details: { issues: passwordValidation.error.errors },
      }),
    );
  }

  // 2. Token 검증
  const tokenHash = hashToken(input.rawToken);
  const record = await deps.verificationTokenRepository.findByHash(tokenHash, 'password_reset');
  if (!record) {
    return Err(new ValidationError('Invalid or expired reset token'));
  }

  // 3. Password Hash + 저장
  const newPasswordHash = await deps.passwordHasher.hash(input.newPassword);
  await deps.accountRepository.setPassword(record.accountId, newPasswordHash);

  // 4. 모든 기존 Session 강제 종료 (Sprint 2C-2-4 — Session Rotation의 일환)
  await deps.sessionRepository.deleteByAccountId(record.accountId);

  // 5. Token 사용 처리
  await deps.verificationTokenRepository.markUsed(tokenHash);

  // 6. Audit
  const resetAt = deps.clock.now().toISOString();
  await recordAudit(deps.auditLogRepository, {
    accountId: record.accountId,
    tenantId: record.tenantId,
    eventType: 'password_reset',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { phase: 'confirmed', resetAt },
  });

  await recordAudit(deps.auditLogRepository, {
    accountId: record.accountId,
    tenantId: record.tenantId,
    eventType: 'password_changed',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { method: 'reset', resetAt },
  });

  // 7. 모든 Session 로그아웃 Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: record.accountId,
    tenantId: record.tenantId,
    eventType: 'session_revoked',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { reason: 'password_reset', all: true, resetAt },
  });

  return Ok({ accountId: record.accountId, resetAt });
}
