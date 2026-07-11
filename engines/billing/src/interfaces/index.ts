/**
 * Billing Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 5 — Billing & Invoice Lifecycle Engine.
 * 8-state machine: Draft→Issued→Open→PartiallyPaid→Paid→Closed (+Cancelled/Voided)
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface ICustomDataPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getAllowedInvoiceTypes(tenantId: string): Promise<readonly string[]>;
  getMaxInvoicesPerOrg(tenantId: string): Promise<number>;
  getDefaultCurrency(tenantId: string): Promise<string>;
  getDefaultDueDays(tenantId: string): Promise<number>;
}

// ═══════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════

export type InvoiceStatus =
  | 'Draft' | 'Issued' | 'Open' | 'PartiallyPaid' | 'Paid' | 'Closed'
  | 'Cancelled' | 'Voided';

export type CreditMemoStatus = 'Issued' | 'Applied' | 'Voided';
export type AdjustmentType = 'surcharge' | 'deduction' | 'correction' | 'fee' | 'tax_ref' | 'discount_ref';

export interface Money {
  amount: number;
  currencyCode: string;
}

export interface BillingReference {
  refType: string;    // 'order' | 'pricing' | 'organization' | 'payment'
  refId: string;
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface Invoice {
  id: string;
  tenantId: string;
  organizationId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  type: string;
  title: string;
  description?: string;

  currency: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  adjustmentTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;

  dueDate: string;
  issueDate: string | null;

  lineIds: string[];
  references: BillingReference[];

  attributes: Record<string, unknown>;
  customFields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];

  issuedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  closedAt: string | null;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  archivedAt: string | null;
}

export interface InvoiceLine {
  id: string;
  tenantId: string;
  invoiceId: string;
  lineNo: number;
  resourceType: string;
  resourceId: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  taxRefId: string | null;
  discountRefId: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BillingAccount {
  id: string;
  tenantId: string;
  organizationId: string;
  accountId: string;
  currency: string;
  balance: number;
  status: 'Active' | 'Suspended' | 'Closed';
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Adjustment {
  id: string;
  tenantId: string;
  invoiceId: string;
  adjustmentType: AdjustmentType;
  name: string;
  amount: Money;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface CreditMemo {
  id: string;
  tenantId: string;
  organizationId: string;
  invoiceId: string | null;
  creditNumber: string;
  status: CreditMemoStatus;
  amount: Money;
  reason: string;
  appliedAmount: number;
  appliedInvoiceId: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  appliedAt: string | null;
}

export interface TaxReference {
  id: string;
  tenantId: string;
  taxCode: string;
  taxName: string;
  rate: number;
  isCompound: boolean;
  attributes: Record<string, unknown>;
}

export interface DiscountReference {
  id: string;
  tenantId: string;
  discountCode: string;
  discountName: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  attributes: Record<string, unknown>;
}

export interface BillingTimelineEntry {
  id: string;
  tenantId: string;
  invoiceId: string;
  eventType: string;
  actorId: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface InvoiceSearchCriteria {
  tenantId: string;
  organizationId?: string;
  query?: string;
  type?: string;
  status?: InvoiceStatus;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'invoiceNumber' | 'dueDate';
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceSearchResult {
  invoices: Invoice[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type BillingAuditEventType =
  | 'invoice_created' | 'invoice_updated' | 'invoice_issued' | 'invoice_cancelled'
  | 'invoice_voided' | 'invoice_closed' | 'invoice_archived' | 'invoice_restored'
  | 'line_added' | 'line_removed' | 'line_updated'
  | 'billing_generated' | 'billing_closed'
  | 'adjustment_created' | 'adjustment_removed'
  | 'credit_issued' | 'credit_applied'
  | 'reference_attached' | 'timeline_appended';

export interface BillingAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  invoiceId?: string;
  actorId: string;
  correlationId: string;
  eventType: BillingAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IInvoiceRepository {
  insert(invoice: Invoice): Promise<void>;
  findById(tenantId: string, id: string): Promise<Invoice | null>;
  findByInvoiceNumber(tenantId: string, invoiceNumber: string): Promise<Invoice | null>;
  update(tenantId: string, id: string, patch: Partial<Invoice>): Promise<void>;
  search(criteria: InvoiceSearchCriteria): Promise<InvoiceSearchResult>;
  countByOrganization(tenantId: string, organizationId: string): Promise<number>;
}

export interface IInvoiceLineRepository {
  insert(line: InvoiceLine): Promise<void>;
  findById(tenantId: string, id: string): Promise<InvoiceLine | null>;
  findByInvoice(tenantId: string, invoiceId: string): Promise<InvoiceLine[]>;
  update(tenantId: string, id: string, patch: Partial<InvoiceLine>): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface IAdjustmentRepository {
  insert(adj: Adjustment): Promise<void>;
  findById(tenantId: string, id: string): Promise<Adjustment | null>;
  findByInvoice(tenantId: string, invoiceId: string): Promise<Adjustment[]>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface ICreditMemoRepository {
  insert(memo: CreditMemo): Promise<void>;
  findById(tenantId: string, id: string): Promise<CreditMemo | null>;
  findByOrganization(tenantId: string, organizationId: string): Promise<CreditMemo[]>;
  update(tenantId: string, id: string, patch: Partial<CreditMemo>): Promise<void>;
}

export interface IBillingTimelineRepository {
  insert(entry: BillingTimelineEntry): Promise<void>;
  findByInvoice(tenantId: string, invoiceId: string, limit?: number): Promise<BillingTimelineEntry[]>;
}

export interface IBillingAuditRepository {
  insert(record: Omit<BillingAuditRecord, 'id' | 'createdAt'>): Promise<BillingAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<BillingAuditRecord[]>;
  findByInvoice(tenantId: string, invoiceId: string, limit?: number): Promise<BillingAuditRecord[]>;
}

export { type Result, type EventEnvelope };
