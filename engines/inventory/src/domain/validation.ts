/**
 * Inventory Engine — Validation Schemas (zod)
 */

import { z } from '@platform/core-sdk';

export const inventoryStatusSchema = z.enum(['Active', 'Archived', 'Deleted']);
export const reservationStatusSchema = z.enum(['Pending', 'Confirmed', 'Cancelled', 'Expired']);

// ═══════════════════════════════════════════
// Inventory
// ═══════════════════════════════════════════

export const createInventorySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  type: z.string().min(1).max(100),
  catalogItemId: z.string().min(1).nullable().optional(),
  catalogVariantId: z.string().min(1).nullable().optional(),
  unit: z.string().min(1).max(50),
  tracksBatch: z.boolean().optional(),
  perishable: z.boolean().optional(),
  safetyStock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  highStockThreshold: z.number().int().min(0).nullable().optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateInventorySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  inventoryId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  safetyStock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  highStockThreshold: z.number().int().min(0).nullable().optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const archiveInventorySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), inventoryId: z.string().min(1),
});
export const restoreInventorySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), inventoryId: z.string().min(1),
});
export const deleteInventorySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), inventoryId: z.string().min(1),
});

export const searchInventoriesSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  status: inventoryStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  catalogItemId: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ═══════════════════════════════════════════
// Stock
// ═══════════════════════════════════════════

export const increaseStockSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  inventoryId: z.string().min(1), locationId: z.string().min(1),
  quantity: z.number().int().min(1),
  locationName: z.string().max(200).optional(),
  batchNumber: z.string().max(100).optional(),
  expiresAt: z.string().optional(),
  reason: z.string().max(500).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const decreaseStockSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  inventoryId: z.string().min(1), locationId: z.string().min(1),
  quantity: z.number().int().min(1),
  reason: z.string().max(500).optional(),
});

export const adjustStockSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  inventoryId: z.string().min(1), locationId: z.string().min(1),
  newOnHand: z.number().int().min(0),
  reason: z.string().max(500).optional(),
});

// ═══════════════════════════════════════════
// Reservation
// ═══════════════════════════════════════════

export const reserveInventorySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  inventoryId: z.string().min(1), locationId: z.string().min(1),
  ownerId: z.string().min(1), ownerType: z.string().min(1).max(100),
  quantity: z.number().int().min(1),
  ttlSeconds: z.number().int().min(1).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const confirmReservationSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  reservationId: z.string().min(1),
});

export const cancelReservationSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  reservationId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const expireReservationSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  reservationId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Allocation
// ═══════════════════════════════════════════

export const allocateInventorySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  inventoryId: z.string().min(1), locationId: z.string().min(1),
  ownerId: z.string().min(1), ownerType: z.string().min(1).max(100),
  quantity: z.number().int().min(1),
  attributes: z.record(z.unknown()).optional(),
});

export const releaseAllocationSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  allocationId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Availability
// ═══════════════════════════════════════════

export const checkAvailabilitySchema = z.object({
  tenantId: z.string().min(1), inventoryId: z.string().min(1),
  locationId: z.string().optional(),
});

export const getAvailableQuantitySchema = z.object({
  tenantId: z.string().min(1), inventoryId: z.string().min(1),
  locationId: z.string().optional(),
});

// ═══════════════════════════════════════════
// Movement
// ═══════════════════════════════════════════

export const listMovementsSchema = z.object({
  tenantId: z.string().min(1), inventoryId: z.string().min(1),
  limit: z.number().int().min(1).max(1000).optional(),
});

// ═══════════════════════════════════════════
// Ledger + Snapshot
// ═══════════════════════════════════════════

export const getLedgerSchema = z.object({
  tenantId: z.string().min(1), inventoryId: z.string().min(1),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const rebuildSnapshotSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  inventoryId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Threshold
// ═══════════════════════════════════════════

export const setThresholdSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  inventoryId: z.string().min(1),
  safetyStock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  highStockThreshold: z.number().int().min(0).nullable().optional(),
});

export const checkThresholdSchema = z.object({
  tenantId: z.string().min(1), inventoryId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Transfer
// ═══════════════════════════════════════════

export const transferInventorySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  inventoryId: z.string().min(1),
  fromLocationId: z.string().min(1), toLocationId: z.string().min(1),
  quantity: z.number().int().min(1),
  reason: z.string().max(500).optional(),
});
