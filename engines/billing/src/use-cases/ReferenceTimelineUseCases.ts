/**
 * Billing Engine — References + Timeline UseCases (5)
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { attachReferenceSchema, appendTimelineSchema, getTimelineSchema } from '../domain/validation.js';
import type { BillingUseCaseDeps } from './types.js';
import type { BillingTimelineEntry } from '../interfaces/index.js';

function env(deps: BillingUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'billing', eventType, schemaRef, payload,
  };
}

async function audit(deps: BillingUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, invoiceId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (invoiceId !== undefined) rec.invoiceId = invoiceId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

async function appendTimelineHelper(deps: BillingUseCaseDeps, tenantId: string, invoiceId: string, actorId: string, eventType: string, description: string, meta?: Record<string, unknown>) {
  const entry: BillingTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId, invoiceId,
    eventType, actorId, description, metadata: meta ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
}

async function attachRefInternal(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string;
    refType: string; refId: string; metadata: Record<string, unknown>; },
  deps: BillingUseCaseDeps,
): Promise<Result<{ invoiceId: string; refType: string; refId: string }, ValidationError | NotFoundError>> {
  const v = attachReferenceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const inv = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!inv) return Err(new NotFoundError('Invoice not found'));

  const newRef = { refType: d.refType, refId: d.refId, metadata: d.metadata ?? {} };
  const refs = [...inv.references.filter((r) => !(r.refType === d.refType && r.refId === d.refId)), newRef];
  await deps.invoiceRepo.update(d.tenantId, d.invoiceId, { references: refs, updatedAt: deps.clock.now().toISOString() });
  await appendTimelineHelper(deps, d.tenantId, d.invoiceId, d.actorId, 'reference_attached', `Reference attached: ${d.refType}:${d.refId}`);
  await deps.eventBus.emit(env(deps, d.invoiceId, d.tenantId, d.correlationId, 'billing.updated', 'billing.reference.attached.v1', { refType: d.refType, refId: d.refId }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'reference_attached', { refType: d.refType, refId: d.refId }, d.invoiceId);
  return Ok({ invoiceId: d.invoiceId, refType: d.refType, refId: d.refId });
}

export async function attachOrderRefUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string; orderId: string; metadata?: Record<string, unknown>; },
  deps: BillingUseCaseDeps,
) { return attachRefInternal({ tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId, invoiceId: input.invoiceId, refType: 'order', refId: input.orderId, metadata: input.metadata ?? {} }, deps); }

export async function attachPricingRefUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string; pricingId: string; metadata?: Record<string, unknown>; },
  deps: BillingUseCaseDeps,
) { return attachRefInternal({ tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId, invoiceId: input.invoiceId, refType: 'pricing', refId: input.pricingId, metadata: input.metadata ?? {} }, deps); }

export async function attachOrganizationRefUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string; organizationId: string; metadata?: Record<string, unknown>; },
  deps: BillingUseCaseDeps,
) { return attachRefInternal({ tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId, invoiceId: input.invoiceId, refType: 'organization', refId: input.organizationId, metadata: input.metadata ?? {} }, deps); }

export async function appendTimelineUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; invoiceId: string;
    eventType: string; description: string; metadata?: Record<string, unknown>; },
  deps: BillingUseCaseDeps,
): Promise<Result<BillingTimelineEntry, ValidationError | NotFoundError>> {
  const v = appendTimelineSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const inv = await deps.invoiceRepo.findById(d.tenantId, d.invoiceId);
  if (!inv) return Err(new NotFoundError('Invoice not found'));
  const entry: BillingTimelineEntry = {
    id: deps.idGenerator.generate(), tenantId: d.tenantId, invoiceId: d.invoiceId,
    eventType: d.eventType, actorId: d.actorId, description: d.description, metadata: d.metadata ?? {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.timelineRepo.insert(entry);
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'timeline_appended', { eventType: d.eventType }, d.invoiceId);
  return Ok(entry);
}

export async function getTimelineUseCase(
  input: { tenantId: string; invoiceId: string; limit?: number },
  deps: BillingUseCaseDeps,
): Promise<Result<BillingTimelineEntry[], ValidationError>> {
  return Ok(await deps.timelineRepo.findByInvoice(input.tenantId, input.invoiceId, input.limit));
}
