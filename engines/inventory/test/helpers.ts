/**
 * Test fixtures — Inventory Engine
 */
import type { InventoryUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryInventoryRepository, InMemoryStockItemRepository,
  InMemoryReservationRepository, InMemoryAllocationRepository,
  InMemoryMovementRepository, InMemoryLedgerRepository,
  InMemoryAvailabilityRepository, InMemoryInventoryAuditRepository,
  InMemoryOrganizationVerifier, InMemoryCatalogVerifier,
  StaticInventoryPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let o = 0;
  return { now: () => new Date(new Date('2026-07-11T08:00:00.000Z').getTime() + o++ * 1000) };
}

export function makeDeps(): InventoryUseCaseDeps & {
  inventoryRepo: InMemoryInventoryRepository; stockRepo: InMemoryStockItemRepository;
  reservationRepo: InMemoryReservationRepository; allocationRepo: InMemoryAllocationRepository;
  movementRepo: InMemoryMovementRepository; ledgerRepo: InMemoryLedgerRepository;
  availabilityRepo: InMemoryAvailabilityRepository; auditRepo: InMemoryInventoryAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  catalogVerifier: InMemoryCatalogVerifier;
  policyProvider: StaticInventoryPolicyProvider;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const inventoryRepo = new InMemoryInventoryRepository();
  const stockRepo = new InMemoryStockItemRepository();
  const reservationRepo = new InMemoryReservationRepository();
  const allocationRepo = new InMemoryAllocationRepository();
  const movementRepo = new InMemoryMovementRepository();
  const ledgerRepo = new InMemoryLedgerRepository();
  const availabilityRepo = new InMemoryAvailabilityRepository();
  const auditRepo = new InMemoryInventoryAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const catalogVerifier = new InMemoryCatalogVerifier();
  const policyProvider = new StaticInventoryPolicyProvider();
  policyProvider.set('t-1', { allowedTypes: ['physical', 'digital', 'slot'] });
  organizationVerifier.add('t-1', 'org-1');
  catalogVerifier.addItem('t-1', 'item-1');

  let idCounter = 0;
  return {
    inventoryRepo, stockRepo, reservationRepo, allocationRepo,
    movementRepo, ledgerRepo, availabilityRepo, auditRepo, eventBus,
    organizationVerifier, catalogVerifier, policyProvider,
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random()*1e6).toString(36)}` },
    clock: makeClock(),
  };
}
