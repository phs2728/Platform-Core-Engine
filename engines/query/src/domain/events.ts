/**
 * Query Engine — EventEnvelope builder
 */
import { createEnvelope, type EventEnvelope } from '@platform/core-sdk';
import type { IIdGenerator } from '../interfaces/index.js';

export interface QueryEventContext {
  aggregateId: string;
  tenantId: string;
  correlationId: string;
  causationId?: string;
}

export async function emitQueryEvent<T>(
  deps: { idGenerator: IIdGenerator; clock: { now(): Date } },
  ctx: QueryEventContext,
  eventType: string,
  schemaRef: string,
  payload: T,
): Promise<EventEnvelope<T>> {
  const eventId = deps.idGenerator.generate();
  const occurredAt = deps.clock.now().toISOString();
  return createEnvelope<T>({
    eventId, aggregateId: ctx.aggregateId, occurredAt,
    tenantId: ctx.tenantId, correlationId: ctx.correlationId,
    causationId: ctx.causationId ?? '',
    engine: 'query', eventType, schemaRef, payload,
  });
}
