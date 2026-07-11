/**
 * Inventory Engine — Lifecycle + Stock UseCases (8 + 3 = 11)
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  createInventorySchema, updateInventorySchema,
  archiveInventorySchema, restoreInventorySchema, deleteInventorySchema,
  searchInventoriesSchema,
  increaseStockSchema, decreaseStockSchema, adjustStockSchema,
} from '../domain/validation.js';
import type { InventoryUseCaseDeps } from './types.js';
import type {
  Inventory, StockItem, InventorySearchCriteria, InventorySearchResult,
  StockSummary, MovementType, InventoryMovement, InventoryLedgerEntry,
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

async function recordLedgerAndMovement(
  deps: InventoryUseCaseDeps,
  tenantId: string, inventoryId: string, stockItemId: string,
  movementType: MovementType, quantityDelta: number,
  stock: StockItem,
  fromLoc: string | null, toLoc: string | null,
  reason: string, actorId: string, corr: string,
): Promise<void> {
  const now = deps.clock.now().toISOString();
  const movement: InventoryMovement = {
    id: deps.idGenerator.generate(), tenantId, inventoryId, stockItemId,
    movementType, quantity: Math.abs(quantityDelta),
    fromLocationId: fromLoc, toLocationId: toLoc,
    reason, referenceType: null, referenceId: null,
    actorId, correlationId: corr, metadata: {}, createdAt: now,
  };
  await deps.movementRepo.insert(movement);

  const ledger: InventoryLedgerEntry = {
    id: deps.idGenerator.generate(), tenantId, inventoryId, stockItemId,
    movementId: movement.id, movementType,
    quantityDelta, balanceAfter: stock.onHand,
    reservedAfter: stock.reserved, allocatedAfter: stock.allocated,
    referenceType: null, referenceId: null, actorId, createdAt: now,
  };
  await deps.ledgerRepo.insert(ledger);
}

// ════════════════════════════════════════════════════════════════════════════
// INVENTORY LIFECYCLE (5)
// ════════════════════════════════════════════════════════════════════════════

export interface CreateInventoryInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  name: string; slug: string; type: string; unit: string;
  catalogItemId?: string | null; catalogVariantId?: string | null;
  description?: string; tracksBatch?: boolean; perishable?: boolean;
  safetyStock?: number; lowStockThreshold?: number; highStockThreshold?: number | null;
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export async function createInventoryUseCase(
  input: CreateInventoryInput, deps: InventoryUseCaseDeps,
): Promise<Result<{ inventoryId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createInventorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  if (await deps.inventoryRepo.existsBySlug(d.tenantId, d.slug)) {
    return Err(new ConflictError('slug already exists'));
  }

  const allowedTypes = await deps.policyProvider.getAllowedInventoryTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) {
    return Err(new ValidationError(`type "${d.type}" not allowed`));
  }

  const pr = await deps.policyProvider.validateAttributes(d.tenantId, d.type, d.attributes ?? {});
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));

  const maxInv = await deps.policyProvider.getMaxInventoriesPerOrg(d.tenantId);
  if (await deps.inventoryRepo.countByOrganization(d.tenantId, d.organizationId) >= maxInv) {
    return Err(new ConflictError(`Max inventories (${maxInv}) reached`));
  }

  const invId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const defaultSafety = await deps.policyProvider.getDefaultSafetyStock(d.tenantId);

  const inv: Inventory = {
    id: invId, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, slug: d.slug, status: 'Active', type: d.type,
    catalogItemId: d.catalogItemId ?? null, catalogVariantId: d.catalogVariantId ?? null,
    unit: d.unit, tracksBatch: d.tracksBatch ?? false, perishable: d.perishable ?? false,
    threshold: {
      safetyStock: d.safetyStock ?? defaultSafety,
      lowStockThreshold: d.lowStockThreshold ?? defaultSafety,
      highStockThreshold: d.highStockThreshold ?? null,
    },
    attributes: pr.value, customFields: d.customFields ?? {}, metadata: d.metadata ?? {},
    tags: d.tags ?? [],
    createdAt: now, createdBy: d.actorId, updatedAt: now, updatedBy: d.actorId,
    archivedAt: null, deletedAt: null,
  };
  if (d.description !== undefined) inv.description = d.description;

  await deps.inventoryRepo.insert(inv);
  await deps.eventBus.emit(env(deps, invId, d.tenantId, d.correlationId, 'inventory.created', 'inventory.created.v1', { inventoryId: invId }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'inventory_created', { name: d.name }, invId);
  return Ok({ inventoryId: invId, createdAt: now });
}

export async function updateInventoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; inventoryId: string;
    name?: string; description?: string;
    safetyStock?: number; lowStockThreshold?: number; highStockThreshold?: number | null;
    attributes?: Record<string, unknown>; customFields?: Record<string, unknown>; tags?: string[]; },
  deps: InventoryUseCaseDeps,
): Promise<Result<Inventory, ValidationError | NotFoundError | ConflictError>> {
  const v = updateInventorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const ex = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!ex) return Err(new NotFoundError('Inventory not found'));
  if (ex.status !== 'Active') return Err(new ConflictError(`Cannot update — status "${ex.status}"`));

  const now = deps.clock.now().toISOString();
  const patch: Partial<Inventory> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.description !== undefined) patch.description = d.description;
  if (d.customFields !== undefined) patch.customFields = d.customFields;
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.safetyStock !== undefined || d.lowStockThreshold !== undefined || d.highStockThreshold !== undefined) {
    const newThreshold = { ...ex.threshold };
    if (d.safetyStock !== undefined) newThreshold.safetyStock = d.safetyStock;
    if (d.lowStockThreshold !== undefined) newThreshold.lowStockThreshold = d.lowStockThreshold;
    if (d.highStockThreshold !== undefined) newThreshold.highStockThreshold = d.highStockThreshold;
    patch.threshold = newThreshold;
  }
  if (d.attributes !== undefined) {
    const pr = await deps.policyProvider.validateAttributes(d.tenantId, ex.type, d.attributes);
    if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));
    patch.attributes = pr.value;
  }

  await deps.inventoryRepo.update(d.tenantId, d.inventoryId, patch);
  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.updated', 'inventory.updated.v1', { inventoryId: d.inventoryId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'inventory_updated', {}, d.inventoryId);
  return Ok({ ...ex, ...patch } as Inventory);
}

export async function archiveInventoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; inventoryId: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<Inventory, ValidationError | NotFoundError | ConflictError>> {
  const v = archiveInventorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!ex) return Err(new NotFoundError('Inventory not found'));
  if (ex.status === 'Archived') return Err(new ConflictError('Already archived'));
  if (ex.status === 'Deleted') return Err(new ConflictError('Cannot archive deleted'));
  const now = deps.clock.now().toISOString();
  await deps.inventoryRepo.update(d.tenantId, d.inventoryId, { status: 'Archived', archivedAt: now, updatedAt: now });
  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.updated', 'inventory.archived.v1', { inventoryId: d.inventoryId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'inventory_archived', {}, d.inventoryId);
  return Ok({ ...ex, status: 'Archived', archivedAt: now });
}

export async function restoreInventoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; inventoryId: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<Inventory, ValidationError | NotFoundError | ConflictError>> {
  const v = restoreInventorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!ex) return Err(new NotFoundError('Inventory not found'));
  if (ex.status !== 'Archived') return Err(new ConflictError(`Cannot restore from "${ex.status}"`));
  const now = deps.clock.now().toISOString();
  await deps.inventoryRepo.update(d.tenantId, d.inventoryId, { status: 'Active', archivedAt: null, updatedAt: now });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'inventory_restored', {}, d.inventoryId);
  return Ok({ ...ex, status: 'Active', archivedAt: null, updatedAt: now });
}

export async function deleteInventoryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; inventoryId: string },
  deps: InventoryUseCaseDeps,
): Promise<Result<{ inventoryId: string }, ValidationError | NotFoundError | ConflictError>> {
  const v = deleteInventorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!ex) return Err(new NotFoundError('Inventory not found'));
  if (ex.status === 'Deleted') return Err(new ConflictError('Already deleted'));
  const now = deps.clock.now().toISOString();
  await deps.inventoryRepo.update(d.tenantId, d.inventoryId, { status: 'Deleted', deletedAt: now, updatedAt: now });
  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.updated', 'inventory.deleted.v1', { inventoryId: d.inventoryId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'inventory_deleted', {}, d.inventoryId);
  return Ok({ inventoryId: d.inventoryId });
}

export async function searchInventoriesUseCase(
  input: InventorySearchCriteria, deps: InventoryUseCaseDeps,
): Promise<Result<InventorySearchResult, ValidationError>> {
  const v = searchInventoriesSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search'));
  return Ok(await deps.inventoryRepo.search(v.data as InventorySearchCriteria));
}

export async function listInventoriesUseCase(
  input: { tenantId: string; organizationId: string; limit?: number; offset?: number },
  deps: InventoryUseCaseDeps,
): Promise<Result<InventorySearchResult, ValidationError>> {
  return Ok(await deps.inventoryRepo.search({
    tenantId: input.tenantId, organizationId: input.organizationId,
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.offset !== undefined ? { offset: input.offset } : {}),
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// STOCK OPERATIONS (3)
// ════════════════════════════════════════════════════════════════════════════

async function getOrCreateStock(deps: InventoryUseCaseDeps, tenantId: string, inventoryId: string, locationId: string, locationName?: string): Promise<StockItem> {
  let stock = await deps.stockRepo.findByInventoryAndLocation(tenantId, inventoryId, locationId);
  if (!stock) {
    const now = deps.clock.now().toISOString();
    stock = {
      id: deps.idGenerator.generate(), tenantId, inventoryId, locationId,
      onHand: 0, reserved: 0, allocated: 0,
      attributes: {}, createdAt: now, updatedAt: now,
    };
    if (locationName !== undefined) stock.locationName = locationName;
    await deps.stockRepo.insert(stock);
  }
  return stock;
}

export async function increaseStockUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    inventoryId: string; locationId: string; quantity: number;
    locationName?: string; batchNumber?: string; expiresAt?: string;
    reason?: string; attributes?: Record<string, unknown>; },
  deps: InventoryUseCaseDeps,
): Promise<Result<StockItem, ValidationError | NotFoundError | ConflictError>> {
  const v = increaseStockSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const inv = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!inv) return Err(new NotFoundError('Inventory not found'));
  if (inv.status !== 'Active') return Err(new ConflictError('Inventory not active'));

  let stock = await getOrCreateStock(deps, d.tenantId, d.inventoryId, d.locationId, d.locationName);
  stock.onHand += d.quantity;
  if (d.batchNumber !== undefined) stock.batchNumber = d.batchNumber;
  if (d.expiresAt !== undefined) stock.expiresAt = d.expiresAt;
  stock.updatedAt = deps.clock.now().toISOString();

  await deps.stockRepo.update(d.tenantId, stock.id, { onHand: stock.onHand, updatedAt: stock.updatedAt,
    ...(d.batchNumber !== undefined ? { batchNumber: d.batchNumber } : {}),
    ...(d.expiresAt !== undefined ? { expiresAt: d.expiresAt } : {}),
  });

  await recordLedgerAndMovement(deps, d.tenantId, d.inventoryId, stock.id, 'increase', d.quantity, stock, null, d.locationId, d.reason ?? 'Stock increase', d.actorId, d.correlationId);
  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.stock.increased', 'inventory.stock.increased.v1', { inventoryId: d.inventoryId, quantity: d.quantity, locationId: d.locationId }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'stock_increased', { quantity: d.quantity, locationId: d.locationId }, d.inventoryId);
  return Ok(stock);
}

export async function decreaseStockUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    inventoryId: string; locationId: string; quantity: number; reason?: string; },
  deps: InventoryUseCaseDeps,
): Promise<Result<StockItem, ValidationError | NotFoundError | ConflictError>> {
  const v = decreaseStockSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const inv = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!inv) return Err(new NotFoundError('Inventory not found'));
  if (inv.status !== 'Active') return Err(new ConflictError('Inventory not active'));

  const stock = await deps.stockRepo.findByInventoryAndLocation(d.tenantId, d.inventoryId, d.locationId);
  if (!stock) return Err(new NotFoundError('Stock not found at location'));
  if (stock.onHand < d.quantity) return Err(new ConflictError('Insufficient on-hand stock'));

  stock.onHand -= d.quantity;
  stock.updatedAt = deps.clock.now().toISOString();
  await deps.stockRepo.update(d.tenantId, stock.id, { onHand: stock.onHand, updatedAt: stock.updatedAt });

  await recordLedgerAndMovement(deps, d.tenantId, d.inventoryId, stock.id, 'decrease', -d.quantity, stock, d.locationId, null, d.reason ?? 'Stock decrease', d.actorId, d.correlationId);
  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.stock.decreased', 'inventory.stock.decreased.v1', { inventoryId: d.inventoryId, quantity: d.quantity }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'stock_decreased', { quantity: d.quantity }, d.inventoryId);

  // Check threshold
  const available = stock.onHand - stock.reserved - stock.allocated;
  if (available <= inv.threshold.safetyStock) {
    await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.threshold.reached', 'inventory.threshold.reached.v1', { inventoryId: d.inventoryId, available, threshold: inv.threshold.safetyStock }));
    await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'threshold_reached', { available, threshold: inv.threshold.safetyStock }, d.inventoryId);
  }

  return Ok(stock);
}

export async function adjustStockUseCase(
  input: { tenantId: string; correlationId: string; actorId: string;
    inventoryId: string; locationId: string; newOnHand: number; reason?: string; },
  deps: InventoryUseCaseDeps,
): Promise<Result<StockItem, ValidationError | NotFoundError | ConflictError>> {
  const v = adjustStockSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const inv = await deps.inventoryRepo.findById(d.tenantId, d.inventoryId);
  if (!inv) return Err(new NotFoundError('Inventory not found'));

  const stock = await deps.stockRepo.findByInventoryAndLocation(d.tenantId, d.inventoryId, d.locationId);
  if (!stock) return Err(new NotFoundError('Stock not found at location'));

  const delta = d.newOnHand - stock.onHand;
  stock.onHand = d.newOnHand;
  stock.updatedAt = deps.clock.now().toISOString();
  await deps.stockRepo.update(d.tenantId, stock.id, { onHand: stock.onHand, updatedAt: stock.updatedAt });

  await recordLedgerAndMovement(deps, d.tenantId, d.inventoryId, stock.id, 'adjustment', delta, stock, d.locationId, d.locationId, d.reason ?? 'Stock adjustment', d.actorId, d.correlationId);
  await deps.eventBus.emit(env(deps, d.inventoryId, d.tenantId, d.correlationId, 'inventory.adjusted', 'inventory.adjusted.v1', { inventoryId: d.inventoryId, newOnHand: d.newOnHand }));
  await audit(deps, inv.organizationId, d.tenantId, d.actorId, d.correlationId, 'stock_adjusted', { newOnHand: d.newOnHand }, d.inventoryId);
  return Ok(stock);
}
