/**
 * Media Engine — Metadata + Transformation + Upload + Version (9 Use Cases)
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
} from '@platform/core-sdk';
import {
  updateMetadataSchema, replaceMetadataSchema,
  requestTransformationSchema, registerTransformationSchema,
  createUploadSessionSchema, completeUploadSchema, cancelUploadSchema,
  publishVersionSchema, rollbackVersionSchema,
} from '../domain/validation.js';
import type { MediaUseCaseDeps } from './types.js';
import type {
  Asset, AssetTransformation, UploadSession, AssetVersion,
} from '../interfaces/index.js';

function env(deps: MediaUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown) {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'media' as const, eventType, schemaRef, payload,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// METADATA (2)
// ════════════════════════════════════════════════════════════════════════════

export async function updateMetadataUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; assetId: string; metadata: Record<string, unknown> },
  deps: MediaUseCaseDeps,
): Promise<Result<Asset, ValidationError | NotFoundError>> {
  const v = updateMetadataSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!ex) return Err(new NotFoundError('Asset not found'));
  const merged = { ...ex.metadata, ...d.metadata };
  const now = deps.clock.now().toISOString();
  await deps.assetRepo.update(d.tenantId, d.assetId, { metadata: merged, updatedAt: now });
  await deps.auditRepo.insert({ organizationId: ex.organizationId, tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId, assetId: d.assetId, eventType: 'metadata_updated', metadata: {} });
  return Ok({ ...ex, metadata: merged, updatedAt: now });
}

export async function replaceMetadataUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; assetId: string; metadata: Record<string, unknown> },
  deps: MediaUseCaseDeps,
): Promise<Result<Asset, ValidationError | NotFoundError>> {
  const v = replaceMetadataSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!ex) return Err(new NotFoundError('Asset not found'));
  const now = deps.clock.now().toISOString();
  await deps.assetRepo.update(d.tenantId, d.assetId, { metadata: d.metadata, updatedAt: now });
  await deps.auditRepo.insert({ organizationId: ex.organizationId, tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId, assetId: d.assetId, eventType: 'metadata_replaced', metadata: {} });
  return Ok({ ...ex, metadata: d.metadata, updatedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// TRANSFORMATION (2)
// ════════════════════════════════════════════════════════════════════════════

export async function requestTransformationUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; assetId: string;
    transformationType: string; inputParams: Record<string, unknown>; providerId?: string },
  deps: MediaUseCaseDeps,
): Promise<Result<AssetTransformation, ValidationError | NotFoundError>> {
  const v = requestTransformationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const asset = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!asset) return Err(new NotFoundError('Asset not found'));
  const tId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const t: AssetTransformation = {
    id: tId, tenantId: d.tenantId, assetId: d.assetId,
    transformationType: d.transformationType, inputParams: d.inputParams,
    outputVariantId: null, status: 'Requested',
    createdAt: now, completedAt: null,
  };
  if (d.providerId !== undefined) t.providerId = d.providerId;
  await deps.transformationRepo.insert(t);
  await deps.eventBus.emit(env(deps, d.assetId, d.tenantId, d.correlationId, 'asset.transformation.requested', 'asset.transformation.requested.v1', { transformationId: tId }));
  await deps.auditRepo.insert({ organizationId: asset.organizationId, tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId, assetId: d.assetId, eventType: 'transformation_requested', metadata: { transformationId: tId } });
  return Ok(t);
}

export async function registerTransformationUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; transformationId: string; outputVariantId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<AssetTransformation, ValidationError | NotFoundError>> {
  const v = registerTransformationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.transformationRepo.findById(d.tenantId, d.transformationId);
  if (!ex) return Err(new NotFoundError('Transformation not found'));
  const now = deps.clock.now().toISOString();
  await deps.transformationRepo.update(d.tenantId, d.transformationId, { status: 'Registered', outputVariantId: d.outputVariantId, completedAt: now });
  await deps.auditRepo.insert({ organizationId: '', tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId, eventType: 'transformation_registered', metadata: { transformationId: d.transformationId } });
  return Ok({ ...ex, status: 'Registered', outputVariantId: d.outputVariantId, completedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// UPLOAD (3)
// ════════════════════════════════════════════════════════════════════════════

export async function createUploadSessionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string;
    providerId: string; providerKey: string; mimeType: string; expectedSizeBytes: number; assetId?: string },
  deps: MediaUseCaseDeps,
): Promise<Result<UploadSession, ValidationError | NotFoundError>> {
  const v = createUploadSessionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  const sId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const session: UploadSession = {
    id: sId, tenantId: d.tenantId, organizationId: d.organizationId,
    assetId: d.assetId ?? null,
    providerId: d.providerId, providerKey: d.providerKey,
    mimeType: d.mimeType, expectedSizeBytes: d.expectedSizeBytes,
    status: 'Pending', uploadedBytes: 0,
    createdAt: now, completedAt: null,
  };
  await deps.uploadRepo.insert(session);
  await deps.eventBus.emit(env(deps, sId, d.tenantId, d.correlationId, 'asset.upload.started', 'asset.upload.started.v1', { sessionId: sId }));
  await deps.auditRepo.insert({ organizationId: d.organizationId, tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId, eventType: 'upload_started', metadata: { sessionId: sId } });
  return Ok(session);
}

export async function completeUploadUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; sessionId: string;
    uploadedBytes: number; hash?: { algorithm: string; value: string } },
  deps: MediaUseCaseDeps,
): Promise<Result<UploadSession, ValidationError | NotFoundError>> {
  const v = completeUploadSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.uploadRepo.findById(d.tenantId, d.sessionId);
  if (!ex) return Err(new NotFoundError('Upload session not found'));
  if (ex.status !== 'Pending') return Err(new ValidationError('Session not pending'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<UploadSession> = { status: 'Completed', uploadedBytes: d.uploadedBytes, completedAt: now };
  if (d.hash !== undefined) patch.hash = d.hash;
  await deps.uploadRepo.update(d.tenantId, d.sessionId, patch);
  await deps.eventBus.emit(env(deps, d.sessionId, d.tenantId, d.correlationId, 'asset.upload.completed', 'asset.upload.completed.v1', { sessionId: d.sessionId }));
  await deps.auditRepo.insert({ organizationId: ex.organizationId, tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId, eventType: 'upload_completed', metadata: { sessionId: d.sessionId } });
  return Ok({ ...ex, ...patch } as UploadSession);
}

export async function cancelUploadUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; sessionId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<{ sessionId: string }, ValidationError | NotFoundError>> {
  const v = cancelUploadSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.uploadRepo.findById(d.tenantId, d.sessionId);
  if (!ex) return Err(new NotFoundError('Upload session not found'));
  await deps.uploadRepo.update(d.tenantId, d.sessionId, { status: 'Cancelled' });
  await deps.auditRepo.insert({ organizationId: ex.organizationId, tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId, eventType: 'upload_cancelled', metadata: { sessionId: d.sessionId } });
  return Ok({ sessionId: d.sessionId });
}

// ════════════════════════════════════════════════════════════════════════════
// VERSION (2)
// ════════════════════════════════════════════════════════════════════════════

export async function publishVersionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; assetId: string },
  deps: MediaUseCaseDeps,
): Promise<Result<AssetVersion, ValidationError | NotFoundError>> {
  const v = publishVersionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const asset = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!asset) return Err(new NotFoundError('Asset not found'));
  const versions = await deps.versionRepo.findAll(d.tenantId, d.assetId);
  const verNum = versions.length + 1;
  const verId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const snap: Record<string, unknown> = {
    name: asset.name, type: asset.type, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes,
    visibility: asset.visibility, tags: asset.tags, metadata: asset.metadata, attributes: asset.attributes,
  };
  const version: AssetVersion = {
    id: verId, tenantId: d.tenantId, assetId: d.assetId, versionNumber: verNum,
    snapshot: snap, status: 'Published', publishedAt: now, publishedBy: d.actorId,
  };
  await deps.versionRepo.insert(version);
  await deps.eventBus.emit(env(deps, d.assetId, d.tenantId, d.correlationId, 'asset.version.published', 'asset.version.published.v1', { versionNumber: verNum }));
  await deps.auditRepo.insert({ organizationId: asset.organizationId, tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId, assetId: d.assetId, eventType: 'version_published', metadata: { versionNumber: verNum } });
  return Ok(version);
}

export async function rollbackVersionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; assetId: string; versionNumber: number },
  deps: MediaUseCaseDeps,
): Promise<Result<AssetVersion, ValidationError | NotFoundError>> {
  const v = rollbackVersionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const target = await deps.versionRepo.findByNumber(d.tenantId, d.assetId, d.versionNumber);
  if (!target) return Err(new NotFoundError('Version not found'));
  const asset = await deps.assetRepo.findById(d.tenantId, d.assetId);
  if (!asset) return Err(new NotFoundError('Asset not found'));
  const snap = target.snapshot as Record<string, unknown>;
  const now = deps.clock.now().toISOString();
  await deps.assetRepo.update(d.tenantId, d.assetId, {
    name: snap['name'] as string, tags: snap['tags'] as string[],
    metadata: snap['metadata'] as Record<string, unknown>,
    attributes: snap['attributes'] as Record<string, unknown>,
    updatedAt: now,
  });
  await deps.versionRepo.update(d.tenantId, target.id, { status: 'RolledBack' });
  await deps.auditRepo.insert({ organizationId: asset.organizationId, tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId, assetId: d.assetId, eventType: 'version_rollback', metadata: { versionNumber: d.versionNumber } });
  return Ok({ ...target, status: 'RolledBack' });
}
