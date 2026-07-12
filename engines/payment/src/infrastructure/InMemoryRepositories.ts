/**
 * In-Memory Repositories — Payment / Transaction / Refund / Invoice / Receipt / Settlement / Webhook / PaymentMethod / Reconciliation / Audit
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  IPaymentRepository,
  ITransactionRepository,
  IRefundRepository,
  IInvoiceRepository,
  IReceiptRepository,
  ISettlementRepository,
  IWebhookRepository,
  IPaymentMethodRepository,
  IReconciliationRepository,
  IPaymentAuditRepository,
  Payment, Transaction, Refund, PaymentInvoice, Receipt,
  Settlement, PaymentWebhook, PaymentMethod, Reconciliation,
  PaymentAuditRecord,
  PaymentSearchCriteria, PaymentSearchResult,
  TransactionSearchCriteria, TransactionSearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Payment
// ═══════════════════════════════════════════

export class InMemoryPaymentRepository implements IPaymentRepository {
  private store = new Map<string, Payment>();

  async insert(payment: Payment): Promise<void> {
    const k = key(payment.tenantId, payment.id);
    if (this.store.has(k)) throw new Error(`Duplicate payment id: ${payment.id}`);
    this.store.set(k, payment);
  }

  async findById(tenantId: string, id: string): Promise<Payment | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByPaymentNumber(tenantId: string, paymentNumber: string): Promise<Payment | null> {
    for (const p of this.store.values()) {
      if (p.tenantId === tenantId && p.paymentNumber === paymentNumber) return p;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<Payment>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Payment not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: PaymentSearchCriteria): Promise<PaymentSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'createdAt';
    const sortOrder = criteria.sortOrder ?? 'desc';

    let candidates: Payment[] = [];
    for (const p of this.store.values()) {
      if (p.tenantId !== criteria.tenantId) continue;
      if (criteria.organizationId !== undefined && p.organizationId !== criteria.organizationId) continue;
      if (criteria.type !== undefined && p.type !== criteria.type) continue;
      if (criteria.status !== undefined && p.status !== criteria.status) continue;
      if (criteria.providerId !== undefined && p.providerId !== criteria.providerId) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => p.tags.includes(t))) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const hay = `${p.paymentNumber} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      candidates.push(p);
    }

    candidates.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'paymentNumber') cmp = a.paymentNumber.localeCompare(b.paymentNumber);
      else if (sortBy === 'grandTotal') cmp = a.grandTotal - b.grandTotal;
      else if (sortBy === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
      else cmp = a.createdAt.localeCompare(b.createdAt);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = candidates.length;
    return { payments: candidates.slice(offset, offset + limit), total, limit, offset };
  }

  async countByOrganization(tenantId: string, organizationId: string): Promise<number> {
    let count = 0;
    for (const p of this.store.values()) {
      if (p.tenantId === tenantId && p.organizationId === organizationId) count += 1;
    }
    return count;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Transaction
// ═══════════════════════════════════════════

export class InMemoryTransactionRepository implements ITransactionRepository {
  private store = new Map<string, Transaction>();
  private counter = 0;

  async insert(txn: Transaction): Promise<void> {
    const k = key(txn.tenantId, txn.id);
    this.store.set(k, txn);
  }

  async findById(tenantId: string, id: string): Promise<Transaction | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByPayment(tenantId: string, paymentId: string): Promise<Transaction[]> {
    const list: Transaction[] = [];
    for (const t of this.store.values()) {
      if (t.tenantId === tenantId && t.paymentId === paymentId) list.push(t);
    }
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async search(criteria: TransactionSearchCriteria): Promise<TransactionSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    let candidates: Transaction[] = [];
    for (const t of this.store.values()) {
      if (t.tenantId !== criteria.tenantId) continue;
      if (criteria.organizationId !== undefined && t.organizationId !== criteria.organizationId) continue;
      if (criteria.paymentId !== undefined && t.paymentId !== criteria.paymentId) continue;
      if (criteria.providerId !== undefined && t.providerId !== criteria.providerId) continue;
      if (criteria.operation !== undefined && t.operation !== criteria.operation) continue;
      if (criteria.result !== undefined && t.result !== criteria.result) continue;
      candidates.push(t);
    }
    candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = candidates.length;
    return { transactions: candidates.slice(offset, offset + limit), total, limit, offset };
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}

// ═══════════════════════════════════════════
// Refund
// ═══════════════════════════════════════════

export class InMemoryRefundRepository implements IRefundRepository {
  private store = new Map<string, Refund>();

  async insert(refund: Refund): Promise<void> {
    const k = key(refund.tenantId, refund.id);
    this.store.set(k, refund);
  }

  async findById(tenantId: string, id: string): Promise<Refund | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByPayment(tenantId: string, paymentId: string): Promise<Refund[]> {
    const list: Refund[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.paymentId === paymentId) list.push(r);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Refund>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Refund not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Invoice
// ═══════════════════════════════════════════

export class InMemoryInvoiceRepository implements IInvoiceRepository {
  private store = new Map<string, PaymentInvoice>();

  async insert(invoice: PaymentInvoice): Promise<void> {
    const k = key(invoice.tenantId, invoice.id);
    if (this.store.has(k)) throw new Error(`Duplicate invoice id: ${invoice.id}`);
    this.store.set(k, invoice);
  }

  async findById(tenantId: string, id: string): Promise<PaymentInvoice | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInvoiceNumber(tenantId: string, invoiceNumber: string): Promise<PaymentInvoice | null> {
    for (const inv of this.store.values()) {
      if (inv.tenantId === tenantId && inv.invoiceNumber === invoiceNumber) return inv;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<PaymentInvoice>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Invoice not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Receipt
// ═══════════════════════════════════════════

export class InMemoryReceiptRepository implements IReceiptRepository {
  private store = new Map<string, Receipt>();

  async insert(receipt: Receipt): Promise<void> {
    const k = key(receipt.tenantId, receipt.id);
    this.store.set(k, receipt);
  }

  async findById(tenantId: string, id: string): Promise<Receipt | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByPayment(tenantId: string, paymentId: string): Promise<Receipt[]> {
    const list: Receipt[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.paymentId === paymentId) list.push(r);
    }
    return list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Settlement
// ═══════════════════════════════════════════

export class InMemorySettlementRepository implements ISettlementRepository {
  private store = new Map<string, Settlement>();

  async insert(settlement: Settlement): Promise<void> {
    const k = key(settlement.tenantId, settlement.id);
    this.store.set(k, settlement);
  }

  async findById(tenantId: string, id: string): Promise<Settlement | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<Settlement[]> {
    const list: Settlement[] = [];
    for (const s of this.store.values()) {
      if (s.tenantId === tenantId && s.organizationId === organizationId) list.push(s);
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async update(tenantId: string, id: string, patch: Partial<Settlement>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Settlement not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Webhook
// ═══════════════════════════════════════════

export class InMemoryWebhookRepository implements IWebhookRepository {
  private store = new Map<string, PaymentWebhook>();

  async insert(webhook: PaymentWebhook): Promise<void> {
    const k = key(webhook.tenantId, webhook.id);
    this.store.set(k, webhook);
  }

  async findById(tenantId: string, id: string): Promise<PaymentWebhook | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByOrganization(tenantId: string, organizationId: string, limit?: number): Promise<PaymentWebhook[]> {
    const list: PaymentWebhook[] = [];
    for (const w of this.store.values()) {
      if (w.tenantId === tenantId && w.organizationId === organizationId) list.push(w);
    }
    list.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async update(tenantId: string, id: string, patch: Partial<PaymentWebhook>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Webhook not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Payment Method
// ═══════════════════════════════════════════

export class InMemoryPaymentMethodRepository implements IPaymentMethodRepository {
  private store = new Map<string, PaymentMethod>();

  async insert(method: PaymentMethod): Promise<void> {
    const k = key(method.tenantId, method.id);
    this.store.set(k, method);
  }

  async findById(tenantId: string, id: string): Promise<PaymentMethod | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByOwner(tenantId: string, ownerId: string): Promise<PaymentMethod[]> {
    const list: PaymentMethod[] = [];
    for (const m of this.store.values()) {
      if (m.tenantId === tenantId && m.ownerId === ownerId && m.status === 'Active') list.push(m);
    }
    return list;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<PaymentMethod[]> {
    const list: PaymentMethod[] = [];
    for (const m of this.store.values()) {
      if (m.tenantId === tenantId && m.organizationId === organizationId && m.status === 'Active') list.push(m);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<PaymentMethod>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Payment method not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Reconciliation
// ═══════════════════════════════════════════

export class InMemoryReconciliationRepository implements IReconciliationRepository {
  private store = new Map<string, Reconciliation>();

  async insert(recon: Reconciliation): Promise<void> {
    const k = key(recon.tenantId, recon.id);
    this.store.set(k, recon);
  }

  async findById(tenantId: string, id: string): Promise<Reconciliation | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<Reconciliation[]> {
    const list: Reconciliation[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.organizationId === organizationId) list.push(r);
    }
    return list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemoryPaymentAuditRepository implements IPaymentAuditRepository {
  private store = new Map<string, PaymentAuditRecord>();
  private counter = 0;

  async insert(record: Omit<PaymentAuditRecord, 'id' | 'createdAt'>): Promise<PaymentAuditRecord> {
    this.counter += 1;
    const full: PaymentAuditRecord = {
      ...record,
      id: `payment-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<PaymentAuditRecord[]> {
    const list: PaymentAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByPayment(tenantId: string, paymentId: string, limit?: number): Promise<PaymentAuditRecord[]> {
    const list: PaymentAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.paymentId !== paymentId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
