/**
 * Change Password UseCase (Epic 2 — Password)
 *
 * 사장님 확립 (Sprint 2C-3):
 * - 현재 비밀번호 검증
 * - 새 비밀번호 정책 검증 (Policy Engine)
 * - Password History 재사용 체크 (historyCount 개수만큼)
 * - Password 만료일 갱신 (expirationDays > 0인 경우)
 * - 모든 Session 강제 종료 (forceLogout 옵션)
 *
 * Result<T,E> 반환 · EventEnvelope 발행 · Audit 기록
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  AuthenticationError,
  type EventEnvelope,
  createEnvelope,
  z,
} from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IPasswordHasher,
  IAccountRepository,
  IPasswordHistoryRepository,
  ISessionRepository,
  IEventBus,
  IAuditLogRepository,
  IdentityPolicy,
} from '../../interfaces/index.js';

export interface ChangePasswordInput {
  accountId: string;
  currentPassword: string;
  newPassword: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
  /** 비밀번호 변경 후 모든 Session 종료 여부 (기본 true) */
  forceLogout?: boolean;
}

export interface ChangePasswordOutput {
  accountId: string;
  changedAt: string;
  passwordExpiresAt: string | null;
  sessionsRevoked: number;
}

export interface ChangePasswordDeps {
  accountRepository: IAccountRepository;
  passwordHasher: IPasswordHasher;
  passwordHistoryRepository: IPasswordHistoryRepository;
  sessionRepository: ISessionRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: IdentityPolicy;
}

function buildPasswordSchema(policy: IdentityPolicy['password']) {
  let s = z.string().min(policy.minLength).max(1024);
  if (policy.requireUppercase) s = s.regex(/[A-Z]/, 'Need uppercase');
  if (policy.requireLowercase) s = s.regex(/[a-z]/, 'Need lowercase');
  if (policy.requireNumber) s = s.regex(/[0-9]/, 'Need number');
  if (policy.requireSpecial) s = s.regex(/[^A-Za-z0-9]/, 'Need special character');
  return s;
}

export async function changePasswordUseCase(
  input: ChangePasswordInput,
  deps: ChangePasswordDeps,
): Promise<Result<ChangePasswordOutput, ValidationError | AuthenticationError>> {
  // 1. Account 조회
  const accountResult = await deps.accountRepository.findById(input.tenantId, input.accountId);
  if (!accountResult.ok) {
    return Err(
      new AuthenticationError('Account not found', {
        details: { reason: 'account_not_found' },
      }),
    );
  }
  const account = accountResult.value;

  // 2. 현재 비밀번호 검증
  const currentOk = await deps.passwordHasher.verify(input.currentPassword, account.passwordHash);
  if (!currentOk) {
    await recordAudit(deps.auditLogRepository, {
      accountId: account.id,
      tenantId: input.tenantId,
      eventType: 'password_reuse_blocked',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason: 'current_password_mismatch' },
    });
    return Err(
      new AuthenticationError('Current password is incorrect', {
        details: { reason: 'current_password_mismatch' },
      }),
    );
  }

  // 3. 새 비밀번호 정책 검증
  const schema = buildPasswordSchema(deps.policy.password);
  const parseResult = schema.safeParse(input.newPassword);
  if (!parseResult.success) {
    return Err(
      new ValidationError('New password does not meet policy', {
        details: { issues: parseResult.error.errors },
      }),
    );
  }

  // 4. 새 비밀번호가 현재 비밀번호와 동일한지 체크
  const sameAsCurrent = await deps.passwordHasher.verify(input.newPassword, account.passwordHash);
  if (sameAsCurrent) {
    return Err(
      new ValidationError('New password must be different from current password', {
        details: { reason: 'same_as_current' },
      }),
    );
  }

  // 5. Password History 재사용 체크
  const newPasswordHash = await deps.passwordHasher.hash(input.newPassword);
  const isReused = await deps.passwordHistoryRepository.checkReuse(
    account.id,
    newPasswordHash,
    deps.policy.password.historyCount,
  );
  if (isReused) {
    await recordAudit(deps.auditLogRepository, {
      accountId: account.id,
      tenantId: input.tenantId,
      eventType: 'password_reuse_blocked',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { historyCount: deps.policy.password.historyCount },
    });
    return Err(
      new ValidationError('Password was used recently. Choose a different password.', {
        details: { reason: 'password_reuse', historyCount: deps.policy.password.historyCount },
      }),
    );
  }

  // 6. 비밀번호 업데이트
  const now = deps.clock.now();
  const passwordExpiresAt =
    deps.policy.password.expirationDays > 0
      ? new Date(now.getTime() + deps.policy.password.expirationDays * 86_400_000).toISOString()
      : null;

  await deps.accountRepository.update(account.id, {
    passwordHash: newPasswordHash,
    passwordChangedAt: now.toISOString(),
    passwordExpiresAt,
    forcePasswordChange: false,
    updatedAt: now.toISOString(),
  });

  // 7. Password History 저장
  await deps.passwordHistoryRepository.insert({
    id: deps.idGenerator.generate(),
    accountId: account.id,
    tenantId: input.tenantId,
    passwordHash: newPasswordHash,
    changedAt: now.toISOString(),
  });

  // 8. Session 종료 (forceLogout 기본 true)
  let sessionsRevoked = 0;
  const shouldLogout = input.forceLogout !== false;
  if (shouldLogout) {
    sessionsRevoked = await deps.sessionRepository.deleteByAccountId(account.id);
  }

  // 9. Event
  const envelope: EventEnvelope<{ accountId: string; sessionsRevoked: number }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'password.changed',
    schemaRef: 'password.changed.v1',
    payload: { accountId: account.id, sessionsRevoked },
  });
  await deps.eventBus.emit(envelope);

  // 10. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'password_changed',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      method: 'change',
      changedAt: now.toISOString(),
      sessionsRevoked,
      forceLogout: shouldLogout,
    },
  });

  if (shouldLogout && sessionsRevoked > 0) {
    await recordAudit(deps.auditLogRepository, {
      accountId: account.id,
      tenantId: input.tenantId,
      eventType: 'session_revoked',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { reason: 'password_change', all: true, count: sessionsRevoked },
    });
  }

  return Ok({
    accountId: account.id,
    changedAt: now.toISOString(),
    passwordExpiresAt,
    sessionsRevoked,
  });
}
