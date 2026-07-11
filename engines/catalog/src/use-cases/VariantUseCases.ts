/**
 * Variant UseCases (3개)
 *   createVariant / updateVariant / deleteVariant
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordCatalogAudit } from '../domain/audit.js';
import {
  createVariantSchema, updateVariantSchema, deleteVariantSchema,
} from '../domain/validation.js';
import { emitCatalogEvent } from '../domain/events.js';
import type { CatalogUseCaseDeps } from './types.js';
import type { Variant } from '../interfaces/index.js';

export interface CreateVariantInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string; itemId: string;
  name: string; sku: string;
  attributes?: Record<string, unknown>;
  isDefault?: boolean;
}

export async function createVariantUseCase(
  input: CreateVariantInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Variant, ValidationError | NotFoundError | ConflictError>> {
  const v = createVariantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid variant input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const item = await deps.itemRepo.findById(d.tenantId, d.itemId);
  if (!item || item.catalogId !== d.catalogId) return Err(new NotFoundError('Item not found in catalog'));

  if (await deps.variantRepo.existsBySku(d.tenantId, d.itemId, d.sku)) {
    return Err(new ConflictError('sku already exists for this item'));
  }

  const maxVariants = await deps.policyProvider.getMaxVariantsPerItem(d.tenantId);
  const existing = await deps.variantRepo.findByItem(d.tenantId, d.itemId);
  if (existing.length >= maxVariants) {
    return Err(new ConflictError(`Max variants limit (${maxVariants}) reached`));
  }

  const variantId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const variant: Variant = {
    id: variantId,
    tenantId: d.tenantId,
    itemId: d.itemId,
    catalogId: d.catalogId,
    name: d.name,
    sku: d.sku,
    attributes: d.attributes ?? {},
    mediaRefs: [],
    pricingRefs: [],
    isDefault: d.isDefault ?? false,
    status: 'Active',
    createdAt: now,
    updatedAt: now,
  };
  await deps.variantRepo.insert(variant);

  const envelope: EventEnvelope<{ variantId: string; itemId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'variant.created', 'variant.created.v1',
      { variantId, itemId: d.itemId });
  await deps.eventBus.emit(envelope);

  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  await recordCatalogAudit(deps.auditRepo, {
    organizationId: catalog?.organizationId ?? '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, variantId, eventType: 'variant_created',
    metadata: { name: d.name, sku: d.sku },
  });

  return Ok(variant);
}

export interface UpdateVariantInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string; variantId: string;
  name?: string;
  attributes?: Record<string, unknown>;
  isDefault?: boolean;
}

export async function updateVariantUseCase(
  input: UpdateVariantInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Variant, ValidationError | NotFoundError>> {
  const v = updateVariantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.variantRepo.findById(d.tenantId, d.variantId);
  if (!existing || existing.catalogId !== d.catalogId) return Err(new NotFoundError('Variant not found'));

  const now = deps.clock.now().toISOString();
  const updated: Variant = { ...existing, updatedAt: now };
  if (d.name !== undefined) updated.name = d.name;
  if (d.attributes !== undefined) updated.attributes = d.attributes;
  if (d.isDefault !== undefined) updated.isDefault = d.isDefault;

  await deps.variantRepo.update(d.tenantId, d.variantId, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.attributes !== undefined ? { attributes: d.attributes } : {}),
    ...(d.isDefault !== undefined ? { isDefault: d.isDefault } : {}),
    updatedAt: now,
  });

  const envelope: EventEnvelope<{ variantId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'variant.updated', 'variant.updated.v1',
      { variantId: d.variantId });
  await deps.eventBus.emit(envelope);

  return Ok(updated);
}

export async function deleteVariantUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; catalogId: string; variantId: string },
  deps: CatalogUseCaseDeps,
): Promise<Result<{ variantId: string }, ValidationError | NotFoundError>> {
  const v = deleteVariantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid delete input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.variantRepo.findById(d.tenantId, d.variantId);
  if (!existing || existing.catalogId !== d.catalogId) return Err(new NotFoundError('Variant not found'));

  await deps.variantRepo.update(d.tenantId, d.variantId, { status: 'Deleted' });

  const envelope: EventEnvelope<{ variantId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'variant.deleted', 'variant.deleted.v1',
      { variantId: d.variantId });
  await deps.eventBus.emit(envelope);

  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  await recordCatalogAudit(deps.auditRepo, {
    organizationId: catalog?.organizationId ?? '', tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, variantId: d.variantId, eventType: 'variant_deleted',
    metadata: {},
  });

  return Ok({ variantId: d.variantId });
}
