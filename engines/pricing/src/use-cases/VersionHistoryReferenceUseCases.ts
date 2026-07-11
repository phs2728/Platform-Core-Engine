/**
 * Version + History + Reference UseCases (5)
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  publishPriceVersionSchema, rollbackPriceVersionSchema,
  getPriceHistorySchema,
  attachCatalogSchema, detachCatalogSchema,
} from '../domain/validation.js';
import type { PricingUseCaseDeps } from './types.js';
import type { PriceVersion, PriceHistory } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// VERSION (2)
// ════════════════════════════════════════════════════════════════════════════

export async function publishPriceVersionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; planId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<PriceVersion, ValidationError | NotFoundError>> {
  const v = publishPriceVersionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const plan = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!plan) return Err(new NotFoundError('Plan not found'));

  const versions = await deps.versionRepo.findAll(d.tenantId, d.planId);
  const versionNumber = versions.length + 1;
  const versionId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  // Build snapshot from current plan state
  const snapshot: Record<string, unknown> = {
    name: plan.name, type: plan.type, baseCurrency: plan.baseCurrency,
    attributes: plan.attributes, customFields: plan.customFields,
    tags: plan.tags, effectiveFrom: plan.effectiveFrom ?? null, effectiveUntil: plan.effectiveUntil ?? null,
  };

  const version: PriceVersion = {
    id: versionId, tenantId: d.tenantId, planId: d.planId,
    versionNumber, snapshot, status: 'Published',
    publishedAt: now, publishedBy: d.actorId,
  };
  await deps.versionRepo.insert(version);

  const env: EventEnvelope<{ planId: string; versionNumber: number }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.version.published', schemaRef: 'pricing.version.published.v1',
    payload: { planId: d.planId, versionNumber },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: plan.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'version_published', metadata: { versionNumber },
  });

  // Also record in history
  await deps.historyRepo.insert({
    tenantId: d.tenantId, planId: d.planId,
    eventType: 'version_published', actorId: d.actorId,
    metadata: { versionNumber },
  });

  return Ok(version);
}

export async function rollbackPriceVersionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; planId: string; versionNumber: number },
  deps: PricingUseCaseDeps,
): Promise<Result<PriceVersion, ValidationError | NotFoundError>> {
  const v = rollbackPriceVersionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const targetVersion = await deps.versionRepo.findByNumber(d.tenantId, d.planId, d.versionNumber);
  if (!targetVersion) return Err(new NotFoundError(`Version ${d.versionNumber} not found`));

  const plan = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!plan) return Err(new NotFoundError('Plan not found'));

  // Restore plan from snapshot
  const snap = targetVersion.snapshot as Record<string, unknown>;
  const now = deps.clock.now().toISOString();
  await deps.planRepo.update(d.tenantId, d.planId, {
    name: snap['name'] as string,
    attributes: snap['attributes'] as Record<string, unknown>,
    customFields: snap['customFields'] as Record<string, unknown>,
    tags: snap['tags'] as string[],
    updatedAt: now, updatedBy: d.actorId,
  });

  // Mark version as rolled back
  await deps.versionRepo.update(d.tenantId, targetVersion.id, {
    status: 'RolledBack',
    rolledBackAt: now,
  });

  const env: EventEnvelope<{ planId: string; versionNumber: number }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.version.rollback', schemaRef: 'pricing.version.rollback.v1',
    payload: { planId: d.planId, versionNumber: d.versionNumber },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: plan.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'version_rollback', metadata: { versionNumber: d.versionNumber },
  });

  await deps.historyRepo.insert({
    tenantId: d.tenantId, planId: d.planId,
    eventType: 'version_rollback', actorId: d.actorId,
    metadata: { versionNumber: d.versionNumber },
  });

  return Ok({ ...targetVersion, status: 'RolledBack', rolledBackAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORY (1)
// ════════════════════════════════════════════════════════════════════════════

export async function getPriceHistoryUseCase(
  input: { tenantId: string; planId: string; limit?: number },
  deps: PricingUseCaseDeps,
): Promise<Result<PriceHistory[], ValidationError>> {
  const v = getPriceHistorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  return Ok(await deps.historyRepo.findByPlan(v.data.tenantId, v.data.planId, v.data.limit));
}

// ════════════════════════════════════════════════════════════════════════════
// REFERENCE (2)
// ════════════════════════════════════════════════════════════════════════════

export async function attachCatalogUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; planId: string; catalogId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<{ planId: string; catalogId: string }, ValidationError | NotFoundError>> {
  const v = attachCatalogSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const plan = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!plan) return Err(new NotFoundError('Plan not found'));

  // Verify catalog exists
  const catalogOk = await deps.catalogVerifier.verify(d.tenantId, d.catalogId);
  if (!catalogOk) return Err(new ValidationError('Catalog not found'));

  if (plan.catalogRefs.includes(d.catalogId)) {
    return Ok({ planId: d.planId, catalogId: d.catalogId }); // idempotent
  }

  const updatedRefs = [...plan.catalogRefs, d.catalogId];
  const now = deps.clock.now().toISOString();
  await deps.planRepo.update(d.tenantId, d.planId, { catalogRefs: updatedRefs, updatedAt: now, updatedBy: d.actorId });

  const env: EventEnvelope<{ planId: string; catalogId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.catalog.attached', schemaRef: 'pricing.catalog.attached.v1',
    payload: { planId: d.planId, catalogId: d.catalogId },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: plan.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'catalog_attached', metadata: { catalogId: d.catalogId },
  });

  return Ok({ planId: d.planId, catalogId: d.catalogId });
}

export async function detachCatalogUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; planId: string; catalogId: string },
  deps: PricingUseCaseDeps,
): Promise<Result<{ planId: string; catalogId: string }, ValidationError | NotFoundError>> {
  const v = detachCatalogSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const plan = await deps.planRepo.findById(d.tenantId, d.planId);
  if (!plan) return Err(new NotFoundError('Plan not found'));

  const updatedRefs = plan.catalogRefs.filter((id) => id !== d.catalogId);
  const now = deps.clock.now().toISOString();
  await deps.planRepo.update(d.tenantId, d.planId, { catalogRefs: updatedRefs, updatedAt: now, updatedBy: d.actorId });

  const env: EventEnvelope<{ planId: string; catalogId: string }> = {
    eventId: deps.idGenerator.generate(), aggregateId: d.planId, occurredAt: now,
    version: '1.0.0', tenantId: d.tenantId, correlationId: d.correlationId, causationId: '',
    engine: 'pricing', eventType: 'pricing.catalog.detached', schemaRef: 'pricing.catalog.detached.v1',
    payload: { planId: d.planId, catalogId: d.catalogId },
  };
  await deps.eventBus.emit(env);

  await deps.auditRepo.insert({
    organizationId: plan.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId, planId: d.planId,
    eventType: 'catalog_detached', metadata: { catalogId: d.catalogId },
  });

  return Ok({ planId: d.planId, catalogId: d.catalogId });
}
