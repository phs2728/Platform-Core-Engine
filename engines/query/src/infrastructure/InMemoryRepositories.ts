/**
 * In-Memory Repositories — Query Engine (9 repos)
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  IProjectionRepository, IDashboardRepository, ISummaryRepository,
  ITimelineRepository, IAnalyticsRepository, ISearchFeedRepository,
  IAIContextRepository, ICheckpointRepository, IQueryAuditRepository,
  Projection, Dashboard, Summary, TimelineEntry, AnalyticsMetrics,
  SearchDocument, AIContext, Checkpoint, QueryAuditRecord,
  ProjectionSearchCriteria, ProjectionSearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Projection
// ═══════════════════════════════════════════

export class InMemoryProjectionRepository implements IProjectionRepository {
  private store = new Map<string, Projection>();
  async insert(p: Projection): Promise<void> {
    const k = key(p.tenantId, p.id);
    if (this.store.has(k)) throw new Error(`Duplicate: ${p.id}`);
    this.store.set(k, p);
  }
  async findById(t: string, id: string): Promise<Projection | null> { return this.store.get(key(t, id)) ?? null; }
  async findByTarget(t: string, tt: string, tr: string): Promise<Projection | null> {
    for (const p of this.store.values()) if (p.tenantId === t && p.targetType === tt && p.targetRef === tr) return p;
    return null;
  }
  async findByType(t: string, tt: string): Promise<Projection[]> {
    return [...this.store.values()].filter((p) => p.tenantId === t && p.targetType === tt);
  }
  async update(t: string, id: string, patch: Partial<Projection>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k);
    if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  async search(c: ProjectionSearchCriteria): Promise<ProjectionSearchResult> {
    const limit = c.limit ?? 20; const offset = c.offset ?? 0;
    let candidates = [...this.store.values()].filter((p) => p.tenantId === c.tenantId);
    if (c.sourceEngine !== undefined) candidates = candidates.filter((p) => p.sourceEngine === c.sourceEngine);
    if (c.targetType !== undefined) candidates = candidates.filter((p) => p.targetType === c.targetType);
    if (c.status !== undefined) candidates = candidates.filter((p) => p.status === c.status);
    if (c.type !== undefined) candidates = candidates.filter((p) => p.type === c.type);
    return { projections: candidates.slice(offset, offset + limit), total: candidates.length, limit, offset };
  }
  async delete(t: string, id: string): Promise<void> { this.store.delete(key(t, id)); }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════

export class InMemoryDashboardRepository implements IDashboardRepository {
  private store = new Map<string, Dashboard>();
  async insert(d: Dashboard): Promise<void> { this.store.set(key(d.tenantId, d.id), d); }
  async findById(t: string, id: string): Promise<Dashboard | null> { return this.store.get(key(t, id)) ?? null; }
  async findByTypeAndTarget(t: string, type: string, tr: string): Promise<Dashboard | null> {
    for (const d of this.store.values()) if (d.tenantId === t && d.type === type && d.targetRef === tr) return d;
    return null;
  }
  async update(t: string, id: string, patch: Partial<Dashboard>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  async listByTenant(t: string, limit?: number): Promise<Dashboard[]> {
    const list = [...this.store.values()].filter((d) => d.tenantId === t);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════

export class InMemorySummaryRepository implements ISummaryRepository {
  private store = new Map<string, Summary>();
  async insert(s: Summary): Promise<void> { this.store.set(key(s.tenantId, s.id), s); }
  async findById(t: string, id: string): Promise<Summary | null> { return this.store.get(key(t, id)) ?? null; }
  async findByType(t: string, type: string, tr?: string): Promise<Summary | null> {
    for (const s of this.store.values()) {
      if (s.tenantId !== t || s.type !== type) continue;
      if (tr !== undefined && s.targetRef !== tr) continue;
      return s;
    }
    return null;
  }
  async update(t: string, id: string, patch: Partial<Summary>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  async listByType(t: string, type: string, limit?: number): Promise<Summary[]> {
    const list = [...this.store.values()].filter((s) => s.tenantId === t && s.type === type);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Timeline
// ═══════════════════════════════════════════

export class InMemoryTimelineRepository implements ITimelineRepository {
  private store = new Map<string, TimelineEntry>();
  async insert(e: TimelineEntry): Promise<void> { this.store.set(key(e.tenantId, e.id), e); }
  async findByTenant(t: string, type?: string, limit?: number): Promise<TimelineEntry[]> {
    let list = [...this.store.values()].filter((e) => e.tenantId === t);
    if (type !== undefined) list = list.filter((e) => e.type === type);
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  async findByAggregate(t: string, aggregateId: string, limit?: number): Promise<TimelineEntry[]> {
    let list = [...this.store.values()].filter((e) => e.tenantId === t && e.aggregateId === aggregateId);
    list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Analytics
// ═══════════════════════════════════════════

export class InMemoryAnalyticsRepository implements IAnalyticsRepository {
  private store = new Map<string, AnalyticsMetrics>();
  async insert(m: AnalyticsMetrics): Promise<void> { this.store.set(key(m.tenantId, m.id), m); }
  async findById(t: string, id: string): Promise<AnalyticsMetrics | null> { return this.store.get(key(t, id)) ?? null; }
  async findByType(t: string, type: string, limit?: number): Promise<AnalyticsMetrics[]> {
    const list = [...this.store.values()].filter((m) => m.tenantId === t && m.type === type);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Search Feed
// ═══════════════════════════════════════════

export class InMemorySearchFeedRepository implements ISearchFeedRepository {
  private store = new Map<string, SearchDocument>();
  async insert(d: SearchDocument): Promise<void> { this.store.set(key(d.tenantId, d.id), d); }
  async findById(t: string, id: string): Promise<SearchDocument | null> { return this.store.get(key(t, id)) ?? null; }
  async findBySource(t: string, engine: string, sourceId: string): Promise<SearchDocument | null> {
    for (const d of this.store.values()) if (d.tenantId === t && d.sourceEngine === engine && d.sourceId === sourceId) return d;
    return null;
  }
  async update(t: string, id: string, patch: Partial<SearchDocument>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  async listByTenant(t: string, limit?: number): Promise<SearchDocument[]> {
    const list = [...this.store.values()].filter((d) => d.tenantId === t);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  async listBySource(t: string, engine: string, limit?: number): Promise<SearchDocument[]> {
    const list = [...this.store.values()].filter((d) => d.tenantId === t && d.sourceEngine === engine);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// AI Context
// ═══════════════════════════════════════════

export class InMemoryAIContextRepository implements IAIContextRepository {
  private store = new Map<string, AIContext>();
  async insert(c: AIContext): Promise<void> { this.store.set(key(c.tenantId, c.id), c); }
  async findById(t: string, id: string): Promise<AIContext | null> { return this.store.get(key(t, id)) ?? null; }
  async findByTarget(t: string, ct: string, tr: string): Promise<AIContext | null> {
    for (const c of this.store.values()) if (c.tenantId === t && c.contextType === ct && c.targetRef === tr) return c;
    return null;
  }
  async update(t: string, id: string, patch: Partial<AIContext>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  async listByTenant(t: string, limit?: number): Promise<AIContext[]> {
    const list = [...this.store.values()].filter((c) => c.tenantId === t);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Checkpoint
// ═══════════════════════════════════════════

export class InMemoryCheckpointRepository implements ICheckpointRepository {
  private store = new Map<string, Checkpoint>();
  async insert(c: Checkpoint): Promise<void> { this.store.set(key(c.tenantId, c.id), c); }
  async findByProjection(t: string, pid: string, engine: string): Promise<Checkpoint | null> {
    for (const c of this.store.values()) if (c.tenantId === t && c.projectionId === pid && c.engine === engine) return c;
    return null;
  }
  async update(t: string, id: string, patch: Partial<Checkpoint>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemoryQueryAuditRepository implements IQueryAuditRepository {
  private store = new Map<string, QueryAuditRecord>();
  private counter = 0;
  async insert(r: Omit<QueryAuditRecord, 'id' | 'createdAt'>): Promise<QueryAuditRecord> {
    this.counter++;
    const full: QueryAuditRecord = { ...r, id: `query-audit-${this.counter}`, createdAt: new Date().toISOString() };
    this.store.set(full.id, full);
    return full;
  }
  async findByTenant(t: string, limit?: number): Promise<QueryAuditRecord[]> {
    const list = [...this.store.values()].filter((r) => r.tenantId === t);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  async findByProjection(t: string, pid: string, limit?: number): Promise<QueryAuditRecord[]> {
    const list = [...this.store.values()].filter((r) => r.tenantId === t && r.projectionId === pid);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); this.counter = 0; }
}
