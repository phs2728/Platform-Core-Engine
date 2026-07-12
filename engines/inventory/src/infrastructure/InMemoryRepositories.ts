/**
 * In-Memory Repositories — Inventory/StockItem/Reservation/Allocation/Movement/Ledger/Availability/Audit
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  IInventoryRepository,
  IStockItemRepository,
  IReservationRepository,
  IAllocationRepository,
  IMovementRepository,
  ILedgerRepository,
  IAvailabilityRepository,
  IInventoryAuditRepository,
  Inventory,
  StockItem,
  Reservation,
  Allocation,
  InventoryMovement,
  InventoryLedgerEntry,
  AvailabilitySnapshot,
  InventoryAuditRecord,
  InventorySearchCriteria,
  InventorySearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Inventory
// ═══════════════════════════════════════════

export class InMemoryInventoryRepository implements IInventoryRepository {
  private store = new Map<string, Inventory>();

  async insert(inv: Inventory): Promise<void> {
    const k = key(inv.tenantId, inv.id);
    if (this.store.has(k)) throw new Error(`Duplicate inventory id: ${inv.id}`);
    this.store.set(k, inv);
  }

  async findById(tenantId: string, id: string): Promise<Inventory | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<Inventory | null> {
    for (const inv of this.store.values()) {
      if (inv.tenantId === tenantId && inv.slug === slug) return inv;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<Inventory>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Inventory not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: InventorySearchCriteria): Promise<InventorySearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'name';
    const sortOrder = criteria.sortOrder ?? 'asc';

    let candidates: Inventory[] = [];
    for (const inv of this.store.values()) {
      if (inv.tenantId !== criteria.tenantId) continue;
      if (inv.status === 'Deleted') continue;
      if (criteria.organizationId !== undefined && inv.organizationId !== criteria.organizationId) continue;
      if (criteria.type !== undefined && inv.type !== criteria.type) continue;
      if (criteria.status !== undefined && inv.status !== criteria.status) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => inv.tags.includes(t))) continue;
      if (criteria.catalogItemId !== undefined && inv.catalogItemId !== criteria.catalogItemId) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const name = inv.name.toLowerCase();
        if (!name.includes(q)) continue;
      }
      candidates.push(inv);
    }

    candidates.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortBy === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = candidates.length;
    return {
      inventories: candidates.slice(offset, offset + limit),
      total, limit, offset,
    };
  }

  async existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const inv of this.store.values()) {
      if (inv.tenantId !== tenantId) continue;
      if (inv.id === excludeId) continue;
      if (inv.slug === slug) return true;
    }
    return false;
  }

  async countByOrganization(tenantId: string, organizationId: string): Promise<number> {
    let count = 0;
    for (const inv of this.store.values()) {
      if (inv.tenantId === tenantId && inv.organizationId === organizationId && inv.status !== 'Deleted') {
        count += 1;
      }
    }
    return count;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// StockItem
// ═══════════════════════════════════════════

export class InMemoryStockItemRepository implements IStockItemRepository {
  private store = new Map<string, StockItem>();

  async insert(stock: StockItem): Promise<void> {
    const k = key(stock.tenantId, stock.id);
    if (this.store.has(k)) throw new Error(`Duplicate stock item id: ${stock.id}`);
    this.store.set(k, stock);
  }

  async findById(tenantId: string, id: string): Promise<StockItem | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInventory(tenantId: string, inventoryId: string): Promise<StockItem[]> {
    const list: StockItem[] = [];
    for (const s of this.store.values()) {
      if (s.tenantId === tenantId && s.inventoryId === inventoryId) list.push(s);
    }
    return list;
  }

  async findByInventoryAndLocation(tenantId: string, inventoryId: string, locationId: string): Promise<StockItem | null> {
    for (const s of this.store.values()) {
      if (s.tenantId === tenantId && s.inventoryId === inventoryId && s.locationId === locationId) return s;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<StockItem>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Stock item not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Reservation
// ═══════════════════════════════════════════

const ACTIVE_RESERVATION_STATUSES = new Set(['Pending', 'Confirmed']);

export class InMemoryReservationRepository implements IReservationRepository {
  private store = new Map<string, Reservation>();

  async insert(reservation: Reservation): Promise<void> {
    const k = key(reservation.tenantId, reservation.id);
    if (this.store.has(k)) throw new Error(`Duplicate reservation id: ${reservation.id}`);
    this.store.set(k, reservation);
  }

  async findById(tenantId: string, id: string): Promise<Reservation | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByInventory(tenantId: string, inventoryId: string): Promise<Reservation[]> {
    const list: Reservation[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.inventoryId === inventoryId) list.push(r);
    }
    return list;
  }

  async findActiveByInventory(tenantId: string, inventoryId: string): Promise<Reservation[]> {
    const list: Reservation[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.inventoryId !== inventoryId) continue;
      if (ACTIVE_RESERVATION_STATUSES.has(r.status)) list.push(r);
    }
    return list;
  }

  async findExpired(tenantId: string): Promise<Reservation[]> {
    const now = new Date().toISOString();
    const list: Reservation[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (!ACTIVE_RESERVATION_STATUSES.has(r.status)) continue;
      if (r.expiresAt <= now) list.push(r);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Reservation>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Reservation not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Allocation
// ═══════════════════════════════════════════

export class InMemoryAllocationRepository implements IAllocationRepository {
  private store = new Map<string, Allocation>();

  async insert(allocation: Allocation): Promise<void> {
    const k = key(allocation.tenantId, allocation.id);
    if (this.store.has(k)) throw new Error(`Duplicate allocation id: ${allocation.id}`);
    this.store.set(k, allocation);
  }

  async findById(tenantId: string, id: string): Promise<Allocation | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findActiveByInventory(tenantId: string, inventoryId: string): Promise<Allocation[]> {
    const list: Allocation[] = [];
    for (const a of this.store.values()) {
      if (a.tenantId !== tenantId) continue;
      if (a.inventoryId !== inventoryId) continue;
      if (a.status === 'Active') list.push(a);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Allocation>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Allocation not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Movement
// ═══════════════════════════════════════════

export class InMemoryMovementRepository implements IMovementRepository {
  private store = new Map<string, InventoryMovement>();
  private seq: InventoryMovement[] = [];

  async insert(movement: InventoryMovement): Promise<void> {
    const k = key(movement.tenantId, movement.id);
    if (this.store.has(k)) throw new Error(`Duplicate movement id: ${movement.id}`);
    this.store.set(k, movement);
    this.seq.push(movement);
  }

  async findByInventory(tenantId: string, inventoryId: string, limit?: number): Promise<InventoryMovement[]> {
    const list: InventoryMovement[] = [];
    for (const m of this.seq) {
      if (m.tenantId === tenantId && m.inventoryId === inventoryId) list.push(m);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.seq.length = 0; }
}

// ═══════════════════════════════════════════
// Ledger
// ═══════════════════════════════════════════

export class InMemoryLedgerRepository implements ILedgerRepository {
  private store = new Map<string, InventoryLedgerEntry>();
  private seq: InventoryLedgerEntry[] = [];

  async insert(entry: InventoryLedgerEntry): Promise<void> {
    const k = key(entry.tenantId, entry.id);
    if (this.store.has(k)) throw new Error(`Duplicate ledger entry id: ${entry.id}`);
    this.store.set(k, entry);
    this.seq.push(entry);
  }

  async findByInventory(tenantId: string, inventoryId: string, limit?: number): Promise<InventoryLedgerEntry[]> {
    const list: InventoryLedgerEntry[] = [];
    for (const e of this.seq) {
      if (e.tenantId === tenantId && e.inventoryId === inventoryId) list.push(e);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findLatest(tenantId: string, stockItemId: string): Promise<InventoryLedgerEntry | null> {
    let latest: InventoryLedgerEntry | null = null;
    for (const e of this.seq) {
      if (e.tenantId !== tenantId) continue;
      if (e.stockItemId !== stockItemId) continue;
      if (latest === null || e.createdAt > latest.createdAt) latest = e;
    }
    return latest;
  }

  clear(): void { this.store.clear(); this.seq.length = 0; }
}

// ═══════════════════════════════════════════
// Availability
// ═══════════════════════════════════════════

export class InMemoryAvailabilityRepository implements IAvailabilityRepository {
  private store = new Map<string, AvailabilitySnapshot>();
  private seq: AvailabilitySnapshot[] = [];

  async insert(snapshot: AvailabilitySnapshot): Promise<void> {
    const k = key(snapshot.tenantId, snapshot.id);
    if (this.store.has(k)) throw new Error(`Duplicate availability snapshot id: ${snapshot.id}`);
    this.store.set(k, snapshot);
    this.seq.push(snapshot);
  }

  async findLatest(tenantId: string, inventoryId: string): Promise<AvailabilitySnapshot | null> {
    let latest: AvailabilitySnapshot | null = null;
    for (const s of this.seq) {
      if (s.tenantId !== tenantId) continue;
      if (s.inventoryId !== inventoryId) continue;
      if (latest === null || s.snapshotAt > latest.snapshotAt) latest = s;
    }
    return latest;
  }

  clear(): void { this.store.clear(); this.seq.length = 0; }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemoryInventoryAuditRepository implements IInventoryAuditRepository {
  private store = new Map<string, InventoryAuditRecord>();
  private counter = 0;

  async insert(record: Omit<InventoryAuditRecord, 'id' | 'createdAt'>): Promise<InventoryAuditRecord> {
    this.counter += 1;
    const full: InventoryAuditRecord = {
      ...record,
      id: `inventory-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<InventoryAuditRecord[]> {
    const list: InventoryAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByInventory(tenantId: string, inventoryId: string, limit?: number): Promise<InventoryAuditRecord[]> {
    const list: InventoryAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.inventoryId !== inventoryId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
