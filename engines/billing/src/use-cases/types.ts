/**
 * Billing Engine — Shared Use Case Deps
 */
import type {
  IClock, IIdGenerator, IEventBus,
  IInvoiceRepository, IInvoiceLineRepository, IAdjustmentRepository,
  ICreditMemoRepository, IBillingTimelineRepository, IBillingAuditRepository,
  IOrganizationVerifier, ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface BillingUseCaseDeps {
  invoiceRepo: IInvoiceRepository;
  lineRepo: IInvoiceLineRepository;
  adjustmentRepo: IAdjustmentRepository;
  creditRepo: ICreditMemoRepository;
  timelineRepo: IBillingTimelineRepository;
  auditRepo: IBillingAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
