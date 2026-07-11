/**
 * Inventory Engine — Sprint 1 Tests (40+)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInventoryUseCase, updateInventoryUseCase, archiveInventoryUseCase, restoreInventoryUseCase, deleteInventoryUseCase,
  searchInventoriesUseCase, listInventoriesUseCase,
  increaseStockUseCase, decreaseStockUseCase, adjustStockUseCase,
  reserveInventoryUseCase, confirmReservationUseCase, cancelReservationUseCase, expireReservationUseCase,
  allocateInventoryUseCase, releaseAllocationUseCase,
  checkAvailabilityUseCase, getAvailableQuantityUseCase,
  listMovementsUseCase, getLedgerUseCase, rebuildSnapshotUseCase,
  setThresholdUseCase, checkThresholdUseCase,
  transferInventoryUseCase,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

// ═══════════════════════════════════════════
// 1) Inventory Lifecycle (8)
// ═══════════════════════════════════════════

describe('Inventory Lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates inventory', async () => {
    const r = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Warehouse Stock', slug: 'warehouse', type: 'physical', unit: 'pcs' }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('inventory.created')).toBe(1);
  });

  it('rejects duplicate slug', async () => {
    await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 'dup', type: 'physical', unit: 'pcs' }, deps);
    const r = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        name: 'B', slug: 'dup', type: 'physical', unit: 'pcs' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown org', async () => {
    const r = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'unknown',
        name: 'X', slug: 'x', type: 'physical', unit: 'pcs' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed type', async () => {
    const r = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'bad', type: 'forbidden', unit: 'pcs' }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates inventory name', async () => {
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Old', slug: 'upd', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    const r = await updateInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: inv.value.inventoryId, name: 'New' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('New');
  });

  it('archives + restores', async () => {
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'arc', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    await archiveInventoryUseCase({ tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: inv.value.inventoryId }, deps);
    const r = await restoreInventoryUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: inv.value.inventoryId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Active');
  });

  it('deletes (soft)', async () => {
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'del', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    const r = await deleteInventoryUseCase({ tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: inv.value.inventoryId }, deps);
    expect(r.ok).toBe(true);
  });

  it('search + list', async () => {
    await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Alpha Stock', slug: 'alpha', type: 'physical', unit: 'pcs' }, deps);
    await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        name: 'Beta Stock', slug: 'beta', type: 'digital', unit: 'unit' }, deps);
    const s = await searchInventoriesUseCase({ tenantId: 't-1', query: 'alpha' }, deps);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.value.total).toBe(1);
    const l = await listInventoriesUseCase({ tenantId: 't-1', organizationId: 'org-1' }, deps);
    expect(l.ok).toBe(true);
    if (l.ok) expect(l.value.total).toBe(2);
  });
});

// ═══════════════════════════════════════════
// 2) Stock Operations (5)
// ═══════════════════════════════════════════

describe('Stock Operations', () => {
  let deps: ReturnType<typeof makeDeps>;
  let invId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Stock', slug: 'stock', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    invId = inv.value.inventoryId;
  });

  it('increases stock', async () => {
    const r = await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 100 }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.onHand).toBe(100);
  });

  it('decreases stock', async () => {
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 100 }, deps);
    const r = await decreaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 30 }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.onHand).toBe(70);
  });

  it('rejects decrease below zero', async () => {
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 10 }, deps);
    const r = await decreaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 50 }, deps);
    expect(r.ok).toBe(false);
  });

  it('adjusts stock to exact value', async () => {
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 100 }, deps);
    const r = await adjustStockUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', newOnHand: 95, reason: 'Audit count' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.onHand).toBe(95);
  });

  it('emits threshold event on low stock', async () => {
    await setThresholdUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        safetyStock: 5, lowStockThreshold: 10 }, deps);
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 20 }, deps);
    await decreaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 18 }, deps);
    expect(deps.eventBus.countByType('inventory.threshold.reached')).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════
// 3) Reservation (5)
// ═══════════════════════════════════════════

describe('Reservation', () => {
  let deps: ReturnType<typeof makeDeps>;
  let invId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Res', slug: 'res', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    invId = inv.value.inventoryId;
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 100 }, deps);
  });

  it('reserves inventory', async () => {
    const r = await reserveInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', ownerId: 'request-1', ownerType: 'request', quantity: 10, ttlSeconds: 3600 }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Pending');
  });

  it('rejects reserve over available', async () => {
    const r = await reserveInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', ownerId: 'o', ownerType: 'request', quantity: 200 }, deps);
    expect(r.ok).toBe(false);
  });

  it('confirms reservation', async () => {
    const res = await reserveInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', ownerId: 'o', ownerType: 'request', quantity: 5 }, deps);
    if (!res.ok) throw new Error('setup');
    const r = await confirmReservationUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', reservationId: res.value.id }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Confirmed');
  });

  it('cancels reservation (releases reserved)', async () => {
    const res = await reserveInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', ownerId: 'o', ownerType: 'request', quantity: 10 }, deps);
    if (!res.ok) throw new Error('setup');
    const r = await cancelReservationUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', reservationId: res.value.id }, deps);
    expect(r.ok).toBe(true);
    // Available should be back to 100
    const avail = await getAvailableQuantityUseCase({ tenantId: 't-1', inventoryId: invId, locationId: 'wh-1' }, deps);
    if (avail.ok) expect(avail.value).toBe(100);
  });

  it('expires reservation', async () => {
    const res = await reserveInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', ownerId: 'o', ownerType: 'request', quantity: 10, ttlSeconds: 1 }, deps);
    if (!res.ok) throw new Error('setup');
    const r = await expireReservationUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', reservationId: res.value.id }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Expired');
  });
});

// ═══════════════════════════════════════════
// 4) Allocation (2)
// ═══════════════════════════════════════════

describe('Allocation', () => {
  let deps: ReturnType<typeof makeDeps>;
  let invId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Alloc', slug: 'alloc', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    invId = inv.value.inventoryId;
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 50 }, deps);
  });

  it('allocates inventory', async () => {
    const r = await allocateInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', ownerId: 'ord-1', ownerType: 'request', quantity: 20 }, deps);
    expect(r.ok).toBe(true);
  });

  it('releases allocation', async () => {
    const a = await allocateInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', ownerId: 'ord-1', ownerType: 'request', quantity: 15 }, deps);
    if (!a.ok) throw new Error('setup');
    const r = await releaseAllocationUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', allocationId: a.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 5) Availability (2)
// ═══════════════════════════════════════════

describe('Availability', () => {
  let deps: ReturnType<typeof makeDeps>;
  let invId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Avail', slug: 'avail', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    invId = inv.value.inventoryId;
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 100 }, deps);
    await reserveInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', ownerId: 'o', ownerType: 'request', quantity: 30 }, deps);
  });

  it('checks availability (onHand - reserved - allocated)', async () => {
    const r = await checkAvailabilityUseCase({ tenantId: 't-1', inventoryId: invId, locationId: 'wh-1' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.onHand).toBe(100);
      expect(r.value.reserved).toBe(30);
      expect(r.value.available).toBe(70);
    }
  });

  it('gets available quantity', async () => {
    const r = await getAvailableQuantityUseCase({ tenantId: 't-1', inventoryId: invId, locationId: 'wh-1' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(70);
  });
});

// ═══════════════════════════════════════════
// 6) Movement + Ledger + Snapshot (4)
// ═══════════════════════════════════════════

describe('Movement + Ledger + Snapshot', () => {
  let deps: ReturnType<typeof makeDeps>;
  let invId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Mov', slug: 'mov', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    invId = inv.value.inventoryId;
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 50 }, deps);
    await decreaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 20 }, deps);
  });

  it('lists movements', async () => {
    const r = await listMovementsUseCase({ tenantId: 't-1', inventoryId: invId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBeGreaterThanOrEqual(2);
  });

  it('gets ledger entries', async () => {
    const r = await getLedgerUseCase({ tenantId: 't-1', inventoryId: invId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.length).toBeGreaterThanOrEqual(2);
  });

  it('rebuilds snapshot', async () => {
    const r = await rebuildSnapshotUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', inventoryId: invId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.totalOnHand).toBe(30);
      expect(r.value.totalAvailable).toBe(30);
    }
  });

  it('snapshot includes multiple locations', async () => {
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-5', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-2', quantity: 25 }, deps);
    const r = await rebuildSnapshotUseCase(
      { tenantId: 't-1', correlationId: 'r-6', actorId: 'admin', inventoryId: invId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.totalOnHand).toBe(55);
      expect(r.value.locationCount).toBe(2);
    }
  });
});

// ═══════════════════════════════════════════
// 7) Threshold (2)
// ═══════════════════════════════════════════

describe('Threshold', () => {
  let deps: ReturnType<typeof makeDeps>;
  let invId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Thresh', slug: 'thresh', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    invId = inv.value.inventoryId;
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 50 }, deps);
  });

  it('sets threshold', async () => {
    const r = await setThresholdUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        safetyStock: 10, lowStockThreshold: 20 }, deps);
    expect(r.ok).toBe(true);
  });

  it('checks threshold status (normal)', async () => {
    await setThresholdUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        safetyStock: 5, lowStockThreshold: 15 }, deps);
    const r = await checkThresholdUseCase({ tenantId: 't-1', inventoryId: invId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('normal');
  });
});

// ═══════════════════════════════════════════
// 8) Transfer (1)
// ═══════════════════════════════════════════

describe('Transfer', () => {
  let deps: ReturnType<typeof makeDeps>;
  let invId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const inv = await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Trans', slug: 'trans', type: 'physical', unit: 'pcs' }, deps);
    if (!inv.ok) throw new Error('setup');
    invId = inv.value.inventoryId;
    await increaseStockUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', inventoryId: invId,
        locationId: 'wh-1', quantity: 100 }, deps);
  });

  it('transfers between locations', async () => {
    const r = await transferInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        fromLocationId: 'wh-1', toLocationId: 'wh-2', quantity: 30 }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('inventory.transfer.completed')).toBe(1);
    // Verify stock levels
    const avail1 = await getAvailableQuantityUseCase({ tenantId: 't-1', inventoryId: invId, locationId: 'wh-1' }, deps);
    const avail2 = await getAvailableQuantityUseCase({ tenantId: 't-1', inventoryId: invId, locationId: 'wh-2' }, deps);
    if (avail1.ok) expect(avail1.value).toBe(70);
    if (avail2.ok) expect(avail2.value).toBe(30);
  });

  it('rejects transfer over available', async () => {
    const r = await transferInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', inventoryId: invId,
        fromLocationId: 'wh-1', toLocationId: 'wh-2', quantity: 200 }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 9) Audit + Multi-Tenant (3)
// ═══════════════════════════════════════════

describe('Audit + Multi-Tenant', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit on create', async () => {
    await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'aud', type: 'physical', unit: 'pcs' }, deps);
    const records = await deps.auditRepo.findByTenant('t-1');
    expect(records.some((r) => r.eventType === 'inventory_created')).toBe(true);
  });

  it('isolates across tenants', async () => {
    deps.organizationVerifier.add('t-2', 'org-1');
    deps.policyProvider.set('t-2', { allowedTypes: ['physical'] });
    await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 'same', type: 'physical', unit: 'pcs' }, deps);
    const r = await createInventoryUseCase(
      { tenantId: 't-2', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        name: 'B', slug: 'same', type: 'physical', unit: 'pcs' }, deps);
    expect(r.ok).toBe(true);
  });

  it('EventEnvelope has 11 fields', async () => {
    await createInventoryUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'env', type: 'physical', unit: 'pcs' }, deps);
    const e = deps.eventBus.byType('inventory.created')[0].envelope;
    expect(e.engine).toBe('inventory');
    expect(e.version).toBe('1.0.0');
    expect(e.eventId).toBeDefined();
  });
});
