/**
 * Inventory Engine — Reservation + Allocation + Availability + Movement + Ledger + Threshold + Transfer (14 Use Cases)
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  reserveInventorySchema, confirmReservationSchema, cancelReservationSchema, expireReservationSchema,
  allocateInventorySchema, releaseAllocationSchema,
  checkAvailabilitySchema, getAvailableQuantitySchema,
  listMovementsSchema, getLedgerSchema, rebuildSnapshotSchema,
  setThresholdSchema, checkThresholdSchema, transferInventorySchema,
} from '../domain/validation.js';
import type { InventoryUseCaseDeps } from './types.js';
import type {
  Reservation, Allocation, StockItem, StockSummary,
  InventoryMovement, InventoryLedgerEntry, AvailabilitySnapshot,
} from '../interfaces/index.js';

function env(deps: InventoryUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'inventory', eventType, schemaRef, payload,
  };
}

async function audit(deps: InventoryUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, invId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (invId !== undefined) rec.inventoryId = invId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

function computeSummary(stocks: StockItem[]): StockSummary {
  return stocks.reduce((acc, s) => ({
    onHand: acc.onHand + s.onHand,
    reserved: acc.reserved + s.reserved,
    allocated: acc.allocated + s.allocated,
    available: acc.available + (s.onHand - s.reserved - s.allocated),
  }), { onHand: 0, reserved: 0, allocated: 0, available: 0 });
}

async function recordLedgerAndMovement(
  deps: InventoryUseCaseDeps,
  tenantId: string, inventoryId: string, stockItemId: string,
  movementType: string, quantityDelta: number,
  stock: StockItem,
  fromLoc: string | null, toLoc: string | null,
  reason: string, actorId: string, corr: string,
): Promise<void> {
  const now = deps.clock.now().toISOString();
  const movement: InventoryMovement = {
    id: deps.idGenerator.generate(), tenantId, inventoryId, stockItemId,
    movementType: movementType as InventoryMovement['movementType'], quantity: Math.abs(quantityDelta),
    fromLocationId: fromLoc, toLocationId: toLoc,
    reason, referenceType: null, referenceId: null,
    actorId, correlationId: corr, metadata: {}, createdAt: now,
  };
  await deps.movementRepo.insert(movement);
  const ledger: InventoryLedgerEntry = {
    id: deps.idGenerator.generate(), tenantId, inventoryId, stockItemId,
    movementId: movement.id, movementType: movementType as InventoryLedgerEntry['movementType'],
    quantityDelta, balanceAfter: stock.onHand,
    reservedAfter: stock.reserved, allocatedAfter: stock.allocated,
    referenceType: null, referenceId: null, actorId, createdAt: now,
  };
  await deps.ledgerRepo.insert(ledger);
}

// ════════════════════════════════════════════════════════════════════════════
// RESERVATION (4)
// ════════════════════════════════════════════════════════════════════════════

export async function reserveInventoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    inventoryId: string; locationId: string;
    ownerId: string; ownerType: string; quantity: number;
    ttlSeconds?: number; attributes?: Record<string, unknown>; },
  deps: InventoryUseCaseDeps,
): Promise<Result<Reservation, ValidationError | NotFoundError | ConflictError>> {
  const v = reserveInventorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const inv = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!inv) return Err(new NotFoundError('Inventory not found'));
  if (inv.status !== 'Active') return Err(new ConflictError('Inventory not active'));

  const stock = await deps.stockRepo.findByInventoryAndLocation(d.tenantId, d.inventoryId, d.locationId);
  if (!stock) return Err(new NotFoundError('Stock not found at location'));

  const available = stock.onHand - stock.reserved - stock.allocated;
  if (available < d.quantity) return Err(new ConflictError(`Insufficient available stock (available: ${available}, requested: ${d.quantity})`));

  const ttl = d.ttlSeconds ?? await deps.policyProvider.getDefaultReservationTtlSeconds(d.tenantId);
  const now = deps.clock.now().toISOString();
  const resId = deps.idGenerator.generate();
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  stock.reserved += d.quantity;
  stock.updatedAt = now;
  await deps.stockRepo.update(d.tenantId, stock.id, { reserved: stock.reserved, updatedAt: now });

  const reservation: Reservation = {
    id: resId, tenantId: d.tenantId, inventoryId: d.inventoryId, stockItemId: stock.id,
    ownerId: d.ownerId, ownerType: d.ownerType, quantity: d.quantity,
    status: 'Pending', ttlSeconds: ttl, expiresAt,
    confirmedAt: null, cancelledAt: null,
    attributes: d.attributes ?? {}, createdAt: now,
  };
  await deps.reservationRepo.insert(reservation);

  await recordLedgerAndMovement(deps, d.tenantId, d.inventoryId, stock.id, 'reservation', d.quantity, stock, d.locationId, null, `Reserved for ${d.ownerType}:${d.ownerId}`, d.actorId, d.correlationId);
  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.reserved', 'inventory.reserved.v1', { reservationId: resId, quantity: d.quantity }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'reserved', { reservationId: resId, quantity: d.quantity }, d.inventoryId);
  return Ok(reservation);
}

export async function confirmReservationUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; reservationId: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<Reservation, ValidationError | NotFoundError | ConflictError>> {
  const v = confirmReservationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const res = await deps.reservationRepo.findById(d.tenantId, d.reservationId);
  if (!res) return Err(new NotFoundError('Reservation not found'));
  if (res.status !== 'Pending') return Err(new ConflictError(`Cannot confirm — status "${res.status}"`));

  const now = deps.clock.now().toISOString();
  await deps.reservationRepo.update(d.tenantId, d.reservationId, { status: 'Confirmed', confirmedAt: now });
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'reservation_confirmed', { reservationId: d.reservationId }, res.inventoryId);
  return Ok({ ...res, status: 'Confirmed', confirmedAt: now });
}

export async function cancelReservationUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; reservationId: string; reason?: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<Reservation, ValidationError | NotFoundError | ConflictError>> {
  const v = cancelReservationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const res = await deps.reservationRepo.findById(d.tenantId, d.reservationId);
  if (!res) return Err(new NotFoundError('Reservation not found'));
  if (res.status === 'Cancelled' || res.status === 'Expired') return Err(new ConflictError(`Cannot cancel — status "${res.status}"`));

  const now = deps.clock.now().toISOString();
  await deps.reservationRepo.update(d.tenantId, d.reservationId, { status: 'Cancelled', cancelledAt: now });

  // Release reserved quantity back to stock
  const stock = await deps.stockRepo.findById(d.tenantId, res.stockItemId);
  if (stock) {
    stock.reserved = Math.max(0, stock.reserved - res.quantity);
    stock.updatedAt = now;
    await deps.stockRepo.update(d.tenantId, stock.id, { reserved: stock.reserved, updatedAt: now });
    await recordLedgerAndMovement(deps, d.tenantId, res.inventoryId, stock.id, 'reservation_cancel', -res.quantity, stock, null, null, d.reason ?? 'Reservation cancelled', d.actorId, d.correlationId);
  }

  await deps.eventBus.emit(env(deps, res.inventoryId, d.tenantId, d.correlationId, 'inventory.released', 'inventory.reservation.cancelled.v1', { reservationId: d.reservationId }));
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'reservation_cancelled', { reservationId: d.reservationId }, res.inventoryId);
  return Ok({ ...res, status: 'Cancelled', cancelledAt: now });
}

export async function expireReservationUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; reservationId: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<Reservation, ValidationError | NotFoundError | ConflictError>> {
  const v = expireReservationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const res = await deps.reservationRepo.findById(d.tenantId, d.reservationId);
  if (!res) return Err(new NotFoundError('Reservation not found'));
  if (res.status !== 'Pending') return Err(new ConflictError(`Cannot expire — status "${res.status}"`));

  const now = deps.clock.now().toISOString();
  await deps.reservationRepo.update(d.tenantId, d.reservationId, { status: 'Expired' });

  const stock = await deps.stockRepo.findById(d.tenantId, res.stockItemId);
  if (stock) {
    stock.reserved = Math.max(0, stock.reserved - res.quantity);
    stock.updatedAt = now;
    await deps.stockRepo.update(d.tenantId, stock.id, { reserved: stock.reserved, updatedAt: now });
  }

  await deps.eventBus.emit(env(deps, res.inventoryId, d.tenantId, d.correlationId, 'inventory.released', 'inventory.reservation.expired.v1', { reservationId: d.reservationId }));
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'reservation_expired', { reservationId: d.reservationId }, res.inventoryId);
  return Ok({ ...res, status: 'Expired' });
}

// ════════════════════════════════════════════════════════════════════════════
// ALLOCATION (2)
// ════════════════════════════════════════════════════════════════════════════

export async function allocateInventoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    inventoryId: string; locationId: string;
    ownerId: string; ownerType: string; quantity: number;
    attributes?: Record<string, unknown>; },
  deps: InventoryUseCaseDeps,
): Promise<Result<Allocation, ValidationError | NotFoundError | ConflictError>> {
  const v = allocateInventorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const inv = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!inv) return Err(new NotFoundError('Inventory not found'));

  const stock = await deps.stockRepo.findByInventoryAndLocation(d.tenantId, d.inventoryId, d.locationId);
  if (!stock) return Err(new NotFoundError('Stock not found at location'));

  const available = stock.onHand - stock.reserved - stock.allocated;
  if (available < d.quantity) return Err(new ConflictError(`Insufficient available stock (available: ${available}, requested: ${d.quantity})`));

  const allocId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  stock.allocated += d.quantity;
  stock.updatedAt = now;
  await deps.stockRepo.update(d.tenantId, stock.id, { allocated: stock.allocated, updatedAt: now });

  const allocation: Allocation = {
    id: allocId, tenantId: d.tenantId, inventoryId: d.inventoryId, stockItemId: stock.id,
    ownerId: d.ownerId, ownerType: d.ownerType, quantity: d.quantity,
    status: 'Active', releasedAt: null,
    attributes: d.attributes ?? {}, createdAt: now,
  };
  await deps.allocationRepo.insert(allocation);

  await recordLedgerAndMovement(deps, d.tenantId, d.inventoryId, stock.id, 'allocation', d.quantity, stock, d.locationId, null, `Allocated for ${d.ownerType}:${d.ownerId}`, d.actorId, d.correlationId);
  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.allocated', 'inventory.allocated.v1', { allocationId: allocId, quantity: d.quantity }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'allocated', { allocationId: allocId, quantity: d.quantity }, d.inventoryId);
  return Ok(allocation);
}

export async function releaseAllocationUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; allocationId: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<Allocation, ValidationError | NotFoundError | ConflictError>> {
  const v = releaseAllocationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const alloc = await deps.allocationRepo.findById(d.tenantId, d.allocationId);
  if (!alloc) return Err(new NotFoundError('Allocation not found'));
  if (alloc.status === 'Released') return Err(new ConflictError('Already released'));

  const now = deps.clock.now().toISOString();
  await deps.allocationRepo.update(d.tenantId, d.allocationId, { status: 'Released', releasedAt: now });

  const stock = await deps.stockRepo.findById(d.tenantId, alloc.stockItemId);
  if (stock) {
    stock.allocated = Math.max(0, stock.allocated - alloc.quantity);
    stock.updatedAt = now;
    await deps.stockRepo.update(d.tenantId, stock.id, { allocated: stock.allocated, updatedAt: now });
    await recordLedgerAndMovement(deps, d.tenantId, alloc.inventoryId, stock.id, 'release', -alloc.quantity, stock, null, null, 'Allocation released', d.actorId, d.correlationId);
  }

  await deps.eventBus.emit(env(deps, alloc.inventoryId, d.tenantId, d.correlationId, 'inventory.released', 'inventory.allocation.released.v1', { allocationId: d.allocationId }));
  await audit(deps, '', d.tenantId, d.actorId, d.correlationId, 'allocation_released', { allocationId: d.allocationId }, alloc.inventoryId);
  return Ok({ ...alloc, status: 'Released', releasedAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// AVAILABILITY (2)
// ════════════════════════════════════════════════════════════════════════════

export async function checkAvailabilityUseCase(
  input: { tenantId: string; inventoryId: string; locationId?: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<StockSummary, ValidationError>> {
  const v = checkAvailabilitySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  let stocks = await deps.stockRepo.findByInventory(d.tenantId, d.inventoryId);
  if (d.locationId !== undefined) stocks = stocks.filter((s) => s.locationId === d.locationId);
  return Ok(computeSummary(stocks));
}

export async function getAvailableQuantityUseCase(
  input: { tenantId: string; inventoryId: string; locationId?: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<number, ValidationError>> {
  const v = getAvailableQuantitySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  let stocks = await deps.stockRepo.findByInventory(d.tenantId, d.inventoryId);
  if (d.locationId !== undefined) stocks = stocks.filter((s) => s.locationId === d.locationId);
  return Ok(computeSummary(stocks).available);
}

// ════════════════════════════════════════════════════════════════════════════
// MOVEMENT (1 read)
// ════════════════════════════════════════════════════════════════════════════

export async function listMovementsUseCase(
  input: { tenantId: string; inventoryId: string; limit?: number },
  deps: InventoryUseCaseDeps,
): Promise<Result<InventoryMovement[], ValidationError>> {
  const v = listMovementsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.movementRepo.findByInventory(v.data.tenantId, v.data.inventoryId, v.data.limit));
}

// ════════════════════════════════════════════════════════════════════════════
// LEDGER + SNAPSHOT (2)
// ════════════════════════════════════════════════════════════════════════════

export async function getLedgerUseCase(
  input: { tenantId: string; inventoryId: string; limit?: number },
  deps: InventoryUseCaseDeps,
): Promise<Result<InventoryLedgerEntry[], ValidationError>> {
  const v = getLedgerSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.ledgerRepo.findByInventory(v.data.tenantId, v.data.inventoryId, v.data.limit));
}

export async function rebuildSnapshotUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; inventoryId: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<AvailabilitySnapshot, ValidationError | NotFoundError>> {
  const v = rebuildSnapshotSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const inv = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!inv) return Err(new NotFoundError('Inventory not found'));

  const stocks = await deps.stockRepo.findByInventory(d.tenantId, d.inventoryId);
  const summary = computeSummary(stocks);
  let thresholdStatus: 'normal' | 'low' | 'critical' = 'normal';
  if (summary.available <= inv.threshold.safetyStock) thresholdStatus = 'critical';
  else if (summary.available <= inv.threshold.lowStockThreshold) thresholdStatus = 'low';

  const snap: AvailabilitySnapshot = {
    id: deps.idGenerator.generate(), tenantId: d.tenantId, inventoryId: d.inventoryId,
    totalOnHand: summary.onHand, totalReserved: summary.reserved,
    totalAllocated: summary.allocated, totalAvailable: summary.available,
    locationCount: stocks.length, thresholdStatus,
    snapshotAt: deps.clock.now().toISOString(),
  };
  await deps.availabilityRepo.insert(snap);
  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.snapshot.updated', 'inventory.snapshot.updated.v1', { inventoryId: d.inventoryId, totalAvailable: summary.available }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'snapshot_updated', { totalAvailable: summary.available, thresholdStatus }, d.inventoryId);
  return Ok(snap);
}

// ════════════════════════════════════════════════════════════════════════════
// THRESHOLD (2)
// ════════════════════════════════════════════════════════════════════════════

export async function setThresholdUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; inventoryId: string;
    safetyStock?: number; lowStockThreshold?: number; highStockThreshold?: number | null; },
  deps: InventoryUseCaseDeps,
): Promise<Result<{ inventoryId: string }, ValidationError | NotFoundError>> {
  const v = setThresholdSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const inv = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!inv) return Err(new NotFoundError('Inventory not found'));

  const newThreshold = { ...inv.threshold };
  if (d.safetyStock !== undefined) newThreshold.safetyStock = d.safetyStock;
  if (d.lowStockThreshold !== undefined) newThreshold.lowStockThreshold = d.lowStockThreshold;
  if (d.highStockThreshold !== undefined) newThreshold.highStockThreshold = d.highStockThreshold;

  await deps.inventoryRepo.update(d.tenantId, d.inventoryId, { threshold: newThreshold, updatedAt: deps.clock.now().toISOString() });
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'threshold_set', { threshold: newThreshold }, d.inventoryId);
  return Ok({ inventoryId: d.inventoryId });
}

export async function checkThresholdUseCase(
  input: { tenantId: string; inventoryId: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<{ status: 'normal' | 'low' | 'critical'; available: number }, ValidationError | NotFoundError>> {
  const v = checkThresholdSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const inv = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!inv) return Err(new NotFoundError('Inventory not found'));

  const stocks = await deps.stockRepo.findByInventory(d.tenantId, d.inventoryId);
  const available = computeSummary(stocks).available;

  let status: 'normal' | 'low' | 'critical' = 'normal';
  if (available <= inv.threshold.safetyStock) status = 'critical';
  else if (available <= inv.threshold.lowStockThreshold) status = 'low';

  return Ok({ status, available });
}

// ════════════════════════════════════════════════════════════════════════════
// TRANSFER (1)
// ════════════════════════════════════════════════════════════════════════════

export async function transferInventoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; inventoryId: string;
    fromLocationId: string; toLocationId: string; quantity: number; reason?: string; },
  deps: InventoryUseCaseDeps,
): Promise<Result<{ fromStockId: string; toStockId: string }, ValidationError | NotFoundError | ConflictError>> {
  const v = transferInventorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const inv = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!inv) return Err(new NotFoundError('Inventory not found'));

  const fromStock = await deps.stockRepo.findByInventoryAndLocation(d.tenantId, d.inventoryId, d.fromLocationId);
  if (!fromStock) return Err(new NotFoundError('Source stock not found'));
  if (fromStock.onHand < d.quantity) return Err(new ConflictError('Insufficient on-hand at source'));

  // Find or create destination stock
  let toStock = await deps.stockRepo.findByInventoryAndLocation(d.tenantId, d.inventoryId, d.toLocationId);
  const now = deps.clock.now().toISOString();
  if (!toStock) {
    toStock = {
      id: deps.idGenerator.generate(), tenantId: d.tenantId, inventoryId: d.inventoryId, locationId: d.toLocationId,
      onHand: 0, reserved: 0, allocated: 0, attributes: {}, createdAt: now, updatedAt: now,
    };
    await deps.stockRepo.insert(toStock);
  }

  fromStock.onHand -= d.quantity;
  toStock.onHand += d.quantity;
  fromStock.updatedAt = now;
  toStock.updatedAt = now;

  await deps.stockRepo.update(d.tenantId, fromStock.id, { onHand: fromStock.onHand, updatedAt: now });
  await deps.stockRepo.update(d.tenantId, toStock.id, { onHand: toStock.onHand, updatedAt: now });

  // Record movements for both legs
  await recordLedgerAndMovement(deps, d.tenantId, d.inventoryId, fromStock.id, 'transfer_out', -d.quantity, fromStock, d.fromLocationId, d.toLocationId, d.reason ?? 'Transfer out', d.actorId, d.correlationId);
  await recordLedgerAndMovement(deps, d.tenantId, d.inventoryId, toStock.id, 'transfer_in', d.quantity, toStock, d.fromLocationId, d.toLocationId, d.reason ?? 'Transfer in', d.actorId, d.correlationId);

  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.transfer.completed', 'inventory.transfer.completed.v1', { inventoryId: d.inventoryId, fromLocationId: d.fromLocationId, toLocationId: d.toLocationId, quantity: d.quantity }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'transfer_completed', { fromLocationId: d.fromLocationId, toLocationId: d.toLocationId, quantity: d.quantity }, d.inventoryId);
  return Ok({ fromStockId: fromStock.id, toStockId: toStock.id });
}
