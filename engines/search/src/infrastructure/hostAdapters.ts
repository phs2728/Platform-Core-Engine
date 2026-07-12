/** Host Stubs + EventBus — Test/Demo only */
import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IProjectionProvider, IRankingProvider, ISynonymProvider, ISpellChecker,
  ICustomDataPolicyProvider, ProjectionSearchDoc, SynonymGroup, SpellCorrection,
} from '../interfaces/index.js';
import { Ok, Err, type Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Projection Provider (Mock — simulates Query Engine)
// ═══════════════════════════════════════════

export class MockProjectionProvider implements IProjectionProvider {
  private docs = new Map<string, ProjectionSearchDoc>();
  private subscribers: ((doc: ProjectionSearchDoc, action: 'created' | 'updated' | 'deleted') => Promise<void>)[] = [];

  add(doc: ProjectionSearchDoc): void { this.docs.set(`${doc.tenantId}::${doc.id}`, doc); }

  async getSearchDocuments(tenantId: string, sourceType?: string): Promise<ProjectionSearchDoc[]> {
    let list = [...this.docs.values()].filter((d) => d.tenantId === tenantId);
    if (sourceType !== undefined) list = list.filter((d) => d.sourceType === sourceType);
    return list;
  }

  async getSearchDocument(tenantId: string, sourceEngine: string, sourceId: string): Promise<ProjectionSearchDoc | null> {
    for (const d of this.docs.values()) {
      if (d.tenantId === tenantId && d.sourceEngine === sourceEngine && d.sourceId === sourceId) return d;
    }
    return null;
  }

  subscribeToChanges(handler: (doc: ProjectionSearchDoc, action: 'created' | 'updated' | 'deleted') => Promise<void>): void {
    this.subscribers.push(handler);
  }

  /** Simulate a document change from Query Engine. */
  notifyChange(doc: ProjectionSearchDoc, action: 'created' | 'updated' | 'deleted'): void {
    if (action === 'deleted') {
      for (const [k, d] of this.docs) { if (d.id === doc.id) { this.docs.delete(k); break; } }
    } else {
      this.docs.set(`${doc.tenantId}::${doc.id}`, doc);
    }
    for (const sub of this.subscribers) void sub(doc, action).catch(() => {});
  }

  clear(): void { this.docs.clear(); this.subscribers = []; }
}

// ═══════════════════════════════════════════
// Ranking Provider (Mock)
// ═══════════════════════════════════════════

export class MockRankingProvider implements IRankingProvider {
  private boosts = new Map<string, number>();
  private popularity = new Map<string, number>();

  setBoost(tenantId: string, sourceType: string, sourceId: string, boost: number): void {
    this.boosts.set(`${tenantId}::${sourceType}::${sourceId}`, boost);
  }
  setPopularity(tenantId: string, sourceType: string, sourceId: string, score: number): void {
    this.popularity.set(`${tenantId}::${sourceType}::${sourceId}`, score);
  }

  async getBoost(tenantId: string, sourceType: string, sourceId: string): Promise<number> {
    return this.boosts.get(`${tenantId}::${sourceType}::${sourceId}`) ?? 1.0;
  }
  async getPopularity(tenantId: string, sourceType: string, sourceId: string): Promise<number> {
    return this.popularity.get(`${tenantId}::${sourceType}::${sourceId}`) ?? 0;
  }
  async getSignals(_t: string, _st: string): Promise<Record<string, number>> { return {}; }
  clear(): void { this.boosts.clear(); this.popularity.clear(); }
}

// ═══════════════════════════════════════════
// Synonym Provider (Mock)
// ═══════════════════════════════════════════

export class MockSynonymProvider implements ISynonymProvider {
  private groups: SynonymGroup[] = [];

  addGroup(id: string, tenantId: string, terms: string[]): void {
    this.groups.push({ id, tenantId, terms });
  }

  async getSynonyms(tenantId: string, term: string): Promise<string[]> {
    const lower = term.toLowerCase();
    for (const g of this.groups) {
      if (g.tenantId !== tenantId) continue;
      if (g.terms.some((t) => t.toLowerCase() === lower)) {
        return g.terms.filter((t) => t.toLowerCase() !== lower);
      }
    }
    return [];
  }

  async getAllSynonymGroups(tenantId: string): Promise<SynonymGroup[]> {
    return this.groups.filter((g) => g.tenantId === tenantId);
  }

  clear(): void { this.groups = []; }
}

// ═══════════════════════════════════════════
// Spell Checker (Mock)
// ═══════════════════════════════════════════

export class MockSpellChecker implements ISpellChecker {
  private corrections = new Map<string, string>();

  addCorrection(from: string, to: string): void { this.corrections.set(from.toLowerCase(), to); }

  async correct(_tenantId: string, query: string): Promise<SpellCorrection> {
    const corrected = this.corrections.get(query.toLowerCase());
    if (corrected) {
      return { original: query, corrected, confidence: 0.9, suggestions: [corrected] };
    }
    return { original: query, corrected: null, confidence: 1, suggestions: [] };
  }
  clear(): void { this.corrections.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticSearchPolicyProvider implements ICustomDataPolicyProvider {
  private config = new Map<string, {
    allowedDomains: readonly string[];
    maxIndexSize: number;
    fuzzyEnabled: boolean;
    autocompleteEnabled: boolean;
  }>();

  set(tenantId: string, c: Partial<{ allowedDomains: readonly string[]; maxIndexSize: number; fuzzyEnabled: boolean; autocompleteEnabled: boolean }>): void {
    const prev = this.config.get(tenantId);
    this.config.set(tenantId, {
      allowedDomains: c.allowedDomains ?? prev?.allowedDomains ?? ['catalog', 'organization', 'booking', 'review', 'media', 'user', 'payment', 'global'],
      maxIndexSize: c.maxIndexSize ?? prev?.maxIndexSize ?? 100000,
      fuzzyEnabled: c.fuzzyEnabled ?? prev?.fuzzyEnabled ?? true,
      autocompleteEnabled: c.autocompleteEnabled ?? prev?.autocompleteEnabled ?? true,
    });
  }

  async validateAttributes(_t: string, _type: string, attrs: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> { return Ok(attrs); }
  async getAllowedSearchDomains(t: string): Promise<readonly string[]> { return this.config.get(t)?.allowedDomains ?? ['global']; }
  async getMaxIndexSizePerTenant(t: string): Promise<number> { return this.config.get(t)?.maxIndexSize ?? 100000; }
  async isFuzzySearchEnabled(t: string): Promise<boolean> { return this.config.get(t)?.fuzzyEnabled ?? true; }
  async isAutocompleteEnabled(t: string): Promise<boolean> { return this.config.get(t)?.autocompleteEnabled ?? true; }
  clear(): void { this.config.clear(); }
}

// ═══════════════════════════════════════════
// EventBus
// ═══════════════════════════════════════════

export interface RecordedEnvelope<T = unknown> { envelope: EventEnvelope<T>; recordedAt: number; }

export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];
  async emit<T>(e: EventEnvelope<T>): Promise<void> { this.emitted.push({ envelope: e, recordedAt: Date.now() }); }
  byType(t: string): RecordedEnvelope[] { return this.emitted.filter((r) => r.envelope.eventType === t); }
  countByType(t: string): number { return this.byType(t).length; }
  clear(): void { this.emitted.length = 0; }
}
