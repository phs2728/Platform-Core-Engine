import {
  Ok,
  Err,
  type Result,
  NotFoundError,
  type EventEnvelope,
  createEnvelope,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  ISessionSigner,
  ISessionRepository,
  IAccountRepository,
  IEventBus,
  IAuditLogRepository,
  SessionRecord,
} from '../interfaces/index.js';

/**
 * Session Refresh UseCase (Sprint 2C-2-4)
 *
 * 사장님 확립: 로그인 후 일정 시점마다 Session ID를 재발급.
 *
 * 흐름:
 * 1) 기존 Session 검증 (token)
 * 2) 기존 Session이 expiresAt까지 일정 시간 남았으면 Rotation 가능
 * 3) 새 Session ID 생성 + 새 Token 발급
 * 4) 기존 Session 삭제 (Rotation)
 */

export interface SessionRefreshInput {
  sessionToken: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionRefreshOutput {
  newSessionToken: string;
  expiresAt: string;
}

export interface SessionRefreshDeps {
  sessionRepository: ISessionRepository & {
    rotate?(oldId: string, newRecord: SessionRecord): Promise<void>;
    findByAccountId(accountId: string): Promise<SessionRecord[]>;
  };
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
  input: SessionRefreshInput,
  deps: SessionRefreshDeps,
): Promise<Result<SessionRefreshOutput, NotFoundError>> {
  // 1. 기존 Session 조회
  const sessionResult = await deps.sessionRepository.findByToken(input.sessionToken);
  if (!sessionResult.ok) return sessionResult;
  const oldSession = sessionResult.value;

  // 2. 만료 시간 확인
  const now = deps.clock.now();
  const expiresAtTime = new Date(oldSession.expiresAt);
  const remainingMinutes = (expiresAtTime.getTime() - now.getTime()) / 60000;

  // 만료되었거나 너무 일찍 Rotation 시도 → 거부
  if (remainingMinutes <= 0) {
    return Err(new NotFoundError('Session expired', {
      details: { resource: 'session' },
    }));
  }

  // Rotation 가능 (충분한 시간 남음)
  if (remainingMinutes < deps.policy.minRemainingMinutesForRotation) {
    // Rotation 불필요. 기존 Token 그대로 반환.
    return Ok({
      newSessionToken: oldSession.token,
      expiresAt: oldSession.expiresAt,
    });
  }

  // 3. 새 Session 생성 (새 ID + 새 Token)
  const newSessionId = deps.idGenerator.generate();
  const newExpiresAt = new Date(now.getTime() + deps.policy.sessionDurationHours * 3600 * 1000);
  const newSessionToken = await deps.sessionSigner.sign({
    accountId: oldSession.accountId,
    sessionId: newSessionId,
    tenantId: oldSession.tenantId,
    issuedAt: now.toISOString(),
    expiresAt: newExpiresAt.toISOString(),
  });

  const newSessionRecord: SessionRecord = {
    id: newSessionId,
    accountId: oldSession.accountId,
    tenantId: oldSession.tenantId,
    token: newSessionToken,
    issuedAt: now.toISOString(),
    expiresAt: newExpiresAt.toISOString(),
  };

  // 4. Rotation (기존 Session 삭제 + 새 Session 추가)
  if (deps.sessionRepository.rotate) {
    await deps.sessionRepository.rotate(oldSession.id, newSessionRecord);
  } else {
    await deps.sessionRepository.delete(oldSession.id);
    await deps.sessionRepository.insert(newSessionRecord);
  }

  // 5. Event
  const envelope: EventEnvelope<{ accountId: string; sessionId: string; refreshedAt: string }> =
    createEnvelope({
      eventId: deps.idGenerator.generate(),
      aggregateId: oldSession.accountId,
      occurredAt: now.toISOString(),
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      causationId: '',
      engine: 'identity',
      eventType: 'session.refreshed',
      schemaRef: 'session.refreshed.v1',
      payload: {
        accountId: oldSession.accountId,
        sessionId: newSessionId,
        refreshedAt: now.toISOString(),
      },
    });
  await deps.eventBus.emit(envelope);

  // 6. Audit
  await recordAudit(deps.auditLogRepository, {
    accountId: oldSession.accountId,
    tenantId: input.tenantId,
    eventType: 'session_refreshed',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: {
      oldSessionId: oldSession.id,
      newSessionId,
      refreshedAt: now.toISOString(),
    },
  });

  return Ok({
    newSessionToken,
    expiresAt: newExpiresAt.toISOString(),
  });
}
