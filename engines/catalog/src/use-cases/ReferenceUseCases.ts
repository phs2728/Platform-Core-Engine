/**
 * Reference UseCases (2개)
 *   assignMediaRef / assignPricingRef
 *
 * 사장님 확립: Reference는 ID만 보관, 실제 데이터 ❌
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordCatalogAudit } from '../domain/audit.js';
import {
  assignMediaRefSchema, assignPricingRefSchema,
} from '../domain/validation.js';
import { emitCatalogEvent } from '../domain/events.js';
import type { CatalogUseCaseDeps } from './types.js';
import type { MediaRef, PricingRef } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// Helper: resolve owner (item/variant/bundle)
// ════════════════════════════════════════════════════════════════════════════

async function resolveOwner(
  deps: CatalogUseCaseDeps,
  tenantId: string,
  catalogId: string,
  ownerType: 'item' | 'variant' | 'bundle',
  ownerId: string,
): Promise<{ ok: true; mediaRefs: MediaRef[]; pricingRefs: PricingRef[]; orgId: string } | { ok: false; error: NotFoundError }> {
  if (ownerType === 'item') {
    const item = await deps.itemRepo.findById(tenantId, ownerId);
    if (!item || item.catalogId !== catalogId) return { ok: false, error: new NotFoundError('Item not found') };
    const catalog = await deps.catalogRepo.findById(tenantId, catalogId);
    return { ok: true, mediaRefs: item.mediaRefs, pricingRefs: item.pricingRefs, orgId: catalog?.organizationId ?? '' };
  }
  if (ownerType === 'variant') {
    const variant = await deps.variantRepo.findById(tenantId, ownerId);
    if (!variant || variant.catalogId !== catalogId) return { ok: false, error: new NotFoundError('Variant not found') };
    const catalog = await deps.catalogRepo.findById(tenantId, catalogId);
    return { ok: true, mediaRefs: variant.mediaRefs, pricingRefs: variant.pricingRefs, orgId: catalog?.organizationId ?? '' };
  }
  // bundle
  const bundle = await deps.bundleRepo.findById(tenantId, ownerId);
  if (!bundle || bundle.catalogId !== catalogId) return { ok: false, error: new NotFoundError('Bundle not found') };
  const catalog = await deps.catalogRepo.findById(tenantId, catalogId);
  return { ok: true, mediaRefs: bundle.mediaRefs, pricingRefs: bundle.pricingRefs, orgId: catalog?.organizationId ?? '' };
}

async function applyRefUpdate(
  deps: CatalogUseCaseDeps,
  tenantId: string,
  ownerType: 'item' | 'variant' | 'bundle',
  ownerId: string,
  patch: { mediaRefs?: MediaRef[]; pricingRefs?: PricingRef[] },
): Promise<void> {
  if (ownerType === 'item') {
    await deps.itemRepo.update(tenantId, ownerId, patch);
  } else if (ownerType === 'variant') {
    await deps.variantRepo.update(tenantId, ownerId, patch);
  } else {
    await deps.bundleRepo.update(tenantId, ownerId, patch);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ASSIGN MEDIA REF
// ════════════════════════════════════════════════════════════════════════════

export interface AssignMediaRefInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string;
  ownerType: 'item' | 'variant' | 'bundle';
  ownerId: string;
  mediaRef: MediaRef;
}

export async function assignMediaRefUseCase(
  input: AssignMediaRefInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<MediaRef, ValidationError | NotFoundError>> {
  const v = assignMediaRefSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid assignMediaRef input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Catalog 존재
  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  if (!catalog) return Err(new NotFoundError('Catalog not found'));

  // Media ID 검증 (Host — Media Engine 직접 호출 ❌)
  const mediaOk = await deps.mediaVerifier.verify(d.tenantId, d.mediaRef.mediaId);
  if (!mediaOk) return Err(new ValidationError('mediaId not found in Media Engine'));

  // Owner resolve
  const owner = await resolveOwner(deps, d.tenantId, d.catalogId, d.ownerType, d.ownerId);
  if (!owner.ok) return Err(owner.error);

  // Append mediaRef
  const updatedRefs = [...owner.mediaRefs, d.mediaRef].sort((a, b) => a.displayOrder - b.displayOrder);
  await applyRefUpdate(deps, d.tenantId, d.ownerType, d.ownerId, { mediaRefs: updatedRefs });

  const envelope: EventEnvelope<{ ownerType: string; ownerId: string; mediaId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'reference.media.assigned', 'reference.media.assigned.v1',
      { ownerType: d.ownerType, ownerId: d.ownerId, mediaId: d.mediaRef.mediaId });
  await deps.eventBus.emit(envelope);

  await recordCatalogAudit(deps.auditRepo, {
    organizationId: owner.orgId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, eventType: 'reference_media_assigned',
    metadata: { ownerType: d.ownerType, ownerId: d.ownerId, mediaId: d.mediaRef.mediaId },
  });

  return Ok(d.mediaRef);
}

// ════════════════════════════════════════════════════════════════════════════
// ASSIGN PRICING REF
// ════════════════════════════════════════════════════════════════════════════

export interface AssignPricingRefInput {
  tenantId: string; correlationId: string; actorId: string;
  catalogId: string;
  ownerType: 'item' | 'variant' | 'bundle';
  ownerId: string;
  pricingRef: PricingRef;
}

export async function assignPricingRefUseCase(
  input: AssignPricingRefInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<PricingRef, ValidationError | NotFoundError>> {
  const v = assignPricingRefSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid assignPricingRef input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const catalog = await deps.catalogRepo.findById(d.tenantId, d.catalogId);
  if (!catalog) return Err(new NotFoundError('Catalog not found'));

  // Pricing ID 검증 (Host)
  const pricingOk = await deps.pricingVerifier.verify(d.tenantId, d.pricingRef.pricingId);
  if (!pricingOk) return Err(new ValidationError('pricingId not found in Pricing Engine'));

  const owner = await resolveOwner(deps, d.tenantId, d.catalogId, d.ownerType, d.ownerId);
  if (!owner.ok) return Err(owner.error);

  const updatedRefs = [...owner.pricingRefs, d.pricingRef].sort((a, b) => a.displayOrder - b.displayOrder);
  await applyRefUpdate(deps, d.tenantId, d.ownerType, d.ownerId, { pricingRefs: updatedRefs });

  const envelope: EventEnvelope<{ ownerType: string; ownerId: string; pricingId: string }> =
    await emitCatalogEvent(deps,
      { aggregateId: d.catalogId, tenantId: d.tenantId, correlationId: d.correlationId },
      'reference.pricing.assigned', 'reference.pricing.assigned.v1',
      { ownerType: d.ownerType, ownerId: d.ownerId, pricingId: d.pricingRef.pricingId });
  await deps.eventBus.emit(envelope);

  await recordCatalogAudit(deps.auditRepo, {
    organizationId: owner.orgId, tenantId: d.tenantId,
    actorId: d.actorId, correlationId: d.correlationId,
    catalogId: d.catalogId, eventType: 'reference_pricing_assigned',
    metadata: { ownerType: d.ownerType, ownerId: d.ownerId, pricingId: d.pricingRef.pricingId },
  });

  return Ok(d.pricingRef);
}
