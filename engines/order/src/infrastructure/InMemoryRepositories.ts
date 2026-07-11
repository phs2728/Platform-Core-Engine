/**
 * In-Memory Repositories — Order/OrderItem/OrderTimeline/OrderApproval/OrderAudit
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  IOrderRepository,
  IOrderItemRepository,
  IOrderTimelineRepository,
  IOrderApprovalRepository,
  IOrderAuditRepository,
  Order,
  OrderItem,
  OrderTimelineEntry,
  OrderApproval,
  OrderAuditRecord,
  OrderSearchCriteria,
  OrderSearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Order
// ═══════════════════════════════════════════

export class InMemoryOrderRepository implements IOrderRepository {
  private store = new Map<string, Order>();

  async insert(o: Order): Promise<void> {
    const k = key(o.tenantId, o.id);
    if (this.store.has(k)) throw new Error(`Duplicate order id: ${o.id}`);
    this.store.set(k, o);
  }

  async findById(tenantId: string, id: string): Promise<Order | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByOrderNumber(tenantId: string, orderNumber: string): Promise<Order | null> {
    for (const o of this.store.values()) {
      if (o.tenantId === tenantId && o.orderNumber === orderNumber) return o;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<Order>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Order not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: OrderSearchCriteria): Promise<OrderSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'createdAt';
    const sortOrder = criteria.sortOrder ?? 'asc';

    let candidates: Order[] = [];
    for (const o of this.store.values()) {
      if (o.tenantId !== criteria.tenantId) continue;
      if (criteria.organizationId !== undefined && o.organizationId !== criteria.organizationId) continue;
      if (criteria.type !== undefined && o.type !== criteria.type) continue;
      if (criteria.status !== undefined && o.status !== criteria.status) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => o.tags.includes(t))) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const title = o.title.toLowerCase();
        const orderNumber = o.orderNumber.toLowerCase();
        const description = o.description?.toLowerCase() ?? '';
        if (!title.includes(q) && !orderNumber.includes(q) && !description.includes(q)) continue;
      }
      candidates.push(o);
    }

    candidates.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'orderNumber') cmp = a.orderNumber.localeCompare(b.orderNumber);
      else if (sortBy === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortBy === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = candidates.length;
    return {
      orders: candidates.slice(offset, offset + limit),
      total, limit, offset,
    };
  }

  async countByOrganization(tenantId: string, organizationId: string): Promise<number> {
    let count = 0;
    for (const o of this.store.values()) {
      if (o.tenantId === tenantId && o.organizationId === organizationId) count += 1;
    }
    return count;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// OrderItem
// ═══════════════════════════════════════════

export class InMemoryOrderItemRepository implements IOrderItemRepository {
  private store = new Map<string, OrderItem>();

  async insert(item: OrderItem): Promise<void> {
    const k = key(item.tenantId, item.id);
    if (this.store.has(k)) throw new Error(`Duplicate order item id: ${item.id}`);
    this.store.set(k, item);
  }

  async findById(tenantId: string, id: string): Promise<OrderItem | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByOrder(tenantId: string, orderId: string): Promise<OrderItem[]> {
    const list: OrderItem[] = [];
    for (const item of this.store.values()) {
      if (item.tenantId === tenantId && item.orderId === orderId) list.push(item);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<OrderItem>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Order item not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Order item not found: ${id}`);
    this.store.delete(k);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// OrderTimeline
// ═══════════════════════════════════════════

export class InMemoryOrderTimelineRepository implements IOrderTimelineRepository {
  private store = new Map<string, OrderTimelineEntry>();

  async insert(entry: OrderTimelineEntry): Promise<void> {
    const k = key(entry.tenantId, entry.id);
    if (this.store.has(k)) throw new Error(`Duplicate timeline entry id: ${entry.id}`);
    this.store.set(k, entry);
  }

  async findByOrder(tenantId: string, orderId: string, limit?: number): Promise<OrderTimelineEntry[]> {
    const list: OrderTimelineEntry[] = [];
    for (const entry of this.store.values()) {
      if (entry.tenantId === tenantId && entry.orderId === orderId) list.push(entry);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// OrderApproval
// ═══════════════════════════════════════════

export class InMemoryOrderApprovalRepository implements IOrderApprovalRepository {
  private store = new Map<string, OrderApproval>();

  async insert(approval: OrderApproval): Promise<void> {
    const k = key(approval.tenantId, approval.id);
    if (this.store.has(k)) throw new Error(`Duplicate approval id: ${approval.id}`);
    this.store.set(k, approval);
  }

  async findById(tenantId: string, id: string): Promise<OrderApproval | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByOrder(tenantId: string, orderId: string): Promise<OrderApproval[]> {
    const list: OrderApproval[] = [];
    for (const a of this.store.values()) {
      if (a.tenantId === tenantId && a.orderId === orderId) list.push(a);
    }
    return list;
  }

  async findPendingByOrder(tenantId: string, orderId: string): Promise<OrderApproval | null> {
    for (const a of this.store.values()) {
      if (a.tenantId !== tenantId) continue;
      if (a.orderId !== orderId) continue;
      if (a.status === 'Pending') return a;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<OrderApproval>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Approval not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// OrderAudit
// ═══════════════════════════════════════════

export class InMemoryOrderAuditRepository implements IOrderAuditRepository {
  private store = new Map<string, OrderAuditRecord>();
  private counter = 0;

  async insert(record: Omit<OrderAuditRecord, 'id' | 'createdAt'>): Promise<OrderAuditRecord> {
    this.counter += 1;
    const full: OrderAuditRecord = {
      ...record,
      id: `order-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<OrderAuditRecord[]> {
    const list: OrderAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByOrder(tenantId: string, orderId: string, limit?: number): Promise<OrderAuditRecord[]> {
    const list: OrderAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.orderId !== orderId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
