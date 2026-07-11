/**
 * Payment Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Payment Domain Model Engine.
 * 30 UseCases: Payment(8) + Invoice(4) + Receipt(2) + Settlement(3)
 * + Transaction(3) + Webhook(3) + PaymentMethod(3) + Reconciliation(1) + Reference(1) + ListPayments(1) + GetPayment(1)
 */

export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

// ── Entities ───────────────────────────

export type {
  Payment, Transaction, Refund, PaymentInvoice, Receipt,
  Settlement, PaymentWebhook, PaymentMethod, Reconciliation,
  InvoiceLineItem, TaxBreakdown,
  PaymentStatus, InvoiceStatus, SettlementStatus, RefundStatus,
  PaymentMethodStatus, WebhookStatus, ReconciliationStatus,
  TaxType, Money, PaymentReference,
  PaymentSearchCriteria, PaymentSearchResult,
  TransactionSearchCriteria, TransactionSearchResult,
  PaymentAuditRecord, PaymentAuditEventType,
} from './interfaces/index.js';

// ── Host Interfaces ────────────────────

export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IUserVerifier, ICustomDataPolicyProvider,
  IPaymentProvider, IPaymentProviderResolver,
  ProviderAuthorizeInput, ProviderCaptureInput,
  ProviderVoidInput, ProviderRefundInput, ProviderTransactionResult,
  IPaymentRepository, ITransactionRepository, IRefundRepository,
  IInvoiceRepository, IReceiptRepository, ISettlementRepository,
  IWebhookRepository, IPaymentMethodRepository, IReconciliationRepository,
  IPaymentAuditRepository,
} from './interfaces/index.js';

// ── UseCases ───────────────────────────

export {
  createPaymentUseCase, authorizePaymentUseCase, capturePaymentUseCase,
  cancelPaymentUseCase, refundPaymentUseCase, voidPaymentUseCase,
  retryPaymentUseCase, expirePaymentUseCase,
  type CreatePaymentInput,
} from './use-cases/PaymentLifecycleUseCases.js';

export {
  createInvoiceUseCase, updateInvoiceUseCase,
  issueInvoiceUseCase, cancelInvoiceUseCase,
  generateReceiptUseCase, getReceiptUseCase,
  createSettlementUseCase, completeSettlementUseCase, listSettlementsUseCase,
} from './use-cases/InvoiceReceiptSettlementUseCases.js';

export {
  getTransactionUseCase, listTransactionsUseCase, searchTransactionsUseCase,
  receiveWebhookUseCase, replayWebhookUseCase, verifyWebhookSignatureUseCase,
  registerPaymentMethodUseCase, archivePaymentMethodUseCase, listPaymentMethodsUseCase,
  runReconciliationUseCase, attachReferenceUseCase,
} from './use-cases/TransactionWebhookMethodUseCases.js';

export type { PaymentUseCaseDeps } from './use-cases/types.js';

// ── In-Memory Repositories + Host Adapters ──

export {
  InMemoryPaymentRepository, InMemoryTransactionRepository,
  InMemoryRefundRepository, InMemoryInvoiceRepository,
  InMemoryReceiptRepository, InMemorySettlementRepository,
  InMemoryWebhookRepository, InMemoryPaymentMethodRepository,
  InMemoryReconciliationRepository, InMemoryPaymentAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

export {
  InMemoryOrganizationVerifier, InMemoryUserVerifier,
  StaticPaymentPolicyProvider,
  MockPaymentProvider, InMemoryPaymentProviderResolver,
  InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';

// ── Domain (for host implementors) ──────

export {
  validatePaymentStatusTransition, isPaymentMutable, isTerminalStatus,
  PAYMENT_TRANSITIONS,
} from './domain/statusTransition.js';
