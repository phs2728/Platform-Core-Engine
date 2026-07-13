/**
 * Studio Engine — In-Memory Repositories
 */
import type {
  Workspace, BuildSession, PageDraft, ComponentBinding, ContentBinding,
  PublishIntent, StudioAsset, StudioAuditRecord,
  IWorkspaceRepository, IBuildSessionRepository, IPageDraftRepository,
  IComponentBindingRepository, IContentBindingRepository, IPublishIntentRepository,
  IStudioAssetRepository, IStudioAuditRepository,
} from '../interfaces/index.js';

// ── Workspace ──
export class InMemoryWorkspaceRepository implements IWorkspaceRepository {
  private store = new Map<string, Workspace>();
  async insert(w: Workspace): Promise<void> { this.store.set(`${w.tenantId}::${w.id}`, { ...w }); }
  async findById(tenantId: string, id: string): Promise<Workspace | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findBySlug(tenantId: string, slug: string): Promise<Workspace | null> {
    for (const w of this.store.values()) {
      if (w.tenantId === tenantId && w.slug === slug) return { ...w };
    }
    return null;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<Workspace[]> {
    const results: Workspace[] = [];
    this.store.forEach(w => { if (w.tenantId === tenantId && w.organizationId === orgId) results.push({ ...w }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<Workspace>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  async existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const w of this.store.values()) {
      if (w.tenantId === tenantId && w.slug === slug && w.id !== excludeId) return true;
    }
    return false;
  }
  async countByOrganization(tenantId: string, orgId: string): Promise<number> {
    let c = 0;
    this.store.forEach(w => { if (w.tenantId === tenantId && w.organizationId === orgId) c++; });
    return c;
  }
  clear(): void { this.store.clear(); }
}

// ── BuildSession ──
export class InMemoryBuildSessionRepository implements IBuildSessionRepository {
  private store = new Map<string, BuildSession>();
  async insert(s: BuildSession): Promise<void> { this.store.set(`${s.tenantId}::${s.id}`, { ...s }); }
  async findById(tenantId: string, id: string): Promise<BuildSession | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByWorkspace(tenantId: string, workspaceId: string): Promise<BuildSession[]> {
    const results: BuildSession[] = [];
    this.store.forEach(s => { if (s.tenantId === tenantId && s.workspaceId === workspaceId) results.push({ ...s }); });
    return results;
  }
  async findActiveByWorkspace(tenantId: string, workspaceId: string): Promise<BuildSession | null> {
    for (const s of this.store.values()) {
      if (s.tenantId === tenantId && s.workspaceId === workspaceId && s.status === 'Active') return { ...s };
    }
    return null;
  }
  async update(tenantId: string, id: string, patch: Partial<BuildSession>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  clear(): void { this.store.clear(); }
}

// ── PageDraft ──
export class InMemoryPageDraftRepository implements IPageDraftRepository {
  private store = new Map<string, PageDraft>();
  async insert(d: PageDraft): Promise<void> { this.store.set(`${d.tenantId}::${d.id}`, { ...d }); }
  async findById(tenantId: string, id: string): Promise<PageDraft | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findBySession(tenantId: string, sessionId: string): Promise<PageDraft[]> {
    const results: PageDraft[] = [];
    this.store.forEach(d => { if (d.tenantId === tenantId && d.buildSessionId === sessionId) results.push({ ...d }); });
    return results;
  }
  async findByWorkspace(tenantId: string, workspaceId: string): Promise<PageDraft[]> {
    const results: PageDraft[] = [];
    this.store.forEach(d => { if (d.tenantId === tenantId && d.workspaceId === workspaceId) results.push({ ...d }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<PageDraft>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  async existsBySlugInSession(tenantId: string, sessionId: string, slug: string): Promise<boolean> {
    for (const d of this.store.values()) {
      if (d.tenantId === tenantId && d.buildSessionId === sessionId && d.pageSlug === slug) return true;
    }
    return false;
  }
  clear(): void { this.store.clear(); }
}

// ── ComponentBinding ──
export class InMemoryComponentBindingRepository implements IComponentBindingRepository {
  private store = new Map<string, ComponentBinding>();
  async insert(b: ComponentBinding): Promise<void> { this.store.set(`${b.tenantId}::${b.id}`, { ...b }); }
  async findById(tenantId: string, id: string): Promise<ComponentBinding | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByDraft(tenantId: string, draftId: string): Promise<ComponentBinding[]> {
    const results: ComponentBinding[] = [];
    this.store.forEach(b => { if (b.tenantId === tenantId && b.draftId === draftId) results.push({ ...b }); });
    return results.sort((a, b) => a.order - b.order);
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentBinding>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  async delete(tenantId: string, id: string): Promise<void> { this.store.delete(`${tenantId}::${id}`); }
  clear(): void { this.store.clear(); }
}

// ── ContentBinding ──
export class InMemoryContentBindingRepository implements IContentBindingRepository {
  private store = new Map<string, ContentBinding>();
  async insert(b: ContentBinding): Promise<void> { this.store.set(`${b.tenantId}::${b.id}`, { ...b }); }
  async findById(tenantId: string, id: string): Promise<ContentBinding | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByDraft(tenantId: string, draftId: string): Promise<ContentBinding[]> {
    const results: ContentBinding[] = [];
    this.store.forEach(b => { if (b.tenantId === tenantId && b.draftId === draftId) results.push({ ...b }); });
    return results;
  }
  async findByComponentBinding(tenantId: string, componentBindingId: string): Promise<ContentBinding[]> {
    const results: ContentBinding[] = [];
    this.store.forEach(b => { if (b.tenantId === tenantId && b.componentBindingId === componentBindingId) results.push({ ...b }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ContentBinding>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  async delete(tenantId: string, id: string): Promise<void> { this.store.delete(`${tenantId}::${id}`); }
  clear(): void { this.store.clear(); }
}

// ── PublishIntent ──
export class InMemoryPublishIntentRepository implements IPublishIntentRepository {
  private store = new Map<string, PublishIntent>();
  async insert(p: PublishIntent): Promise<void> { this.store.set(`${p.tenantId}::${p.id}`, { ...p }); }
  async findById(tenantId: string, id: string): Promise<PublishIntent | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByDraft(tenantId: string, draftId: string): Promise<PublishIntent[]> {
    const results: PublishIntent[] = [];
    this.store.forEach(p => { if (p.tenantId === tenantId && p.draftId === draftId) results.push({ ...p }); });
    return results;
  }
  async findByWorkspace(tenantId: string, workspaceId: string): Promise<PublishIntent[]> {
    const results: PublishIntent[] = [];
    this.store.forEach(p => { if (p.tenantId === tenantId && p.workspaceId === workspaceId) results.push({ ...p }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<PublishIntent>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  clear(): void { this.store.clear(); }
}

// ── StudioAsset ──
export class InMemoryStudioAssetRepository implements IStudioAssetRepository {
  private store = new Map<string, StudioAsset>();
  async insert(a: StudioAsset): Promise<void> { this.store.set(`${a.tenantId}::${a.id}`, { ...a }); }
  async findById(tenantId: string, id: string): Promise<StudioAsset | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByWorkspace(tenantId: string, workspaceId: string): Promise<StudioAsset[]> {
    const results: StudioAsset[] = [];
    this.store.forEach(a => { if (a.tenantId === tenantId && a.workspaceId === workspaceId) results.push({ ...a }); });
    return results;
  }
  async delete(tenantId: string, id: string): Promise<void> { this.store.delete(`${tenantId}::${id}`); }
  clear(): void { this.store.clear(); }
}

// ── Audit ──
export class InMemoryStudioAuditRepository implements IStudioAuditRepository {
  private store: StudioAuditRecord[] = [];
  private idCounter = 0;
  async insert(record: Omit<StudioAuditRecord, 'id' | 'createdAt'>): Promise<StudioAuditRecord> {
    const full: StudioAuditRecord = { ...record, id: `studio-audit-${++this.idCounter}`, createdAt: new Date().toISOString() };
    this.store.push(full);
    return full;
  }
  async findByTenant(tenantId: string, limit = 100): Promise<StudioAuditRecord[]> {
    return this.store.filter(r => r.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(r => ({ ...r }));
  }
  async findByOrganization(tenantId: string, orgId: string, limit = 100): Promise<StudioAuditRecord[]> {
    return this.store.filter(r => r.tenantId === tenantId && r.organizationId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(r => ({ ...r }));
  }
  clear(): void { this.store = []; this.idCounter = 0; }
}