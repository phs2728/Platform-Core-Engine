/**
 * Creative Knowledge Engine — Public Interfaces
 *
 * Phase 7: AI Research Platform.
 *  - Research-First: client interviews, audits, competitor analysis
 *  - Evidence-Based: all recommendations require evidence
 *  - Provider Plugin: no browser/crawler/scraper logic
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
  getMaxResearchProjectsPerOrg(tenantId: string): Promise<number>;
}

export interface IWebsiteAuditProvider {
  audit(url: string): Promise<Result<WebsiteAuditData, Error>>;
}

export interface ICompetitorProvider {
  analyze(url: string): Promise<Result<CompetitorData, Error>>;
}

export interface IScreenshotProvider {
  capture(url: string): Promise<Result<ScreenshotData, Error>>;
}

export interface IHTMLProvider {
  fetch(url: string): Promise<Result<HTMLData, Error>>;
}

export interface ISEOProvider {
  audit(url: string): Promise<Result<SEOData, Error>>;
}

export interface IPerformanceProvider {
  audit(url: string): Promise<Result<PerformanceData, Error>>;
}

export interface IAccessibilityProvider {
  audit(url: string): Promise<Result<AccessibilityData, Error>>;
}

export interface IResearchProvider {
  research(query: string): Promise<Result<ResearchData, Error>>;
}

export interface ILLMProvider {
  analyze(input: LLMAnalyzeInput): Promise<Result<LLMAnalyzeOutput, Error>>;
  generateBrief(input: BriefGenInput): Promise<Result<BriefGenOutput, Error>>;
}

// ═══════════════════════════════════════════
// Provider Data Types
// ═══════════════════════════════════════════

export interface WebsiteAuditData {
  url: string;
  title: string;
  pages: number;
  loadTime: number;
  mobile: boolean;
  ssl: boolean;
}

export interface CompetitorData {
  url: string;
  name: string;
  strengths: string[];
  weaknesses: string[];
  patterns: string[];
}

export interface ScreenshotData {
  url: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
}

export interface HTMLData {
  url: string;
  structure: string;
  metaTags: Record<string, string>;
  headingHierarchy: string[];
}

export interface SEOData {
  url: string;
  score: number;
  issues: string[];
  metaTags: Record<string, string>;
  keywords: string[];
}

export interface PerformanceData {
  url: string;
  score: number;
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
}

export interface AccessibilityData {
  url: string;
  score: number;
  violations: { id: string; impact: string; description: string }[];
  level: 'A' | 'AA' | 'AAA';
}

export interface ResearchData {
  query: string;
  summary: string;
  keyFindings: string[];
  sources: { title: string; url: string }[];
}

export interface LLMAnalyzeInput {
  content: string;
  task: string;
  context: Record<string, unknown>;
}

export interface LLMAnalyzeOutput {
  analysis: string;
  confidence: number;
  insights: string[];
}

export interface BriefGenInput {
  interview: ClientInterview;
  businessProfile: BusinessProfile;
  auditResults: AuditSummary;
}

export interface BriefGenOutput {
  brief: CreativeBrief;
  confidence: number;
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type ResearchStatus = 'Created' | 'Interviewing' | 'Auditing' | 'Analyzing' | 'Completed' | 'Archived';
export type AuditType = 'Website' | 'UX' | 'SEO' | 'Accessibility' | 'Performance' | 'Content';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type PatternType = 'Visual' | 'Layout' | 'Copy';

export interface AuditSummary {
  website: WebsiteAuditResult | null;
  ux: UXAuditResult | null;
  seo: SEOAuditResult | null;
  accessibility: AccessibilityAuditResult | null;
  performance: PerformanceAuditResult | null;
  content: ContentAuditResult | null;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface ResearchProject {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  status: ResearchStatus;
  industry: string;
  interviewId: string | null;
  businessProfileId: string | null;
  briefId: string | null;
  auditIds: string[];
  competitorIds: string[];
  evidenceIds: string[];
  recommendationIds: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface ResearchSession {
  id: string;
  projectId: string;
  tenantId: string;
  phase: string;
  startedAt: string;
  completedAt: string | null;
  findings: string[];
}

export interface ClientInterview {
  id: string;
  tenantId: string;
  projectId: string;
  businessGoal: string;
  targetAudience: string;
  targetRegion: string;
  competitors: string[];
  brandPersonality: string;
  preferredStyle: string;
  dislikedStyle: string;
  businessModel: string;
  revenueModel: string;
  budget: string;
  timeline: string;
  successMetrics: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface BusinessProfile {
  id: string;
  tenantId: string;
  projectId: string;
  companyName: string;
  industry: string;
  description: string;
  targetMarket: string;
  competitiveAdvantage: string;
  revenueModel: string;
  maturity: string;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorProfile {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  url: string;
  strengths: string[];
  weaknesses: string[];
  patterns: CompetitorPattern[];
  auditScore: number;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface CompetitorPattern {
  type: string;
  description: string;
  quality: number;
}

export interface WebsiteAuditResult {
  id: string;
  tenantId: string;
  projectId: string;
  url: string;
  type: AuditType;
  score: number;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendations: string[];
  details: Record<string, unknown>;
  evidence: ResearchEvidence[];
  auditedAt: string;
}

export interface UXAuditResult {
  id: string; tenantId: string; projectId: string; type: 'UX';
  score: number; confidence: number;
  strengths: string[]; weaknesses: string[]; risks: string[];
  recommendations: string[];
  details: { navigation: number; layout: number; typography: number; spacing: number; responsiveness: number; consistency: number; };
  evidence: ResearchEvidence[];
  auditedAt: string;
}

export interface SEOAuditResult {
  id: string; tenantId: string; projectId: string; type: 'SEO';
  score: number; confidence: number;
  strengths: string[]; weaknesses: string[]; risks: string[];
  recommendations: string[];
  details: { metaTags: number; headings: number; keywords: number; mobile: number; ssl: number; };
  evidence: ResearchEvidence[];
  auditedAt: string;
}

export interface AccessibilityAuditResult {
  id: string; tenantId: string; projectId: string; type: 'Accessibility';
  score: number; confidence: number;
  strengths: string[]; weaknesses: string[]; risks: string[];
  recommendations: string[];
  details: { level: 'A' | 'AA' | 'AAA'; violations: number; criticalCount: number; };
  evidence: ResearchEvidence[];
  auditedAt: string;
}

export interface PerformanceAuditResult {
  id: string; tenantId: string; projectId: string; type: 'Performance';
  score: number; confidence: number;
  strengths: string[]; weaknesses: string[]; risks: string[];
  recommendations: string[];
  details: { loadTime: number; fcp: number; lcp: number; cls: number; };
  evidence: ResearchEvidence[];
  auditedAt: string;
}

export interface ContentAuditResult {
  id: string; tenantId: string; projectId: string; type: 'Content';
  score: number; confidence: number;
  strengths: string[]; weaknesses: string[]; risks: string[];
  recommendations: string[];
  details: { clarity: number; tone: number; readability: number; structure: number; ctaStrength: number; };
  evidence: ResearchEvidence[];
  auditedAt: string;
}

export interface DesignPattern {
  id: string;
  tenantId: string;
  projectId: string;
  type: PatternType;
  name: string;
  description: string;
  principles: string[];
  qualityScore: number;
  sourceUrl: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface CreativeBrief {
  id: string;
  tenantId: string;
  projectId: string;
  goals: string[];
  audience: string;
  competitors: string[];
  constraints: { type: string; description: string }[];
  successMetrics: string[];
  budget: string;
  timeline: string;
  evidence: ResearchEvidence[];
  confidence: number;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface ResearchEvidence {
  id: string;
  tenantId: string;
  projectId: string;
  source: string;
  sourceType: 'audit' | 'competitor' | 'market' | 'user' | 'benchmark' | 'interview';
  claim: string;
  data: Record<string, unknown>;
  confidence: number;
  createdAt: string;
}

export interface Benchmark {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  referenceApp: string;
  category: string;
  scores: Record<string, number>;
  principles: string[];
  description: string;
  createdAt: string;
}

export interface GapAnalysis {
  id: string;
  tenantId: string;
  projectId: string;
  currentScore: number;
  benchmarkScore: number;
  gap: number;
  gaps: { area: string; current: number; benchmark: number; gap: number; priority: Priority }[];
  recommendations: string[];
  createdAt: string;
}

export interface ResearchRecommendation {
  id: string;
  tenantId: string;
  projectId: string;
  category: 'design' | 'ux' | 'content' | 'technical' | 'strategy';
  priority: Priority;
  title: string;
  description: string;
  evidenceIds: string[];
  confidence: number;
  reason: string;
  expectedImpact: number;
  createdAt: string;
}

export interface KnowledgeArticle {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  category: string;
  tags: string[];
  content: string;
  sources: { title: string; url: string }[];
  confidence: number;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchMemory {
  id: string;
  tenantId: string;
  projectId: string;
  history: ResearchMemoryEntry[];
  patternLibrary: string[];
  successfulStrategies: string[];
  failedStrategies: string[];
  updatedAt: string;
}

export interface ResearchMemoryEntry {
  timestamp: string;
  action: string;
  summary: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type KnowledgeAuditEventType =
  | 'research_created' | 'research_completed' | 'research_archived'
  | 'interview_completed' | 'website_audited'
  | 'competitor_analyzed' | 'knowledge_created' | 'knowledge_updated'
  | 'benchmark_generated' | 'recommendation_generated' | 'evidence_generated'
  | 'brief_generated' | 'memory_updated';

export interface KnowledgeAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  projectId?: string | undefined;
  actorId: string;
  correlationId: string;
  eventType: KnowledgeAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repository Contracts
// ═══════════════════════════════════════════

export interface IResearchRepository {
  insert(project: ResearchProject): Promise<void>;
  findById(tenantId: string, id: string): Promise<ResearchProject | null>;
  findBySlug(tenantId: string, slug: string): Promise<ResearchProject | null>;
  update(tenantId: string, id: string, patch: Partial<ResearchProject>): Promise<void>;
  findAll(tenantId: string): Promise<ResearchProject[]>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
  countByOrganization(tenantId: string, orgId: string): Promise<number>;
}

export interface IInterviewRepository {
  insert(interview: ClientInterview): Promise<void>;
  findById(tenantId: string, id: string): Promise<ClientInterview | null>;
  findByProject(tenantId: string, projectId: string): Promise<ClientInterview | null>;
}

export interface IBusinessProfileRepository {
  insert(profile: BusinessProfile): Promise<void>;
  findById(tenantId: string, id: string): Promise<BusinessProfile | null>;
  findByProject(tenantId: string, projectId: string): Promise<BusinessProfile | null>;
  update(tenantId: string, id: string, patch: Partial<BusinessProfile>): Promise<void>;
}

export interface IAuditResultRepository {
  insert(result: WebsiteAuditResult | UXAuditResult | SEOAuditResult | AccessibilityAuditResult | PerformanceAuditResult | ContentAuditResult): Promise<void>;
  findById(tenantId: string, id: string): Promise<WebsiteAuditResult | UXAuditResult | SEOAuditResult | AccessibilityAuditResult | PerformanceAuditResult | ContentAuditResult | null>;
  findByProject(tenantId: string, projectId: string): Promise<(WebsiteAuditResult | UXAuditResult | SEOAuditResult | AccessibilityAuditResult | PerformanceAuditResult | ContentAuditResult)[]>;
}

export interface ICompetitorRepository {
  insert(competitor: CompetitorProfile): Promise<void>;
  findById(tenantId: string, id: string): Promise<CompetitorProfile | null>;
  findByProject(tenantId: string, projectId: string): Promise<CompetitorProfile[]>;
}

export interface IKnowledgeRepository {
  insert(article: KnowledgeArticle): Promise<void>;
  findById(tenantId: string, id: string): Promise<KnowledgeArticle | null>;
  findBySlug(tenantId: string, slug: string): Promise<KnowledgeArticle | null>;
  findAll(tenantId: string): Promise<KnowledgeArticle[]>;
  update(tenantId: string, id: string, patch: Partial<KnowledgeArticle>): Promise<void>;
}

export interface IEvidenceRepository {
  insert(evidence: ResearchEvidence): Promise<void>;
  findById(tenantId: string, id: string): Promise<ResearchEvidence | null>;
  findByProject(tenantId: string, projectId: string): Promise<ResearchEvidence[]>;
  findByClaim(tenantId: string, projectId: string, claim: string): Promise<ResearchEvidence | null>;
}

export interface IRecommendationRepository {
  insert(rec: ResearchRecommendation): Promise<void>;
  findByProject(tenantId: string, projectId: string): Promise<ResearchRecommendation[]>;
}

export interface IBenchmarkRepository {
  insert(benchmark: Benchmark): Promise<void>;
  findById(tenantId: string, id: string): Promise<Benchmark | null>;
  findByProject(tenantId: string, projectId: string): Promise<Benchmark[]>;
}

export interface IPatternRepository {
  insert(pattern: DesignPattern): Promise<void>;
  findById(tenantId: string, id: string): Promise<DesignPattern | null>;
  findByProject(tenantId: string, projectId: string): Promise<DesignPattern[]>;
}

export interface IBriefRepository {
  insert(brief: CreativeBrief): Promise<void>;
  findById(tenantId: string, id: string): Promise<CreativeBrief | null>;
  findByProject(tenantId: string, projectId: string): Promise<CreativeBrief | null>;
}

export interface IMemoryRepository {
  upsert(memory: ResearchMemory): Promise<void>;
  findByProject(tenantId: string, projectId: string): Promise<ResearchMemory | null>;
  appendEntry(tenantId: string, projectId: string, entry: ResearchMemoryEntry): Promise<void>;
}

export interface IGapAnalysisRepository {
  insert(analysis: GapAnalysis): Promise<void>;
  findByProject(tenantId: string, projectId: string): Promise<GapAnalysis | null>;
}

export interface IKnowledgeAuditRepository {
  insert(record: Omit<KnowledgeAuditRecord, 'id' | 'createdAt'>): Promise<KnowledgeAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<KnowledgeAuditRecord[]>;
  findByProject(tenantId: string, projectId: string, limit?: number): Promise<KnowledgeAuditRecord[]>;
}

export { type Result, type EventEnvelope };
