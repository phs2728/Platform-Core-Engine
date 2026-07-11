import { Ok, type Result } from '@platform/core-sdk';
import type { ISessionRepository, IEventBus, IClock } from '../interfaces/index.js';
import { createEnvelope, type EventEnvelope } from '@platform/core-sdk';

export interface LogoutInput {
  sessionToken: string;
  accountId: string;
  tenantId: string;
  correlationId: string;
}

export interface LoggedOutPayload {
  accountId: string;
  sessionId: string;
  loggedOutAt: string;
}

export async function logoutUseCase(
  input: LogoutInput,
  deps: LogoutDeps,
): Promise<Result<void, never>> {
  const sessionResult = await deps.sessionRepository.findByToken(input.sessionToken);
  if (sessionResult.ok) {
    await deps.sessionRepository.delete(sessionResult.value.id);

    const envelope: EventEnvelope<LoggedOutPayload> = createEnvelope({
      eventId: crypto.randomUUID(),
      aggregateId: input.accountId,
      occurredAt: deps.clock.now().toISOString(),
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      causationId: '',
      engine: 'identity',
      eventType: 'auth.logout',
      schemaRef: 'auth.logout.v1',
      payload: {
        accountId: input.accountId,
        sessionId: sessionResult.value.id,
        loggedOutAt: deps.clock.now().toISOString(),
      },
    });
    await deps.eventBus.emit(envelope);
  }
  return Ok(undefined);
}

export interface LogoutDeps {
  sessionRepository: ISessionRepository;
  eventBus: IEventBus;
  clock: IClock;
}
