/**
 * In-Memory Repositories — Invoice / InvoiceLine / Adjustment / CreditMemo / Timeline / Audit
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  IInvoiceRepository,
  IInvoiceLineRepository,
  IAdjustmentRepository,
  ICreditMemoRepository,
  IBillingTimelineRepository,
  IBillingAuditRepository,
  Invoice,
  InvoiceLine,
  Adjustment,
  CreditMemo,
  BillingTimelineEntry,
  BillingAuditRecord,
  InvoiceSearchCriteria,
  InvoiceSearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Invoice
// ═══════════════════════════════════════════

export class InMemoryInvoiceRepository implements IInvoiceRepository {
  private store = new Map<string, Invoice>();

  async insert(invoice: Invoice): Promise<void> {
    const k = key(invoice.tenantId, invoice.id);
    if (this.store.has(k)) throw new Error(`Duplicate invoice id: ${invoice.id}`);
    this.store.set(k, invoice);
  }

  async findById(tenantId: string, id: string): Promise<Invoice | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInvoiceNumber(tenantId: string, invoiceNumber: string): Promise<Invoice | null> {
    for (const inv of this.store.values()) {
      if (inv.tenantId === tenantId && inv.invoiceNumber === invoiceNumber) return inv;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<Invoice>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Invoice not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: InvoiceSearchCriteria): Promise<InvoiceSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'createdAt';
    const sortOrder = criteria.sortOrder ?? 'desc';

    let candidates: Invoice[] = [];
    for (const inv of this.store.values()) {
      if (inv.tenantId !== criteria.tenantId) continue;
      // Hide terminal/voided from default search? No — explicit status filter covers it.
      if (criteria.organizationId !== undefined && inv.organizationId !== criteria.organizationId) continue;
      if (criteria.type !== undefined && inv.type !== criteria.type) continue;
      if (criteria.status !== undefined && inv.status !== criteria.status) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => inv.tags.includes(t))) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const hay = `${inv.invoiceNumber} ${inv.title} ${inv.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      candidates.push(inv);
    }

    candidates.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'invoiceNumber') cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      else if (sortBy === 'dueDate') cmp = a.dueDate.localeCompare(b.dueDate);
      else if (sortBy === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
      else cmp = a.createdAt.localeCompare(b.createdAt); // 'createdAt' default
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = candidates.length;
    return {
      invoices: candidates.slice(offset, offset + limit),
      total, limit, offset,
    };
  }

  async countByOrganization(tenantId: string, organizationId: string): Promise<number> {
    let count = 0;
    for (const inv of this.store.values()) {
      if (inv.tenantId === tenantId && inv.organizationId === organizationId) count += 1;
    }
    return count;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// InvoiceLine
// ═══════════════════════════════════════════

export class InMemoryInvoiceLineRepository implements IInvoiceLineRepository {
  private store = new Map<string, InvoiceLine>();

  async insert(line: InvoiceLine): Promise<void> {
    const k = key(line.tenantId, line.id);
    if (this.store.has(k)) throw new Error(`Duplicate invoice line id: ${line.id}`);
    this.store.set(k, line);
  }

  async findById(tenantId: string, id: string): Promise<InvoiceLine | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInvoice(tenantId: string, invoiceId: string): Promise<InvoiceLine[]> {
    const list: InvoiceLine[] = [];
    for (const ln of this.store.values()) {
      if (ln.tenantId === tenantId && ln.invoiceId === invoiceId) list.push(ln);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<InvoiceLine>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Invoice line not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Invoice line not found: ${id}`);
    this.store.delete(k);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Adjustment
// ═══════════════════════════════════════════

export class InMemoryAdjustmentRepository implements IAdjustmentRepository {
  private store = new Map<string, Adjustment>();

  async insert(adj: Adjustment): Promise<void> {
    const k = key(adj.tenantId, adj.id);
    if (this.store.has(k)) throw new Error(`Duplicate adjustment id: ${adj.id}`);
    this.store.set(k, adj);
  }

  async findById(tenantId: string, id: string): Promise<Adjustment | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInvoice(tenantId: string, invoiceId: string): Promise<Adjustment[]> {
    const list: Adjustment[] = [];
    for (const adj of this.store.values()) {
      if (adj.tenantId === tenantId && adj.invoiceId === invoiceId) list.push(adj);
    }
    return list;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Adjustment not found: ${id}`);
    this.store.delete(k);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// CreditMemo
// ═══════════════════════════════════════════

export class InMemoryCreditMemoRepository implements ICreditMemoRepository {
  private store = new Map<string, CreditMemo>();

  async insert(memo: CreditMemo): Promise<void> {
    const k = key(memo.tenantId, memo.id);
    if (this.store.has(k)) throw new Error(`Duplicate credit memo id: ${memo.id}`);
    this.store.set(k, memo);
  }

  async findById(tenantId: string, id: string): Promise<CreditMemo | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<CreditMemo[]> {
    const list: CreditMemo[] = [];
    for (const memo of this.store.values()) {
      if (memo.tenantId === tenantId && memo.organizationId === organizationId) list.push(memo);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<CreditMemo>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Credit memo not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Billing Timeline
// ═══════════════════════════════════════════

export class InMemoryBillingTimelineRepository implements IBillingTimelineRepository {
  private store = new Map<string, BillingTimelineEntry>();

  async insert(entry: BillingTimelineEntry): Promise<void> {
    const k = key(entry.tenantId, entry.id);
    if (this.store.has(k)) throw new Error(`Duplicate timeline entry id: ${entry.id}`);
    this.store.set(k, entry);
  }

  async findByInvoice(tenantId: string, invoiceId: string, limit?: number): Promise<BillingTimelineEntry[]> {
    const list: BillingTimelineEntry[] = [];
    for (const entry of this.store.values()) {
      if (entry.tenantId === tenantId && entry.invoiceId === invoiceId) list.push(entry);
    }
    // Newest-first (most useful for timeline UI)
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemoryBillingAuditRepository implements IBillingAuditRepository {
  private store = new Map<string, BillingAuditRecord>();
  private counter = 0;

  async insert(record: Omit<BillingAuditRecord, 'id' | 'createdAt'>): Promise<BillingAuditRecord> {
    this.counter += 1;
    const full: BillingAuditRecord = {
      ...record,
      id: `billing-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<BillingAuditRecord[]> {
    const list: BillingAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByInvoice(tenantId: string, invoiceId: string, limit?: number): Promise<BillingAuditRecord[]> {
    const list: BillingAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.invoiceId !== invoiceId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
