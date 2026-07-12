/**
 * Creative Knowledge Engine — In-Memory Repositories
 */
import type {
  ResearchProject, ClientInterview, BusinessProfile, CompetitorProfile,
  WebsiteAuditResult, UXAuditResult, SEOAuditResult, AccessibilityAuditResult,
  PerformanceAuditResult, ContentAuditResult, DesignPattern, CreativeBrief,
  ResearchEvidence, Benchmark, GapAnalysis, ResearchRecommendation,
  KnowledgeArticle, ResearchMemory, ResearchMemoryEntry, KnowledgeAuditRecord,
  IResearchRepository, IInterviewRepository, IBusinessProfileRepository,
  IAuditResultRepository, ICompetitorRepository, IKnowledgeRepository,
  IEvidenceRepository, IRecommendationRepository, IBenchmarkRepository,
  IPatternRepository, IBriefRepository, IMemoryRepository,
  IGapAnalysisRepository, IKnowledgeAuditRepository,
} from '../interfaces/index.js';

type AnyAuditResult = WebsiteAuditResult | UXAuditResult | SEOAuditResult | AccessibilityAuditResult | PerformanceAuditResult | ContentAuditResult;

// ── Research Project Repository ──
export class InMemoryResearchRepository implements IResearchRepository {
  protected store = new Map<string, ResearchProject>();
  async insert(p: ResearchProject): Promise<void> { this.store.set(`${p.tenantId}::${p.id}`, { ...p }); }
  async findById(t: string, id: string): Promise<ResearchProject | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findBySlug(t: string, slug: string): Promise<ResearchProject | null> { for (const p of this.store.values()) if (p.tenantId === t && p.slug === slug) return { ...p }; return null; }
  async update(t: string, id: string, patch: Partial<ResearchProject>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  async findAll(t: string): Promise<ResearchProject[]> { return [...this.store.values()].filter((p) => p.tenantId === t); }
  async existsBySlug(t: string, slug: string, excludeId?: string): Promise<boolean> { for (const p of this.store.values()) if (p.tenantId === t && p.slug === slug && p.id !== excludeId) return true; return false; }
  async countByOrganization(t: string, orgId: string): Promise<number> { let c = 0; for (const p of this.store.values()) if (p.tenantId === t && p.organizationId === orgId) c++; return c; }
  clear(): void { this.store.clear(); }
}

// ── Interview Repository ──
export class InMemoryInterviewRepository implements IInterviewRepository {
  protected store = new Map<string, ClientInterview>();
  async insert(i: ClientInterview): Promise<void> { this.store.set(`${i.tenantId}::${i.id}`, { ...i }); }
  async findById(t: string, id: string): Promise<ClientInterview | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<ClientInterview | null> { for (const i of this.store.values()) if (i.tenantId === t && i.projectId === pid) return { ...i }; return null; }
  clear(): void { this.store.clear(); }
}

// ── Business Profile Repository ──
export class InMemoryBusinessProfileRepository implements IBusinessProfileRepository {
  protected store = new Map<string, BusinessProfile>();
  async insert(p: BusinessProfile): Promise<void> { this.store.set(`${p.tenantId}::${p.id}`, { ...p }); }
  async findById(t: string, id: string): Promise<BusinessProfile | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<BusinessProfile | null> { for (const p of this.store.values()) if (p.tenantId === t && p.projectId === pid) return { ...p }; return null; }
  async update(t: string, id: string, patch: Partial<BusinessProfile>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── Audit Result Repository ──
export class InMemoryAuditResultRepository implements IAuditResultRepository {
  protected store = new Map<string, AnyAuditResult>();
  async insert(r: AnyAuditResult): Promise<void> { this.store.set(`${r.tenantId}::${r.id}`, { ...r }); }
  async findById(t: string, id: string): Promise<AnyAuditResult | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<AnyAuditResult[]> { return [...this.store.values()].filter((r) => r.tenantId === t && r.projectId === pid); }
  clear(): void { this.store.clear(); }
}

// ── Competitor Repository ──
export class InMemoryCompetitorRepository implements ICompetitorRepository {
  protected store = new Map<string, CompetitorProfile>();
  async insert(c: CompetitorProfile): Promise<void> { this.store.set(`${c.tenantId}::${c.id}`, { ...c }); }
  async findById(t: string, id: string): Promise<CompetitorProfile | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<CompetitorProfile[]> { return [...this.store.values()].filter((c) => c.tenantId === t && c.projectId === pid); }
  clear(): void { this.store.clear(); }
}

// ── Knowledge Repository ──
export class InMemoryKnowledgeRepository implements IKnowledgeRepository {
  protected store = new Map<string, KnowledgeArticle>();
  async insert(a: KnowledgeArticle): Promise<void> { this.store.set(`${a.tenantId}::${a.id}`, { ...a }); }
  async findById(t: string, id: string): Promise<KnowledgeArticle | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findBySlug(t: string, slug: string): Promise<KnowledgeArticle | null> { for (const a of this.store.values()) if (a.tenantId === t && a.slug === slug) return { ...a }; return null; }
  async findAll(t: string): Promise<KnowledgeArticle[]> { return [...this.store.values()].filter((a) => a.tenantId === t); }
  async update(t: string, id: string, patch: Partial<KnowledgeArticle>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── Evidence Repository ──
export class InMemoryEvidenceRepository implements IEvidenceRepository {
  protected store = new Map<string, ResearchEvidence>();
  async insert(e: ResearchEvidence): Promise<void> { this.store.set(`${e.tenantId}::${e.id}`, { ...e }); }
  async findById(t: string, id: string): Promise<ResearchEvidence | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<ResearchEvidence[]> { return [...this.store.values()].filter((e) => e.tenantId === t && e.projectId === pid); }
  async findByClaim(t: string, pid: string, claim: string): Promise<ResearchEvidence | null> { for (const e of this.store.values()) if (e.tenantId === t && e.projectId === pid && e.claim === claim) return { ...e }; return null; }
  clear(): void { this.store.clear(); }
}

// ── Recommendation Repository ──
export class InMemoryRecommendationRepository implements IRecommendationRepository {
  private recs: ResearchRecommendation[] = [];
  async insert(r: ResearchRecommendation): Promise<void> { this.recs.push({ ...r }); }
  async findByProject(t: string, pid: string): Promise<ResearchRecommendation[]> { return this.recs.filter((r) => r.tenantId === t && r.projectId === pid); }
  clear(): void { this.recs = []; }
}

// ── Benchmark Repository ──
export class InMemoryBenchmarkRepository implements IBenchmarkRepository {
  protected store = new Map<string, Benchmark>();
  async insert(b: Benchmark): Promise<void> { this.store.set(`${b.tenantId}::${b.id}`, { ...b }); }
  async findById(t: string, id: string): Promise<Benchmark | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<Benchmark[]> { return [...this.store.values()].filter((b) => b.tenantId === t && b.projectId === pid); }
  clear(): void { this.store.clear(); }
}

// ── Pattern Repository ──
export class InMemoryPatternRepository implements IPatternRepository {
  protected store = new Map<string, DesignPattern>();
  async insert(p: DesignPattern): Promise<void> { this.store.set(`${p.tenantId}::${p.id}`, { ...p }); }
  async findById(t: string, id: string): Promise<DesignPattern | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<DesignPattern[]> { return [...this.store.values()].filter((p) => p.tenantId === t && p.projectId === pid); }
  clear(): void { this.store.clear(); }
}

// ── Brief Repository ──
export class InMemoryBriefRepository implements IBriefRepository {
  protected store = new Map<string, CreativeBrief>();
  async insert(b: CreativeBrief): Promise<void> { this.store.set(`${b.tenantId}::${b.id}`, { ...b }); }
  async findById(t: string, id: string): Promise<CreativeBrief | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<CreativeBrief | null> { for (const b of this.store.values()) if (b.tenantId === t && b.projectId === pid) return { ...b }; return null; }
  clear(): void { this.store.clear(); }
}

// ── Memory Repository ──
export class InMemoryMemoryRepository implements IMemoryRepository {
  protected store = new Map<string, ResearchMemory>();
  async upsert(m: ResearchMemory): Promise<void> { this.store.set(`${m.tenantId}::${m.projectId}`, { ...m }); }
  async findByProject(t: string, pid: string): Promise<ResearchMemory | null> { return this.store.get(`${t}::${pid}`) ?? null; }
  async appendEntry(t: string, pid: string, entry: ResearchMemoryEntry): Promise<void> {
    const key = `${t}::${pid}`;
    let mem = this.store.get(key);
    if (!mem) {
      mem = { id: `mem-${Date.now()}`, tenantId: t, projectId: pid, history: [], patternLibrary: [], successfulStrategies: [], failedStrategies: [], updatedAt: entry.timestamp };
      this.store.set(key, mem);
    }
    mem.history.push(entry);
    mem.updatedAt = entry.timestamp;
  }
  clear(): void { this.store.clear(); }
}

// ── Gap Analysis Repository ──
export class InMemoryGapAnalysisRepository implements IGapAnalysisRepository {
  protected store = new Map<string, GapAnalysis>();
  async insert(g: GapAnalysis): Promise<void> { this.store.set(`${g.tenantId}::${g.projectId}`, { ...g }); }
  async findByProject(t: string, pid: string): Promise<GapAnalysis | null> { return this.store.get(`${t}::${pid}`) ?? null; }
  clear(): void { this.store.clear(); }
}

// ── Knowledge Audit Repository ──
export class InMemoryKnowledgeAuditRepository implements IKnowledgeAuditRepository {
  private store: KnowledgeAuditRecord[] = [];
  private idCounter = 0;
  async insert(record: Omit<KnowledgeAuditRecord, 'id' | 'createdAt'>): Promise<KnowledgeAuditRecord> {
    const full: KnowledgeAuditRecord = { ...record, id: `kaudit-${++this.idCounter}`, createdAt: new Date().toISOString() };
    this.store.push(full); return full;
  }
  async findByTenant(t: string, limit = 100): Promise<KnowledgeAuditRecord[]> { return this.store.filter((r) => r.tenantId === t).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
  async findByProject(t: string, pid: string, limit = 100): Promise<KnowledgeAuditRecord[]> { return this.store.filter((r) => r.tenantId === t && r.projectId === pid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
  clear(): void { this.store = []; this.idCounter = 0; }
}
