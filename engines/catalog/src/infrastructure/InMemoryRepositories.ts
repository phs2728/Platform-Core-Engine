/**
 * In-Memory Repositories — Catalog/Category/Item/Variant/Bundle/Audit
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  ICatalogRepository,
  ICategoryRepository,
  IItemRepository,
  IVariantRepository,
  IBundleRepository,
  ICatalogAuditRepository,
  Catalog,
  Category,
  Item,
  Variant,
  Bundle,
  CatalogAuditRecord,
  CatalogSearchCriteria,
  CatalogSearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Catalog
// ═══════════════════════════════════════════

export class InMemoryCatalogRepository implements ICatalogRepository {
  private store = new Map<string, Catalog>();

  async insert(c: Catalog): Promise<void> {
    const k = key(c.tenantId, c.id);
    if (this.store.has(k)) throw new Error(`Duplicate catalog id: ${c.id}`);
    this.store.set(k, c);
  }

  async findById(tenantId: string, id: string): Promise<Catalog | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<Catalog | null> {
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.slug === slug) return c;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<Catalog>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Catalog not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: CatalogSearchCriteria): Promise<CatalogSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'name';
    const sortOrder = criteria.sortOrder ?? 'asc';

    let candidates: Catalog[] = [];
    for (const c of this.store.values()) {
      if (c.tenantId !== criteria.tenantId) continue;
      if (c.status === 'Deleted') continue;
      if (criteria.organizationId !== undefined && c.organizationId !== criteria.organizationId) continue;
      if (criteria.type !== undefined && c.type !== criteria.type) continue;
      if (criteria.status !== undefined && c.status !== criteria.status) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => c.tags.includes(t))) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const name = c.name.toLowerCase();
        if (!name.includes(q)) continue;
      }
      candidates.push(c);
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
      catalogs: candidates.slice(offset, offset + limit),
      total, limit, offset,
    };
  }

  async existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const c of this.store.values()) {
      if (c.tenantId !== tenantId) continue;
      if (c.id === excludeId) continue;
      if (c.slug === slug) return true;
    }
    return false;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<Catalog[]> {
    const list: Catalog[] = [];
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.organizationId === organizationId) list.push(c);
    }
    return list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Category
// ═══════════════════════════════════════════

export class InMemoryCategoryRepository implements ICategoryRepository {
  private store = new Map<string, Category>();

  async insert(c: Category): Promise<void> {
    const k = key(c.tenantId, c.id);
    if (this.store.has(k)) throw new Error(`Duplicate category id: ${c.id}`);
    this.store.set(k, c);
  }

  async findById(tenantId: string, id: string): Promise<Category | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByCatalog(tenantId: string, catalogId: string): Promise<Category[]> {
    const list: Category[] = [];
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.catalogId === catalogId) list.push(c);
    }
    return list;
  }

  async findByParent(tenantId: string, catalogId: string, parentCategoryId: string | null): Promise<Category[]> {
    const list: Category[] = [];
    for (const c of this.store.values()) {
      if (c.tenantId !== tenantId) continue;
      if (c.catalogId !== catalogId) continue;
      if (parentCategoryId === null) {
        if (c.parentCategoryId === null) list.push(c);
      } else {
        if (c.parentCategoryId === parentCategoryId) list.push(c);
      }
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Category>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Category not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async existsBySlug(tenantId: string, catalogId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const c of this.store.values()) {
      if (c.tenantId !== tenantId) continue;
      if (c.catalogId !== catalogId) continue;
      if (c.id === excludeId) continue;
      if (c.slug === slug) return true;
    }
    return false;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Item
// ═══════════════════════════════════════════

export class InMemoryItemRepository implements IItemRepository {
  private store = new Map<string, Item>();

  async insert(i: Item): Promise<void> {
    const k = key(i.tenantId, i.id);
    if (this.store.has(k)) throw new Error(`Duplicate item id: ${i.id}`);
    this.store.set(k, i);
  }

  async findById(tenantId: string, id: string): Promise<Item | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByCatalog(tenantId: string, catalogId: string): Promise<Item[]> {
    const list: Item[] = [];
    for (const i of this.store.values()) {
      if (i.tenantId === tenantId && i.catalogId === catalogId) list.push(i);
    }
    return list;
  }

  async findByCategory(tenantId: string, catalogId: string, categoryId: string): Promise<Item[]> {
    const list: Item[] = [];
    for (const i of this.store.values()) {
      if (i.tenantId !== tenantId) continue;
      if (i.catalogId !== catalogId) continue;
      if (i.categoryId === categoryId) list.push(i);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Item>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Item not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async existsBySlug(tenantId: string, catalogId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const i of this.store.values()) {
      if (i.tenantId !== tenantId) continue;
      if (i.catalogId !== catalogId) continue;
      if (i.id === excludeId) continue;
      if (i.slug === slug) return true;
    }
    return false;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Variant
// ═══════════════════════════════════════════

export class InMemoryVariantRepository implements IVariantRepository {
  private store = new Map<string, Variant>();

  async insert(v: Variant): Promise<void> {
    const k = key(v.tenantId, v.id);
    if (this.store.has(k)) throw new Error(`Duplicate variant id: ${v.id}`);
    this.store.set(k, v);
  }

  async findById(tenantId: string, id: string): Promise<Variant | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByItem(tenantId: string, itemId: string): Promise<Variant[]> {
    const list: Variant[] = [];
    for (const v of this.store.values()) {
      if (v.tenantId === tenantId && v.itemId === itemId) list.push(v);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Variant>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Variant not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async existsBySku(tenantId: string, itemId: string, sku: string, excludeId?: string): Promise<boolean> {
    for (const v of this.store.values()) {
      if (v.tenantId !== tenantId) continue;
      if (v.itemId !== itemId) continue;
      if (v.id === excludeId) continue;
      if (v.sku === sku) return true;
    }
    return false;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Bundle
// ═══════════════════════════════════════════

export class InMemoryBundleRepository implements IBundleRepository {
  private store = new Map<string, Bundle>();

  async insert(b: Bundle): Promise<void> {
    const k = key(b.tenantId, b.id);
    if (this.store.has(k)) throw new Error(`Duplicate bundle id: ${b.id}`);
    this.store.set(k, b);
  }

  async findById(tenantId: string, id: string): Promise<Bundle | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByCatalog(tenantId: string, catalogId: string): Promise<Bundle[]> {
    const list: Bundle[] = [];
    for (const b of this.store.values()) {
      if (b.tenantId === tenantId && b.catalogId === catalogId) list.push(b);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Bundle>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Bundle not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async existsBySlug(tenantId: string, catalogId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const b of this.store.values()) {
      if (b.tenantId !== tenantId) continue;
      if (b.catalogId !== catalogId) continue;
      if (b.id === excludeId) continue;
      if (b.slug === slug) return true;
    }
    return false;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemoryCatalogAuditRepository implements ICatalogAuditRepository {
  private store = new Map<string, CatalogAuditRecord>();
  private counter = 0;

  async insert(record: Omit<CatalogAuditRecord, 'id' | 'createdAt'>): Promise<CatalogAuditRecord> {
    this.counter += 1;
    const full: CatalogAuditRecord = {
      ...record,
      id: `catalog-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<CatalogAuditRecord[]> {
    const list: CatalogAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByCatalog(tenantId: string, catalogId: string, limit?: number): Promise<CatalogAuditRecord[]> {
    const list: CatalogAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.catalogId !== catalogId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
