/**
 * Platform Validation Engine — EventEnvelope builder
 */

import { createEnvelope, type EventEnvelope } from '@platform/core-sdk';
import type { IIdGenerator } from '../interfaces/index.js';

export interface ValidationEventContext {
  aggregateId: string;
  tenantId: string;
  correlationId: string;
  causationId?: string;
}

export async function emitValidationEvent<T>(
  deps: { idGenerator: IIdGenerator; clock: { now(): Date } },
  ctx: ValidationEventContext,
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
    engine: 'platform-validation',
    eventType,
    schemaRef,
    payload,
  });
}
