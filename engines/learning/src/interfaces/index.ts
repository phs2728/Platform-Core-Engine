/**
 * Learning Engine — Public Interfaces
 *
 * Phase 8: Platform Intelligence Memory.
 *  - Continuous Learning from outcomes
 *  - Evidence-Based: all learning requires evidence
 *  - Explainable: observation → evidence → pattern → confidence → recommendation
 *  - Provider Plugin: no ML framework, no training pipeline
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces — Provider Plugin Architecture
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface IPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getMaxLearningProjectsPerOrg(tenantId: string): Promise<number>;
}

export interface ILearningProvider {
  analyze(input: LearningAnalyzeInput): Promise<Result<LearningAnalyzeOutput, Error>>;
}

export interface IAnalyticsProvider {
  getMetrics(source: string, category: string): Promise<Result<AnalyticsData, Error>>;
}

export interface IBehaviorProvider {
  getBehaviorData(source: string): Promise<Result<BehaviorData, Error>>;
}

export interface ITrendProvider {
  detectTrends(category: string, region: string): Promise<Result<TrendData, Error>>;
}

export interface IEvidenceProvider {
  gatherEvidence(source: string, claim: string): Promise<Result<EvidenceData, Error>>;
}

export interface IFeedbackProvider {
  getFeedback(recommendationId: string): Promise<Result<FeedbackData, Error>>;
}

export interface IKnowledgeProvider {
  getKnowledge(query: string): Promise<Result<KnowledgeData, Error>>;
}

// ═══════════════════════════════════════════
// Provider Data Types
// ═══════════════════════════════════════════

export interface LearningAnalyzeInput {
  context: Record<string, unknown>;
  task: string;
  patterns: LearningPattern[];
}

export interface LearningAnalyzeOutput {
  analysis: string;
  confidence: number;
  insights: string[];
  recommendations: string[];
}

export interface AnalyticsData {
  source: string;
  category: string;
  metrics: Record<string, number>;
  summary: string;
}

export interface BehaviorData {
  source: string;
  sessions: number;
  bounceRate: number;
  avgDuration: number;
  conversionRate: number;
  clickThroughRate: number;
  topPages: string[];
}

export interface TrendData {
  category: string;
  region: string;
  trends: { name: string; direction: 'up' | 'down' | 'stable'; magnitude: number; confidence: number }[];
}

export interface EvidenceData {
  source: string;
  claim: string;
  supportingData: Record<string, unknown>;
  confidence: number;
}

export interface FeedbackData {
  recommendationId: string;
  outcome: 'accepted' | 'rejected' | 'ignored';
  impactScore: number;
  notes: string;
}

export interface KnowledgeData {
  query: string;
  articles: { title: string; content: string; confidence: number }[];
  summary: string;
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type LearningStatus = 'Created' | 'Learning' | 'Analyzing' | 'Completed' | 'Archived';
export type PatternCategory = 'Design' | 'UX' | 'Copy' | 'SEO' | 'Conversion' | 'Accessibility' | 'Navigation' | 'Search' | 'Trust' | 'Performance' | 'Brand' | 'Content';
export type PatternType = 'Success' | 'Failure';
export type RecommendationOutcome = 'accepted' | 'rejected' | 'ignored';
export type TrendDirection = 'up' | 'down' | 'stable';
export type PersonalizationScope = 'Organization' | 'Tenant' | 'User' | 'Region' | 'Language' | 'Industry';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface LearningProject {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  status: LearningStatus;
  sourceRef: string;
  patternIds: string[];
  trendIds: string[];
  evidenceIds: string[];
  recommendationIds: string[];
  statisticsId: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface LearningSession {
  id: string;
  projectId: string;
  tenantId: string;
  phase: string;
  startedAt: string;
  completedAt: string | null;
  findings: string[];
}

export interface LearningPattern {
  id: string;
  tenantId: string;
  projectId: string;
  type: PatternType;
  category: PatternCategory;
  name: string;
  description: string;
  observation: string;
  evidenceIds: string[];
  confidence: number;
  impact: number;
  frequency: number;
  applicableContexts: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SuccessPattern extends LearningPattern { type: 'Success'; }
export interface FailurePattern extends LearningPattern { type: 'Failure'; }

export interface Trend {
  id: string;
  tenantId: string;
  projectId: string;
  category: PatternCategory;
  name: string;
  direction: TrendDirection;
  magnitude: number;
  confidence: number;
  description: string;
  evidenceIds: string[];
  detectedAt: string;
}

export interface RecommendationFeedback {
  id: string;
  tenantId: string;
  projectId: string;
  recommendationId: string;
  category: PatternCategory;
  outcome: RecommendationOutcome;
  impactScore: number;
  contextRef: string;
  evidenceIds: string[];
  notes: string;
  recordedAt: string;
}

export interface DesignInsight {
  id: string;
  tenantId: string;
  projectId: string;
  designType: string;
  insight: string;
  qualityScore: number;
  evidenceIds: string[];
  successfulContexts: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface UXInsight {
  id: string;
  tenantId: string;
  projectId: string;
  insight: string;
  usabilityScore: number;
  evidenceIds: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface CopyInsight {
  id: string;
  tenantId: string;
  projectId: string;
  insight: string;
  effectivenessScore: number;
  evidenceIds: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface SearchInsight {
  id: string;
  tenantId: string;
  projectId: string;
  insight: string;
  relevanceScore: number;
  evidenceIds: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeEvolution {
  id: string;
  tenantId: string;
  projectId: string;
  knowledgeId: string;
  version: number;
  previousVersion: number;
  change: string;
  reason: string;
  evidenceIds: string[];
  confidenceDelta: number;
  newConfidence: number;
  evolvedAt: string;
}

export interface LearningEvidence {
  id: string;
  tenantId: string;
  projectId: string;
  source: string;
  sourceType: 'analytics' | 'behavior' | 'feedback' | 'ab_test' | 'observation' | 'benchmark' | 'outcome';
  claim: string;
  data: Record<string, unknown>;
  confidence: number;
  createdAt: string;
}

export interface LearningModel {
  id: string;
  tenantId: string;
  projectId: string;
  category: PatternCategory;
  version: number;
  accuracy: number;
  coverage: number;
  patterns: string[];
  lastUpdated: string;
}

export interface ConfidenceScore {
  id: string;
  tenantId: string;
  projectId: string;
  ref: string;
  refType: string;
  score: number;
  evidenceCount: number;
  factors: { name: string; weight: number; value: number }[];
  updatedAt: string;
}

export interface PersonalizationProfile {
  id: string;
  tenantId: string;
  scope: PersonalizationScope;
  scopeRef: string;
  preferences: Record<string, unknown>;
  learnedPatterns: string[];
  confidence: number;
  updatedAt: string;
}

export interface LearningStatistics {
  id: string;
  tenantId: string;
  projectId: string;
  improvementRate: number;
  knowledgeGrowth: number;
  patternAccuracy: number;
  recommendationAccuracy: number;
  avgConfidence: number;
  trendStability: number;
  learningCoverage: number;
  totalPatterns: number;
  totalEvidence: number;
  updatedAt: string;
}

export interface LearningMemory {
  id: string;
  tenantId: string;
  projectId: string;
  history: LearningMemoryEntry[];
  successfulStrategies: string[];
  failedStrategies: string[];
  designMemory: DesignMemoryEntry[];
  updatedAt: string;
}

export interface LearningMemoryEntry {
  timestamp: string;
  action: string;
  summary: string;
}

export interface DesignMemoryEntry {
  designType: string;
  description: string;
  qualityScore: number;
  sourceRef: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type LearningAuditEventType =
  | 'learning_started' | 'learning_completed' | 'learning_archived'
  | 'pattern_learned' | 'pattern_updated' | 'trend_detected'
  | 'recommendation_learned' | 'knowledge_evolved'
  | 'memory_updated' | 'confidence_updated'
  | 'report_generated' | 'improvement_detected' | 'analytics_updated';

export interface LearningAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  projectId?: string | undefined;
  actorId: string;
  correlationId: string;
  eventType: LearningAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repository Contracts
// ═══════════════════════════════════════════

export interface ILearningRepository {
  insert(project: LearningProject): Promise<void>;
  findById(tenantId: string, id: string): Promise<LearningProject | null>;
  findBySlug(tenantId: string, slug: string): Promise<LearningProject | null>;
  update(tenantId: string, id: string, patch: Partial<LearningProject>): Promise<void>;
  findAll(tenantId: string): Promise<LearningProject[]>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
  countByOrganization(tenantId: string, orgId: string): Promise<number>;
}

export interface IPatternRepository {
  insert(pattern: LearningPattern): Promise<void>;
  findById(tenantId: string, id: string): Promise<LearningPattern | null>;
  findByProject(tenantId: string, projectId: string): Promise<LearningPattern[]>;
  findByType(tenantId: string, projectId: string, type: PatternType): Promise<LearningPattern[]>;
  findByCategory(tenantId: string, projectId: string, category: PatternCategory): Promise<LearningPattern[]>;
  update(tenantId: string, id: string, patch: Partial<LearningPattern>): Promise<void>;
}

export interface ITrendRepository {
  insert(trend: Trend): Promise<void>;
  findById(tenantId: string, id: string): Promise<Trend | null>;
  findByProject(tenantId: string, projectId: string): Promise<Trend[]>;
  findByCategory(tenantId: string, projectId: string, category: PatternCategory): Promise<Trend[]>;
}

export interface IRecommendationFeedbackRepository {
  insert(feedback: RecommendationFeedback): Promise<void>;
  findByProject(tenantId: string, projectId: string): Promise<RecommendationFeedback[]>;
  findByRecommendation(tenantId: string, recommendationId: string): Promise<RecommendationFeedback[]>;
  findByOutcome(tenantId: string, projectId: string, outcome: RecommendationOutcome): Promise<RecommendationFeedback[]>;
}

export interface IInsightRepository {
  insertDesign(insight: DesignInsight): Promise<void>;
  insertUX(insight: UXInsight): Promise<void>;
  insertCopy(insight: CopyInsight): Promise<void>;
  insertSearch(insight: SearchInsight): Promise<void>;
  findDesignByProject(tenantId: string, projectId: string): Promise<DesignInsight[]>;
  findUXByProject(tenantId: string, projectId: string): Promise<UXInsight[]>;
  findCopyByProject(tenantId: string, projectId: string): Promise<CopyInsight[]>;
  findSearchByProject(tenantId: string, projectId: string): Promise<SearchInsight[]>;
}

export interface IKnowledgeEvolutionRepository {
  insert(evolution: KnowledgeEvolution): Promise<void>;
  findByProject(tenantId: string, projectId: string): Promise<KnowledgeEvolution[]>;
  findByKnowledge(tenantId: string, knowledgeId: string): Promise<KnowledgeEvolution[]>;
}

export interface IEvidenceRepository {
  insert(evidence: LearningEvidence): Promise<void>;
  findById(tenantId: string, id: string): Promise<LearningEvidence | null>;
  findByProject(tenantId: string, projectId: string): Promise<LearningEvidence[]>;
  findByClaim(tenantId: string, projectId: string, claim: string): Promise<LearningEvidence | null>;
}

export interface IModelRepository {
  insert(model: LearningModel): Promise<void>;
  findById(tenantId: string, id: string): Promise<LearningModel | null>;
  findByProject(tenantId: string, projectId: string): Promise<LearningModel[]>;
  findByCategory(tenantId: string, projectId: string, category: PatternCategory): Promise<LearningModel | null>;
  update(tenantId: string, id: string, patch: Partial<LearningModel>): Promise<void>;
}

export interface IConfidenceRepository {
  upsert(score: ConfidenceScore): Promise<void>;
  findByRef(tenantId: string, projectId: string, ref: string): Promise<ConfidenceScore | null>;
  findByProject(tenantId: string, projectId: string): Promise<ConfidenceScore[]>;
}

export interface IPersonalizationRepository {
  upsert(profile: PersonalizationProfile): Promise<void>;
  findByScope(tenantId: string, scope: PersonalizationScope, scopeRef: string): Promise<PersonalizationProfile | null>;
  findByTenant(tenantId: string): Promise<PersonalizationProfile[]>;
}

export interface IStatisticsRepository {
  upsert(stats: LearningStatistics): Promise<void>;
  findByProject(tenantId: string, projectId: string): Promise<LearningStatistics | null>;
}

export interface IMemoryRepository {
  upsert(memory: LearningMemory): Promise<void>;
  findByProject(tenantId: string, projectId: string): Promise<LearningMemory | null>;
  appendEntry(tenantId: string, projectId: string, entry: LearningMemoryEntry): Promise<void>;
  addDesignMemory(tenantId: string, projectId: string, entry: DesignMemoryEntry): Promise<void>;
}

export interface ILearningAuditRepository {
  insert(record: Omit<LearningAuditRecord, 'id' | 'createdAt'>): Promise<LearningAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<LearningAuditRecord[]>;
  findByProject(tenantId: string, projectId: string, limit?: number): Promise<LearningAuditRecord[]>;
}

export { type Result, type EventEnvelope };
