/**
 * Payment Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Payment Domain Model Engine.
 * 9-state machine: Draft→Pending→Authorized→Captured→Settled (+Cancelled/Failed/Expired/Refunded)
 *
 * NOT a payment processor — Provider Plugin Architecture.
 * Engine defines domain model + process; Host implements IPaymentProvider.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface IUserVerifier {
  verify(tenantId: string, userId: string): Promise<boolean>;
}

export interface ICustomDataPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getAllowedPaymentTypes(tenantId: string): Promise<readonly string[]>;
  getMaxPaymentsPerOrg(tenantId: string): Promise<number>;
  getDefaultCurrency(tenantId: string): Promise<string>;
  getDefaultTaxRate(tenantId: string): Promise<number>;
}

// ═══════════════════════════════════════════
// Payment Provider Plugin Architecture
// ═══════════════════════════════════════════

/**
 * IPaymentProvider — Host-implemented adapter for real payment processors.
 * The engine NEVER touches card numbers, bank accounts, or provider SDKs.
 */
export interface IPaymentProvider {
  readonly providerId: string;
  readonly providerType: string;   // 'card' | 'bank' | 'wallet' | 'cash' | 'crypto'

  authorize(input: ProviderAuthorizeInput): Promise<Result<ProviderTransactionResult, Error>>;
  capture(input: ProviderCaptureInput): Promise<Result<ProviderTransactionResult, Error>>;
  void(input: ProviderVoidInput): Promise<Result<ProviderTransactionResult, Error>>;
  refund(input: ProviderRefundInput): Promise<Result<ProviderTransactionResult, Error>>;
  verifyWebhookSignature(payload: unknown, signature: string): Promise<Result<boolean, Error>>;
}

export interface IPaymentProviderResolver {
  resolve(providerId: string): Promise<Result<IPaymentProvider, Error>>;
  getDefault(tenantId: string): Promise<Result<IPaymentProvider, Error>>;
}

export interface ProviderAuthorizeInput {
  tenantId: string;
  paymentId: string;
  paymentMethodId: string;
  amount: number;
  currencyCode: string;
  description: string;
  metadata: Record<string, unknown>;
}

export interface ProviderCaptureInput {
  tenantId: string;
  paymentId: string;
  providerTransactionId: string;
  amount: number;
  currencyCode: string;
}

export interface ProviderVoidInput {
  tenantId: string;
  paymentId: string;
  providerTransactionId: string;
}

export interface ProviderRefundInput {
  tenantId: string;
  paymentId: string;
  providerTransactionId: string;
  amount: number;
  currencyCode: string;
  reason: string;
}

export interface ProviderTransactionResult {
  providerTransactionId: string;
  status: 'approved' | 'declined' | 'pending' | 'failed';
  declineReason: string | null;
  providerFee: number | null;
  rawResponse: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════

export type PaymentStatus =
  | 'Draft' | 'Pending' | 'Authorized' | 'Captured'
  | 'Settled' | 'Refunded' | 'Cancelled' | 'Failed' | 'Expired';

export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Cancelled' | 'Void';

export type SettlementStatus = 'Open' | 'Completed' | 'Failed';

export type RefundStatus = 'Pending' | 'Completed' | 'Failed';

export type PaymentMethodStatus = 'Active' | 'Archived';

export type WebhookStatus = 'Received' | 'Processed' | 'Failed' | 'Replayed';

export type ReconciliationStatus = 'Pending' | 'Matched' | 'Unmatched' | 'Discrepant';

export type TaxType = 'VAT' | 'GST' | 'SalesTax' | 'Custom';

export interface Money {
  amount: number;
  currencyCode: string;
}

export interface TaxBreakdown {
  taxType: TaxType;
  taxRate: number;
  taxAmount: number;
  taxLabel: string;
}

export interface PaymentReference {
  refType: string;    // generic cross-engine reference type identifier
  refId: string;
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

/**
 * Payment — the aggregate root.
 */
export interface Payment {
  id: string;
  tenantId: string;
  organizationId: string;
  paymentNumber: string;
  status: PaymentStatus;
  type: string;
  description: string;

  amount: number;
  currency: string;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;

  providerId: string;
  providerTransactionId: string | null;
  paymentMethodId: string | null;

  references: PaymentReference[];
  taxBreakdowns: TaxBreakdown[];

  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];

  retryCount: number;

  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;

  authorizedAt: string | null;
  capturedAt: string | null;
  settledAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  failedAt: string | null;
  failReason: string | null;
  expiredAt: string | null;
  refundedAt: string | null;
  archivedAt: string | null;
}

/**
 * Transaction — immutable ledger of every provider interaction.
 */
export interface Transaction {
  id: string;
  tenantId: string;
  organizationId: string;
  paymentId: string;
  transactionNumber: string;
  providerId: string;
  providerTransactionId: string;
  operation: 'Authorize' | 'Capture' | 'Void' | 'Refund';
  amount: number;
  currency: string;
  result: 'Approved' | 'Declined' | 'Pending' | 'Failed';
  declineReason: string | null;
  providerFee: number | null;
  rawResponse: Record<string, unknown>;
  createdAt: string;
}

/**
 * Refund — tracks refund lifecycle per payment.
 */
export interface Refund {
  id: string;
  tenantId: string;
  organizationId: string;
  paymentId: string;
  refundNumber: string;
  status: RefundStatus;
  amount: number;
  currency: string;
  reason: string;
  providerTransactionId: string | null;
  providerFee: number | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Invoice — financial document linked to one or more payments.
 */
export interface PaymentInvoice {
  id: string;
  tenantId: string;
  organizationId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  paymentIds: string[];
  currency: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  billingAddressRef: string | null;
  shippingAddressRef: string | null;
  taxNumber: string | null;
  lineItems: InvoiceLineItem[];
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  issueDate: string | null;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxRefId?: string | null | undefined;
  discountRefId?: string | null | undefined;
}

/**
 * Receipt — customer-facing proof of payment.
 */
export interface Receipt {
  id: string;
  tenantId: string;
  organizationId: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string | null;
  format: 'Email' | 'PDF' | 'Printable' | 'Localized';
  recipientEmail: string | null;
  locale: string;
  amount: number;
  currency: string;
  taxTotal: number;
  content: Record<string, unknown>;
  generatedAt: string;
}

/**
 * Settlement — batch settlement from provider.
 */
export interface Settlement {
  id: string;
  tenantId: string;
  organizationId: string;
  settlementNumber: string;
  status: SettlementStatus;
  providerId: string;
  providerSettlementId: string | null;
  currency: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  transactionCount: number;
  transactionIds: string[];
  settledAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Webhook — provider event ingestion.
 */
export interface PaymentWebhook {
  id: string;
  tenantId: string;
  organizationId: string;
  providerId: string;
  eventType: string;
  status: WebhookStatus;
  signature: string;
  payload: Record<string, unknown>;
  verified: boolean;
  processedResult: string | null;
  receivedAt: string;
  processedAt: string | null;
  replayedAt: string | null;
}

/**
 * Payment Method — tokenized payment instrument.
 */
export interface PaymentMethod {
  id: string;
  tenantId: string;
  organizationId: string;
  ownerId: string;
  providerId: string;
  methodType: string;    // 'card' | 'bank_account' | 'wallet'
  displayName: string;
  token: string;         // provider token — never raw card number
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  brand: string | null;
  status: PaymentMethodStatus;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  archivedAt: string | null;
}

/**
 * Reconciliation — audit-grade matching result.
 */
export interface Reconciliation {
  id: string;
  tenantId: string;
  organizationId: string;
  reconciliationNumber: string;
  status: ReconciliationStatus;
  periodStart: string;
  periodEnd: string;
  providerId: string;
  expectedAmount: number;
  actualAmount: number;
  discrepancy: number;
  transactionCount: number;
  matchedCount: number;
  unmatchedCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface PaymentSearchCriteria {
  tenantId: string;
  organizationId?: string;
  query?: string;
  type?: string;
  status?: PaymentStatus;
  providerId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'paymentNumber' | 'grandTotal';
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentSearchResult {
  payments: Payment[];
  total: number;
  limit: number;
  offset: number;
}

export interface TransactionSearchCriteria {
  tenantId: string;
  organizationId?: string;
  paymentId?: string;
  providerId?: string;
  operation?: 'Authorize' | 'Capture' | 'Void' | 'Refund';
  result?: 'Approved' | 'Declined' | 'Pending' | 'Failed';
  limit?: number;
  offset?: number;
}

export interface TransactionSearchResult {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type PaymentAuditEventType =
  | 'payment_created' | 'payment_authorized' | 'payment_captured'
  | 'payment_cancelled' | 'payment_refunded' | 'payment_voided'
  | 'payment_failed' | 'payment_expired' | 'payment_retried'
  | 'payment_archived'
  | 'invoice_created' | 'invoice_updated' | 'invoice_issued' | 'invoice_cancelled'
  | 'receipt_generated'
  | 'settlement_created' | 'settlement_completed'
  | 'webhook_received' | 'webhook_replayed'
  | 'reconciliation_completed'
  | 'payment_method_registered' | 'payment_method_archived'
  | 'reference_attached';

export interface PaymentAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  paymentId?: string;
  actorId: string;
  correlationId: string;
  eventType: PaymentAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories (7 + audit)
// ═══════════════════════════════════════════

export interface IPaymentRepository {
  insert(payment: Payment): Promise<void>;
  findById(tenantId: string, id: string): Promise<Payment | null>;
  findByPaymentNumber(tenantId: string, paymentNumber: string): Promise<Payment | null>;
  update(tenantId: string, id: string, patch: Partial<Payment>): Promise<void>;
  search(criteria: PaymentSearchCriteria): Promise<PaymentSearchResult>;
  countByOrganization(tenantId: string, organizationId: string): Promise<number>;
}

export interface ITransactionRepository {
  insert(txn: Transaction): Promise<void>;
  findById(tenantId: string, id: string): Promise<Transaction | null>;
  findByPayment(tenantId: string, paymentId: string): Promise<Transaction[]>;
  search(criteria: TransactionSearchCriteria): Promise<TransactionSearchResult>;
}

export interface IRefundRepository {
  insert(refund: Refund): Promise<void>;
  findById(tenantId: string, id: string): Promise<Refund | null>;
  findByPayment(tenantId: string, paymentId: string): Promise<Refund[]>;
  update(tenantId: string, id: string, patch: Partial<Refund>): Promise<void>;
}

export interface IInvoiceRepository {
  insert(invoice: PaymentInvoice): Promise<void>;
  findById(tenantId: string, id: string): Promise<PaymentInvoice | null>;
  findByInvoiceNumber(tenantId: string, invoiceNumber: string): Promise<PaymentInvoice | null>;
  update(tenantId: string, id: string, patch: Partial<PaymentInvoice>): Promise<void>;
}

export interface IReceiptRepository {
  insert(receipt: Receipt): Promise<void>;
  findById(tenantId: string, id: string): Promise<Receipt | null>;
  findByPayment(tenantId: string, paymentId: string): Promise<Receipt[]>;
}

export interface ISettlementRepository {
  insert(settlement: Settlement): Promise<void>;
  findById(tenantId: string, id: string): Promise<Settlement | null>;
  findByOrganization(tenantId: string, organizationId: string): Promise<Settlement[]>;
  update(tenantId: string, id: string, patch: Partial<Settlement>): Promise<void>;
}

export interface IWebhookRepository {
  insert(webhook: PaymentWebhook): Promise<void>;
  findById(tenantId: string, id: string): Promise<PaymentWebhook | null>;
  findByOrganization(tenantId: string, organizationId: string, limit?: number): Promise<PaymentWebhook[]>;
  update(tenantId: string, id: string, patch: Partial<PaymentWebhook>): Promise<void>;
}

export interface IPaymentMethodRepository {
  insert(method: PaymentMethod): Promise<void>;
  findById(tenantId: string, id: string): Promise<PaymentMethod | null>;
  findByOwner(tenantId: string, ownerId: string): Promise<PaymentMethod[]>;
  findByOrganization(tenantId: string, organizationId: string): Promise<PaymentMethod[]>;
  update(tenantId: string, id: string, patch: Partial<PaymentMethod>): Promise<void>;
}

export interface IReconciliationRepository {
  insert(recon: Reconciliation): Promise<void>;
  findById(tenantId: string, id: string): Promise<Reconciliation | null>;
  findByOrganization(tenantId: string, organizationId: string): Promise<Reconciliation[]>;
}

export interface IPaymentAuditRepository {
  insert(record: Omit<PaymentAuditRecord, 'id' | 'createdAt'>): Promise<PaymentAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<PaymentAuditRecord[]>;
  findByPayment(tenantId: string, paymentId: string, limit?: number): Promise<PaymentAuditRecord[]>;
}

export { type Result, type EventEnvelope };
