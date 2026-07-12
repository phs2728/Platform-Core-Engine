/** In-Memory Repositories — Release Manager (6 repos) */
import type {
  IReleaseRepository, IVersionRepository, ITagRepository,
  IHistoryRepository, IChecklistRepository, IReleaseAuditRepository,
  Release, VersionRecord, Tag, ReleaseHistory, ReleaseChecklist, ReleaseAuditRecord,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═════ Release ═════
export class InMemoryReleaseRepository implements IReleaseRepository {
  private store = new Map<string, Release>();
  async insert(r: Release): Promise<void> { this.store.set(key(r.tenantId, r.id), r); }
  async findById(t: string, id: string): Promise<Release | null> { return this.store.get(key(t, id)) ?? null; }
  async findByEngine(t: string, engineId: string): Promise<Release[]> {
    return [...this.store.values()].filter((r) => r.tenantId === t && r.engineId === engineId);
  }
  async findLatest(t: string, engineId: string): Promise<Release | null> {
    const list = await this.findByEngine(t, engineId);
    if (list.length === 0) return null;
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!;
  }
  async update(t: string, id: string, patch: Partial<Release>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  async listAll(t: string, limit?: number): Promise<Release[]> {
    const list = [...this.store.values()].filter((r) => r.tenantId === t);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═════ Version ═════
export class InMemoryVersionRepository implements IVersionRepository {
  private store = new Map<string, VersionRecord>();
  async insert(v: VersionRecord): Promise<void> { this.store.set(key(v.tenantId, v.id), v); }
  async findByEngine(t: string, engineId: string): Promise<VersionRecord[]> {
    return [...this.store.values()].filter((v) => v.tenantId === t && v.engineId === engineId);
  }
  async findLatest(t: string, engineId: string): Promise<VersionRecord | null> {
    const list = await this.findByEngine(t, engineId);
    if (list.length === 0) return null;
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!;
  }
  clear(): void { this.store.clear(); }
}

// ═════ Tag ═════
export class InMemoryTagRepository implements ITagRepository {
  private store = new Map<string, Tag>();
  async insert(t: Tag): Promise<void> { this.store.set(key(t.tenantId, t.id), t); }
  async findById(t: string, id: string): Promise<Tag | null> { return this.store.get(key(t, id)) ?? null; }
  async findByName(t: string, name: string): Promise<Tag | null> {
    for (const tag of this.store.values()) if (tag.tenantId === t && tag.name === name) return tag;
    return null;
  }
  async findByEngine(t: string, engineId: string): Promise<Tag[]> {
    return [...this.store.values()].filter((tag) => tag.tenantId === t && tag.engineId === engineId);
  }
  async delete(t: string, id: string): Promise<void> { this.store.delete(key(t, id)); }
  clear(): void { this.store.clear(); }
}

// ═════ History ═════
export class InMemoryHistoryRepository implements IHistoryRepository {
  private store = new Map<string, ReleaseHistory>();
  async upsert(h: ReleaseHistory): Promise<void> { this.store.set(key(h.tenantId, h.engineId), h); }
  async findByEngine(t: string, engineId: string): Promise<ReleaseHistory | null> {
    return this.store.get(key(t, engineId)) ?? null;
  }
  clear(): void { this.store.clear(); }
}

// ═════ Checklist ═════
export class InMemoryChecklistRepository implements IChecklistRepository {
  private store = new Map<string, ReleaseChecklist>();
  async upsert(releaseId: string, checklist: ReleaseChecklist): Promise<void> { this.store.set(releaseId, checklist); }
  async findByRelease(releaseId: string): Promise<ReleaseChecklist | null> { return this.store.get(releaseId) ?? null; }
  clear(): void { this.store.clear(); }
}

// ═════ Audit ═════
export class InMemoryReleaseAuditRepository implements IReleaseAuditRepository {
  private store = new Map<string, ReleaseAuditRecord>();
  private counter = 0;
  async insert(r: Omit<ReleaseAuditRecord, 'id' | 'createdAt'>): Promise<ReleaseAuditRecord> {
    this.counter++;
    const full: ReleaseAuditRecord = { ...r, id: `rel-audit-${this.counter}`, createdAt: new Date().toISOString() };
    this.store.set(full.id, full);
    return full;
  }
  async findByTenant(t: string, limit?: number): Promise<ReleaseAuditRecord[]> {
    const list = [...this.store.values()].filter((r) => r.tenantId === t);
    return limit !== undefined ? list.slice(-limit) : list;
  }
  async findByRelease(t: string, releaseId: string): Promise<ReleaseAuditRecord[]> {
    return [...this.store.values()].filter((r) => r.tenantId === t && r.releaseId === releaseId);
  }
  clear(): void { this.store.clear(); this.counter = 0; }
}
