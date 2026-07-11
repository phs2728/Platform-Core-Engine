/**
 * Media Engine — Validation Schemas (zod)
 */

import { z } from '@platform/core-sdk';

export const assetStatusSchema = z.enum(['Draft', 'Active', 'Archived', 'Deleted']);
export const visibilitySchema = z.enum(['private', 'tenant', 'public']);

// ═══════════════════════════════════════════
// Asset
// ═══════════════════════════════════════════

export const createAssetSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  type: z.string().min(1).max(100),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(0),
  storageProviderId: z.string().min(1).max(128),
  storageKey: z.string().min(1).max(512),
  initialStatus: assetStatusSchema.optional(),
  visibility: visibilitySchema.optional(),
  accessPolicyRef: z.string().max(256).optional(),
  hash: z.object({ algorithm: z.string(), value: z.string() }).optional(),
  checksum: z.string().max(128).optional(),
  language: z.string().max(10).optional(),
  dimensions: z.object({
    width: z.number().int().min(0).optional(),
    height: z.number().int().min(0).optional(),
    duration: z.number().min(0).optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateAssetSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  assetId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: visibilitySchema.optional(),
  accessPolicyRef: z.string().max(256).optional(),
  language: z.string().max(10).optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const archiveAssetSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), assetId: z.string().min(1),
});
export const restoreAssetSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), assetId: z.string().min(1),
});
export const deleteAssetSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), assetId: z.string().min(1),
});
export const getAssetSchema = z.object({
  tenantId: z.string().min(1), assetId: z.string().min(1),
});
export const searchAssetsSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  status: assetStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  mimeType: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'sizeBytes']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ═══════════════════════════════════════════
// Variant
// ═══════════════════════════════════════════

export const createVariantSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  assetId: z.string().min(1),
  variantType: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(0),
  storageProviderId: z.string().min(1).max(128),
  storageKey: z.string().min(1).max(512),
  isDefault: z.boolean().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const updateVariantSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  variantId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const deleteVariantSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  variantId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Collection
// ═══════════════════════════════════════════

export const createCollectionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  type: z.string().min(1).max(100),
  attributes: z.record(z.unknown()).optional(),
});

export const addAssetToCollectionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  collectionId: z.string().min(1), assetId: z.string().min(1),
});

export const removeAssetFromCollectionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  collectionId: z.string().min(1), assetId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Reference
// ═══════════════════════════════════════════

export const attachReferenceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  assetId: z.string().min(1),
  ownerType: z.string().min(1).max(100),
  ownerId: z.string().min(1).max(128),
  referenceType: z.string().min(1).max(100),
  displayOrder: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const detachReferenceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  referenceId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Metadata
// ═══════════════════════════════════════════

export const updateMetadataSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  assetId: z.string().min(1),
  metadata: z.record(z.unknown()),
});

export const replaceMetadataSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  assetId: z.string().min(1),
  metadata: z.record(z.unknown()),
});

// ═══════════════════════════════════════════
// Transformation
// ═══════════════════════════════════════════

export const requestTransformationSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  assetId: z.string().min(1),
  transformationType: z.string().min(1).max(100),
  inputParams: z.record(z.unknown()),
  providerId: z.string().max(128).optional(),
});

export const registerTransformationSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  transformationId: z.string().min(1),
  outputVariantId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Upload
// ═══════════════════════════════════════════

export const createUploadSessionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  organizationId: z.string().min(1),
  providerId: z.string().min(1).max(128),
  providerKey: z.string().min(1).max(512),
  mimeType: z.string().min(1).max(200),
  expectedSizeBytes: z.number().int().min(0),
  assetId: z.string().min(1).optional(),
});

export const completeUploadSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  sessionId: z.string().min(1),
  uploadedBytes: z.number().int().min(0),
  hash: z.object({ algorithm: z.string(), value: z.string() }).optional(),
});

export const cancelUploadSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  sessionId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Version
// ═══════════════════════════════════════════

export const publishVersionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  assetId: z.string().min(1),
});

export const rollbackVersionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  assetId: z.string().min(1),
  versionNumber: z.number().int().min(1),
});
