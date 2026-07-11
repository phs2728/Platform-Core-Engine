/**
 * Catalog Engine — Validation Schemas (zod)
 *
 * 사장님 확립 (2026-07-11):
 *  - attributes/customFields/metadata = 자유 JSON (Policy가 검증)
 *  - slug = Tenant 내 유니크
 *  - status = 4-state (Draft/Active/Archived/Deleted)
 */

import { z } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Shared Schemas
// ═══════════════════════════════════════════

export const catalogStatusSchema = z.enum(['Draft', 'Active', 'Archived', 'Deleted']);

export const mediaRefSchema = z.object({
  mediaId: z.string().min(1).max(128),
  role: z.enum(['primary', 'gallery', 'thumbnail', 'attachment']),
  displayOrder: z.number().int().min(0),
});

export const pricingRefSchema = z.object({
  pricingId: z.string().min(1).max(128),
  role: z.enum(['default', 'tier', 'promo']),
  displayOrder: z.number().int().min(0),
});

// ═══════════════════════════════════════════
// Catalog Core Schemas
// ═══════════════════════════════════════════

export const createCatalogSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric + hyphens'),
  description: z.string().max(2000).optional(),
  type: z.string().min(1).max(100),
  initialStatus: catalogStatusSchema.optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  searchKeywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateCatalogSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  searchKeywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const archiveCatalogSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const restoreCatalogSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
});

export const deleteCatalogSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
});

export const getCatalogSchema = z.object({
  tenantId: z.string().min(1),
  catalogId: z.string().min(1),
});

export const searchCatalogsSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  status: catalogStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ═══════════════════════════════════════════
// Category Schemas
// ═══════════════════════════════════════════

export const createCategorySchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  parentCategoryId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  displayOrder: z.number().int().min(0).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const updateCategorySchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  displayOrder: z.number().int().min(0).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const moveCategorySchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  categoryId: z.string().min(1),
  newParentCategoryId: z.string().min(1).nullable(),
});

export const deleteCategorySchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  categoryId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Item Schemas (Variant/Bundle/Reference 부모)
// ═══════════════════════════════════════════

export const createItemSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  type: z.string().min(1).max(100),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  searchKeywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

// ═══════════════════════════════════════════
// Variant Schemas
// ═══════════════════════════════════════════

export const createVariantSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  itemId: z.string().min(1),
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(100),
  attributes: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export const updateVariantSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  variantId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  attributes: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export const deleteVariantSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  variantId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Bundle Schemas
// ═══════════════════════════════════════════

const bundleComponentSchema = z.object({
  refType: z.enum(['item', 'variant']),
  refId: z.string().min(1).max(128),
  quantity: z.number().int().min(1),
  attributes: z.record(z.unknown()),
});

export const createBundleSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  components: z.array(bundleComponentSchema).min(1),
  attributes: z.record(z.unknown()).optional(),
});

export const updateBundleSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  bundleId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  components: z.array(bundleComponentSchema).min(1).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const deleteBundleSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  bundleId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Reference Schemas (Media / Pricing)
// ═══════════════════════════════════════════

export const assignMediaRefSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  ownerType: z.enum(['item', 'variant', 'bundle']),
  ownerId: z.string().min(1),
  mediaRef: mediaRefSchema,
});

export const assignPricingRefSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  catalogId: z.string().min(1),
  ownerType: z.enum(['item', 'variant', 'bundle']),
  ownerId: z.string().min(1),
  pricingRef: pricingRefSchema,
});
