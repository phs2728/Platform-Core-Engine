/**
 * Creative Knowledge Engine — Public API
 *
 * Phase 7: AI Research Platform.
 *   Research-First: client interviews, audits, competitor analysis.
 *   Evidence-Based: all recommendations require evidence.
 *   Provider Plugin: no browser/crawler/scraper logic.
 */

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

// Types
export type {
  ResearchProject, ResearchSession, ClientInterview, BusinessProfile, CompetitorProfile, CompetitorPattern,
  WebsiteAuditResult, UXAuditResult, SEOAuditResult, AccessibilityAuditResult, PerformanceAuditResult, ContentAuditResult,
  DesignPattern, CreativeBrief, ResearchEvidence, Benchmark, GapAnalysis, ResearchRecommendation,
  KnowledgeArticle, ResearchMemory, ResearchMemoryEntry,
  ResearchStatus, AuditType, Priority, PatternType, AuditSummary,
  WebsiteAuditData, CompetitorData, ScreenshotData, HTMLData, SEOData, PerformanceData, AccessibilityData, ResearchData,
  LLMAnalyzeInput, LLMAnalyzeOutput, BriefGenInput, BriefGenOutput,
  KnowledgeAuditRecord, KnowledgeAuditEventType,
} from './interfaces/index.js';

// Interface types
export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  IWebsiteAuditProvider, ICompetitorProvider, IScreenshotProvider,
  IHTMLProvider, ISEOProvider, IPerformanceProvider, IAccessibilityProvider,
  IResearchProvider, ILLMProvider,
  IResearchRepository, IInterviewRepository, IBusinessProfileRepository,
  IAuditResultRepository, ICompetitorRepository, IKnowledgeRepository,
  IEvidenceRepository, IRecommendationRepository, IBenchmarkRepository,
  IPatternRepository, IBriefRepository, IMemoryRepository,
  IGapAnalysisRepository, IKnowledgeAuditRepository,
} from './interfaces/index.js';

// Research, Interview, Brief
export {
  createResearchProjectUseCase, startResearchSessionUseCase, completeResearchUseCase, archiveResearchUseCase,
  getResearchProjectUseCase, listResearchProjectsUseCase,
  conductInterviewUseCase, generateCreativeBriefUseCase, updateBusinessProfileUseCase,
} from './use-cases/ResearchInterviewUseCases.js';

// Audit, Competitor, Pattern, Benchmark
export {
  auditWebsiteUseCase, auditUXUseCase, auditSEOUseCase, auditAccessibilityUseCase, auditPerformanceUseCase, auditContentUseCase,
  analyzeCompetitorUseCase, compareCompetitorsUseCase,
  extractPatternsUseCase, extractVisualPatternsUseCase, extractCopyPatternsUseCase, extractLayoutPatternsUseCase,
  generateBenchmarkUseCase,
} from './use-cases/AuditCompetitorUseCases.js';

// Knowledge, Evidence, Recommendation, Memory
export {
  createKnowledgeUseCase, updateKnowledgeUseCase, searchKnowledgeUseCase, recommendKnowledgeUseCase,
  generateEvidenceUseCase, calculateConfidenceUseCase,
  generateRecommendationsUseCase, generateGapAnalysisUseCase,
  getResearchMemoryUseCase, updateResearchMemoryUseCase, searchResearchHistoryUseCase,
} from './use-cases/KnowledgeRecommendationUseCases.js';

// Events
export { KNOWLEDGE_EVENTS, type KnowledgeEventType, KNOWLEDGE_EVENT_SCHEMAS } from './domain/events.js';

// Status Transitions
export { canTransitionResearch } from './domain/statusTransition.js';

export type { KnowledgeUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryResearchRepository, InMemoryInterviewRepository, InMemoryBusinessProfileRepository,
  InMemoryAuditResultRepository, InMemoryCompetitorRepository, InMemoryKnowledgeRepository,
  InMemoryEvidenceRepository, InMemoryRecommendationRepository, InMemoryBenchmarkRepository,
  InMemoryPatternRepository, InMemoryBriefRepository, InMemoryMemoryRepository,
  InMemoryGapAnalysisRepository, InMemoryKnowledgeAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Adapters
export {
  InMemoryOrganizationVerifier, StaticKnowledgePolicyProvider,
  MockWebsiteAuditProvider, MockCompetitorProvider, MockScreenshotProvider,
  MockHTMLProvider, MockSEOProvider, MockPerformanceProvider, MockAccessibilityProvider,
  MockResearchProvider, MockLLMProvider,
  InMemoryEventBus, type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
