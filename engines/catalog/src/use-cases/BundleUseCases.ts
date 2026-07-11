/**
 * Bundle UseCases (3개)
 *   createBundle / updateBundle / deleteBundle
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordCatalogAudit } from '../domain/audit.js';
import {
  createBundleSchema, updateBundleSchema, deleteBundleSchema,
} from '../domain/validation.js';
import { emitCatalogEvent } from '../domain/events.js';
import type { CatalogUseCaseDeps } from './types.js';
import type { Bundle, BundleComponent } from '../interfaces/index.js';

export interface CreateBundleInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string;
  name: string; slug: string;
  description?: string;
  components: BundleComponent[];
  attributes?: Record<string, unknown>;
}

export async function createBundleUseCase(
  input: CreateBundleInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Bundle, ValidationError | NotFoundError | ConflictError>> {
  const v = createBundleSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid bundle input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  if (!catalog) return Err(new NotFoundError('Catalog not found'));

  // Components 검증 — Item/Variant 존재 확인
  for (const comp of d.components) {
    if (comp.refType === 'item') {
      const item = await deps.itemRepo.findById(d.tenantId, comp.refId);
      if (!item || item.catalogId !== d.catalogId) return Err(new NotFoundError(`Component item ${comp.refId} not found`));
    } else if (comp.refType === 'variant') {
      const variant = await deps.variantRepo.findById(d.tenantId, comp.refId);
      if (!variant || variant.catalogId !== d.catalogId) return Err(new NotFoundError(`Component variant ${comp.refId} not found`));
    }
  }

  if (await deps.bundleRepo.existsBySlug(d.tenantId, d.catalogId, d.slug)) {
    return Err(new ConflictError('slug already exists in this catalog'));
  }

  const maxBundles = await deps.policyProvider.getMaxBundlesPerCatalog(d.tenantId);
  const existing = await deps.bundleRepo.findByCatalog(d.tenantId, d.catalogId);
  if (existing.length >= maxBundles) {
    return Err(new ConflictError(`Max bundles limit (${maxBundles}) reached`));
  }

  const bundleId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const bundle: Bundle = {
    id: bundleId,
    tenantId: d.tenantId,
    catalogId: d.catalogId,
    name: d.name,
    slug: d.slug,
    components: d.components,
    attributes: d.attributes ?? {},
    mediaRefs: [],
    pricingRefs: [],
    status: 'Active',
    createdAt: now, createdBy: d.actorId,
    updatedAt: now,
  };
  if (d.description !== undefined) bundle.description = d.description;

  await deps.bundleRepo.insert(bundle);

  const envelope: EventEnvelope<{ bundleId: string; componentCount: number }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'bundle.created', 'bundle.created.v1',
      { bundleId, componentCount: d.components.length });
  await deps.eventBus.emit(envelope);

  await recordCatalogAudit(deps.auditRepo, {
    organizationId: catalog.organizationId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, bundleId, eventType: 'bundle_created',
    metadata: { name: d.name, slug: d.slug, componentCount: d.components.length },
  });

  return Ok(bundle);
}

export interface UpdateBundleInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string; bundleId: string;
  name?: string; description?: string;
  components?: BundleComponent[];
  attributes?: Record<string, unknown>;
}

export async function updateBundleUseCase(
  input: UpdateBundleInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Bundle, ValidationError | NotFoundError>> {
  const v = updateBundleSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.bundleRepo.findById(d.tenantId, d.bundleId);
  if (!existing || existing.catalogId !== d.catalogId) return Err(new NotFoundError('Bundle not found'));

  const now = deps.clock.now().toISOString();
  const updated: Bundle = { ...existing, updatedAt: now };
  if (d.name !== undefined) updated.name = d.name;
  if (d.description !== undefined) updated.description = d.description;
  if (d.components !== undefined) updated.components = d.components;
  if (d.attributes !== undefined) updated.attributes = d.attributes;

  await deps.bundleRepo.update(d.tenantId, d.bundleId, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.description !== undefined ? { description: d.description } : {}),
    ...(d.components !== undefined ? { components: d.components } : {}),
    ...(d.attributes !== undefined ? { attributes: d.attributes } : {}),
    updatedAt: now,
  });

  const envelope: EventEnvelope<{ bundleId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'bundle.updated', 'bundle.updated.v1',
      { bundleId: d.bundleId });
  await deps.eventBus.emit(envelope);

  return Ok(updated);
}

export async function deleteBundleUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; catalogId: string; bundleId: string },
  deps: CatalogUseCaseDeps,
): Promise<Result<{ bundleId: string }, ValidationError | NotFoundError>> {
  const v = deleteBundleSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid delete input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.bundleRepo.findById(d.tenantId, d.bundleId);
  if (!existing || existing.catalogId !== d.catalogId) return Err(new NotFoundError('Bundle not found'));

  await deps.bundleRepo.update(d.tenantId, d.bundleId, { status: 'Deleted' });

  const envelope: EventEnvelope<{ bundleId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'bundle.deleted', 'bundle.deleted.v1',
      { bundleId: d.bundleId });
  await deps.eventBus.emit(envelope);

  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  await recordCatalogAudit(deps.auditRepo, {
    organizationId: catalog?.organizationId ?? '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, bundleId: d.bundleId, eventType: 'bundle_deleted',
    metadata: {},
  });

  return Ok({ bundleId: d.bundleId });
}
