/**
 * Payment Engine — Shared Use Case Deps
 */

import type {
  IClock, IIdGenerator, IEventBus,
  IPaymentRepository, ITransactionRepository, IRefundRepository,
  IInvoiceRepository, IReceiptRepository, ISettlementRepository,
  IWebhookRepository, IPaymentMethodRepository, IReconciliationRepository,
  IPaymentAuditRepository,
  IOrganizationVerifier, IUserVerifier,
  ICustomDataPolicyProvider,
  IPaymentProviderResolver,
} from '../interfaces/index.js';

export interface PaymentUseCaseDeps {
  paymentRepo: IPaymentRepository;
  transactionRepo: ITransactionRepository;
  refundRepo: IRefundRepository;
  invoiceRepo: IInvoiceRepository;
  receiptRepo: IReceiptRepository;
  settlementRepo: ISettlementRepository;
  webhookRepo: IWebhookRepository;
  paymentMethodRepo: IPaymentMethodRepository;
  reconciliationRepo: IReconciliationRepository;
  auditRepo: IPaymentAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  userVerifier: IUserVerifier;
  policyProvider: ICustomDataPolicyProvider;
  providerResolver: IPaymentProviderResolver;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
