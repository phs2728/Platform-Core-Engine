/** Host Stubs + EventBus — Test/Demo only */
import type { EventEnvelope } from '@platform/core-sdk';
import type {
  ILLMProvider, IEmbeddingProvider, IVectorProvider, IPromptProvider,
  IKnowledgeProvider, ITranslationProvider, IAIContextProvider, ISearchResultProvider,
  ICustomDataPolicyProvider,
  LLMInput, LLMOutput, ChatInput, ChatOutput, EmbedInput,
  VectorMatch, PromptTemplate, KnowledgeChunk, AIContextRef, SearchResultRef,
  LLMProviderType,
} from '../interfaces/index.js';
import { Ok, Err, type Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// LLM Provider (Mock — simulates OpenAI/Gemini/Claude)
// ═══════════════════════════════════════════

export class MockLLMProvider implements ILLMProvider {
  readonly providerId = 'mock-llm';
  readonly providerType = 'custom' as LLMProviderType;
  private defaultResponse = 'This is a mock AI response.';

  setDefaultResponse(text: string): void { this.defaultResponse = text; }

  async generate(input: LLMInput): Promise<Result<LLMOutput, Error>> {
    const content = `${this.defaultResponse}\n\nQuery: ${input.userPrompt}`;
    return Ok({ content, tokensUsed: Math.ceil(content.length / 4), finishReason: 'stop', providerMeta: { model: 'mock' } });
  }

  async chat(input: ChatInput): Promise<Result<ChatOutput, Error>> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
    const content = `${this.defaultResponse} — responding to: ${lastUser?.content ?? ''}`;
    return Ok({
      message: { role: 'assistant', content, tokensUsed: Math.ceil(content.length / 4) },
      tokensUsed: Math.ceil(content.length / 4), finishReason: 'stop',
    });
  }

  async embed(_input: EmbedInput): Promise<Result<number[], Error>> {
    return Ok(Array.from({ length: 384 }, () => Math.random()));
  }
}

// ═══════════════════════════════════════════
// Embedding Provider (Mock)
// ═══════════════════════════════════════════

export class MockEmbeddingProvider implements IEmbeddingProvider {
  readonly dimensions = 384;
  async embed(text: string): Promise<Result<number[], Error>> {
    const hash = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return Ok(Array.from({ length: this.dimensions }, (_, i) => Math.sin(hash + i) * 0.5));
  }
  async embedBatch(texts: string[]): Promise<Result<number[][], Error>> {
    const results: number[][] = [];
    for (const t of texts) {
      const r = await this.embed(t);
      if (r.ok) results.push(r.value);
    }
    return Ok(results);
  }
}

// ═══════════════════════════════════════════
// Vector Provider (Mock — in-memory cosine similarity)
// ═══════════════════════════════════════════

export class MockVectorProvider implements IVectorProvider {
  private store = new Map<string, { vector: number[]; metadata: Record<string, unknown> }>();

  async upsert(id: string, vector: number[], metadata: Record<string, unknown>): Promise<Result<boolean, Error>> {
    this.store.set(id, { vector, metadata });
    return Ok(true);
  }

  async search(queryVector: number[], limit: number): Promise<Result<VectorMatch[], Error>> {
    const results: VectorMatch[] = [];
    for (const [id, entry] of this.store) {
      const score = this.cosineSimilarity(queryVector, entry.vector);
      results.push({ id, score, metadata: entry.metadata });
    }
    results.sort((a, b) => b.score - a.score);
    return Ok(results.slice(0, limit));
  }

  async delete(id: string): Promise<Result<boolean, Error>> { this.store.delete(id); return Ok(true); }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }
    return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Prompt Provider (Mock)
// ═══════════════════════════════════════════

export class MockPromptProvider implements IPromptProvider {
  private prompts = new Map<string, PromptTemplate>();

  addPrompt(p: PromptTemplate): void { this.prompts.set(p.name, p); }

  async getPrompt(name: string, _version?: number): Promise<Result<PromptTemplate, Error>> {
    const p = this.prompts.get(name);
    if (!p) return Err(new Error(`Prompt not found: ${name}`));
    return Ok(p);
  }

  async listPrompts(): Promise<Result<PromptTemplate[], Error>> { return Ok([...this.prompts.values()]); }
  clear(): void { this.prompts.clear(); }
}

// ═══════════════════════════════════════════
// Knowledge Provider (Mock)
// ═══════════════════════════════════════════

export class MockKnowledgeProvider implements IKnowledgeProvider {
  private chunks: KnowledgeChunk[] = [];

  addChunk(c: KnowledgeChunk): void { this.chunks.push(c); }

  async query(_tenantId: string, query: string, limit: number): Promise<Result<KnowledgeChunk[], Error>> {
    const q = query.toLowerCase();
    const matches = this.chunks.filter((c) => c.content.toLowerCase().includes(q)).slice(0, limit);
    return Ok(matches);
  }

  async ingest(_tenantId: string, chunks: KnowledgeChunk[]): Promise<Result<boolean, Error>> {
    this.chunks.push(...chunks);
    return Ok(true);
  }

  clear(): void { this.chunks = []; }
}

// ═══════════════════════════════════════════
// Translation Provider (Mock)
// ═══════════════════════════════════════════

export class MockTranslationProvider implements ITranslationProvider {
  async translate(text: string, from: string, to: string): Promise<Result<string, Error>> {
    return Ok(`[${from}→${to}] ${text}`);
  }
  async detectLanguage(text: string): Promise<Result<string, Error>> {
    if (/[\uac00-\ud7af]/.test(text)) return Ok('ko');
    return Ok('en');
  }
  async supportedLanguages(): Promise<readonly string[]> { return ['en', 'ko', 'ka', 'ru', 'tr', 'zh', 'de']; }
}

// ═══════════════════════════════════════════
// AI Context Provider (Mock — simulates Query Engine)
// ═══════════════════════════════════════════

export class MockAIContextProvider implements IAIContextProvider {
  private contexts = new Map<string, AIContextRef>();

  addContext(key: string, ctx: AIContextRef): void { this.contexts.set(key, ctx); }

  async getAIContext(_t: string, contextType: string, targetRef: string): Promise<Result<AIContextRef, Error>> {
    const ctx = this.contexts.get(`${contextType}::${targetRef}`);
    if (!ctx) return Err(new Error('AIContext not found'));
    return Ok(ctx);
  }

  async getAIContexts(_t: string, contextType: string): Promise<Result<AIContextRef[], Error>> {
    const list = [...this.contexts.values()].filter((c) => c.contextType === contextType);
    return Ok(list);
  }

  clear(): void { this.contexts.clear(); }
}

// ═══════════════════════════════════════════
// Search Result Provider (Mock — simulates Search Engine)
// ═══════════════════════════════════════════

export class MockSearchResultProvider implements ISearchResultProvider {
  private docs: SearchResultRef[] = [];

  addDoc(d: SearchResultRef): void { this.docs.push(d); }

  async search(_t: string, query: string, _domain: string, limit: number): Promise<Result<SearchResultRef[], Error>> {
    const q = query.toLowerCase();
    const matches = this.docs.filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
    return Ok(matches.slice(0, limit));
  }

  clear(): void { this.docs = []; }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticAIPolicyProvider implements ICustomDataPolicyProvider {
  private config = new Map<string, { allowedAssistants: readonly string[]; maxTokens: number; temperature: number }>();

  set(tenantId: string, c: Partial<{ allowedAssistants: readonly string[]; maxTokens: number; temperature: number }>): void {
    const prev = this.config.get(tenantId);
    this.config.set(tenantId, {
      allowedAssistants: c.allowedAssistants ?? prev?.allowedAssistants ?? ['platform', 'booking', 'payment', 'review', 'organization', 'admin'],
      maxTokens: c.maxTokens ?? prev?.maxTokens ?? 4096,
      temperature: c.temperature ?? prev?.temperature ?? 0.7,
    });
  }

  async validateAttributes(_t: string, _type: string, attrs: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> { return Ok(attrs); }
  async getAllowedAssistantTypes(t: string): Promise<readonly string[]> { return this.config.get(t)?.allowedAssistants ?? ['platform']; }
  async getMaxTokens(t: string): Promise<number> { return this.config.get(t)?.maxTokens ?? 4096; }
  async getDefaultTemperature(t: string): Promise<number> { return this.config.get(t)?.temperature ?? 0.7; }
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
