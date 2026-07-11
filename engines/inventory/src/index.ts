/**
 * Inventory Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 5 — First Business Engine.
 * Platform SSoT for all reservable/sellable resources.
 */

export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

export type {
  Inventory, StockItem, Reservation, Allocation,
  InventoryMovement, InventoryLedgerEntry, AvailabilitySnapshot,
  InventoryStatus, ReservationStatus, MovementType,
  ThresholdConfig, StockSummary, Location,
  InventorySearchCriteria, InventorySearchResult,
  InventoryAuditRecord, InventoryAuditEventType,
} from './interfaces/index.js';

export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, ICatalogVerifier, ICustomDataPolicyProvider,
  IInventoryRepository, IStockItemRepository, IReservationRepository,
  IAllocationRepository, IMovementRepository, ILedgerRepository,
  IAvailabilityRepository, IInventoryAuditRepository,
} from './interfaces/index.js';

export {
  createInventoryUseCase, updateInventoryUseCase,
  archiveInventoryUseCase, restoreInventoryUseCase, deleteInventoryUseCase,
  searchInventoriesUseCase, listInventoriesUseCase,
  increaseStockUseCase, decreaseStockUseCase, adjustStockUseCase,
  type CreateInventoryInput,
} from './use-cases/InventoryLifecycleUseCases.js';

export {
  reserveInventoryUseCase, confirmReservationUseCase, cancelReservationUseCase, expireReservationUseCase,
  allocateInventoryUseCase, releaseAllocationUseCase,
  checkAvailabilityUseCase, getAvailableQuantityUseCase,
  listMovementsUseCase,
  getLedgerUseCase, rebuildSnapshotUseCase,
  setThresholdUseCase, checkThresholdUseCase,
  transferInventoryUseCase,
} from './use-cases/ReservationAllocationUseCases.js';

export type { InventoryUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories + Host Adapters
export {
  InMemoryInventoryRepository, InMemoryStockItemRepository,
  InMemoryReservationRepository, InMemoryAllocationRepository,
  InMemoryMovementRepository, InMemoryLedgerRepository,
  InMemoryAvailabilityRepository, InMemoryInventoryAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

export {
  InMemoryOrganizationVerifier, InMemoryCatalogVerifier,
  StaticInventoryPolicyProvider, InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
