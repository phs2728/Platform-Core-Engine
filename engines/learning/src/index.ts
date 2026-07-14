/**
 * Learning Engine — Public API
 *
 * Phase 8: Platform Intelligence Memory.
 *   Continuous Learning from outcomes.
 *   Evidence-Based: all learning requires evidence.
 *   Explainable: observation → evidence → pattern → confidence → recommendation.
 */

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

// Types
export type {
  LearningProject, LearningSession, LearningPattern, SuccessPattern, FailurePattern,
  Trend, RecommendationFeedback, DesignInsight, UXInsight, CopyInsight, SearchInsight,
  KnowledgeEvolution, LearningEvidence, LearningModel, ConfidenceScore,
  PersonalizationProfile, LearningStatistics, LearningMemory, LearningMemoryEntry, DesignMemoryEntry,
  LearningStatus, PatternCategory, PatternType, RecommendationOutcome, TrendDirection, PersonalizationScope,
  LearningAnalyzeInput, LearningAnalyzeOutput, AnalyticsData, BehaviorData, TrendData,
  EvidenceData, FeedbackData, KnowledgeData,
  LearningAuditRecord, LearningAuditEventType,
} from './interfaces/index.js';

// Interface types
export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  ILearningProvider, IAnalyticsProvider, IBehaviorProvider,
  ITrendProvider, IEvidenceProvider, IFeedbackProvider, IKnowledgeProvider,
  ILearningRepository, IPatternRepository, ITrendRepository,
  IRecommendationFeedbackRepository, IInsightRepository,
  IKnowledgeEvolutionRepository, IEvidenceRepository, IModelRepository,
  IConfidenceRepository, IPersonalizationRepository, IStatisticsRepository,
  IMemoryRepository, ILearningAuditRepository,
} from './interfaces/index.js';

// Learning Lifecycle
export {
  createLearningProjectUseCase, startLearningUseCase, completeLearningUseCase, archiveLearningUseCase,
  getLearningProjectUseCase, listLearningProjectsUseCase,
} from './use-cases/LearningUseCases.js';

// Pattern, Trend, Model, Confidence
export {
  learnSuccessPatternUseCase, learnFailurePatternUseCase, detectTrendUseCase,
  updateLearningModelUseCase, calculateConfidenceUseCase,
  getPatternUseCase, listPatternsUseCase, getTrendUseCase, listTrendsUseCase,
} from './use-cases/PatternUseCases.js';

// Recommendation, Design, Knowledge, Analytics, Memory
export {
  recordRecommendationResultUseCase, recordOutcomeUseCase,
  learnRecommendationUseCase, recommendImprovementUseCase,
  learnDesignUseCase, learnUXUseCase, learnCopyUseCase, learnSearchUseCase,
  updateKnowledgeUseCase, evolveKnowledgeUseCase,
  generateLearningReportUseCase, searchLearningMemoryUseCase,
  calculateLearningScoreUseCase, calculateImprovementRateUseCase, generateTrendAnalysisUseCase,
  getLearningMemoryUseCase, updateLearningMemoryUseCase, getLearningStatisticsUseCase,
  getDesignMemoryUseCase, getPersonalizationProfileUseCase,
} from './use-cases/RecommendationKnowledgeUseCases.js';

// Events
export { LEARNING_EVENTS, type LearningEventType, LEARNING_EVENT_SCHEMAS } from './domain/events.js';

// Status Transitions
export { canTransitionLearning } from './domain/statusTransition.js';

export type { LearningUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryLearningRepository, InMemoryPatternRepository, InMemoryTrendRepository,
  InMemoryFeedbackRepository, InMemoryInsightRepository,
  InMemoryKnowledgeEvolutionRepository, InMemoryEvidenceRepository, InMemoryModelRepository,
  InMemoryConfidenceRepository, InMemoryPersonalizationRepository, InMemoryStatisticsRepository,
  InMemoryMemoryRepository, InMemoryLearningAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Adapters
export {
  InMemoryOrganizationVerifier, StaticLearningPolicyProvider,
  MockLearningProvider, MockAnalyticsProvider, MockBehaviorProvider,
  MockTrendProvider, MockEvidenceProvider, MockFeedbackProvider, MockKnowledgeProvider,
  InMemoryEventBus, type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
