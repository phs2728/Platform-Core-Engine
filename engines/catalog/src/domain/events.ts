/**
 * Catalog Engine — EventEnvelope builder (Organization Engine 패턴 동일)
 */

import { createEnvelope, type EventEnvelope } from '@platform/core-sdk';
import type { IIdGenerator } from '../interfaces/index.js';

export interface CatalogEventContext {
  aggregateId: string;
  tenantId: string;
  correlationId: string;
  causationId?: string;
}

export async function emitCatalogEvent<T>(
  deps: { idGenerator: IIdGenerator; clock: { now(): Date } },
  ctx: CatalogEventContext,
  eventType: string,
  schemaRef: string,
  payload: T,
): Promise<EventEnvelope<T>> {
  const eventId = deps.idGenerator.generate();
  const occurredAt = deps.clock.now().toISOString();
  return createEnvelope<T>({
    eventId,
    aggregateId: ctx.aggregateId,
    occurredAt,
    tenantId: ctx.tenantId,
    correlationId: ctx.correlationId,
    causationId: ctx.causationId ?? '',
    engine: 'catalog',
    eventType,
    schemaRef,
    payload,
  });
}
