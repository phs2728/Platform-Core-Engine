/**
 * AI Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 6 — Intelligence Layer.
 *
 * AI Engine은 원본 Business Engine Repository에 직접 접근하지 않습니다.
 * 오직 Query Engine의 AIContext와 Search Engine의 검색 결과만 사용합니다.
 *
 * 모든 AI 기능은 Host Interface Plugin으로 구현됩니다:
 *   ILLMProvider (OpenAI/Gemini/Claude/Ollama — 교체 가능)
 *   IEmbeddingProvider, IVectorProvider, IPromptProvider,
 *   IKnowledgeProvider, ITranslationProvider
 *
 * AI는 판단을 돕는 역할만 하고, 최종 상태 변경은 비즈니스 엔진이 수행합니다.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces — ALL AI via Plugin
// ═══════════════════════════════════════════

/** LLM Provider — text generation, chat, reasoning. Swappable: OpenAI/Gemini/Claude/Ollama. */
export interface ILLMProvider {
  readonly providerId: string;
  readonly providerType: LLMProviderType;

  generate(input: LLMInput): Promise<Result<LLMOutput, Error>>;
  chat(input: ChatInput): Promise<Result<ChatOutput, Error>>;
  embed(input: EmbedInput): Promise<Result<number[], Error>>;
}

export type LLMProviderType = 'openai' | 'gemini' | 'claude' | 'ollama' | 'azure-openai' | 'vertex-ai' | 'custom';

export interface LLMInput {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  context?: AIContextRef[];
}

export interface LLMOutput {
  content: string;
  tokensUsed: number;
  finishReason: string;
  providerMeta: Record<string, unknown>;
}

export interface ChatInput {
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOutput {
  message: ChatMessage;
  tokensUsed: number;
  finishReason: string;
}

export interface EmbedInput {
  text: string;
}

/** Embedding Provider — vector embeddings for semantic search. */
export interface IEmbeddingProvider {
  embed(text: string): Promise<Result<number[], Error>>;
  embedBatch(texts: string[]): Promise<Result<number[][], Error>>;
  readonly dimensions: number;
}

/** Vector Provider — vector storage and similarity search. */
export interface IVectorProvider {
  upsert(id: string, vector: number[], metadata: Record<string, unknown>): Promise<Result<boolean, Error>>;
  search(queryVector: number[], limit: number): Promise<Result<VectorMatch[], Error>>;
  delete(id: string): Promise<Result<boolean, Error>>;
}

export interface VectorMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

/** Prompt Provider — prompt template management. */
export interface IPromptProvider {
  getPrompt(name: string, version?: number): Promise<Result<PromptTemplate, Error>>;
  listPrompts(): Promise<Result<PromptTemplate[], Error>>;
}

/** Knowledge Provider — domain knowledge base for RAG. */
export interface IKnowledgeProvider {
  query(tenantId: string, query: string, limit: number): Promise<Result<KnowledgeChunk[], Error>>;
  ingest(tenantId: string, chunks: KnowledgeChunk[]): Promise<Result<boolean, Error>>;
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  source: string;
  metadata: Record<string, unknown>;
  score: number;
}

/** Translation Provider — multi-language translation. */
export interface ITranslationProvider {
  translate(text: string, from: string, to: string): Promise<Result<string, Error>>;
  detectLanguage(text: string): Promise<Result<string, Error>>;
  supportedLanguages(): Promise<readonly string[]>;
}

/** AI Context Provider — reads from Query Engine's AIContext (NOT direct engine access). */
export interface IAIContextProvider {
  getAIContext(tenantId: string, contextType: string, targetRef: string): Promise<Result<AIContextRef, Error>>;
  getAIContexts(tenantId: string, contextType: string): Promise<Result<AIContextRef[], Error>>;
}

export interface AIContextRef {
  contextType: string;
  targetRef: string;
  summary: string;
  facts: Record<string, unknown>;
  sentiment: number | null;
  riskLevel: string | null;
}

/** Search Provider — reads from Search Engine (NOT direct engine access). */
export interface ISearchResultProvider {
  search(tenantId: string, query: string, domain: string, limit: number): Promise<Result<SearchResultRef[], Error>>;
}

export interface SearchResultRef {
  documentId: string;
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  score: number;
}

/** Custom Data Policy */
export interface ICustomDataPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getAllowedAssistantTypes(tenantId: string): Promise<readonly string[]>;
  getMaxTokens(tenantId: string): Promise<number>;
  getDefaultTemperature(tenantId: string): Promise<number>;
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type AssistantType =
  | 'platform' | 'booking' | 'payment' | 'review'
  | 'organization' | 'admin';

export type InsightType =
  | 'revenue' | 'customer' | 'booking' | 'payment'
  | 'inventory' | 'review';

export type PredictionType =
  | 'demand_forecast' | 'cancellation_risk' | 'fraud_risk'
  | 'low_stock' | 'customer_churn' | 'revenue_forecast';

export type RecommendationType =
  | 'related' | 'similar' | 'cross_sell' | 'up_sell'
  | 'next_best_action' | 'personalized' | 'trending' | 'nearby';

export type GenerationType =
  | 'reply' | 'description' | 'email' | 'notification'
  | 'report' | 'summary' | 'headline' | 'tags';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

/** Conversation — a multi-turn chat session. */
export interface Conversation {
  id: string;
  tenantId: string;
  userId: string;
  assistantType: AssistantType;
  messages: ConversationMessage[];
  context: AIContextRef[];
  status: 'active' | 'ended';
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokensUsed: number;
  metadata: Record<string, unknown>;
  timestamp: string;
}

/** Prompt Template — versioned prompt with variables. */
export interface PromptTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;   // {{variable}} placeholders
  variables: string[];
  version: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** AI Recommendation — generated recommendation with reasoning. */
export interface AIRecommendation {
  id: string;
  tenantId: string;
  type: RecommendationType;
  targetRef: string;
  items: AIRecommendationItem[];
  reasoning: string;
  confidence: number;
  createdAt: string;
}

export interface AIRecommendationItem {
  sourceType: string;
  sourceId: string;
  title: string;
  score: number;
  reason: string;
}

/** AI Insight — generated insight from data analysis. */
export interface AIInsight {
  id: string;
  tenantId: string;
  type: InsightType;
  targetRef: string | null;
  title: string;
  summary: string;
  details: string;
  metrics: Record<string, number>;
  recommendations: string[];
  confidence: number;
  createdAt: string;
}

/** AI Prediction — forecast or risk assessment. */
export interface AIPrediction {
  id: string;
  tenantId: string;
  type: PredictionType;
  targetRef: string | null;
  prediction: string;
  probability: number;
  confidence: number;
  factors: { name: string; weight: number; value: string }[];
  timeframe: string;
  createdAt: string;
}

/** AI Generation — content generation result. */
export interface AIGeneration {
  id: string;
  tenantId: string;
  type: GenerationType;
  input: string;
  output: string;
  promptUsed: string;
  tokensUsed: number;
  createdAt: string;
}

/** Knowledge Entry — ingested knowledge chunk. */
export interface KnowledgeEntry {
  id: string;
  tenantId: string;
  content: string;
  source: string;
  vector: number[] | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type AIAuditEventType =
  | 'chat_started' | 'chat_completed' | 'chat_failed'
  | 'summary_generated' | 'recommendation_generated'
  | 'prediction_completed' | 'insight_generated'
  | 'translation_completed' | 'generation_completed'
  | 'prompt_updated' | 'provider_changed' | 'ai_failed';

export interface AIAuditRecord {
  id: string;
  tenantId: string;
  conversationId?: string;
  promptId?: string;
  actorId: string;
  correlationId: string;
  eventType: AIAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IConversationRepository {
  insert(c: Conversation): Promise<void>;
  findById(tenantId: string, id: string): Promise<Conversation | null>;
  findByUser(tenantId: string, userId: string, limit?: number): Promise<Conversation[]>;
  update(tenantId: string, id: string, patch: Partial<Conversation>): Promise<void>;
}

export interface IPromptRepository {
  insert(p: PromptTemplate): Promise<void>;
  findById(tenantId: string, id: string): Promise<PromptTemplate | null>;
  findByName(tenantId: string, name: string, activeOnly?: boolean): Promise<PromptTemplate | null>;
  update(tenantId: string, id: string, patch: Partial<PromptTemplate>): Promise<void>;
  listByTenant(tenantId: string): Promise<PromptTemplate[]>;
}

export interface IKnowledgeRepository {
  insert(e: KnowledgeEntry): Promise<void>;
  findById(tenantId: string, id: string): Promise<KnowledgeEntry | null>;
  search(tenantId: string, query: string, limit: number): Promise<KnowledgeEntry[]>;
  listByTenant(tenantId: string, limit?: number): Promise<KnowledgeEntry[]>;
}

export interface IRecommendationRepository {
  insert(r: AIRecommendation): Promise<void>;
  findById(tenantId: string, id: string): Promise<AIRecommendation | null>;
  findByTarget(tenantId: string, targetRef: string, limit?: number): Promise<AIRecommendation[]>;
  findByType(tenantId: string, type: RecommendationType, limit?: number): Promise<AIRecommendation[]>;
}

export interface IInsightRepository {
  insert(i: AIInsight): Promise<void>;
  findById(tenantId: string, id: string): Promise<AIInsight | null>;
  findByType(tenantId: string, type: InsightType, limit?: number): Promise<AIInsight[]>;
}

export interface IPredictionRepository {
  insert(p: AIPrediction): Promise<void>;
  findById(tenantId: string, id: string): Promise<AIPrediction | null>;
  findByType(tenantId: string, type: PredictionType, limit?: number): Promise<AIPrediction[]>;
}

export interface IAIAuditRepository {
  insert(record: Omit<AIAuditRecord, 'id' | 'createdAt'>): Promise<AIAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<AIAuditRecord[]>;
}

export { type Result, type EventEnvelope };
