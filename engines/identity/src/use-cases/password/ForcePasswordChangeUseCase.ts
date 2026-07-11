/**
 * Force Password Change UseCase (Epic 2 — Password)
 *
 * 사장님 확립 (Sprint 2C-3):
 * - 관리자가 특정 계정에 forcePasswordChange = true 설정
 * - 비밀번호 만료(passwordExpiresAt) 체크 — 만료 시 강제 변경 필요
 * - 두 가지 모드:
 *   1) enforce: 계정의 forcePasswordChange 플래그를 true로 설정 (admin action)
 *   2) check: 계정이 강제 변경 대상인지 확인 (로그인/세션 검증 시 사용)
 *
 * Result<T,E> 반환 · EventEnvelope 발행 · Audit 기록
 */

import {
  Ok,
  Err,
  type Result,
  NotFoundError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IAccountRepository,
  IEventBus,
  IAuditLogRepository,
} from '../../interfaces/index.js';

export interface ForcePasswordChangeInput {
  accountId: string;
  tenantId: string;
  correlationId: string;
  /** true = 강제 변경 설정, false = 해제 */
  force: boolean;
  /** 관리자 ID (Audit용) */
  adminId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ForcePasswordChangeOutput {
  accountId: string;
  forcePasswordChange: boolean;
  /** 비밀번호가 만료되었는지 (check 모드에서 사용) */
  passwordExpired: boolean;
}

export interface ForcePasswordChangeDeps {
  accountRepository: IAccountRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
}

/**
 * 관리자가 계정의 forcePasswordChange 플래그를 설정.
 */
export async function forcePasswordChangeUseCase(
  input: ForcePasswordChangeInput,
  deps: ForcePasswordChangeDeps,
): Promise<Result<ForcePasswordChangeOutput, NotFoundError>> {
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

  // 2. 플래그 설정
  const now = deps.clock.now();
  await deps.accountRepository.update(account.id, {
    forcePasswordChange: input.force,
    updatedAt: now.toISOString(),
  });

  // 3. 만료 체크
  const passwordExpired =
    account.passwordExpiresAt !== null && new Date(account.passwordExpiresAt) <= now;

  // 4. Event
  const envelope: EventEnvelope<{
    accountId: string;
    force: boolean;
    adminId: string | null;
  }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: account.id,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'password.force_change',
    schemaRef: 'password.force_change.v1',
    payload: {
      accountId: account.id,
      force: input.force,
      adminId: input.adminId ?? null,
    },
  });
  await deps.eventBus.emit(envelope);

  // 5. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: account.id,
    tenantId: input.tenantId,
    eventType: 'force_password_change',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      force: input.force,
      adminId: input.adminId ?? null,
      passwordExpired,
    },
  });

  return Ok({
    accountId: account.id,
    forcePasswordChange: input.force,
    passwordExpired,
  });
}

/**
 * Helper: 계정이 강제 비밀번호 변경 대상인지 체크.
 * 로그인/세션 검증 시 사용.
 *
 * - forcePasswordChange === true → 강제 변경 필요
 * - passwordExpiresAt <= now → 만료로 인한 강제 변경 필요
 */
export function isPasswordChangeRequired(
  account: {
    forcePasswordChange: boolean;
    passwordExpiresAt: string | null;
  },
  now: Date,
): boolean {
  if (account.forcePasswordChange) return true;
  if (account.passwordExpiresAt !== null && new Date(account.passwordExpiresAt) <= now) {
    return true;
  }
  return false;
}
