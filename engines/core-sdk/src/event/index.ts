/**
 * event/ — EventEnvelope + 버전 관리
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "Event는 Envelope만 정의하지 말고 버전 관리 규칙도 포함하세요.
 *  eventType, version, schemaRef 필수"
 */

import type { EngineName } from '../types.js';

/**
 * EventEnvelope (사장님 지정 8개 필드)
 */
export interface EventEnvelope<TPayload = unknown> {
  /** Unique Event ID (UUID v7) */
  readonly eventId: string;
  /** Aggregate ID */
  readonly aggregateId: string;
  /** 발생 시각 (ISO 8601) */
  readonly occurredAt: string;
  /** Schema Version (SemVer) */
  readonly version: string;
  /** Tenant ID (Multi-tenancy) */
  readonly tenantId: string;
  /** Correlation ID (분산 추적) */
  readonly correlationId: string;
  /** Causation ID (인과 관계) */
  readonly causationId: string;
  /** Engine 식별자 */
  readonly engine: EngineName;
  /** Event Type (e.g., 'auth.login.success') */
  readonly eventType: string;
  /** Schema Reference (zod schema name) */
  readonly schemaRef: string;
  /** Payload */
  readonly payload: TPayload;
}

/**
 * Event Type 정의 (사장님 확립: eventType/version/schemaRef 필수)
 */
export interface EventTypeDefinition<TPayload = unknown> {
  /** Event Type ID (e.g., 'auth.login.success') */
  readonly eventType: string;
  /** Schema Version (SemVer) */
  readonly version: string;
  /** zod schema reference */
  readonly schemaRef: string;
  /** Event 발신 Engine */
  readonly engine: EngineName;
  /** Payload Type (TypeScript 용) */
  readonly payloadType: TPayload;
  /** Description (optional) */
  readonly description?: string;
}

/**
 * Event Emitter
 */
export interface IEventEmitter {
  emit<T>(envelope: EventEnvelope<T>): Promise<void>;
}

export type Unsubscribe = () => void;

export interface IEventSubscriber {
  on<T>(
    eventType: string,
    handler: (envelope: EventEnvelope<T>) => Promise<void>,
  ): Unsubscribe;
}

/**
 * Event Factory Helper
 */
export interface CreateEventInput<T> {
  eventId: string;
  aggregateId: string;
  occurredAt: string;
  tenantId: string;
  correlationId: string;
  causationId: string;
  engine: EngineName;
  eventType: string;
  schemaRef: string;
  payload: T;
}

export function createEnvelope<T>(input: CreateEventInput<T>): EventEnvelope<T> {
  return {
    eventId: input.eventId,
    aggregateId: input.aggregateId,
    occurredAt: input.occurredAt,
    version: '1.0.0', // 사장님 확립: SemVer
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    engine: input.engine,
    eventType: input.eventType,
    schemaRef: input.schemaRef,
    payload: input.payload,
  };
}
