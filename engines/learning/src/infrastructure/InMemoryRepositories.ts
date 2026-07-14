/**
 * Learning Engine — In-Memory Repositories
 */
import type {
  LearningProject, LearningPattern, Trend, RecommendationFeedback,
  DesignInsight, UXInsight, CopyInsight, SearchInsight,
  KnowledgeEvolution, LearningEvidence, LearningModel, ConfidenceScore,
  PersonalizationProfile, LearningStatistics, LearningMemory, LearningMemoryEntry, DesignMemoryEntry,
  LearningAuditRecord,
  ILearningRepository, IPatternRepository, ITrendRepository,
  IRecommendationFeedbackRepository, IInsightRepository,
  IKnowledgeEvolutionRepository, IEvidenceRepository, IModelRepository,
  IConfidenceRepository, IPersonalizationRepository, IStatisticsRepository,
  IMemoryRepository, ILearningAuditRepository,
  PatternType, PatternCategory, RecommendationOutcome, PersonalizationScope,
} from '../interfaces/index.js';

// ── Learning Project Repository ──
export class InMemoryLearningRepository implements ILearningRepository {
  protected store = new Map<string, LearningProject>();
  async insert(p: LearningProject): Promise<void> { this.store.set(`${p.tenantId}::${p.id}`, { ...p }); }
  async findById(t: string, id: string): Promise<LearningProject | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findBySlug(t: string, slug: string): Promise<LearningProject | null> { for (const p of this.store.values()) if (p.tenantId === t && p.slug === slug) return { ...p }; return null; }
  async update(t: string, id: string, patch: Partial<LearningProject>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  async findAll(t: string): Promise<LearningProject[]> { return [...this.store.values()].filter((p) => p.tenantId === t); }
  async existsBySlug(t: string, slug: string, excludeId?: string): Promise<boolean> { for (const p of this.store.values()) if (p.tenantId === t && p.slug === slug && p.id !== excludeId) return true; return false; }
  async countByOrganization(t: string, orgId: string): Promise<number> { let c = 0; for (const p of this.store.values()) if (p.tenantId === t && p.organizationId === orgId) c++; return c; }
  clear(): void { this.store.clear(); }
}

// ── Pattern Repository ──
export class InMemoryPatternRepository implements IPatternRepository {
  protected store = new Map<string, LearningPattern>();
  async insert(p: LearningPattern): Promise<void> { this.store.set(`${p.tenantId}::${p.id}`, { ...p }); }
  async findById(t: string, id: string): Promise<LearningPattern | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<LearningPattern[]> { return [...this.store.values()].filter((p) => p.tenantId === t && p.projectId === pid); }
  async findByType(t: string, pid: string, type: PatternType): Promise<LearningPattern[]> { return [...this.store.values()].filter((p) => p.tenantId === t && p.projectId === pid && p.type === type); }
  async findByCategory(t: string, pid: string, cat: PatternCategory): Promise<LearningPattern[]> { return [...this.store.values()].filter((p) => p.tenantId === t && p.projectId === pid && p.category === cat); }
  async update(t: string, id: string, patch: Partial<LearningPattern>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── Trend Repository ──
export class InMemoryTrendRepository implements ITrendRepository {
  protected store = new Map<string, Trend>();
  async insert(tr: Trend): Promise<void> { this.store.set(`${tr.tenantId}::${tr.id}`, { ...tr }); }
  async findById(t: string, id: string): Promise<Trend | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<Trend[]> { return [...this.store.values()].filter((tr) => tr.tenantId === t && tr.projectId === pid); }
  async findByCategory(t: string, pid: string, cat: PatternCategory): Promise<Trend[]> { return [...this.store.values()].filter((tr) => tr.tenantId === t && tr.projectId === pid && tr.category === cat); }
  clear(): void { this.store.clear(); }
}

// ── Recommendation Feedback Repository ──
export class InMemoryFeedbackRepository implements IRecommendationFeedbackRepository {
  protected store = new Map<string, RecommendationFeedback>();
  async insert(f: RecommendationFeedback): Promise<void> { this.store.set(`${f.tenantId}::${f.id}`, { ...f }); }
  async findByProject(t: string, pid: string): Promise<RecommendationFeedback[]> { return [...this.store.values()].filter((f) => f.tenantId === t && f.projectId === pid); }
  async findByRecommendation(t: string, rid: string): Promise<RecommendationFeedback[]> { return [...this.store.values()].filter((f) => f.tenantId === t && f.recommendationId === rid); }
  async findByOutcome(t: string, pid: string, outcome: RecommendationOutcome): Promise<RecommendationFeedback[]> { return [...this.store.values()].filter((f) => f.tenantId === t && f.projectId === pid && f.outcome === outcome); }
  clear(): void { this.store.clear(); }
}

// ── Insight Repository (Design/UX/Copy/Search) ──
export class InMemoryInsightRepository implements IInsightRepository {
  private design = new Map<string, DesignInsight>();
  private ux = new Map<string, UXInsight>();
  private copy = new Map<string, CopyInsight>();
  private search = new Map<string, SearchInsight>();
  async insertDesign(i: DesignInsight): Promise<void> { this.design.set(`${i.tenantId}::${i.id}`, { ...i }); }
  async insertUX(i: UXInsight): Promise<void> { this.ux.set(`${i.tenantId}::${i.id}`, { ...i }); }
  async insertCopy(i: CopyInsight): Promise<void> { this.copy.set(`${i.tenantId}::${i.id}`, { ...i }); }
  async insertSearch(i: SearchInsight): Promise<void> { this.search.set(`${i.tenantId}::${i.id}`, { ...i }); }
  async findDesignByProject(t: string, pid: string): Promise<DesignInsight[]> { return [...this.design.values()].filter((i) => i.tenantId === t && i.projectId === pid); }
  async findUXByProject(t: string, pid: string): Promise<UXInsight[]> { return [...this.ux.values()].filter((i) => i.tenantId === t && i.projectId === pid); }
  async findCopyByProject(t: string, pid: string): Promise<CopyInsight[]> { return [...this.copy.values()].filter((i) => i.tenantId === t && i.projectId === pid); }
  async findSearchByProject(t: string, pid: string): Promise<SearchInsight[]> { return [...this.search.values()].filter((i) => i.tenantId === t && i.projectId === pid); }
  clear(): void { this.design.clear(); this.ux.clear(); this.copy.clear(); this.search.clear(); }
}

// ── Knowledge Evolution Repository ──
export class InMemoryKnowledgeEvolutionRepository implements IKnowledgeEvolutionRepository {
  protected store = new Map<string, KnowledgeEvolution>();
  async insert(e: KnowledgeEvolution): Promise<void> { this.store.set(`${e.tenantId}::${e.id}`, { ...e }); }
  async findByProject(t: string, pid: string): Promise<KnowledgeEvolution[]> { return [...this.store.values()].filter((e) => e.tenantId === t && e.projectId === pid); }
  async findByKnowledge(t: string, kid: string): Promise<KnowledgeEvolution[]> { return [...this.store.values()].filter((e) => e.tenantId === t && e.knowledgeId === kid); }
  clear(): void { this.store.clear(); }
}

// ── Evidence Repository ──
export class InMemoryEvidenceRepository implements IEvidenceRepository {
  protected store = new Map<string, LearningEvidence>();
  async insert(e: LearningEvidence): Promise<void> { this.store.set(`${e.tenantId}::${e.id}`, { ...e }); }
  async findById(t: string, id: string): Promise<LearningEvidence | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<LearningEvidence[]> { return [...this.store.values()].filter((e) => e.tenantId === t && e.projectId === pid); }
  async findByClaim(t: string, pid: string, claim: string): Promise<LearningEvidence | null> { for (const e of this.store.values()) if (e.tenantId === t && e.projectId === pid && e.claim === claim) return { ...e }; return null; }
  clear(): void { this.store.clear(); }
}

// ── Model Repository ──
export class InMemoryModelRepository implements IModelRepository {
  protected store = new Map<string, LearningModel>();
  async insert(m: LearningModel): Promise<void> { this.store.set(`${m.tenantId}::${m.id}`, { ...m }); }
  async findById(t: string, id: string): Promise<LearningModel | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<LearningModel[]> { return [...this.store.values()].filter((m) => m.tenantId === t && m.projectId === pid); }
  async findByCategory(t: string, pid: string, cat: PatternCategory): Promise<LearningModel | null> { for (const m of this.store.values()) if (m.tenantId === t && m.projectId === pid && m.category === cat) return { ...m }; return null; }
  async update(t: string, id: string, patch: Partial<LearningModel>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── Confidence Repository ──
export class InMemoryConfidenceRepository implements IConfidenceRepository {
  protected store = new Map<string, ConfidenceScore>();
  async upsert(c: ConfidenceScore): Promise<void> { this.store.set(`${c.tenantId}::${c.projectId}::${c.ref}`, { ...c }); }
  async findByRef(t: string, pid: string, ref: string): Promise<ConfidenceScore | null> { return this.store.get(`${t}::${pid}::${ref}`) ?? null; }
  async findByProject(t: string, pid: string): Promise<ConfidenceScore[]> { return [...this.store.values()].filter((c) => c.tenantId === t && c.projectId === pid); }
  clear(): void { this.store.clear(); }
}

// ── Personalization Repository ──
export class InMemoryPersonalizationRepository implements IPersonalizationRepository {
  protected store = new Map<string, PersonalizationProfile>();
  async upsert(p: PersonalizationProfile): Promise<void> { this.store.set(`${p.tenantId}::${p.scope}::${p.scopeRef}`, { ...p }); }
  async findByScope(t: string, scope: PersonalizationScope, ref: string): Promise<PersonalizationProfile | null> { return this.store.get(`${t}::${scope}::${ref}`) ?? null; }
  async findByTenant(t: string): Promise<PersonalizationProfile[]> { return [...this.store.values()].filter((p) => p.tenantId === t); }
  clear(): void { this.store.clear(); }
}

// ── Statistics Repository ──
export class InMemoryStatisticsRepository implements IStatisticsRepository {
  protected store = new Map<string, LearningStatistics>();
  async upsert(s: LearningStatistics): Promise<void> { this.store.set(`${s.tenantId}::${s.projectId}`, { ...s }); }
  async findByProject(t: string, pid: string): Promise<LearningStatistics | null> { return this.store.get(`${t}::${pid}`) ?? null; }
  clear(): void { this.store.clear(); }
}

// ── Memory Repository ──
export class InMemoryMemoryRepository implements IMemoryRepository {
  protected store = new Map<string, LearningMemory>();
  async upsert(m: LearningMemory): Promise<void> { this.store.set(`${m.tenantId}::${m.projectId}`, { ...m }); }
  async findByProject(t: string, pid: string): Promise<LearningMemory | null> { return this.store.get(`${t}::${pid}`) ?? null; }
  async appendEntry(t: string, pid: string, entry: LearningMemoryEntry): Promise<void> {
    const key = `${t}::${pid}`;
    let mem = this.store.get(key);
    if (!mem) {
      mem = { id: `mem-${Date.now()}`, tenantId: t, projectId: pid, history: [], successfulStrategies: [], failedStrategies: [], designMemory: [], updatedAt: entry.timestamp };
      this.store.set(key, mem);
    }
    mem.history.push(entry);
    mem.updatedAt = entry.timestamp;
  }
  async addDesignMemory(t: string, pid: string, entry: DesignMemoryEntry): Promise<void> {
    const key = `${t}::${pid}`;
    let mem = this.store.get(key);
    if (!mem) {
      mem = { id: `mem-${Date.now()}`, tenantId: t, projectId: pid, history: [], successfulStrategies: [], failedStrategies: [], designMemory: [], updatedAt: new Date().toISOString() };
      this.store.set(key, mem);
    }
    mem.designMemory.push(entry);
  }
  clear(): void { this.store.clear(); }
}

// ── Learning Audit Repository ──
export class InMemoryLearningAuditRepository implements ILearningAuditRepository {
  private store: LearningAuditRecord[] = [];
  private idCounter = 0;
  async insert(record: Omit<LearningAuditRecord, 'id' | 'createdAt'>): Promise<LearningAuditRecord> {
    const full: LearningAuditRecord = { ...record, id: `laudit-${++this.idCounter}`, createdAt: new Date().toISOString() };
    this.store.push(full); return full;
  }
  async findByTenant(t: string, limit = 100): Promise<LearningAuditRecord[]> { return this.store.filter((r) => r.tenantId === t).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
  async findByProject(t: string, pid: string, limit = 100): Promise<LearningAuditRecord[]> { return this.store.filter((r) => r.tenantId === t && r.projectId === pid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
  clear(): void { this.store = []; this.idCounter = 0; }
}
