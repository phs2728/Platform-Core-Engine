/**
 * Inventory Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 5 — First Business Engine.
 * Inventory = Platform SSoT for all reservable/sellable resources.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface ICatalogVerifier {
  verifyItem(tenantId: string, itemId: string): Promise<boolean>;
  verifyVariant(tenantId: string, variantId: string): Promise<boolean>;
}

export interface ICustomDataPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getAllowedInventoryTypes(tenantId: string): Promise<readonly string[]>;
  getMaxInventoriesPerOrg(tenantId: string): Promise<number>;
  getDefaultReservationTtlSeconds(tenantId: string): Promise<number>;
  getDefaultSafetyStock(tenantId: string): Promise<number>;
}

// ═══════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════

export type InventoryStatus = 'Active' | 'Archived' | 'Deleted';
export type ReservationStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Expired';
export type MovementType = 'increase' | 'decrease' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'allocation' | 'release' | 'reservation' | 'reservation_cancel';

export interface ThresholdConfig {
  safetyStock: number;
  lowStockThreshold: number;
  highStockThreshold: number | null;
}

export interface StockSummary {
  onHand: number;
  reserved: number;
  allocated: number;
  available: number;
}

export interface Location {
  locationId: string;
  locationName?: string;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface Inventory {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  status: InventoryStatus;
  type: string;
  catalogItemId: string | null;
  catalogVariantId: string | null;
  unit: string;
  tracksBatch: boolean;
  perishable: boolean;
  threshold: ThresholdConfig;
  attributes: Record<string, unknown>;
  customFields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface StockItem {
  id: string;
  tenantId: string;
  inventoryId: string;
  locationId: string;
  locationName?: string;
  onHand: number;
  reserved: number;
  allocated: number;
  batchNumber?: string;
  expiresAt?: string;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  tenantId: string;
  inventoryId: string;
  stockItemId: string;
  ownerId: string;
  ownerType: string;
  quantity: number;
  status: ReservationStatus;
  ttlSeconds: number;
  expiresAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface Allocation {
  id: string;
  tenantId: string;
  inventoryId: string;
  stockItemId: string;
  ownerId: string;
  ownerType: string;
  quantity: number;
  status: 'Active' | 'Released';
  releasedAt: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  tenantId: string;
  inventoryId: string;
  stockItemId: string;
  movementType: MovementType;
  quantity: number;
  fromLocationId: string | null;
  toLocationId: string | null;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  actorId: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface InventoryLedgerEntry {
  id: string;
  tenantId: string;
  inventoryId: string;
  stockItemId: string;
  movementId: string;
  movementType: MovementType;
  quantityDelta: number;
  balanceAfter: number;
  reservedAfter: number;
  allocatedAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  actorId: string;
  createdAt: string;
}

export interface AvailabilitySnapshot {
  id: string;
  tenantId: string;
  inventoryId: string;
  totalOnHand: number;
  totalReserved: number;
  totalAllocated: number;
  totalAvailable: number;
  locationCount: number;
  thresholdStatus: 'normal' | 'low' | 'critical';
  snapshotAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface InventorySearchCriteria {
  tenantId: string;
  organizationId?: string;
  query?: string;
  type?: string;
  status?: InventoryStatus;
  tags?: string[];
  catalogItemId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface InventorySearchResult {
  inventories: Inventory[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type InventoryAuditEventType =
  | 'inventory_created' | 'inventory_updated' | 'inventory_archived' | 'inventory_restored' | 'inventory_deleted'
  | 'stock_increased' | 'stock_decreased' | 'stock_adjusted'
  | 'reserved' | 'reservation_confirmed' | 'reservation_cancelled' | 'reservation_expired'
  | 'allocated' | 'allocation_released'
  | 'movement_recorded' | 'transfer_completed'
  | 'threshold_set' | 'threshold_reached'
  | 'snapshot_updated';

export interface InventoryAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  inventoryId?: string;
  actorId: string;
  correlationId: string;
  eventType: InventoryAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IInventoryRepository {
  insert(inv: Inventory): Promise<void>;
  findById(tenantId: string, id: string): Promise<Inventory | null>;
  findBySlug(tenantId: string, slug: string): Promise<Inventory | null>;
  update(tenantId: string, id: string, patch: Partial<Inventory>): Promise<void>;
  search(criteria: InventorySearchCriteria): Promise<InventorySearchResult>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
  countByOrganization(tenantId: string, organizationId: string): Promise<number>;
}

export interface IStockItemRepository {
  insert(stock: StockItem): Promise<void>;
  findById(tenantId: string, id: string): Promise<StockItem | null>;
  findByInventory(tenantId: string, inventoryId: string): Promise<StockItem[]>;
  findByInventoryAndLocation(tenantId: string, inventoryId: string, locationId: string): Promise<StockItem | null>;
  update(tenantId: string, id: string, patch: Partial<StockItem>): Promise<void>;
}

export interface IReservationRepository {
  insert(reservation: Reservation): Promise<void>;
  findById(tenantId: string, id: string): Promise<Reservation | null>;
  findByInventory(tenantId: string, inventoryId: string): Promise<Reservation[]>;
  findActiveByInventory(tenantId: string, inventoryId: string): Promise<Reservation[]>;
  findExpired(tenantId: string): Promise<Reservation[]>;
  update(tenantId: string, id: string, patch: Partial<Reservation>): Promise<void>;
}

export interface IAllocationRepository {
  insert(allocation: Allocation): Promise<void>;
  findById(tenantId: string, id: string): Promise<Allocation | null>;
  findActiveByInventory(tenantId: string, inventoryId: string): Promise<Allocation[]>;
  update(tenantId: string, id: string, patch: Partial<Allocation>): Promise<void>;
}

export interface IMovementRepository {
  insert(movement: InventoryMovement): Promise<void>;
  findByInventory(tenantId: string, inventoryId: string, limit?: number): Promise<InventoryMovement[]>;
}

export interface ILedgerRepository {
  insert(entry: InventoryLedgerEntry): Promise<void>;
  findByInventory(tenantId: string, inventoryId: string, limit?: number): Promise<InventoryLedgerEntry[]>;
  findLatest(tenantId: string, stockItemId: string): Promise<InventoryLedgerEntry | null>;
}

export interface IAvailabilityRepository {
  insert(snapshot: AvailabilitySnapshot): Promise<void>;
  findLatest(tenantId: string, inventoryId: string): Promise<AvailabilitySnapshot | null>;
}

export interface IInventoryAuditRepository {
  insert(record: Omit<InventoryAuditRecord, 'id' | 'createdAt'>): Promise<InventoryAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<InventoryAuditRecord[]>;
  findByInventory(tenantId: string, inventoryId: string, limit?: number): Promise<InventoryAuditRecord[]>;
}

export { type Result, type EventEnvelope };
