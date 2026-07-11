/**
 * Verify MFA Challenge UseCase (Epic 4)
 * TOTP / Email OTP / SMS OTP / Backup Code 검증
 */

import { Ok, Err, type Result, type EventEnvelope, createEnvelope } from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IAuditLogRepository,
  IEventBus,
  IMfaRepository,
  ITotp,
  IVerificationTokenRepository,
  MfaMethod,
} from '../../interfaces/index.js';
import { createHash } from 'node:crypto';

export interface VerifyMfaInput {
  accountId: string;
  tenantId: string;
  method: MfaMethod;
  code: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface VerifyMfaDeps {
  mfaRepository: IMfaRepository;
  totp: ITotp;
  verificationTokenRepository: IVerificationTokenRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
}

export async function verifyMfaUseCase(
  input: VerifyMfaInput,
  deps: VerifyMfaDeps,
): Promise<Result<{ verified: true; method: MfaMethod }, Error>> {
  const { method, code } = input;

  // 1. Backup Code
  if (method === 'backup_code') {
    const codeHash = createHash('sha256').update(code).digest('hex');
    const backupRecord = await deps.mfaRepository.findBackupCode(input.accountId, codeHash);
    if (!backupRecord) {
      await recordAudit(deps.auditLogRepository, {
        accountId: input.accountId,
        tenantId: input.tenantId,
        eventType: 'mfa_failed',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { method, reason: 'invalid_backup_code' },
      });
      return Err(new Error('Invalid backup code'));
    }
    await deps.mfaRepository.markBackupCodeUsed(backupRecord.id);

    await emitMfaEvent(deps, input, 'mfa_verified', method);
    return Ok({ verified: true, method });
  }

  // 2. TOTP
  if (method === 'totp') {
    const enrollment = await deps.mfaRepository.findEnabledByMethod(input.accountId, 'totp');
    if (!enrollment || !enrollment.secret) {
      return Err(new Error('TOTP not enrolled'));
    }
    if (!deps.totp.verify(enrollment.secret, code)) {
      await recordAudit(deps.auditLogRepository, {
        accountId: input.accountId,
        tenantId: input.tenantId,
        eventType: 'mfa_failed',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { method, reason: 'invalid_totp' },
      });
      return Err(new Error('Invalid TOTP code'));
    }
    await emitMfaEvent(deps, input, 'mfa_verified', method);
    return Ok({ verified: true, method });
  }

  // 3. Email OTP / SMS OTP
  if (method === 'email_otp' || method === 'sms_otp') {
    const purpose = method === 'email_otp' ? 'mfa_email' : 'mfa_sms';
    const enrollment = await deps.mfaRepository.findEnabledByMethod(
      input.accountId,
      method === 'email_otp' ? 'email_otp' : 'sms_otp',
    );
    if (!enrollment) {
      return Err(new Error(`${method} not enrolled`));
    }
    const target = method === 'email_otp' ? enrollment.email : enrollment.phone;
    if (!target) {
      return Err(new Error(`No ${method} target`));
    }

    const otpRecord = await deps.verificationTokenRepository.findByOtp(target, purpose);
    if (!otpRecord) {
      return Err(new Error('No active OTP'));
    }

    const attempts = await deps.verificationTokenRepository.incrementAttempts(otpRecord.tokenHash);
    if (attempts > otpRecord.maxAttempts) {
      await recordAudit(deps.auditLogRepository, {
        accountId: input.accountId,
        tenantId: input.tenantId,
        eventType: 'mfa_failed',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { method, reason: 'max_attempts' },
      });
      return Err(new Error('Max attempts exceeded'));
    }

    // Security: Use timing-safe comparison (Sprint 2C-4 fix)
    const { timingSafeEqual } = await import('node:crypto');
    let codeMatch = false;
    try {
      const a = Buffer.from(String(otpRecord.code));
      const b = Buffer.from(String(code));
      if (a.length === b.length) {
        codeMatch = timingSafeEqual(a, b);
      }
    } catch { codeMatch = false; }
    if (!codeMatch) {
      await recordAudit(deps.auditLogRepository, {
        accountId: input.accountId,
        tenantId: input.tenantId,
        eventType: 'mfa_failed',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { method, reason: 'invalid_otp' },
      });
      return Err(new Error('Invalid OTP code'));
    }

    await deps.verificationTokenRepository.markUsed(otpRecord.tokenHash);
    await emitMfaEvent(deps, input, 'mfa_verified', method);
    return Ok({ verified: true, method });
  }

  return Err(new Error(`Unsupported MFA method: ${method}`));
}

async function emitMfaEvent(
  deps: VerifyMfaDeps,
  input: VerifyMfaInput,
  eventType: string,
  method: MfaMethod,
): Promise<void> {
  const now = deps.clock.now().toISOString();
  const envelope: EventEnvelope<{ method: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.accountId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType,
    schemaRef: `${eventType}.v1`,
    payload: { method },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType: eventType === 'mfa_verified' ? 'mfa_verified' : 'mfa_failed',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { method },
  });
}
