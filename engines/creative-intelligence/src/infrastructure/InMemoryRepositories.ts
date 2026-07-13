/**
 * Creative Intelligence RC2 — In-Memory Repositories
 */
import type {
  ArtDirection, PremiumReview, DesignCritique, DesignRecommendation,
  AIArtifactDetection, LuxuryScore, CreativeApproval, CreativeAuditRecord,
  IArtDirectionRepository, IPremiumReviewRepository, IDesignCritiqueRepository,
  IDesignRecommendationRepository, IAIArtifactDetectionRepository,
  ILuxuryScoreRepository, ICreativeApprovalRepository, ICreativeAuditRepository,
} from '../interfaces/index.js';

// ── Art Direction ──
export class InMemoryArtDirectionRepository implements IArtDirectionRepository {
  private store = new Map<string, ArtDirection>();
  async insert(a: ArtDirection): Promise<void> { this.store.set(`${a.tenantId}::${a.id}`, { ...a }); }
  async findById(tenantId: string, id: string): Promise<ArtDirection | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByStyle(tenantId: string, style: ArtDirection['style']): Promise<ArtDirection | null> {
    for (const a of this.store.values()) {
      if (a.tenantId === tenantId && a.style === style && a.status === 'Active') return { ...a };
    }
    return null;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<ArtDirection[]> {
    const results: ArtDirection[] = [];
    this.store.forEach(a => { if (a.tenantId === tenantId && a.organizationId === orgId) results.push({ ...a }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ArtDirection>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  clear(): void { this.store.clear(); }
}

// ── Premium Review ──
export class InMemoryPremiumReviewRepository implements IPremiumReviewRepository {
  private store = new Map<string, PremiumReview>();
  async insert(p: PremiumReview): Promise<void> { this.store.set(`${p.tenantId}::${p.id}`, { ...p }); }
  async findById(tenantId: string, id: string): Promise<PremiumReview | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByPage(tenantId: string, pageRef: string): Promise<PremiumReview[]> {
    const results: PremiumReview[] = [];
    this.store.forEach(p => { if (p.tenantId === tenantId && p.pageRef === pageRef) results.push({ ...p }); });
    return results;
  }
  clear(): void { this.store.clear(); }
}

// ── Design Critique ──
export class InMemoryDesignCritiqueRepository implements IDesignCritiqueRepository {
  private store = new Map<string, DesignCritique>();
  async insert(d: DesignCritique): Promise<void> { this.store.set(`${d.tenantId}::${d.id}`, { ...d }); }
  async findById(tenantId: string, id: string): Promise<DesignCritique | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByPage(tenantId: string, pageRef: string): Promise<DesignCritique[]> {
    const results: DesignCritique[] = [];
    this.store.forEach(d => { if (d.tenantId === tenantId && d.pageRef === pageRef) results.push({ ...d }); });
    return results;
  }
  clear(): void { this.store.clear(); }
}

// ── Design Recommendation ──
export class InMemoryDesignRecommendationRepository implements IDesignRecommendationRepository {
  private store = new Map<string, DesignRecommendation>();
  async insert(d: DesignRecommendation): Promise<void> { this.store.set(`${d.tenantId}::${d.id}`, { ...d }); }
  async findById(tenantId: string, id: string): Promise<DesignRecommendation | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByPage(tenantId: string, pageRef: string): Promise<DesignRecommendation[]> {
    const results: DesignRecommendation[] = [];
    this.store.forEach(d => { if (d.tenantId === tenantId && d.pageRef === pageRef) results.push({ ...d }); });
    return results;
  }
  clear(): void { this.store.clear(); }
}

// ── AI Artifact Detection ──
export class InMemoryAIArtifactDetectionRepository implements IAIArtifactDetectionRepository {
  private store = new Map<string, AIArtifactDetection>();
  async insert(d: AIArtifactDetection): Promise<void> { this.store.set(`${d.tenantId}::${d.id}`, { ...d }); }
  async findById(tenantId: string, id: string): Promise<AIArtifactDetection | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByPage(tenantId: string, pageRef: string): Promise<AIArtifactDetection[]> {
    const results: AIArtifactDetection[] = [];
    this.store.forEach(d => { if (d.tenantId === tenantId && d.pageRef === pageRef) results.push({ ...d }); });
    return results;
  }
  clear(): void { this.store.clear(); }
}

// ── Luxury Score ──
export class InMemoryLuxuryScoreRepository implements ILuxuryScoreRepository {
  private store = new Map<string, LuxuryScore>();
  async insert(l: LuxuryScore): Promise<void> { this.store.set(`${l.tenantId}::${l.id}`, { ...l }); }
  async findById(tenantId: string, id: string): Promise<LuxuryScore | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByPage(tenantId: string, pageRef: string): Promise<LuxuryScore[]> {
    const results: LuxuryScore[] = [];
    this.store.forEach(l => { if (l.tenantId === tenantId && l.pageRef === pageRef) results.push({ ...l }); });
    return results;
  }
  clear(): void { this.store.clear(); }
}

// ── Creative Approval ──
export class InMemoryCreativeApprovalRepository implements ICreativeApprovalRepository {
  private store = new Map<string, CreativeApproval>();
  async insert(a: CreativeApproval): Promise<void> { this.store.set(`${a.tenantId}::${a.id}`, { ...a }); }
  async findById(tenantId: string, id: string): Promise<CreativeApproval | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByPage(tenantId: string, pageRef: string): Promise<CreativeApproval[]> {
    const results: CreativeApproval[] = [];
    this.store.forEach(a => { if (a.tenantId === tenantId && a.pageRef === pageRef) results.push({ ...a }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<CreativeApproval>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  clear(): void { this.store.clear(); }
}

// ── Audit ──
export class InMemoryCreativeAuditRepository implements ICreativeAuditRepository {
  private store: CreativeAuditRecord[] = [];
  private idCounter = 0;
  async insert(record: Omit<CreativeAuditRecord, 'id' | 'createdAt'>): Promise<CreativeAuditRecord> {
    const full: CreativeAuditRecord = { ...record, id: `ci-audit-${++this.idCounter}`, createdAt: new Date().toISOString() };
    this.store.push(full);
    return full;
  }
  async findByTenant(tenantId: string, limit = 100): Promise<CreativeAuditRecord[]> {
    return this.store.filter(r => r.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(r => ({ ...r }));
  }
  async findByOrganization(tenantId: string, orgId: string, limit = 100): Promise<CreativeAuditRecord[]> {
    return this.store.filter(r => r.tenantId === tenantId && r.organizationId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(r => ({ ...r }));
  }
  clear(): void { this.store = []; this.idCounter = 0; }
}