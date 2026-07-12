/** In-Memory Repositories — Search Engine (7 repos) */
import type {
  ISearchRepository, IIndexRepository, IAutocompleteRepository,
  IRankingRepository, IAnalyticsRepository, ISynonymRepository, ISearchAuditRepository,
  IndexedDocument, SearchIndex, AutocompleteEntry, RankingRule,
  SearchLog, SynonymGroup, SearchAuditRecord, SearchDomain,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Search (Indexed Documents)
// ═══════════════════════════════════════════

export class InMemorySearchRepository implements ISearchRepository {
  private store = new Map<string, IndexedDocument>();
  async insert(d: IndexedDocument): Promise<void> { this.store.set(key(d.tenantId, d.id), d); }
  async findById(t: string, id: string): Promise<IndexedDocument | null> { return this.store.get(key(t, id)) ?? null; }
  async findBySource(t: string, engine: string, sourceId: string): Promise<IndexedDocument | null> {
    for (const d of this.store.values()) if (d.tenantId === t && d.sourceEngine === engine && d.sourceId === sourceId) return d;
    return null;
  }
  async update(t: string, id: string, patch: Partial<IndexedDocument>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  async delete(t: string, id: string): Promise<void> { this.store.delete(key(t, id)); }
  async findAll(t: string): Promise<IndexedDocument[]> { return [...this.store.values()].filter((d) => d.tenantId === t); }
  async findByDomain(t: string, domain: SearchDomain): Promise<IndexedDocument[]> {
    const sourceTypeMap: Record<string, string[]> = {
      catalog: ['catalog_item', 'catalog'],
      organization: ['organization'],
      booking: ['booking'],
      review: ['review'],
      media: ['media', 'media_asset'],
      user: ['user'],
      payment: ['payment'],
    };
    const types = sourceTypeMap[domain] ?? [domain];
    return [...this.store.values()].filter((d) => d.tenantId === t && types.includes(d.sourceType));
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Index
// ═══════════════════════════════════════════

export class InMemoryIndexRepository implements IIndexRepository {
  private store = new Map<string, SearchIndex>();
  async insert(i: SearchIndex): Promise<void> { this.store.set(key(i.tenantId, i.id), i); }
  async findById(t: string, id: string): Promise<SearchIndex | null> { return this.store.get(key(t, id)) ?? null; }
  async findByDomain(t: string, domain: string): Promise<SearchIndex | null> {
    for (const i of this.store.values()) if (i.tenantId === t && i.domain === domain) return i;
    return null;
  }
  async update(t: string, id: string, patch: Partial<SearchIndex>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  async listByTenant(t: string): Promise<SearchIndex[]> { return [...this.store.values()].filter((i) => i.tenantId === t); }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Autocomplete
// ═══════════════════════════════════════════

export class InMemoryAutocompleteRepository implements IAutocompleteRepository {
  private store = new Map<string, AutocompleteEntry>();
  async insert(e: AutocompleteEntry): Promise<void> { this.store.set(key(e.tenantId, `${e.term}::${e.domain}`), e); }
  async findByTerm(t: string, prefix: string, limit?: number): Promise<AutocompleteEntry[]> {
    const list = [...this.store.values()].filter((e) => e.tenantId === t && e.term.toLowerCase().startsWith(prefix.toLowerCase()));
    list.sort((a, b) => b.frequency - a.frequency);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  async incrementFrequency(t: string, term: string, domain: SearchDomain): Promise<void> {
    const k = key(t, `${term}::${domain}`);
    const ex = this.store.get(k);
    if (ex) { ex.frequency += 1; ex.lastUsedAt = new Date().toISOString(); }
    else {
      this.store.set(k, { id: `ac-${Date.now()}`, tenantId: t, term, frequency: 1, domain, lastUsedAt: new Date().toISOString() });
    }
  }
  async listPopular(t: string, limit?: number): Promise<AutocompleteEntry[]> {
    const list = [...this.store.values()].filter((e) => e.tenantId === t);
    list.sort((a, b) => b.frequency - a.frequency);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Ranking
// ═══════════════════════════════════════════

export class InMemoryRankingRepository implements IRankingRepository {
  private store = new Map<string, RankingRule>();
  async insert(r: RankingRule): Promise<void> { this.store.set(key(r.tenantId, r.id), r); }
  async findById(t: string, id: string): Promise<RankingRule | null> { return this.store.get(key(t, id)) ?? null; }
  async findBySourceType(t: string, st: string): Promise<RankingRule[]> {
    return [...this.store.values()].filter((r) => r.tenantId === t && r.sourceType === st);
  }
  async delete(t: string, id: string): Promise<void> { this.store.delete(key(t, id)); }
  async listByTenant(t: string): Promise<RankingRule[]> { return [...this.store.values()].filter((r) => r.tenantId === t); }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Analytics
// ═══════════════════════════════════════════

export class InMemoryAnalyticsRepository implements IAnalyticsRepository {
  private logs: SearchLog[] = [];
  async insertLog(l: SearchLog): Promise<void> { this.logs.push(l); }
  async getLogs(t: string, limit?: number): Promise<SearchLog[]> {
    const list = this.logs.filter((l) => l.tenantId === t);
    return limit !== undefined ? list.slice(-limit) : list;
  }
  async getZeroResultQueries(t: string, limit?: number): Promise<SearchLog[]> {
    const list = this.logs.filter((l) => l.tenantId === t && l.resultCount === 0);
    return limit !== undefined ? list.slice(-limit) : list;
  }
  async getTopKeywords(t: string, limit?: number): Promise<{ keyword: string; count: number }[]> {
    const counts = new Map<string, number>();
    for (const l of this.logs) {
      if (l.tenantId !== t) continue;
      counts.set(l.query, (counts.get(l.query) ?? 0) + 1);
    }
    const list = [...counts.entries()].map(([keyword, count]) => ({ keyword, count })).sort((a, b) => b.count - a.count);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.logs = []; }
}

// ═══════════════════════════════════════════
// Synonym
// ═══════════════════════════════════════════

export class InMemorySynonymRepository implements ISynonymRepository {
  private store = new Map<string, SynonymGroup>();
  async insert(g: SynonymGroup): Promise<void> { this.store.set(key(g.tenantId, g.id), g); }
  async findById(t: string, id: string): Promise<SynonymGroup | null> { return this.store.get(key(t, id)) ?? null; }
  async findByTerm(t: string, term: string): Promise<SynonymGroup | null> {
    for (const g of this.store.values()) {
      if (g.tenantId !== t) continue;
      if (g.terms.some((tt) => tt.toLowerCase() === term.toLowerCase())) return g;
    }
    return null;
  }
  async listByTenant(t: string): Promise<SynonymGroup[]> { return [...this.store.values()].filter((g) => g.tenantId === t); }
  async delete(t: string, id: string): Promise<void> { this.store.delete(key(t, id)); }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemorySearchAuditRepository implements ISearchAuditRepository {
  private store = new Map<string, SearchAuditRecord>();
  private counter = 0;
  async insert(r: Omit<SearchAuditRecord, 'id' | 'createdAt'>): Promise<SearchAuditRecord> {
    this.counter++;
    const full: SearchAuditRecord = { ...r, id: `search-audit-${this.counter}`, createdAt: new Date().toISOString() };
    this.store.set(full.id, full);
    return full;
  }
  async findByTenant(t: string, limit?: number): Promise<SearchAuditRecord[]> {
    const list = [...this.store.values()].filter((r) => r.tenantId === t);
    return limit !== undefined ? list.slice(-limit) : list;
  }
  clear(): void { this.store.clear(); this.counter = 0; }
}
