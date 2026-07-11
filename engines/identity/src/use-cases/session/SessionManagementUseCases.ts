/**
 * Session Management UseCases (Epic 5)
 * - Logout All (모든 Session 종료)
 * - Revoke Session (admin/user가 특정 Session 종료)
 * - Refresh Session (Rotation)
 */

import { Ok, Err, type Result, NotFoundError, type EventEnvelope, createEnvelope } from '@platform/core-sdk';
import { recordAudit } from '../../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  ISessionRepository,
  ISessionSigner,
  IAccountRepository,
  IEventBus,
  IAuditLogRepository,
  SessionRecord,
  SessionPayload,
} from '../../interfaces/index.js';

// ══════════════════════════════════════════════
// Logout All
// ══════════════════════════════════════════════

export interface LogoutAllInput {
  accountId: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogoutAllDeps {
  sessionRepository: ISessionRepository;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
  auditLogRepository: IAuditLogRepository;
}

export async function logoutAllUseCase(
  input: LogoutAllInput,
  deps: LogoutAllDeps,
): Promise<Result<{ revokedCount: number }, Error>> {
  const count = await deps.sessionRepository.deleteByAccountId(input.accountId);
  const now = deps.clock.now().toISOString();

  const envelope: EventEnvelope<{ count: number }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.accountId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'session.logout_all',
    schemaRef: 'session.logout_all.v1',
    payload: { count },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType: 'logout_all',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { revokedCount: count },
  });

  return Ok({ revokedCount: count });
}

// ══════════════════════════════════════════════
// Revoke Session (Admin or Self)
// ══════════════════════════════════════════════

export interface RevokeSessionInput {
  sessionId: string;
  accountId: string;
  tenantId: string;
  correlationId: string;
  isAdmin: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface RevokeSessionDeps {
  sessionRepository: ISessionRepository;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
  auditLogRepository: IAuditLogRepository;
}

export async function revokeSessionUseCase(
  input: RevokeSessionInput,
  deps: RevokeSessionDeps,
): Promise<Result<void, NotFoundError>> {
  const sessionResult = await deps.sessionRepository.findById(input.sessionId);
  if (!sessionResult.ok) {
    return Err(new NotFoundError('Session not found', { details: { sessionId: input.sessionId } }));
  }
  const session = sessionResult.value;

  // 권한 체크: 본인 세션 또는 admin
  if (!input.isAdmin && session.accountId !== input.accountId) {
    return Err(new NotFoundError('Session not found', { details: { sessionId: input.sessionId } }));
  }

  await deps.sessionRepository.delete(input.sessionId);
  const now = deps.clock.now().toISOString();

  const envelope: EventEnvelope<{ sessionId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: session.accountId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'session.revoked',
    schemaRef: 'session.revoked.v1',
    payload: { sessionId: input.sessionId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: session.accountId,
    tenantId: input.tenantId,
    eventType: 'session_revoked',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { sessionId: input.sessionId, by: input.isAdmin ? 'admin' : 'self' },
  });

  return Ok(undefined);
}

// ══════════════════════════════════════════════
// Refresh Session (Rotation — Epic 5)
// ══════════════════════════════════════════════

export interface RefreshSessionInput {
  sessionToken: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefreshSessionOutput {
  newSessionToken: string;
  newSessionId: string;
  expiresAt: string;
}

export interface RefreshSessionDeps {
  sessionRepository: ISessionRepository;
  sessionSigner: ISessionSigner;
  accountRepository: IAccountRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
  policy: {
    sessionDurationHours: number;
    minRemainingMinutesForRotation: number;
  };
}

export async function refreshSessionUseCase(
  input: RefreshSessionInput,
  deps: RefreshSessionDeps,
): Promise<Result<RefreshSessionOutput, NotFoundError>> {
  const sessionResult = await deps.sessionRepository.findByToken(input.sessionToken);
  if (!sessionResult.ok) {
    return Err(new NotFoundError('Session not found', { details: {} }));
  }
  const oldSession = sessionResult.value;
  const now = deps.clock.now();

  // 만료 체크
  if (new Date(oldSession.expiresAt) <= now) {
    return Err(new NotFoundError('Session expired', { details: {} }));
  }

  // 새 Session 생성 (Rotation)
  const newSessionId = deps.idGenerator.generate();
  const newExpiresAt = new Date(now.getTime() + deps.policy.sessionDurationHours * 3_600_000);

  const payload: SessionPayload = {
    accountId: oldSession.accountId,
    sessionId: newSessionId,
    tenantId: oldSession.tenantId,
    issuedAt: now.toISOString(),
    expiresAt: newExpiresAt.toISOString(),
  };
  const newToken = await deps.sessionSigner.sign(payload);

  const newRecord: SessionRecord = {
    id: newSessionId,
    accountId: oldSession.accountId,
    tenantId: oldSession.tenantId,
    token: newToken,
    refreshToken: null,
    type: oldSession.type,
    deviceFingerprint: oldSession.deviceFingerprint,
    deviceName: oldSession.deviceName,
    ipAddress: input.ipAddress ?? oldSession.ipAddress,
    userAgent: input.userAgent ?? oldSession.userAgent,
    issuedAt: now.toISOString(),
    expiresAt: newExpiresAt.toISOString(),
    lastUsedAt: now.toISOString(),
  };

  // 기존 Session 삭제 + 새 Session 추가
  await deps.sessionRepository.delete(oldSession.id);
  await deps.sessionRepository.insert(newRecord);

  const envelope: EventEnvelope<{ oldId: string; newId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: oldSession.accountId,
    occurredAt: now.toISOString(),
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'session.refreshed',
    schemaRef: 'session.refreshed.v1',
    payload: { oldId: oldSession.id, newId: newSessionId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: oldSession.accountId,
    tenantId: input.tenantId,
    eventType: 'session_refreshed',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { oldSessionId: oldSession.id, newSessionId },
  });

  return Ok({
    newSessionToken: newToken,
    newSessionId,
    expiresAt: newExpiresAt.toISOString(),
  });
}
