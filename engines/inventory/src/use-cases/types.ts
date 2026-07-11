/**
 * Inventory Engine — Shared Use Case Deps
 */

import type {
  IClock, IIdGenerator, IEventBus,
  IInventoryRepository, IStockItemRepository, IReservationRepository,
  IAllocationRepository, IMovementRepository, ILedgerRepository,
  IAvailabilityRepository, IInventoryAuditRepository,
  IOrganizationVerifier, ICatalogVerifier, ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface InventoryUseCaseDeps {
  inventoryRepo: IInventoryRepository;
  stockRepo: IStockItemRepository;
  reservationRepo: IReservationRepository;
  allocationRepo: IAllocationRepository;
  movementRepo: IMovementRepository;
  ledgerRepo: ILedgerRepository;
  availabilityRepo: IAvailabilityRepository;
  auditRepo: IInventoryAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  catalogVerifier: ICatalogVerifier;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
