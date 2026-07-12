/** AI Engine — EventEnvelope builder */
import { createEnvelope, type EventEnvelope } from '@platform/core-sdk';
import type { IIdGenerator } from '../interfaces/index.js';

export interface AIEventContext { aggregateId: string; tenantId: string; correlationId: string; causationId?: string; }

export async function emitAIEvent<T>(
  deps: { idGenerator: IIdGenerator; clock: { now(): Date } },
  ctx: AIEventContext, eventType: string, schemaRef: string, payload: T,
): Promise<EventEnvelope<T>> {
  return createEnvelope<T>({
    eventId: deps.idGenerator.generate(), aggregateId: ctx.aggregateId,
    occurredAt: deps.clock.now().toISOString(), tenantId: ctx.tenantId,
    correlationId: ctx.correlationId, causationId: ctx.causationId ?? '',
    engine: 'ai', eventType, schemaRef, payload,
  });
}
