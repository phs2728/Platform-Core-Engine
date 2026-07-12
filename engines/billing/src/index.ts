/**
 * Billing Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Billing & Invoice Lifecycle Engine.
 */

export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

export type {
  Invoice, InvoiceLine, BillingAccount, Adjustment, CreditMemo,
  TaxReference, DiscountReference, BillingTimelineEntry,
  InvoiceStatus, CreditMemoStatus, AdjustmentType, Money, BillingReference,
  InvoiceSearchCriteria, InvoiceSearchResult,
  BillingAuditRecord, BillingAuditEventType,
} from './interfaces/index.js';

export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, ICustomDataPolicyProvider,
  IInvoiceRepository, IInvoiceLineRepository, IAdjustmentRepository,
  ICreditMemoRepository, IBillingTimelineRepository, IBillingAuditRepository,
} from './interfaces/index.js';

export {
  createInvoiceUseCase, updateInvoiceUseCase, cancelInvoiceUseCase,
  issueInvoiceUseCase, voidInvoiceUseCase,
  archiveInvoiceUseCase, restoreInvoiceUseCase,
  getInvoiceUseCase, searchInvoicesUseCase, listInvoicesUseCase,
  addInvoiceLineUseCase, removeInvoiceLineUseCase, updateInvoiceLineUseCase,
  addAdjustmentUseCase, removeAdjustmentUseCase,
  issueCreditMemoUseCase, applyCreditUseCase,
  generateBillingUseCase, closeBillingUseCase,
  type CreateInvoiceInput,
} from './use-cases/InvoiceLifecycleUseCases.js';

export {
  attachOrderRefUseCase, attachPricingRefUseCase, attachOrganizationRefUseCase,
  appendTimelineUseCase, getTimelineUseCase,
} from './use-cases/ReferenceTimelineUseCases.js';

export type { BillingUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories + Host Adapters
export {
  InMemoryInvoiceRepository, InMemoryInvoiceLineRepository,
  InMemoryAdjustmentRepository, InMemoryCreditMemoRepository,
  InMemoryBillingTimelineRepository, InMemoryBillingAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

export {
  InMemoryOrganizationVerifier,
  StaticBillingPolicyProvider, InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
