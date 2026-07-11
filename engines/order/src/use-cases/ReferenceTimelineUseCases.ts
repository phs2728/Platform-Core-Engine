/**
 * Order Engine — References + Timeline UseCases (6)
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  attachReferenceSchema, appendTimelineSchema, getTimelineSchema,
} from '../domain/validation.js';
import type { OrderUseCaseDeps } from './types.js';
import type { Order, OrderTimelineEntry, TimelineEventType } from '../interfaces/index.js';

function env(deps: OrderUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'order', eventType, schemaRef, payload,
  };
}

async function audit(deps: OrderUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, orderId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (orderId !== undefined) rec.orderId = orderId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

async function appendTimelineHelper(deps: OrderUseCaseDeps, tenantId: string, orderId: string, actorId: string, eventType: TimelineEventType, description: string, meta?: Record<string, unknown>) {
  const entry: OrderTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId, orderId,
    eventType, actorId, description, metadata: meta ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
}

// ════════════════════════════════════════════════════════════════════════════
// REFERENCES (4 — generic attach + typed wrappers)
// ════════════════════════════════════════════════════════════════════════════

async function attachRefInternal(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string;
    refType: string; refId: string; metadata: Record<string, unknown>; },
  deps: OrderUseCaseDeps,
): Promise<Result<{ orderId: string; refType: string; refId: string }, ValidationError | NotFoundError>> {
  const v = attachReferenceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const order = await deps.orderRepo.findById(d.tenantId, d.orderId);
  if (!order) return Err(new NotFoundError('Order not found'));

  const newRef = { refType: d.refType, refId: d.refId, metadata: d.metadata ?? {} };
  const refs = [...order.references.filter((r) => !(r.refType === d.refType && r.refId === d.refId)), newRef];
  await deps.orderRepo.update(d.tenantId, d.orderId, { references: refs, updatedAt: deps.clock.now().toISOString() });
  await appendTimelineHelper(deps, d.tenantId, d.orderId, d.actorId, 'reference_attached', `Reference attached: ${d.refType}:${d.refId}`);
  await deps.eventBus.emit(env(deps, d.orderId, d.tenantId, d.correlationId, 'order.updated', 'order.reference.attached.v1', { refType: d.refType, refId: d.refId }));
  await audit(deps, order.organizationId, d.tenantId, d.actorId, d.correlationId, 'reference_attached', { refType: d.refType, refId: d.refId }, d.orderId);
  return Ok({ orderId: d.orderId, refType: d.refType, refId: d.refId });
}

export async function attachBookingRefUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string; bookingId: string; metadata?: Record<string, unknown>; },
  deps: OrderUseCaseDeps,
) { return attachRefInternal({ tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId, orderId: input.orderId, refType: 'booking', refId: input.bookingId, metadata: input.metadata ?? {} }, deps); }

export async function attachInventoryRefUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string; inventoryId: string; metadata?: Record<string, unknown>; },
  deps: OrderUseCaseDeps,
) { return attachRefInternal({ tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId, orderId: input.orderId, refType: 'inventory', refId: input.inventoryId, metadata: input.metadata ?? {} }, deps); }

export async function attachCatalogRefUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string; catalogId: string; metadata?: Record<string, unknown>; },
  deps: OrderUseCaseDeps,
) { return attachRefInternal({ tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId, orderId: input.orderId, refType: 'catalog', refId: input.catalogId, metadata: input.metadata ?? {} }, deps); }

export async function attachPricingRefUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string; pricingId: string; metadata?: Record<string, unknown>; },
  deps: OrderUseCaseDeps,
) { return attachRefInternal({ tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId, orderId: input.orderId, refType: 'pricing', refId: input.pricingId, metadata: input.metadata ?? {} }, deps); }

// ════════════════════════════════════════════════════════════════════════════
// TIMELINE (2)
// ════════════════════════════════════════════════════════════════════════════

export async function appendTimelineUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; orderId: string;
    eventType: string; description: string; metadata?: Record<string, unknown>; },
  deps: OrderUseCaseDeps,
): Promise<Result<OrderTimelineEntry, ValidationError | NotFoundError>> {
  const v = appendTimelineSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const order = await deps.orderRepo.findById(d.tenantId, d.orderId);
  if (!order) return Err(new NotFoundError('Order not found'));

  const entry: OrderTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId: d.tenantId, orderId: d.orderId,
    eventType: d.eventType as TimelineEventType, actorId: d.actorId,
    description: d.description, metadata: d.metadata ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
  await audit(deps, order.organizationId, d.tenantId, d.actorId, d.correlationId, 'timeline_appended', { eventType: d.eventType }, d.orderId);
  return Ok(entry);
}

export async function getTimelineUseCase(
  input: { tenantId: string; orderId: string; limit?: number },
  deps: OrderUseCaseDeps,
): Promise<Result<OrderTimelineEntry[], ValidationError>> {
  return Ok(await deps.timelineRepo.findByOrder(input.tenantId, input.orderId, input.limit));
}
