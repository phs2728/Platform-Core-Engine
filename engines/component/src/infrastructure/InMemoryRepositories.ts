/**
 * Component Engine — In-Memory Repositories
 *
 * Map-based storage with tenant isolation. Test/Demo only.
 */
import type {
  ExperienceComponent, ComponentVariant, ComponentPreset, ComponentComposition,
  ComponentSlot, ComponentTokenReference, ComponentState, ComponentInteraction,
  ComponentAnimation, ComponentAccessibility, ComponentScore, ComponentReview,
  ComponentPattern, ComponentBehavior, ComponentVersion, MarketplaceEntry,
  ComponentAuditRecord, ComponentAuditEventType,
  IComponentRepository, IComponentSubEntityRepository,
  ICompositionRepository, IScoreRepository, IReviewRepository,
  IPatternRepository, IVersionRepository, IMarketplaceRepository,
  IComponentAuditRepository,
  ComponentTier, MarketplaceTier, ExperienceType,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Component Repository
// ═══════════════════════════════════════════

export class InMemoryComponentRepository implements IComponentRepository {
  private store = new Map<string, ExperienceComponent>();

  async insert(c: ExperienceComponent): Promise<void> { this.store.set(c.id, { ...c }); }
  async findById(tenantId: string, id: string): Promise<ExperienceComponent | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findBySlug(tenantId: string, slug: string): Promise<ExperienceComponent | null> {
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.slug === slug) return { ...c };
    }
    return null;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ExperienceComponent[]> {
    const results: ExperienceComponent[] = [];
    this.store.forEach(c => { if (c.tenantId === tenantId && c.organizationId === orgId) results.push({ ...c }); });
    return results;
  }
  async findByType(tenantId: string, componentType: string): Promise<ExperienceComponent[]> {
    const results: ExperienceComponent[] = [];
    this.store.forEach(c => { if (c.tenantId === tenantId && c.componentType === componentType) results.push({ ...c }); });
    return results;
  }
  async findByTier(tenantId: string, tier: ComponentTier): Promise<ExperienceComponent[]> {
    const results: ExperienceComponent[] = [];
    this.store.forEach(c => { if (c.tenantId === tenantId && c.tier === tier) results.push({ ...c }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ExperienceComponent>): Promise<void> {
    const existing = this.store.get(id);
    if (!existing || existing.tenantId !== tenantId) return;
    this.store.set(id, { ...existing, ...patch });
  }
  async findAll(tenantId: string): Promise<ExperienceComponent[]> {
    const results: ExperienceComponent[] = [];
    this.store.forEach(c => { if (c.tenantId === tenantId) results.push({ ...c }); });
    return results;
  }
  async existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.slug === slug && c.id !== excludeId) return true;
    }
    return false;
  }
  async countByOrganization(tenantId: string, orgId: string): Promise<number> {
    let count = 0;
    this.store.forEach(c => { if (c.tenantId === tenantId && c.organizationId === orgId) count++; });
    return count;
  }
}

// ═══════════════════════════════════════════
// Generic Sub-Entity Repository
// ═══════════════════════════════════════════

export class InMemoryVariantRepository implements IComponentSubEntityRepository<ComponentVariant> {
  private store = new Map<string, ComponentVariant>();
  async insert(e: ComponentVariant): Promise<void> { this.store.set(e.id, { ...e }); }
  async findById(tenantId: string, id: string): Promise<ComponentVariant | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentVariant[]> {
    const results: ComponentVariant[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentVariant[]> {
    const results: ComponentVariant[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.organizationId === orgId) results.push({ ...v }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentVariant>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<ComponentVariant[]> {
    const results: ComponentVariant[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId) results.push({ ...v }); });
    return results;
  }
}

export class InMemoryPresetRepository implements IComponentSubEntityRepository<ComponentPreset> {
  private store = new Map<string, ComponentPreset>();
  async insert(e: ComponentPreset): Promise<void> { this.store.set(e.id, { ...e }); }
  async findById(tenantId: string, id: string): Promise<ComponentPreset | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentPreset[]> {
    const results: ComponentPreset[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentPreset[]> {
    const results: ComponentPreset[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.organizationId === orgId) results.push({ ...v }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentPreset>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<ComponentPreset[]> {
    const results: ComponentPreset[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId) results.push({ ...v }); });
    return results;
  }
}

export class InMemorySlotRepository implements IComponentSubEntityRepository<ComponentSlot> {
  private store = new Map<string, ComponentSlot>();
  async insert(e: ComponentSlot): Promise<void> { this.store.set(e.id, { ...e }); }
  async findById(tenantId: string, id: string): Promise<ComponentSlot | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentSlot[]> {
    const results: ComponentSlot[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentSlot[]> {
    const results: ComponentSlot[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.organizationId === orgId) results.push({ ...v }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentSlot>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<ComponentSlot[]> {
    const results: ComponentSlot[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId) results.push({ ...v }); });
    return results;
  }
}

export class InMemoryTokenRefRepository implements IComponentSubEntityRepository<ComponentTokenReference> {
  private store = new Map<string, ComponentTokenReference>();
  async insert(e: ComponentTokenReference): Promise<void> { this.store.set(e.id, { ...e }); }
  async findById(tenantId: string, id: string): Promise<ComponentTokenReference | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentTokenReference[]> {
    const results: ComponentTokenReference[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentTokenReference[]> {
    const results: ComponentTokenReference[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.organizationId === orgId) results.push({ ...v }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentTokenReference>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<ComponentTokenReference[]> {
    const results: ComponentTokenReference[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId) results.push({ ...v }); });
    return results;
  }
}

export class InMemoryStateRepository implements IComponentSubEntityRepository<ComponentState> {
  private store = new Map<string, ComponentState>();
  async insert(e: ComponentState): Promise<void> { this.store.set(e.id, { ...e }); }
  async findById(tenantId: string, id: string): Promise<ComponentState | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentState[]> {
    const results: ComponentState[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentState[]> {
    const results: ComponentState[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.organizationId === orgId) results.push({ ...v }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentState>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<ComponentState[]> {
    const results: ComponentState[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId) results.push({ ...v }); });
    return results;
  }
}

export class InMemoryInteractionRepository implements IComponentSubEntityRepository<ComponentInteraction> {
  private store = new Map<string, ComponentInteraction>();
  async insert(e: ComponentInteraction): Promise<void> { this.store.set(e.id, { ...e }); }
  async findById(tenantId: string, id: string): Promise<ComponentInteraction | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentInteraction[]> {
    const results: ComponentInteraction[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentInteraction[]> {
    const results: ComponentInteraction[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.organizationId === orgId) results.push({ ...v }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentInteraction>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<ComponentInteraction[]> {
    const results: ComponentInteraction[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId) results.push({ ...v }); });
    return results;
  }
}

export class InMemoryAnimationRepository implements IComponentSubEntityRepository<ComponentAnimation> {
  private store = new Map<string, ComponentAnimation>();
  async insert(e: ComponentAnimation): Promise<void> { this.store.set(e.id, { ...e }); }
  async findById(tenantId: string, id: string): Promise<ComponentAnimation | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentAnimation[]> {
    const results: ComponentAnimation[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentAnimation[]> {
    const results: ComponentAnimation[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.organizationId === orgId) results.push({ ...v }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentAnimation>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<ComponentAnimation[]> {
    const results: ComponentAnimation[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId) results.push({ ...v }); });
    return results;
  }
}

export class InMemoryAccessibilityRepository implements IComponentSubEntityRepository<ComponentAccessibility> {
  private store = new Map<string, ComponentAccessibility>();
  async insert(e: ComponentAccessibility): Promise<void> { this.store.set(e.id, { ...e }); }
  async findById(tenantId: string, id: string): Promise<ComponentAccessibility | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentAccessibility[]> {
    const results: ComponentAccessibility[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentAccessibility[]> {
    const results: ComponentAccessibility[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.organizationId === orgId) results.push({ ...v }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentAccessibility>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<ComponentAccessibility[]> {
    const results: ComponentAccessibility[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId) results.push({ ...v }); });
    return results;
  }
}

export class InMemoryBehaviorRepository implements IComponentSubEntityRepository<ComponentBehavior> {
  private store = new Map<string, ComponentBehavior>();
  async insert(e: ComponentBehavior): Promise<void> { this.store.set(e.id, { ...e }); }
  async findById(tenantId: string, id: string): Promise<ComponentBehavior | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentBehavior[]> {
    const results: ComponentBehavior[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentBehavior[]> {
    const results: ComponentBehavior[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.organizationId === orgId) results.push({ ...v }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentBehavior>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<ComponentBehavior[]> {
    const results: ComponentBehavior[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId) results.push({ ...v }); });
    return results;
  }
}

// ═══════════════════════════════════════════
// Composition Repository
// ═══════════════════════════════════════════

export class InMemoryCompositionRepository implements ICompositionRepository {
  private store = new Map<string, ComponentComposition>();
  async insert(c: ComponentComposition): Promise<void> { this.store.set(c.id, { ...c }); }
  async findById(tenantId: string, id: string): Promise<ComponentComposition | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findBySlug(tenantId: string, slug: string): Promise<ComponentComposition | null> {
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.slug === slug) return { ...c };
    }
    return null;
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentComposition[]> {
    const results: ComponentComposition[] = [];
    this.store.forEach(c => {
      if (c.tenantId === tenantId && (c.parentComponentId === componentId || c.childComponentIds.includes(componentId)))
        results.push({ ...c });
    });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentComposition[]> {
    const results: ComponentComposition[] = [];
    this.store.forEach(c => { if (c.tenantId === tenantId && c.organizationId === orgId) results.push({ ...c }); });
    return results;
  }
  async findByExperienceType(tenantId: string, type: ExperienceType): Promise<ComponentComposition[]> {
    const results: ComponentComposition[] = [];
    this.store.forEach(c => { if (c.tenantId === tenantId && c.experienceType === type) results.push({ ...c }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentComposition>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async existsBySlug(tenantId: string, slug: string): Promise<boolean> {
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.slug === slug) return true;
    }
    return false;
  }
}

// ═══════════════════════════════════════════
// Score Repository
// ═══════════════════════════════════════════

export class InMemoryScoreRepository implements IScoreRepository {
  private store = new Map<string, ComponentScore>();
  async insert(s: ComponentScore): Promise<void> { this.store.set(s.id, { ...s }); }
  async findById(tenantId: string, id: string): Promise<ComponentScore | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentScore | null> {
    for (const s of this.store.values()) {
      if (s.tenantId === tenantId && s.componentId === componentId) return { ...s };
    }
    return null;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentScore[]> {
    const results: ComponentScore[] = [];
    this.store.forEach(s => { if (s.tenantId === tenantId && s.organizationId === orgId) results.push({ ...s }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentScore>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
}

// ═══════════════════════════════════════════
// Review Repository
// ═══════════════════════════════════════════

export class InMemoryReviewRepository implements IReviewRepository {
  private store = new Map<string, ComponentReview>();
  async insert(r: ComponentReview): Promise<void> { this.store.set(r.id, { ...r }); }
  async findById(tenantId: string, id: string): Promise<ComponentReview | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentReview[]> {
    const results: ComponentReview[] = [];
    this.store.forEach(r => { if (r.tenantId === tenantId && r.componentId === componentId) results.push({ ...r }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentReview[]> {
    const results: ComponentReview[] = [];
    this.store.forEach(r => { if (r.tenantId === tenantId && r.organizationId === orgId) results.push({ ...r }); });
    return results;
  }
  async findByReviewer(tenantId: string, reviewerId: string): Promise<ComponentReview[]> {
    const results: ComponentReview[] = [];
    this.store.forEach(r => { if (r.tenantId === tenantId && r.reviewerId === reviewerId) results.push({ ...r }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentReview>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
}

// ═══════════════════════════════════════════
// Pattern Repository
// ═══════════════════════════════════════════

export class InMemoryPatternRepository implements IPatternRepository {
  private store = new Map<string, ComponentPattern>();
  async insert(p: ComponentPattern): Promise<void> { this.store.set(p.id, { ...p }); }
  async findById(tenantId: string, id: string): Promise<ComponentPattern | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findBySlug(tenantId: string, slug: string): Promise<ComponentPattern | null> {
    for (const p of this.store.values()) {
      if (p.tenantId === tenantId && p.slug === slug) return { ...p };
    }
    return null;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ComponentPattern[]> {
    const results: ComponentPattern[] = [];
    this.store.forEach(p => { if (p.tenantId === tenantId && p.organizationId === orgId) results.push({ ...p }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentPattern>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
  async existsBySlug(tenantId: string, slug: string): Promise<boolean> {
    for (const p of this.store.values()) {
      if (p.tenantId === tenantId && p.slug === slug) return true;
    }
    return false;
  }
}

// ═══════════════════════════════════════════
// Version Repository
// ═══════════════════════════════════════════

export class InMemoryVersionRepository implements IVersionRepository {
  private store = new Map<string, ComponentVersion>();
  async insert(v: ComponentVersion): Promise<void> { this.store.set(v.id, { ...v }); }
  async findById(tenantId: string, id: string): Promise<ComponentVersion | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<ComponentVersion[]> {
    const results: ComponentVersion[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.componentId === componentId) results.push({ ...v }); });
    return results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async findActive(tenantId: string, componentId: string): Promise<ComponentVersion | null> {
    for (const v of this.store.values()) {
      if (v.tenantId === tenantId && v.componentId === componentId && v.isActive) return { ...v };
    }
    return null;
  }
  async deactivateAll(tenantId: string, componentId: string): Promise<void> {
    this.store.forEach((v, key) => {
      if (v.tenantId === tenantId && v.componentId === componentId && v.isActive) {
        this.store.set(key, { ...v, isActive: false });
      }
    });
  }
  async update(tenantId: string, id: string, patch: Partial<ComponentVersion>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
}

// ═══════════════════════════════════════════
// Marketplace Repository
// ═══════════════════════════════════════════

export class InMemoryMarketplaceRepository implements IMarketplaceRepository {
  private store = new Map<string, MarketplaceEntry>();
  async insert(m: MarketplaceEntry): Promise<void> { this.store.set(m.id, { ...m }); }
  async findById(tenantId: string, id: string): Promise<MarketplaceEntry | null> {
    const r = this.store.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    return { ...r };
  }
  async findByComponent(tenantId: string, componentId: string): Promise<MarketplaceEntry | null> {
    for (const m of this.store.values()) {
      if (m.tenantId === tenantId && m.componentId === componentId) return { ...m };
    }
    return null;
  }
  async findByTier(tenantId: string, tier: MarketplaceTier): Promise<MarketplaceEntry[]> {
    const results: MarketplaceEntry[] = [];
    this.store.forEach(m => { if (m.tenantId === tenantId && m.tier === tier) results.push({ ...m }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<MarketplaceEntry[]> {
    const results: MarketplaceEntry[] = [];
    this.store.forEach(m => { if (m.tenantId === tenantId && m.organizationId === orgId) results.push({ ...m }); });
    return results;
  }
  async findAll(tenantId: string): Promise<MarketplaceEntry[]> {
    const results: MarketplaceEntry[] = [];
    this.store.forEach(m => { if (m.tenantId === tenantId) results.push({ ...m }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<MarketplaceEntry>): Promise<void> {
    const e = this.store.get(id);
    if (!e || e.tenantId !== tenantId) return;
    this.store.set(id, { ...e, ...patch });
  }
}

// ═══════════════════════════════════════════
// Audit Repository
// ═══════════════════════════════════════════

export class InMemoryComponentAuditRepository implements IComponentAuditRepository {
  private counter = 0;
  private store: ComponentAuditRecord[] = [];
  async insert(record: Omit<ComponentAuditRecord, 'id' | 'createdAt'>): Promise<ComponentAuditRecord> {
    this.counter++;
    const full: ComponentAuditRecord = {
      ...record,
      id: `audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.push(full);
    return full;
  }
  async findByTenant(tenantId: string, limit?: number): Promise<ComponentAuditRecord[]> {
    const filtered = this.store.filter(r => r.tenantId === tenantId);
    const sorted = filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return (limit ? sorted.slice(0, limit) : sorted).map(r => ({ ...r }));
  }
  async findByOrganization(tenantId: string, orgId: string, limit?: number): Promise<ComponentAuditRecord[]> {
    const filtered = this.store.filter(r => r.tenantId === tenantId && r.organizationId === orgId);
    const sorted = filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return (limit ? sorted.slice(0, limit) : sorted).map(r => ({ ...r }));
  }
}
