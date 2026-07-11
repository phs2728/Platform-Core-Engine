/**
 * Order Engine — Shared Use Case Deps
 */
import type {
  IClock, IIdGenerator, IEventBus,
  IOrderRepository, IOrderItemRepository, IOrderTimelineRepository,
  IOrderApprovalRepository, IOrderAuditRepository,
  IOrganizationVerifier, ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface OrderUseCaseDeps {
  orderRepo: IOrderRepository;
  itemRepo: IOrderItemRepository;
  timelineRepo: IOrderTimelineRepository;
  approvalRepo: IOrderApprovalRepository;
  auditRepo: IOrderAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
