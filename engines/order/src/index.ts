/**
 * Order Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Transaction Lifecycle Engine.
 */

export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

export type {
  Order, OrderItem, OrderApproval, OrderTimelineEntry,
  OrderStatus, ApprovalStatus, TimelineEventType, OrderReference,
  OrderSearchCriteria, OrderSearchResult,
  OrderAuditRecord, OrderAuditEventType,
} from './interfaces/index.js';

export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, ICustomDataPolicyProvider,
  IOrderRepository, IOrderItemRepository, IOrderTimelineRepository,
  IOrderApprovalRepository, IOrderAuditRepository,
} from './interfaces/index.js';

export {
  createOrderUseCase, updateOrderUseCase, cancelOrderUseCase,
  approveOrderUseCase, rejectOrderUseCase,
  archiveOrderUseCase, restoreOrderUseCase,
  getOrderUseCase, searchOrdersUseCase, listOrdersUseCase,
  submitOrderUseCase, confirmOrderUseCase, completeOrderUseCase, closeOrderUseCase,
  addItemUseCase, removeItemUseCase, updateItemUseCase,
  requestApprovalUseCase, approveUseCase, rejectApprovalUseCase,
  type CreateOrderInput,
} from './use-cases/OrderLifecycleUseCases.js';

export {
  attachBookingRefUseCase, attachInventoryRefUseCase,
  attachCatalogRefUseCase, attachPricingRefUseCase,
  appendTimelineUseCase, getTimelineUseCase,
} from './use-cases/ReferenceTimelineUseCases.js';

export type { OrderUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories + Host Adapters
export {
  InMemoryOrderRepository, InMemoryOrderItemRepository,
  InMemoryOrderTimelineRepository, InMemoryOrderApprovalRepository,
  InMemoryOrderAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

export {
  InMemoryOrganizationVerifier,
  StaticOrderPolicyProvider, InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
