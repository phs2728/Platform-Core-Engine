/**
 * Enroll TOTP MFA UseCase (Epic 4)
 * 사장님 Engineering Manager 확립: MFA Email OTP / SMS OTP / TOTP / Backup Code
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
  IAccountRepository,
  MfaEnrollmentRecord,
  MfaMethod,
} from '../../interfaces/index.js';

export interface EnrollTotpInput {
  accountId: string;
  tenantId: string;
  accountName: string;
  issuer: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EnrollTotpOutput {
  enrollmentId: string;
  secret: string;
  otpauthUri: string;
  backupCodes: string[];
}

export interface EnrollTotpDeps {
  mfaRepository: IMfaRepository;
  totp: ITotp;
  accountRepository: IAccountRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: { mfa: { backupCodeCount: number } };
}

export async function enrollTotpUseCase(
  input: EnrollTotpInput,
  deps: EnrollTotpDeps,
): Promise<Result<EnrollTotpOutput, Error>> {
  const accountLookup = await deps.accountRepository.findById(input.tenantId, input.accountId);
  if (!accountLookup.ok) {
    return Err(new Error('Account not found'));
  }

  const enrollmentId = deps.idGenerator.generate();
  const secret = deps.totp.generateSecret();
  const otpauthUri = deps.totp.generateUri(secret, input.accountName, input.issuer);
  const now = deps.clock.now().toISOString();

  const enrollment: MfaEnrollmentRecord = {
    id: enrollmentId,
    accountId: input.accountId,
    tenantId: input.tenantId,
    method: 'totp' as MfaMethod,
    secret,
    phone: null,
    email: null,
    enabled: true,
    enrolledAt: now,
    disabledAt: null,
  };
  await deps.mfaRepository.insertEnrollment(enrollment);

  const backupCodes = deps.totp.generateBackupCodes(deps.policy.mfa.backupCodeCount);
  const { createHash } = await import('node:crypto');
  const backupRecords = backupCodes.map((code) => ({
    id: deps.idGenerator.generate(),
    accountId: input.accountId,
    tenantId: input.tenantId,
    codeHash: createHash('sha256').update(code).digest('hex'),
    usedAt: null,
    createdAt: now,
  }));
  await deps.mfaRepository.insertBackupCodes(backupRecords);

  const envelope: EventEnvelope<{ enrollmentId: string; method: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.accountId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'mfa.enrolled',
    schemaRef: 'mfa.enrolled.v1',
    payload: { enrollmentId, method: 'totp' },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType: 'mfa_enrolled',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { enrollmentId, method: 'totp' },
  });

  return Ok({ enrollmentId, secret, otpauthUri, backupCodes });
}
