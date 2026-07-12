/**
 * Inventory Engine — Demo
 */
import {
  createInventoryUseCase, increaseStockUseCase, decreaseStockUseCase,
  reserveInventoryUseCase, confirmReservationUseCase,
  allocateInventoryUseCase, releaseAllocationUseCase,
  checkAvailabilityUseCase, transferInventoryUseCase,
  rebuildSnapshotUseCase, setThresholdUseCase, checkThresholdUseCase,
  InMemoryInventoryRepository, InMemoryStockItemRepository,
  InMemoryReservationRepository, InMemoryAllocationRepository,
  InMemoryMovementRepository, InMemoryLedgerRepository,
  InMemoryAvailabilityRepository, InMemoryInventoryAuditRepository,
  InMemoryOrganizationVerifier, InMemoryCatalogVerifier,
  StaticInventoryPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Inventory Engine — Demo ═══\n');
  const deps = {
    inventoryRepo: new InMemoryInventoryRepository(),
    stockRepo: new InMemoryStockItemRepository(),
    reservationRepo: new InMemoryReservationRepository(),
    allocationRepo: new InMemoryAllocationRepository(),
    movementRepo: new InMemoryMovementRepository(),
    ledgerRepo: new InMemoryLedgerRepository(),
    availabilityRepo: new InMemoryAvailabilityRepository(),
    auditRepo: new InMemoryInventoryAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier: new InMemoryOrganizationVerifier(),
    catalogVerifier: new InMemoryCatalogVerifier(),
    policyProvider: new StaticInventoryPolicyProvider(),
    idGenerator: { generate: () => `demo-${Math.random().toString(36).slice(2,8)}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  deps.organizationVerifier.add('demo', 'org-1');
  deps.policyProvider.set('demo', { allowedTypes: ['physical'] });
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Create Inventory');
  const inv = u(await createInventoryUseCase(
    { tenantId: 'demo', correlationId: 'd1', actorId: 'admin', organizationId: 'org-1',
      name: 'Main Warehouse', slug: 'main-wh', type: 'physical', unit: 'pcs' }, deps));
  console.log(`  ✓ inventoryId=${inv.inventoryId}\n`);

  console.log('▶ 2) Increase Stock (100 → wh-1)');
  u(await increaseStockUseCase(
    { tenantId: 'demo', correlationId: 'd2', actorId: 'admin', inventoryId: inv.inventoryId,
      locationId: 'wh-1', locationName: 'Main WH', quantity: 100 }, deps));
  console.log('  ✓ stock=100\n');

  console.log('▶ 3) Set Threshold');
  u(await setThresholdUseCase(
    { tenantId: 'demo', correlationId: 'd3', actorId: 'admin', inventoryId: inv.inventoryId,
      safetyStock: 10, lowStockThreshold: 20 }, deps));
  console.log('  ✓ safetyStock=10, lowStock=20\n');

  console.log('▶ 4) Reserve 30 units');
  const res = u(await reserveInventoryUseCase(
    { tenantId: 'demo', correlationId: 'd4', actorId: 'admin', inventoryId: inv.inventoryId,
      locationId: 'wh-1', ownerId: 'request-1', ownerType: 'request', quantity: 30, ttlSeconds: 3600 }, deps));
  console.log(`  ✓ reservationId=${res.id}\n`);

  console.log('▶ 5) Check Availability');
  const avail = u(await checkAvailabilityUseCase(
    { tenantId: 'demo', inventoryId: inv.inventoryId, locationId: 'wh-1' }, deps));
  console.log(`  onHand=${avail.onHand} reserved=${avail.reserved} available=${avail.available}\n`);

  console.log('▶ 6) Allocate 20 units');
  u(await allocateInventoryUseCase(
    { tenantId: 'demo', correlationId: 'd5', actorId: 'admin', inventoryId: inv.inventoryId,
      locationId: 'wh-1', ownerId: 'request-2', ownerType: 'request', quantity: 20 }, deps));
  console.log('  ✓ allocated=20\n');

  console.log('▶ 7) Transfer 25 units to wh-2');
  u(await transferInventoryUseCase(
    { tenantId: 'demo', correlationId: 'd6', actorId: 'admin', inventoryId: inv.inventoryId,
      fromLocationId: 'wh-1', toLocationId: 'wh-2', quantity: 25 }, deps));
  console.log('  ✓ transferred\n');

  console.log('▶ 8) Rebuild Snapshot');
  const snap = u(await rebuildSnapshotUseCase(
    { tenantId: 'demo', correlationId: 'd7', actorId: 'admin', inventoryId: inv.inventoryId }, deps));
  console.log(`  onHand=${snap.totalOnHand} available=${snap.totalAvailable} locations=${snap.locationCount}\n`);

  console.log('▶ 9) Check Threshold');
  const thr = u(await checkThresholdUseCase(
    { tenantId: 'demo', inventoryId: inv.inventoryId }, deps));
  console.log(`  status=${thr.status} available=${thr.available}\n`);

  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of deps.eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [t, c] of [...counts.entries()].sort()) console.log(`  ${t}: ${c}`);
  console.log('\n═══ Demo Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
