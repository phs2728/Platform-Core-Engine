/** In-Memory Repositories — AI Engine (7 repos) */
import type {
  IConversationRepository, IPromptRepository, IKnowledgeRepository,
  IRecommendationRepository, IInsightRepository, IPredictionRepository, IAIAuditRepository,
  Conversation, PromptTemplate, KnowledgeEntry,
  AIRecommendation, AIInsight, AIPrediction, AIAuditRecord,
  RecommendationType, InsightType, PredictionType,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═════ Conversation ═════
export class InMemoryConversationRepository implements IConversationRepository {
  private store = new Map<string, Conversation>();
  async insert(c: Conversation): Promise<void> { this.store.set(key(c.tenantId, c.id), c); }
  async findById(t: string, id: string): Promise<Conversation | null> { return this.store.get(key(t, id)) ?? null; }
  async findByUser(t: string, userId: string, limit?: number): Promise<Conversation[]> {
    const list = [...this.store.values()].filter((c) => c.tenantId === t && c.userId === userId);
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  async update(t: string, id: string, patch: Partial<Conversation>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  clear(): void { this.store.clear(); }
}

// ═════ Prompt ═════
export class InMemoryPromptRepository implements IPromptRepository {
  private store = new Map<string, PromptTemplate>();
  async insert(p: PromptTemplate): Promise<void> { this.store.set(key(p.tenantId, p.id), p); }
  async findById(t: string, id: string): Promise<PromptTemplate | null> { return this.store.get(key(t, id)) ?? null; }
  async findByName(t: string, name: string, activeOnly?: boolean): Promise<PromptTemplate | null> {
    for (const p of this.store.values()) {
      if (p.tenantId !== t || p.name !== name) continue;
      if (activeOnly && !p.active) continue;
      return p;
    }
    return null;
  }
  async update(t: string, id: string, patch: Partial<PromptTemplate>): Promise<void> {
    const k = key(t, id); const ex = this.store.get(k); if (!ex) throw new Error(`Not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }
  async listByTenant(t: string): Promise<PromptTemplate[]> { return [...this.store.values()].filter((p) => p.tenantId === t); }
  clear(): void { this.store.clear(); }
}

// ═════ Knowledge ═════
export class InMemoryKnowledgeRepository implements IKnowledgeRepository {
  private store = new Map<string, KnowledgeEntry>();
  async insert(e: KnowledgeEntry): Promise<void> { this.store.set(key(e.tenantId, e.id), e); }
  async findById(t: string, id: string): Promise<KnowledgeEntry | null> { return this.store.get(key(t, id)) ?? null; }
  async search(t: string, query: string, limit: number): Promise<KnowledgeEntry[]> {
    const q = query.toLowerCase();
    const list = [...this.store.values()].filter((e) => e.tenantId === t && e.content.toLowerCase().includes(q));
    return list.slice(0, limit);
  }
  async listByTenant(t: string, limit?: number): Promise<KnowledgeEntry[]> {
    const list = [...this.store.values()].filter((e) => e.tenantId === t);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═════ Recommendation ═════
export class InMemoryRecommendationRepository implements IRecommendationRepository {
  private store = new Map<string, AIRecommendation>();
  async insert(r: AIRecommendation): Promise<void> { this.store.set(key(r.tenantId, r.id), r); }
  async findById(t: string, id: string): Promise<AIRecommendation | null> { return this.store.get(key(t, id)) ?? null; }
  async findByTarget(t: string, targetRef: string, limit?: number): Promise<AIRecommendation[]> {
    const list = [...this.store.values()].filter((r) => r.tenantId === t && r.targetRef === targetRef);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  async findByType(t: string, type: RecommendationType, limit?: number): Promise<AIRecommendation[]> {
    const list = [...this.store.values()].filter((r) => r.tenantId === t && r.type === type);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═════ Insight ═════
export class InMemoryInsightRepository implements IInsightRepository {
  private store = new Map<string, AIInsight>();
  async insert(i: AIInsight): Promise<void> { this.store.set(key(i.tenantId, i.id), i); }
  async findById(t: string, id: string): Promise<AIInsight | null> { return this.store.get(key(t, id)) ?? null; }
  async findByType(t: string, type: InsightType, limit?: number): Promise<AIInsight[]> {
    const list = [...this.store.values()].filter((i) => i.tenantId === t && i.type === type);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═════ Prediction ═════
export class InMemoryPredictionRepository implements IPredictionRepository {
  private store = new Map<string, AIPrediction>();
  async insert(p: AIPrediction): Promise<void> { this.store.set(key(p.tenantId, p.id), p); }
  async findById(t: string, id: string): Promise<AIPrediction | null> { return this.store.get(key(t, id)) ?? null; }
  async findByType(t: string, type: PredictionType, limit?: number): Promise<AIPrediction[]> {
    const list = [...this.store.values()].filter((p) => p.tenantId === t && p.type === type);
    return limit !== undefined ? list.slice(0, limit) : list;
  }
  clear(): void { this.store.clear(); }
}

// ═════ Audit ═════
export class InMemoryAIAuditRepository implements IAIAuditRepository {
  private store = new Map<string, AIAuditRecord>();
  private counter = 0;
  async insert(r: Omit<AIAuditRecord, 'id' | 'createdAt'>): Promise<AIAuditRecord> {
    this.counter++;
    const full: AIAuditRecord = { ...r, id: `ai-audit-${this.counter}`, createdAt: new Date().toISOString() };
    this.store.set(full.id, full);
    return full;
  }
  async findByTenant(t: string, limit?: number): Promise<AIAuditRecord[]> {
    const list = [...this.store.values()].filter((r) => r.tenantId === t);
    return limit !== undefined ? list.slice(-limit) : list;
  }
  clear(): void { this.store.clear(); this.counter = 0; }
}
