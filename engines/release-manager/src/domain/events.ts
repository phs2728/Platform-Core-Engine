/** Release Manager — EventEnvelope builder */
import { createEnvelope, type EventEnvelope } from '@platform/core-sdk';
import type { IIdGenerator } from '../interfaces/index.js';

export interface ReleaseEventContext { aggregateId: string; tenantId: string; correlationId: string; causationId?: string; }

export async function emitReleaseEvent<T>(
  deps: { idGenerator: IIdGenerator; clock: { now(): Date } },
  ctx: ReleaseEventContext, eventType: string, schemaRef: string, payload: T,
): Promise<EventEnvelope<T>> {
  return createEnvelope<T>({
    eventId: deps.idGenerator.generate(), aggregateId: ctx.aggregateId,
    occurredAt: deps.clock.now().toISOString(), tenantId: ctx.tenantId,
    correlationId: ctx.correlationId, causationId: ctx.causationId ?? '',
    engine: 'release-manager', eventType, schemaRef, payload,
  });
}
