/**
 * Pricing Plan + Price + Component UseCases
 *   createPricingPlan/updatePricingPlan/archivePricingPlan/restorePricingPlan/deletePricingPlan
 *   getPricingPlan/listPricingPlans/searchPricingPlans
 *   createPrice/updatePrice/archivePrice/restorePrice
 *   addPriceComponent/removePriceComponent
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { createPricingPlanSchema, updatePricingPlanSchema,
  archivePricingPlanSchema, restorePricingPlanSchema, deletePricingPlanSchema,
  getPricingPlanSchema, searchPricingPlansSchema,
  createPriceSchema, updatePriceSchema,
  archivePriceSchema, restorePriceSchema,
  addPriceComponentSchema, removePriceComponentSchema,
} from '../domain/validation.js';
import type { PricingUseCaseDeps } from './types.js';
import type {
  PricingPlan, Price, PriceComponent, PricingStatus,
  PricingSearchCriteria, PricingSearchResult, Money,
} from '../interfaces/index.js';

// Helper imports (forward-declared via dynamic pattern to avoid circular)
// audit/events functions will be called via deps directly

// ════════════════════════════════════════════════════════════════════════════
// PLAN LIFECYCLE (8)
// ════════════════════════════════════════════════════════════════════════════

export interface CreatePlanInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  name: string; slug: string; type: string; baseCurrency: string;
  description?: string; initialStatus?: PricingStatus;
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>; metadata?: Record<string, unknown>;
  tags?: string[]; effectiveFrom?: string; effectiveUntil?: string;
}

export async function createPricingPlanUseCase(
  input: CreatePlanInput, deps: PricingUseCaseDeps,
): Promise<Result<{ planId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createPricingPlanSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid plan input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  if (await deps.planRepo.existsBySlug(d.tenantId, d.slug)) {
    return Err(new ConflictError('slug already exists'));
  }

  const allowedTypes = await deps.policyProvider.getAllowedPlanTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) {
    return Err(new ValidationError(`plan type "${d.type}" not allowed`));
  }

  const pr = await deps.policyProvider.validateAttributes(d.tenantId, d.type, d.attributes ?? {});
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected attributes'));

  const allowedCurrencies = await deps.policyProvider.getAllowedCurrencies(d.tenantId);
  if (!allowedCurrencies.includes(d.baseCurrency)) {
    return Err(new ValidationError(`currency "${d.baseCurrency}" not allowed`));
  }

  const planId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const initialStatus: PricingStatus = d.initialStatus ?? 'Active';

  const plan: PricingPlan = {
    id: planId, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, slug: d.slug, status: initialStatus, type: d.type,
    baseCurrency: d.baseCurrency,
    attributes: pr.value, customFields: d.customFields ?? {}, metadata: d.metadata ?? {},
    tags: d.tags ?? [], catalogRefs: [],
    createdAt: now, createdBy: d.actorId, updatedAt: now, updatedBy: d.actorId,
    archivedAt: null, deletedAt: null,
  };
  if (d.description !== undefined) plan.description = d.description;
  if (d.effectiveFrom !== undefined) plan.effectiveFrom = d.effectiveFrom;
  if (d.effectiveUntil !== undefined) plan.effectiveUntil = d.effectiveUntil;

  await deps.planRepo.insert(plan);

  const envelope: EventEnvelope<{ planId: string; type: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.plan.created', schemaRef: 'pricing.plan.created.v1',
    payload: { planId, type: d.type },
  };
  await deps.eventBus.emit(envelope);

  await deps.auditRepo.insert({
    organizationId: d.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId,
    eventType: 'plan_created', metadata: { name: d.name, type: d.type },
  });

  return Ok({ planId, createdAt: now });
}

export interface UpdatePlanInput {
  tenantId: string; correlationId: string; actorId: string; planId: string;
  name?: string; description?: string;
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>; metadata?: Record<string, unknown>;
  tags?: string[]; effectiveFrom?: string; effectiveUntil?: string;
}

export async function updatePricingPlanUseCase(
  input: UpdatePlanInput, deps: PricingUseCaseDeps,
): Promise<Result<PricingPlan, ValidationError | NotFoundError | ConflictError>> {
  const v = updatePricingPlanSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!existing) return Err(new NotFoundError('Plan not found'));
  if (existing.status === 'Archived' || existing.status === 'Deleted') {
    return Err(new ConflictError(`Cannot update — status "${existing.status}"`));
  }

  const now = deps.clock.now().toISOString();
  const updated: PricingPlan = { ...existing, updatedAt: now, updatedBy: d.actorId };
  if (d.name !== undefined) updated.name = d.name;
  if (d.description !== undefined) updated.description = d.description;
  if (d.customFields !== undefined) updated.customFields = d.customFields;
  if (d.metadata !== undefined) updated.metadata = d.metadata;
  if (d.tags !== undefined) updated.tags = d.tags;
  if (d.effectiveFrom !== undefined) updated.effectiveFrom = d.effectiveFrom;
  if (d.effectiveUntil !== undefined) updated.effectiveUntil = d.effectiveUntil;
  if (d.attributes !== undefined) {
    const pr = await deps.policyProvider.validateAttributes(d.tenantId, existing.type, d.attributes);
    if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));
    updated.attributes = pr.value;
  }

  await deps.planRepo.update(d.tenantId, d.planId, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.description !== undefined ? { description: d.description } : {}),
    ...(d.customFields !== undefined ? { customFields: d.customFields } : {}),
    ...(d.metadata !== undefined ? { metadata: d.metadata } : {}),
    ...(d.tags !== undefined ? { tags: d.tags } : {}),
    ...(d.effectiveFrom !== undefined ? { effectiveFrom: d.effectiveFrom } : {}),
    ...(d.effectiveUntil !== undefined ? { effectiveUntil: d.effectiveUntil } : {}),
    ...(d.attributes !== undefined ? { attributes: updated.attributes } : {}),
    updatedAt: now, updatedBy: d.actorId,
  });

  const envelope: EventEnvelope<{ planId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.plan.updated', schemaRef: 'pricing.plan.updated.v1',
    payload: { planId: d.planId },
  };
  await deps.eventBus.emit(envelope);

  await deps.auditRepo.insert({
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'plan_updated', metadata: {},
  });

  return Ok(updated);
}

export async function archivePricingPlanUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; planId: string; reason?: string },
  deps: PricingUseCaseDeps,
): Promise<Result<PricingPlan, ValidationError | NotFoundError | ConflictError>> {
  const v = archivePricingPlanSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!existing) return Err(new NotFoundError('Plan not found'));
  if (existing.status === 'Archived') return Err(new ConflictError('Already archived'));
  if (existing.status === 'Deleted') return Err(new ConflictError('Cannot archive deleted'));

  const now = deps.clock.now().toISOString();
  await deps.planRepo.update(d.tenantId, d.planId, { status: 'Archived', archivedAt: now, updatedAt: now, updatedBy: d.actorId });

  const env: EventEnvelope<{ planId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.plan.archived', schemaRef: 'pricing.plan.archived.v1',
    payload: { planId: d.planId },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'plan_archived', metadata: {},
  });

  return Ok({ ...existing, status: 'Archived', archivedAt: now, updatedAt: now });
}

export async function restorePricingPlanUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; planId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<PricingPlan, ValidationError | NotFoundError | ConflictError>> {
  const v = restorePricingPlanSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!existing) return Err(new NotFoundError('Plan not found'));
  if (existing.status !== 'Archived') return Err(new ConflictError(`Cannot restore from "${existing.status}"`));

  const now = deps.clock.now().toISOString();
  await deps.planRepo.update(d.tenantId, d.planId, { status: 'Active', archivedAt: null, updatedAt: now, updatedBy: d.actorId });

  const env: EventEnvelope<{ planId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.plan.restored', schemaRef: 'pricing.plan.restored.v1',
    payload: { planId: d.planId },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'plan_restored', metadata: {},
  });

  return Ok({ ...existing, status: 'Active', archivedAt: null, updatedAt: now });
}

export async function deletePricingPlanUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; planId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<{ planId: string; deletedAt: string }, ValidationError | NotFoundError | ConflictError>> {
  const v = deletePricingPlanSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!existing) return Err(new NotFoundError('Plan not found'));
  if (existing.status === 'Deleted') return Err(new ConflictError('Already deleted'));

  const now = deps.clock.now().toISOString();
  await deps.planRepo.update(d.tenantId, d.planId, { status: 'Deleted', deletedAt: now, updatedAt: now, updatedBy: d.actorId });

  const env: EventEnvelope<{ planId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.plan.deleted', schemaRef: 'pricing.plan.deleted.v1',
    payload: { planId: d.planId },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: existing.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'plan_deleted', metadata: {},
  });

  return Ok({ planId: d.planId, deletedAt: now });
}

export async function getPricingPlanUseCase(
  input: { tenantId: string; planId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<PricingPlan | null, ValidationError>> {
  const v = getPricingPlanSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  return Ok(await deps.planRepo.findById(v.data.tenantId, v.data.planId));
}

export async function searchPricingPlansUseCase(
  input: PricingSearchCriteria,
  deps: PricingUseCaseDeps,
): Promise<Result<PricingSearchResult, ValidationError>> {
  const v = searchPricingPlansSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search input', { details: { issues: v.error.errors } }));
  return Ok(await deps.planRepo.search(v.data as PricingSearchCriteria));
}

export async function listPricingPlansUseCase(
  input: { tenantId: string; organizationId: string; limit?: number; offset?: number },
  deps: PricingUseCaseDeps,
): Promise<Result<PricingSearchResult, ValidationError>> {
  return Ok(await deps.planRepo.search({
    tenantId: input.tenantId, organizationId: input.organizationId,
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// PRICE LIFECYCLE (4)
// ════════════════════════════════════════════════════════════════════════════

export interface CreatePriceInput {
  tenantId: string; correlationId: string; actorId: string;
  planId: string; name: string; amount: Money;
  description?: string; attributes?: Record<string, unknown>;
}

export async function createPriceUseCase(
  input: CreatePriceInput, deps: PricingUseCaseDeps,
): Promise<Result<Price, ValidationError | NotFoundError>> {
  const v = createPriceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid price input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const plan = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!plan) return Err(new NotFoundError('Plan not found'));

  const priceId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const price: Price = {
    id: priceId, tenantId: d.tenantId, organizationId: plan.organizationId,
    planId: d.planId, name: d.name, amount: d.amount, status: 'Active',
    attributes: d.attributes ?? {},
    createdAt: now, updatedAt: now, archivedAt: null,
  };
  if (d.description !== undefined) price.description = d.description;

  await deps.priceRepo.insert(price);

  const env: EventEnvelope<{ priceId: string; planId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.created', schemaRef: 'pricing.created.v1',
    payload: { priceId, planId: d.planId },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: plan.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'price_created', metadata: { priceId, name: d.name },
  });

  return Ok(price);
}

export async function updatePriceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; priceId: string;
    name?: string; amount?: Money; description?: string; attributes?: Record<string, unknown>; },
  deps: PricingUseCaseDeps,
): Promise<Result<Price, ValidationError | NotFoundError>> {
  const v = updatePriceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.priceRepo.findById(d.tenantId, d.priceId);
  if (!existing) return Err(new NotFoundError('Price not found'));

  const now = deps.clock.now().toISOString();
  const updated: Price = { ...existing, updatedAt: now };
  if (d.name !== undefined) updated.name = d.name;
  if (d.amount !== undefined) updated.amount = d.amount;
  if (d.description !== undefined) updated.description = d.description;
  if (d.attributes !== undefined) updated.attributes = d.attributes;

  await deps.priceRepo.update(d.tenantId, d.priceId, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.amount !== undefined ? { amount: d.amount } : {}),
    ...(d.description !== undefined ? { description: d.description } : {}),
    ...(d.attributes !== undefined ? { attributes: d.attributes } : {}),
    updatedAt: now,
  });

  const env: EventEnvelope<{ priceId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: existing.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.updated', schemaRef: 'pricing.updated.v1',
    payload: { priceId: d.priceId },
  };
  await deps.eventBus.emit(env);

  return Ok(updated);
}

export async function archivePriceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; priceId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<Price, ValidationError | NotFoundError | ConflictError>> {
  const v = archivePriceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.priceRepo.findById(d.tenantId, d.priceId);
  if (!existing) return Err(new NotFoundError('Price not found'));
  if (existing.status === 'Archived') return Err(new ConflictError('Already archived'));

  const now = deps.clock.now().toISOString();
  await deps.priceRepo.update(d.tenantId, d.priceId, { status: 'Archived', archivedAt: now, updatedAt: now });

  const env: EventEnvelope<{ priceId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: existing.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.archived', schemaRef: 'pricing.archived.v1',
    payload: { priceId: d.priceId },
  };
  await deps.eventBus.emit(env);

  return Ok({ ...existing, status: 'Archived', archivedAt: now });
}

export async function restorePriceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; priceId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<Price, ValidationError | NotFoundError | ConflictError>> {
  const v = restorePriceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.priceRepo.findById(d.tenantId, d.priceId);
  if (!existing) return Err(new NotFoundError('Price not found'));
  if (existing.status !== 'Archived') return Err(new ConflictError(`Cannot restore from "${existing.status}"`));

  const now = deps.clock.now().toISOString();
  await deps.priceRepo.update(d.tenantId, d.priceId, { status: 'Active', archivedAt: null, updatedAt: now });

  const env: EventEnvelope<{ priceId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: existing.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.restored', schemaRef: 'pricing.restored.v1',
    payload: { priceId: d.priceId },
  };
  await deps.eventBus.emit(env);

  return Ok({ ...existing, status: 'Active', archivedAt: null });
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT (2)
// ════════════════════════════════════════════════════════════════════════════

export async function addPriceComponentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    priceId: string; componentType: PriceComponent['componentType'];
    name: string; amount?: Money; percentage?: number;
    displayOrder?: number; attributes?: Record<string, unknown>; },
  deps: PricingUseCaseDeps,
): Promise<Result<PriceComponent, ValidationError | NotFoundError>> {
  const v = addPriceComponentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid component input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const price = await deps.priceRepo.findById(d.tenantId, d.priceId);
  if (!price) return Err(new NotFoundError('Price not found'));

  const compId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const comp: PriceComponent = {
    id: compId, tenantId: d.tenantId, priceId: d.priceId,
    componentType: d.componentType, name: d.name,
    displayOrder: d.displayOrder ?? 0, attributes: d.attributes ?? {},
    createdAt: now, updatedAt: now,
  };
  if (d.amount !== undefined) comp.amount = d.amount;
  if (d.percentage !== undefined) comp.percentage = d.percentage;

  await deps.componentRepo.insert(comp);

  const env: EventEnvelope<{ componentId: string; priceId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.priceId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.component.added', schemaRef: 'pricing.component.added.v1',
    payload: { componentId: compId, priceId: d.priceId },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: price.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: price.planId,
    eventType: 'component_added', metadata: { componentId: compId, componentType: d.componentType },
  });

  return Ok(comp);
}

export async function removePriceComponentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; componentId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<{ componentId: string }, ValidationError | NotFoundError>> {
  const v = removePriceComponentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const comp = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!comp) return Err(new NotFoundError('Component not found'));

  await deps.componentRepo.remove(d.tenantId, d.componentId);

  const now = deps.clock.now().toISOString();
  const env: EventEnvelope<{ componentId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.componentId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.component.removed', schemaRef: 'pricing.component.removed.v1',
    payload: { componentId: d.componentId },
  };
  await deps.eventBus.emit(env);

  return Ok({ componentId: d.componentId });
}
