/**
 * Organization Engine — Event Envelope Builders
 *
 * 사장님 확립 (2026-07-11, 헌법 §C-22 Event Standard):
 *   EventEnvelope는 11 필드 (eventId, aggregateId, occurredAt, version,
 *   tenantId, correlationId, causationId, engine, eventType, schemaRef, payload)
 *
 *   eventType/version/schemaRef 필수 (Sprint 2B-1 Event Standard)
 */

import {
  createEnvelope,
  type EventEnvelope,
} from '@platform/core-sdk';
import type { IIdGenerator } from '../interfaces/index.js';

export interface EnvelopeContext {
  aggregateId: string;
  tenantId: string;
  correlationId: string;
  causationId?: string;
}

export interface OrganizationEventInput<T> extends EnvelopeContext {
  eventType: string;
  schemaRef: string;
  payload: T;
}

export async function emitOrganizationEvent<T>(
  deps: { idGenerator: IIdGenerator; clock: { now(): Date } },
  ctx: {
    aggregateId: string;
    tenantId: string;
    correlationId: string;
    causationId?: string;
  },
  eventType: string,
  schemaRef: string,
  payload: T,
): Promise<EventEnvelope<T>> {
  const eventId = deps.idGenerator.generate();
  const occurredAt = deps.clock.now().toISOString();
  const envelope: EventEnvelope<T> = createEnvelope<T>({
    eventId,
    aggregateId: ctx.aggregateId,
    occurredAt,
    tenantId: ctx.tenantId,
    correlationId: ctx.correlationId,
    causationId: ctx.causationId ?? '',
    engine: 'organization',
    eventType,
    schemaRef,
    payload,
  });
  return envelope;
}

/** Re-export for convenience */
export { createEnvelope };
