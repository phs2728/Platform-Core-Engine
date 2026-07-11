/**
 * Media Engine — Asset Lifecycle + Variants + Collections + References (16 Use Cases)
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope, z,
} from '@platform/core-sdk';
import {
  createAssetSchema, updateAssetSchema,
  archiveAssetSchema, restoreAssetSchema, deleteAssetSchema,
  getAssetSchema, searchAssetsSchema,
  createVariantSchema, updateVariantSchema, deleteVariantSchema,
  createCollectionSchema, addAssetToCollectionSchema, removeAssetFromCollectionSchema,
  attachReferenceSchema, detachReferenceSchema,
} from '../domain/validation.js';
import type { MediaUseCaseDeps } from './types.js';
import type {
  Asset, AssetVariant, AssetCollection, AssetReference,
  AssetStatus, AssetSearchCriteria, AssetSearchResult, Visibility,
} from '../interfaces/index.js';

function envelope(deps: MediaUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'media', eventType, schemaRef, payload,
  };
}

async function audit(deps: MediaUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, assetId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (assetId !== undefined) rec.assetId = assetId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

// ════════════════════════════════════════════════════════════════════════════
// ASSET LIFECYCLE (8)
// ════════════════════════════════════════════════════════════════════════════

export interface CreateAssetInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  name: string; slug: string;
  type: string; mimeType: string; sizeBytes: number;
  storageProviderId: string; storageKey: string;
  description?: string; initialStatus?: AssetStatus;
  visibility?: Visibility; accessPolicyRef?: string;
  hash?: { algorithm: string; value: string };
  checksum?: string; language?: string;
  dimensions?: { width?: number; height?: number; duration?: number };
  tags?: string[];
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createAssetUseCase(
  input: CreateAssetInput, deps: MediaUseCaseDeps,
): Promise<Result<{ assetId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createAssetSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid asset input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  if (await deps.assetRepo.existsBySlug(d.tenantId, d.slug)) {
    return Err(new ConflictError('slug already exists'));
  }

  const allowedTypes = await deps.policyProvider.getAllowedAssetTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) {
    return Err(new ValidationError(`type "${d.type}" not allowed`));
  }

  const pr = await deps.policyProvider.validateAttributes(d.tenantId, d.type, d.attributes ?? {});
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));

  const maxAssets = await deps.policyProvider.getMaxAssetsPerOrg(d.tenantId);
  const current = await deps.assetRepo.countByOrganization(d.tenantId, d.organizationId);
  if (current >= maxAssets) {
    return Err(new ConflictError(`Max assets limit (${maxAssets}) reached`));
  }

  const assetId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const initialStatus: AssetStatus = d.initialStatus ?? 'Active';
  const vis: Visibility = d.visibility ?? 'tenant';

  const asset: Asset = {
    id: assetId, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, slug: d.slug, status: initialStatus, type: d.type,
    mimeType: d.mimeType, sizeBytes: d.sizeBytes,
    storageProviderId: d.storageProviderId, storageKey: d.storageKey,
    visibility: vis,
    attributes: pr.value, customFields: d.customFields ?? {}, metadata: d.metadata ?? {},
    tags: d.tags ?? [], variantIds: [], collectionIds: [],
    createdAt: now, createdBy: d.actorId, updatedAt: now, updatedBy: d.actorId,
    archivedAt: null, deletedAt: null,
  };
  if (d.description !== undefined) asset.description = d.description;
  if (d.accessPolicyRef !== undefined) asset.accessPolicyRef = d.accessPolicyRef;
  if (d.hash !== undefined) asset.hash = d.hash;
  if (d.checksum !== undefined) asset.checksum = d.checksum;
  if (d.language !== undefined) asset.language = d.language;
  if (d.dimensions !== undefined) {
    asset.dimensions = d.dimensions as { width?: number; height?: number; duration?: number };
  }

  await deps.assetRepo.insert(asset);
  await deps.eventBus.emit(envelope(deps, assetId, d.tenantId, d.correlationId, 'asset.created', 'asset.created.v1', { assetId, type: d.type }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'asset_created', { name: d.name }, assetId);
  return Ok({ assetId, createdAt: now });
}

export async function updateAssetUseCase(
  input: z.infer<typeof updateAssetSchema> & { tenantId: string; correlationId: string; actorId: string; assetId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<Asset, ValidationError | NotFoundError | ConflictError>> {
  const v = updateAssetSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update', { details: { issues: v.error.errors } }));
  const d = v.data;
  const existing = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!existing) return Err(new NotFoundError('Asset not found'));
  if (existing.status === 'Archived' || existing.status === 'Deleted') return Err(new ConflictError(`Cannot update — status "${existing.status}"`));

  const now = deps.clock.now().toISOString();
  const patch: Partial<Asset> = { updatedAt: now, updatedBy: d.actorId };
  if (d.name !== undefined) patch.name = d.name;
  if (d.description !== undefined) patch.description = d.description;
  if (d.visibility !== undefined) patch.visibility = d.visibility;
  if (d.accessPolicyRef !== undefined) patch.accessPolicyRef = d.accessPolicyRef;
  if (d.language !== undefined) patch.language = d.language;
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.attributes !== undefined) {
    const pr = await deps.policyProvider.validateAttributes(d.tenantId, existing.type, d.attributes);
    if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));
    patch.attributes = pr.value;
  }
  if (d.customFields !== undefined) patch.customFields = d.customFields;

  await deps.assetRepo.update(d.tenantId, d.assetId, patch);
  await deps.eventBus.emit(envelope(deps, d.assetId, d.tenantId, d.correlationId, 'asset.updated', 'asset.updated.v1', { assetId: d.assetId }));
  await audit(deps, existing.organizationId, d.tenantId, d.actorId, d.correlationId, 'asset_updated', {}, d.assetId);
  return Ok({ ...existing, ...patch } as Asset);
}

export async function archiveAssetUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; assetId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<Asset, ValidationError | NotFoundError | ConflictError>> {
  const v = archiveAssetSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!ex) return Err(new NotFoundError('Asset not found'));
  if (ex.status === 'Archived') return Err(new ConflictError('Already archived'));
  if (ex.status === 'Deleted') return Err(new ConflictError('Cannot archive deleted'));
  const now = deps.clock.now().toISOString();
  await deps.assetRepo.update(d.tenantId, d.assetId, { status: 'Archived', archivedAt: now, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.assetId, d.tenantId, d.correlationId, 'asset.archived', 'asset.archived.v1', { assetId: d.assetId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'asset_archived', {}, d.assetId);
  return Ok({ ...ex, status: 'Archived', archivedAt: now, updatedAt: now });
}

export async function restoreAssetUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; assetId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<Asset, ValidationError | NotFoundError | ConflictError>> {
  const v = restoreAssetSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!ex) return Err(new NotFoundError('Asset not found'));
  if (ex.status !== 'Archived') return Err(new ConflictError(`Cannot restore from "${ex.status}"`));
  const now = deps.clock.now().toISOString();
  await deps.assetRepo.update(d.tenantId, d.assetId, { status: 'Active', archivedAt: null, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.assetId, d.tenantId, d.correlationId, 'asset.restored', 'asset.restored.v1', { assetId: d.assetId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'asset_restored', {}, d.assetId);
  return Ok({ ...ex, status: 'Active', archivedAt: null, updatedAt: now });
}

export async function deleteAssetUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; assetId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<{ assetId: string }, ValidationError | NotFoundError | ConflictError>> {
  const v = deleteAssetSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!ex) return Err(new NotFoundError('Asset not found'));
  if (ex.status === 'Deleted') return Err(new ConflictError('Already deleted'));
  const now = deps.clock.now().toISOString();
  await deps.assetRepo.update(d.tenantId, d.assetId, { status: 'Deleted', deletedAt: now, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.assetId, d.tenantId, d.correlationId, 'asset.deleted', 'asset.deleted.v1', { assetId: d.assetId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'asset_deleted', {}, d.assetId);
  return Ok({ assetId: d.assetId });
}

export async function getAssetUseCase(
  input: { tenantId: string; assetId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<Asset | null, ValidationError>> {
  const v = getAssetSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.assetRepo.findById(v.data.tenantId, v.data.assetId));
}

export async function searchAssetsUseCase(
  input: AssetSearchCriteria, deps: MediaUseCaseDeps,
): Promise<Result<AssetSearchResult, ValidationError>> {
  const v = searchAssetsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search'));
  return Ok(await deps.assetRepo.search(v.data as AssetSearchCriteria));
}

export async function listAssetsUseCase(
  input: { tenantId: string; organizationId: string; limit?: number; offset?: number },
  deps: MediaUseCaseDeps,
): Promise<Result<AssetSearchResult, ValidationError>> {
  return Ok(await deps.assetRepo.search({
    tenantId: input.tenantId, organizationId: input.organizationId,
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// VARIANTS (3)
// ════════════════════════════════════════════════════════════════════════════

export async function createVariantUseCase(
  input: z.infer<typeof createVariantSchema> & { tenantId: string; correlationId: string; actorId: string; assetId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<AssetVariant, ValidationError | NotFoundError | ConflictError>> {
  const v = createVariantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid variant input'));
  const d = v.data;
  const asset = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!asset) return Err(new NotFoundError('Asset not found'));

  const maxV = await deps.policyProvider.getMaxVariantsPerAsset(d.tenantId);
  if (await deps.variantRepo.countByAsset(d.tenantId, d.assetId) >= maxV) {
    return Err(new ConflictError(`Max variants (${maxV}) reached`));
  }

  const variantId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const variant: AssetVariant = {
    id: variantId, tenantId: d.tenantId, assetId: d.assetId,
    variantType: d.variantType, name: d.name, mimeType: d.mimeType, sizeBytes: d.sizeBytes,
    storageProviderId: d.storageProviderId, storageKey: d.storageKey,
    isDefault: d.isDefault ?? false, attributes: d.attributes ?? {},
    createdAt: now, updatedAt: now,
  };
  await deps.variantRepo.insert(variant);
  await deps.assetRepo.update(d.tenantId, d.assetId, { variantIds: [...asset.variantIds, variantId] });
  await deps.eventBus.emit(envelope(deps, d.assetId, d.tenantId, d.correlationId, 'asset.variant.created', 'asset.variant.created.v1', { variantId, assetId: d.assetId }));
  await audit(deps, asset.organizationId, d.tenantId, d.actorId, d.correlationId, 'variant_created', { variantId }, d.assetId);
  return Ok(variant);
}

export async function updateVariantUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; variantId: string; name?: string; attributes?: Record<string, unknown> },
  deps: MediaUseCaseDeps,
): Promise<Result<AssetVariant, ValidationError | NotFoundError>> {
  const v = updateVariantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update'));
  const d = v.data;
  const ex = await deps.variantRepo.findById(d.tenantId, d.variantId);
  if (!ex) return Err(new NotFoundError('Variant not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<AssetVariant> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  await deps.variantRepo.update(d.tenantId, d.variantId, patch);
  return Ok({ ...ex, ...patch });
}

export async function deleteVariantUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; variantId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<{ variantId: string }, ValidationError | NotFoundError>> {
  const v = deleteVariantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.variantRepo.findById(d.tenantId, d.variantId);
  if (!ex) return Err(new NotFoundError('Variant not found'));
  await deps.variantRepo.remove(d.tenantId, d.variantId);
  return Ok({ variantId: d.variantId });
}

// ════════════════════════════════════════════════════════════════════════════
// COLLECTIONS (3)
// ════════════════════════════════════════════════════════════════════════════

export async function createCollectionUseCase(
  input: z.infer<typeof createCollectionSchema> & { tenantId: string; correlationId: string; actorId: string; organizationId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<AssetCollection, ValidationError | NotFoundError>> {
  const v = createCollectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid collection input'));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  const collId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const coll: AssetCollection = {
    id: collId, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, slug: d.slug, type: d.type, assetIds: [],
    attributes: d.attributes ?? {}, createdAt: now, updatedAt: now,
  };
  if (d.description !== undefined) coll.description = d.description;
  await deps.collectionRepo.insert(coll);
  await deps.eventBus.emit(envelope(deps, collId, d.tenantId, d.correlationId, 'asset.collection.created', 'asset.collection.created.v1', { collectionId: collId }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'collection_created', { name: d.name });
  return Ok(coll);
}

export async function addAssetToCollectionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; collectionId: string; assetId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<{ collectionId: string; assetId: string }, ValidationError | NotFoundError>> {
  const v = addAssetToCollectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const coll = await deps.collectionRepo.findById(d.tenantId, d.collectionId);
  if (!coll) return Err(new NotFoundError('Collection not found'));
  const asset = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!asset) return Err(new NotFoundError('Asset not found'));
  if (!coll.assetIds.includes(d.assetId)) {
    await deps.collectionRepo.update(d.tenantId, d.collectionId, { assetIds: [...coll.assetIds, d.assetId], updatedAt: deps.clock.now().toISOString() });
  }
  await audit(deps, coll.organizationId, d.tenantId, d.actorId, d.correlationId, 'asset_added_to_collection', { collectionId: d.collectionId, assetId: d.assetId });
  return Ok({ collectionId: d.collectionId, assetId: d.assetId });
}

export async function removeAssetFromCollectionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; collectionId: string; assetId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<{ collectionId: string; assetId: string }, ValidationError | NotFoundError>> {
  const v = removeAssetFromCollectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const coll = await deps.collectionRepo.findById(d.tenantId, d.collectionId);
  if (!coll) return Err(new NotFoundError('Collection not found'));
  await deps.collectionRepo.update(d.tenantId, d.collectionId, { assetIds: coll.assetIds.filter((id) => id !== d.assetId), updatedAt: deps.clock.now().toISOString() });
  await audit(deps, coll.organizationId, d.tenantId, d.actorId, d.correlationId, 'asset_removed_from_collection', { collectionId: d.collectionId, assetId: d.assetId });
  return Ok({ collectionId: d.collectionId, assetId: d.assetId });
}

// ════════════════════════════════════════════════════════════════════════════
// REFERENCES (2)
// ════════════════════════════════════════════════════════════════════════════

export async function attachReferenceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    assetId: string; ownerType: string; ownerId: string; referenceType: string;
    displayOrder?: number; metadata?: Record<string, unknown>; },
  deps: MediaUseCaseDeps,
): Promise<Result<AssetReference, ValidationError | NotFoundError>> {
  const v = attachReferenceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid reference input'));
  const d = v.data;
  const asset = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!asset) return Err(new NotFoundError('Asset not found'));
  const refId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const ref: AssetReference = {
    id: refId, tenantId: d.tenantId, assetId: d.assetId,
    ownerType: d.ownerType, ownerId: d.ownerId, referenceType: d.referenceType,
    displayOrder: d.displayOrder ?? 0, metadata: d.metadata ?? {},
    createdAt: now,
  };
  await deps.referenceRepo.insert(ref);
  await deps.eventBus.emit(envelope(deps, d.assetId, d.tenantId, d.correlationId, 'asset.reference.attached', 'asset.reference.attached.v1', { referenceId: refId, assetId: d.assetId, ownerType: d.ownerType }));
  await audit(deps, asset.organizationId, d.tenantId, d.actorId, d.correlationId, 'reference_attached', { referenceId: refId }, d.assetId);
  return Ok(ref);
}

export async function detachReferenceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; referenceId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<{ referenceId: string }, ValidationError | NotFoundError>> {
  const v = detachReferenceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ref = await deps.referenceRepo.findById(d.tenantId, d.referenceId);
  if (!ref) return Err(new NotFoundError('Reference not found'));
  await deps.referenceRepo.remove(d.tenantId, d.referenceId);
  await deps.eventBus.emit(envelope(deps, ref.assetId, d.tenantId, d.correlationId, 'asset.reference.detached', 'asset.reference.detached.v1', { referenceId: d.referenceId }));
  return Ok({ referenceId: d.referenceId });
}
