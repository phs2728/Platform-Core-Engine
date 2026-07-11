/**
 * In-Memory Repositories — Pricing Engine
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 * Currency repository uses key = `${tenantId}::${code}`
 *
 * Catalog/Category/Item/Variant/Bundle/Audit 패턴 동일.
 */

import type {
  IPricingPlanRepository,
  IPriceRepository,
  IPriceComponentRepository,
  ITierPricingRepository,
  ITimePricingRepository,
  ICurrencyRepository,
  IExchangeRateRepository,
  IPriceVersionRepository,
  IPriceHistoryRepository,
  IPricingAuditRepository,
  PricingPlan,
  Price,
  PriceComponent,
  TierPricing,
  TimePricing,
  Currency,
  ExchangeRate,
  PriceVersion,
  PriceHistory,
  PricingAuditRecord,
  PricingSearchCriteria,
  PricingSearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// PricingPlan
// ═══════════════════════════════════════════

export class InMemoryPricingPlanRepository implements IPricingPlanRepository {
  private store = new Map<string, PricingPlan>();

  async insert(plan: PricingPlan): Promise<void> {
    const k = key(plan.tenantId, plan.id);
    if (this.store.has(k)) throw new Error(`Duplicate pricing plan id: ${plan.id}`);
    this.store.set(k, plan);
  }

  async findById(tenantId: string, id: string): Promise<PricingPlan | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<PricingPlan | null> {
    for (const p of this.store.values()) {
      if (p.tenantId === tenantId && p.slug === slug) return p;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<PricingPlan>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Pricing plan not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: PricingSearchCriteria): Promise<PricingSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'name';
    const sortOrder = criteria.sortOrder ?? 'asc';

    let candidates: PricingPlan[] = [];
    for (const p of this.store.values()) {
      if (p.tenantId !== criteria.tenantId) continue;
      if (p.status === 'Deleted') continue;
      if (criteria.organizationId !== undefined && p.organizationId !== criteria.organizationId) continue;
      if (criteria.type !== undefined && p.type !== criteria.type) continue;
      if (criteria.status !== undefined && p.status !== criteria.status) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => p.tags.includes(t))) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const name = p.name.toLowerCase();
        if (!name.includes(q)) continue;
      }
      candidates.push(p);
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
      plans: candidates.slice(offset, offset + limit),
      total, limit, offset,
    };
  }

  async existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const p of this.store.values()) {
      if (p.tenantId !== tenantId) continue;
      if (p.id === excludeId) continue;
      if (p.slug === slug) return true;
    }
    return false;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Price
// ═══════════════════════════════════════════

export class InMemoryPriceRepository implements IPriceRepository {
  private store = new Map<string, Price>();

  async insert(price: Price): Promise<void> {
    const k = key(price.tenantId, price.id);
    if (this.store.has(k)) throw new Error(`Duplicate price id: ${price.id}`);
    this.store.set(k, price);
  }

  async findById(tenantId: string, id: string): Promise<Price | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByPlan(tenantId: string, planId: string): Promise<Price[]> {
    const list: Price[] = [];
    for (const p of this.store.values()) {
      if (p.tenantId === tenantId && p.planId === planId) list.push(p);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Price>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Price not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// PriceComponent
// ═══════════════════════════════════════════

export class InMemoryPriceComponentRepository implements IPriceComponentRepository {
  private store = new Map<string, PriceComponent>();

  async insert(comp: PriceComponent): Promise<void> {
    const k = key(comp.tenantId, comp.id);
    if (this.store.has(k)) throw new Error(`Duplicate price component id: ${comp.id}`);
    this.store.set(k, comp);
  }

  async findById(tenantId: string, id: string): Promise<PriceComponent | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByPrice(tenantId: string, priceId: string): Promise<PriceComponent[]> {
    const list: PriceComponent[] = [];
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.priceId === priceId) list.push(c);
    }
    return list;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Price component not found: ${id}`);
    this.store.delete(k);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// TierPricing
// ═══════════════════════════════════════════

export class InMemoryTierPricingRepository implements ITierPricingRepository {
  private store = new Map<string, TierPricing>();

  async insert(tier: TierPricing): Promise<void> {
    const k = key(tier.tenantId, tier.id);
    if (this.store.has(k)) throw new Error(`Duplicate tier pricing id: ${tier.id}`);
    this.store.set(k, tier);
  }

  async findById(tenantId: string, id: string): Promise<TierPricing | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByPlan(tenantId: string, planId: string): Promise<TierPricing[]> {
    const list: TierPricing[] = [];
    for (const t of this.store.values()) {
      if (t.tenantId === tenantId && t.planId === planId) list.push(t);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<TierPricing>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Tier pricing not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Tier pricing not found: ${id}`);
    this.store.delete(k);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// TimePricing
// ═══════════════════════════════════════════

export class InMemoryTimePricingRepository implements ITimePricingRepository {
  private store = new Map<string, TimePricing>();

  async insert(tp: TimePricing): Promise<void> {
    const k = key(tp.tenantId, tp.id);
    if (this.store.has(k)) throw new Error(`Duplicate time pricing id: ${tp.id}`);
    this.store.set(k, tp);
  }

  async findById(tenantId: string, id: string): Promise<TimePricing | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByPlan(tenantId: string, planId: string): Promise<TimePricing[]> {
    const list: TimePricing[] = [];
    for (const t of this.store.values()) {
      if (t.tenantId === tenantId && t.planId === planId) list.push(t);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<TimePricing>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Time pricing not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Time pricing not found: ${id}`);
    this.store.delete(k);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Currency (keyed by tenantId::code)
// ═══════════════════════════════════════════

export class InMemoryCurrencyRepository implements ICurrencyRepository {
  // Keyed by `${tenantId}::${code}`. Since Currency carries no tenantId,
  // insert() records the caller's tenant via an internal tracker set by
  // the most recent tenant-scoped operation. For tests, use the scoped
  // helper `insertFor(tenantId, currency)`.
  private store = new Map<string, Currency>();
  private tenantByCode = new Map<string, string>(); // code → tenantId for insert lookups

  /** Test helper: insert with explicit tenantId for proper isolation. */
  insertFor(tenantId: string, currency: Currency): Promise<void> {
    const k = key(tenantId, currency.code);
    if (this.store.has(k)) throw new Error(`Duplicate currency code: ${currency.code}`);
    this.store.set(k, currency);
    this.tenantByCode.set(currency.code, tenantId);
    return Promise.resolve();
  }

  async insert(currency: Currency): Promise<void> {
    const tenantId = this.tenantByCode.get(currency.code);
    if (tenantId !== undefined) {
      await this.insertFor(tenantId, currency);
      return;
    }
    // Fallback: store under a global key when tenant is unknown
    const k = `global::${currency.code}`;
    if (this.store.has(k)) throw new Error(`Duplicate currency code: ${currency.code}`);
    this.store.set(k, currency);
  }

  async findByCode(tenantId: string, code: string): Promise<Currency | null> {
    return this.store.get(key(tenantId, code)) ?? this.store.get(`global::${code}`) ?? null;
  }

  async findAll(tenantId: string): Promise<Currency[]> {
    const list: Currency[] = [];
    const prefix = `${tenantId}::`;
    for (const [k, c] of this.store.entries()) {
      if (k.startsWith(prefix) || k.startsWith('global::')) list.push(c);
    }
    return list;
  }

  async findBase(tenantId: string): Promise<Currency | null> {
    const prefix = `${tenantId}::`;
    for (const [k, c] of this.store.entries()) {
      if ((k.startsWith(prefix) || k.startsWith('global::')) && c.isBase) return c;
    }
    return null;
  }

  async update(tenantId: string, code: string, patch: Partial<Currency>): Promise<void> {
    const k = key(tenantId, code);
    const ex = this.store.get(k) ?? this.store.get(`global::${code}`);
    if (!ex) throw new Error(`Currency not found: ${code}`);
    this.store.set(this.store.has(k) ? k : `global::${code}`, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); this.tenantByCode.clear(); }
}

// ═══════════════════════════════════════════
// ExchangeRate
// ═══════════════════════════════════════════

export class InMemoryExchangeRateRepository implements IExchangeRateRepository {
  private store = new Map<string, ExchangeRate>();

  async insert(rate: ExchangeRate): Promise<void> {
    const k = key(rate.tenantId, rate.id);
    if (this.store.has(k)) throw new Error(`Duplicate exchange rate id: ${rate.id}`);
    this.store.set(k, rate);
  }

  async findLatest(tenantId: string, fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    let latest: ExchangeRate | null = null;
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.fromCurrency !== fromCurrency) continue;
      if (r.toCurrency !== toCurrency) continue;
      if (latest === null || r.effectiveAt > latest.effectiveAt) {
        latest = r;
      }
    }
    return latest;
  }

  async findAll(tenantId: string): Promise<ExchangeRate[]> {
    const list: ExchangeRate[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// PriceVersion
// ═══════════════════════════════════════════

export class InMemoryPriceVersionRepository implements IPriceVersionRepository {
  private store = new Map<string, PriceVersion>();

  async insert(version: PriceVersion): Promise<void> {
    const k = key(version.tenantId, version.id);
    if (this.store.has(k)) throw new Error(`Duplicate price version id: ${version.id}`);
    this.store.set(k, version);
  }

  async findLatest(tenantId: string, planId: string): Promise<PriceVersion | null> {
    let latest: PriceVersion | null = null;
    for (const v of this.store.values()) {
      if (v.tenantId !== tenantId) continue;
      if (v.planId !== planId) continue;
      if (latest === null || v.versionNumber > latest.versionNumber) {
        latest = v;
      }
    }
    return latest;
  }

  async findByNumber(tenantId: string, planId: string, versionNumber: number): Promise<PriceVersion | null> {
    for (const v of this.store.values()) {
      if (v.tenantId !== tenantId) continue;
      if (v.planId !== planId) continue;
      if (v.versionNumber === versionNumber) return v;
    }
    return null;
  }

  async findAll(tenantId: string, planId: string): Promise<PriceVersion[]> {
    const list: PriceVersion[] = [];
    for (const v of this.store.values()) {
      if (v.tenantId !== tenantId) continue;
      if (v.planId === planId) list.push(v);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<PriceVersion>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Price version not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// PriceHistory (counter-based id)
// ═══════════════════════════════════════════

export class InMemoryPriceHistoryRepository implements IPriceHistoryRepository {
  private store = new Map<string, PriceHistory>();
  private counter = 0;

  async insert(record: Omit<PriceHistory, 'id' | 'createdAt'>): Promise<PriceHistory> {
    this.counter += 1;
    const full: PriceHistory = {
      ...record,
      id: `price-history-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByPlan(tenantId: string, planId: string, limit?: number): Promise<PriceHistory[]> {
    const list: PriceHistory[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.planId === planId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}

// ═══════════════════════════════════════════
// PricingAudit (counter-based id)
// ═══════════════════════════════════════════

export class InMemoryPricingAuditRepository implements IPricingAuditRepository {
  private store = new Map<string, PricingAuditRecord>();
  private counter = 0;

  async insert(record: Omit<PricingAuditRecord, 'id' | 'createdAt'>): Promise<PricingAuditRecord> {
    this.counter += 1;
    const full: PricingAuditRecord = {
      ...record,
      id: `pricing-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<PricingAuditRecord[]> {
    const list: PricingAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByPlan(tenantId: string, planId: string, limit?: number): Promise<PricingAuditRecord[]> {
    const list: PricingAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.planId !== planId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
