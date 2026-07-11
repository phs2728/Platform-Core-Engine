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
  ISessionRepository,
  IEventBus,
  IAuditLogRepository,
} from '../interfaces/index.js';

export interface LogoutInput {
  sessionToken: string;
  accountId: string;
  tenantId: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogoutDeps {
  sessionRepository: ISessionRepository;
  eventBus: IEventBus;
  clock: IClock;
  idGenerator: { generate(): string };
  auditLogRepository: import('../infrastructure/InMemoryAuditLogRepository.js').IAuditLogRepository;
}

export interface LoggedOutPayload {
  accountId: string;
  sessionId: string;
  loggedOutAt: string;
}

export async function logoutUseCase(
  input: LogoutInput,
  deps: LogoutDeps,
): Promise<Result<void, NotFoundError>> {
  const sessionResult = await deps.sessionRepository.findByToken(input.sessionToken);
  if (!sessionResult.ok) return Err(sessionResult.error);

  await deps.sessionRepository.delete(sessionResult.value.id);

  const loggedOutAt = deps.clock.now().toISOString();

  const envelope: EventEnvelope<LoggedOutPayload> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.accountId,
    occurredAt: loggedOutAt,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'identity',
    eventType: 'auth.logout',
    schemaRef: 'auth.logout.v1',
    payload: {
      accountId: input.accountId,
      sessionId: sessionResult.value.id,
      loggedOutAt,
    },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType: 'session_revoked',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { sessionId: sessionResult.value.id, method: 'logout' },
  });

  return Ok(undefined);
}
