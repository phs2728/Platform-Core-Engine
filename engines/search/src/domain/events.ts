/** Search Engine — EventEnvelope builder */
import { createEnvelope, type EventEnvelope } from '@platform/core-sdk';
import type { IIdGenerator } from '../interfaces/index.js';

export interface SearchEventContext {
  aggregateId: string; tenantId: string; correlationId: string; causationId?: string;
}

export async function emitSearchEvent<T>(
  deps: { idGenerator: IIdGenerator; clock: { now(): Date } },
  ctx: SearchEventContext, eventType: string, schemaRef: string, payload: T,
): Promise<EventEnvelope<T>> {
  const eventId = deps.idGenerator.generate();
  return createEnvelope<T>({
    eventId, aggregateId: ctx.aggregateId, occurredAt: deps.clock.now().toISOString(),
    tenantId: ctx.tenantId, correlationId: ctx.correlationId, causationId: ctx.causationId ?? '',
    engine: 'search', eventType, schemaRef, payload,
  });
}
