/**
 * Experience Engine — In-Memory Repositories
 *
 * Test/Demo implementations. Production hosts provide real
 * implementations of the same port interfaces.
 */
import type {
  IExperienceRepository, ILayoutRepository, IHeroRepository, IBannerRepository,
  INavigationRepository, IDashboardRepository, ISearchExperienceRepository,
  IPatternRepository, IPersonalizationRepository, IUXScoreRepository, IAuditRepository,
  Experience, Layout, Hero, Banner, Navigation, Dashboard, SearchExperience,
  UXPattern, PersonalizationProfile, UXScore, ExperienceAuditRecord,
  ExperienceSearchCriteria, ExperienceSearchResult,
} from '../interfaces/index.js';

// ── Experience Repository ──
export class InMemoryExperienceRepository implements IExperienceRepository {
  private byId = new Map<string, Experience>();
  async insert(r: Experience): Promise<void> { this.byId.set(r.id, { ...r }); }
  async update(tenantId: string, id: string, patch: Partial<Experience>): Promise<void> {
    const cur = this.byId.get(id);
    if (cur && cur.tenantId === tenantId) this.byId.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
  }
  async findById(tenantId: string, id: string): Promise<Experience | null> {
    const e = this.byId.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }
  async findBySlug(tenantId: string, slug: string): Promise<Experience | null> {
    for (const e of this.byId.values()) if (e.tenantId === tenantId && e.slug === slug) return e;
    return null;
  }
  async findByOrganization(tenantId: string, organizationId: string, options?: { limit?: number; offset?: number }): Promise<Experience[]> {
    const all = [...this.byId.values()].filter((e) => e.tenantId === tenantId && e.organizationId === organizationId);
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    return all.slice(offset, offset + limit);
  }
  async search(tenantId: string, criteria: ExperienceSearchCriteria): Promise<ExperienceSearchResult> {
    const all = [...this.byId.values()].filter((e) => e.tenantId === (criteria.tenantId ?? tenantId));
    const limit = criteria.limit ?? 100;
    const offset = criteria.offset ?? 0;
    return { experiences: all.slice(offset, offset + limit), total: all.length, limit, offset };
  }
  async delete(tenantId: string, id: string): Promise<void> {
    const e = this.byId.get(id);
    if (e && e.tenantId === tenantId) this.byId.delete(id);
  }
  async count(tenantId: string): Promise<number> {
    return [...this.byId.values()].filter((e) => e.tenantId === tenantId).length;
  }
  clear(): void { this.byId.clear(); }
}

// ── Layout Repository ──
export class InMemoryLayoutRepository implements ILayoutRepository {
  private byId = new Map<string, Layout>();
  async insert(r: Layout): Promise<void> { this.byId.set(r.id, { ...r }); }
  async update(tenantId: string, id: string, patch: Partial<Layout>): Promise<void> {
    const cur = this.byId.get(id);
    if (cur && cur.tenantId === tenantId) this.byId.set(id, { ...cur, ...patch });
  }
  async findById(tenantId: string, id: string): Promise<Layout | null> {
    const e = this.byId.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }
  async findBySlug(tenantId: string, slug: string): Promise<Layout | null> {
    for (const e of this.byId.values()) if (e.tenantId === tenantId && e.slug === slug) return e;
    return null;
  }
  async findByType(tenantId: string, type: string): Promise<Layout[]> {
    return [...this.byId.values()].filter((e) => e.tenantId === tenantId && e.type === type);
  }
  async publish(tenantId: string, id: string): Promise<void> { /* no-op; status is updated via update() */ }
  async delete(tenantId: string, id: string): Promise<void> {
    const e = this.byId.get(id);
    if (e && e.tenantId === tenantId) this.byId.delete(id);
  }
  clear(): void { this.byId.clear(); }
}

// ── Hero Repository ──
export class InMemoryHeroRepository implements IHeroRepository {
  private byId = new Map<string, Hero>();
  async insert(r: Hero): Promise<void> { this.byId.set(r.id, { ...r }); }
  async update(tenantId: string, id: string, patch: Partial<Hero>): Promise<void> {
    const cur = this.byId.get(id);
    if (cur && cur.tenantId === tenantId) this.byId.set(id, { ...cur, ...patch });
  }
  async findById(tenantId: string, id: string): Promise<Hero | null> {
    const e = this.byId.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }
  async publish(tenantId: string, id: string): Promise<void> { /* no-op */ }
  async delete(tenantId: string, id: string): Promise<void> {
    const e = this.byId.get(id);
    if (e && e.tenantId === tenantId) this.byId.delete(id);
  }
  clear(): void { this.byId.clear(); }
}

// ── Banner Repository ──
export class InMemoryBannerRepository implements IBannerRepository {
  private byId = new Map<string, Banner>();
  async insert(r: Banner): Promise<void> { this.byId.set(r.id, { ...r }); }
  async update(tenantId: string, id: string, patch: Partial<Banner>): Promise<void> {
    const cur = this.byId.get(id);
    if (cur && cur.tenantId === tenantId) this.byId.set(id, { ...cur, ...patch });
  }
  async findById(tenantId: string, id: string): Promise<Banner | null> {
    const e = this.byId.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }
  async publish(tenantId: string, id: string): Promise<void> { /* no-op */ }
  async delete(tenantId: string, id: string): Promise<void> {
    const e = this.byId.get(id);
    if (e && e.tenantId === tenantId) this.byId.delete(id);
  }
  clear(): void { this.byId.clear(); }
}

// ── Navigation Repository ──
export class InMemoryNavigationRepository implements INavigationRepository {
  private byId = new Map<string, Navigation>();
  async insert(r: Navigation): Promise<void> { this.byId.set(r.id, { ...r }); }
  async update(tenantId: string, id: string, patch: Partial<Navigation>): Promise<void> {
    const cur = this.byId.get(id);
    if (cur && cur.tenantId === tenantId) this.byId.set(id, { ...cur, ...patch });
  }
  async findById(tenantId: string, id: string): Promise<Navigation | null> {
    const e = this.byId.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }
  async publish(tenantId: string, id: string): Promise<void> { /* no-op */ }
  async delete(tenantId: string, id: string): Promise<void> {
    const e = this.byId.get(id);
    if (e && e.tenantId === tenantId) this.byId.delete(id);
  }
  clear(): void { this.byId.clear(); }
}

// ── Dashboard Repository ──
export class InMemoryDashboardRepository implements IDashboardRepository {
  private byId = new Map<string, Dashboard>();
  async insert(r: Dashboard): Promise<void> { this.byId.set(r.id, { ...r }); }
  async update(tenantId: string, id: string, patch: Partial<Dashboard>): Promise<void> {
    const cur = this.byId.get(id);
    if (cur && cur.tenantId === tenantId) this.byId.set(id, { ...cur, ...patch });
  }
  async findById(tenantId: string, id: string): Promise<Dashboard | null> {
    const e = this.byId.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }
  async publish(tenantId: string, id: string): Promise<void> { /* no-op */ }
  async delete(tenantId: string, id: string): Promise<void> {
    const e = this.byId.get(id);
    if (e && e.tenantId === tenantId) this.byId.delete(id);
  }
  clear(): void { this.byId.clear(); }
}

// ── SearchExperience Repository ──
export class InMemorySearchExperienceRepository implements ISearchExperienceRepository {
  private byId = new Map<string, SearchExperience>();
  async insert(r: SearchExperience): Promise<void> { this.byId.set(r.id, { ...r }); }
  async update(tenantId: string, id: string, patch: Partial<SearchExperience>): Promise<void> {
    const cur = this.byId.get(id);
    if (cur && cur.tenantId === tenantId) this.byId.set(id, { ...cur, ...patch });
  }
  async findById(tenantId: string, id: string): Promise<SearchExperience | null> {
    const e = this.byId.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }
  async publish(tenantId: string, id: string): Promise<void> { /* no-op */ }
  async delete(tenantId: string, id: string): Promise<void> {
    const e = this.byId.get(id);
    if (e && e.tenantId === tenantId) this.byId.delete(id);
  }
  clear(): void { this.byId.clear(); }
}

// ── Pattern Repository ──
export class InMemoryPatternRepository implements IPatternRepository {
  private byId = new Map<string, UXPattern>();
  async insert(r: UXPattern): Promise<void> { this.byId.set(r.id, { ...r }); }
  async update(tenantId: string, id: string, patch: Partial<UXPattern>): Promise<void> {
    const cur = this.byId.get(id);
    if (cur && cur.tenantId === tenantId) this.byId.set(id, { ...cur, ...patch });
  }
  async findById(tenantId: string, id: string): Promise<UXPattern | null> {
    const e = this.byId.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }
  async findByCategory(tenantId: string, category: string): Promise<UXPattern[]> {
    return [...this.byId.values()].filter((e) => e.tenantId === tenantId && e.category === category);
  }
  async publish(tenantId: string, id: string): Promise<void> { /* no-op */ }
  async clone(tenantId: string, sourceId: string, newName: string): Promise<UXPattern> {
    const src = this.byId.get(sourceId);
    if (!src || src.tenantId !== tenantId) throw new Error('Source pattern not found');
    const id = `pat-${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    const cloned: UXPattern = { ...src, id, name: newName, status: 'Draft', publishedAt: undefined, createdAt: now, updatedAt: now };
    this.byId.set(id, cloned);
    return cloned;
  }
  async delete(tenantId: string, id: string): Promise<void> {
    const e = this.byId.get(id);
    if (e && e.tenantId === tenantId) this.byId.delete(id);
  }
  clear(): void { this.byId.clear(); }
}

// ── Personalization Repository ──
export class InMemoryPersonalizationRepository implements IPersonalizationRepository {
  private byId = new Map<string, PersonalizationProfile>();
  async insert(r: PersonalizationProfile): Promise<void> { this.byId.set(r.id, { ...r }); }
  async update(tenantId: string, id: string, patch: Partial<PersonalizationProfile>): Promise<void> {
    const cur = this.byId.get(id);
    if (cur && cur.tenantId === tenantId) this.byId.set(id, { ...cur, ...patch });
  }
  async findById(tenantId: string, id: string): Promise<PersonalizationProfile | null> {
    const e = this.byId.get(id);
    return e && e.tenantId === tenantId ? e : null;
  }
  async delete(tenantId: string, id: string): Promise<void> {
    const e = this.byId.get(id);
    if (e && e.tenantId === tenantId) this.byId.delete(id);
  }
  clear(): void { this.byId.clear(); }
}

// ── UXScore Repository ──
export class InMemoryUXScoreRepository implements IUXScoreRepository {
  private byId = new Map<string, UXScore>();
  async insert(r: UXScore): Promise<void> { this.byId.set(r.id, { ...r }); }
  async findByExperience(tenantId: string, experienceId: string): Promise<UXScore[]> {
    return [...this.byId.values()].filter((s) => s.tenantId === tenantId && s.experienceId === experienceId);
  }
  async findLatest(tenantId: string, experienceId: string): Promise<UXScore | null> {
    const all = (await this.findByExperience(tenantId, experienceId)).sort((a, b) =>
      new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime());
    return all[0] ?? null;
  }
  clear(): void { this.byId.clear(); }
}

// ── Audit Repository ──
export class InMemoryAuditRepository implements IAuditRepository {
  private byId = new Map<string, ExperienceAuditRecord>();
  async insert(r: ExperienceAuditRecord): Promise<void> { this.byId.set(r.id, { ...r }); }
  async findByTenant(tenantId: string, options?: { limit?: number; offset?: number }): Promise<ExperienceAuditRecord[]> {
    const all = [...this.byId.values()].filter((r) => r.tenantId === tenantId);
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    return all.slice(offset, offset + limit);
  }
  clear(): void { this.byId.clear(); }
}
