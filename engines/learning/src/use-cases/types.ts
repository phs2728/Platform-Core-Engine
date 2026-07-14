/** Learning Engine — Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  ILearningProvider, IAnalyticsProvider, IBehaviorProvider,
  ITrendProvider, IEvidenceProvider, IFeedbackProvider, IKnowledgeProvider,
  ILearningRepository, IPatternRepository, ITrendRepository,
  IRecommendationFeedbackRepository, IInsightRepository,
  IKnowledgeEvolutionRepository, IEvidenceRepository, IModelRepository,
  IConfidenceRepository, IPersonalizationRepository, IStatisticsRepository,
  IMemoryRepository, ILearningAuditRepository,
} from '../interfaces/index.js';

export interface LearningUseCaseDeps {
  learningRepo: ILearningRepository;
  patternRepo: IPatternRepository;
  trendRepo: ITrendRepository;
  feedbackRepo: IRecommendationFeedbackRepository;
  insightRepo: IInsightRepository;
  knowledgeEvoRepo: IKnowledgeEvolutionRepository;
  evidenceRepo: IEvidenceRepository;
  modelRepo: IModelRepository;
  confidenceRepo: IConfidenceRepository;
  personalizationRepo: IPersonalizationRepository;
  statisticsRepo: IStatisticsRepository;
  memoryRepo: IMemoryRepository;
  auditRepo: ILearningAuditRepository;
  eventBus: IEventBus;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: IPolicyProvider;
  learningProvider: ILearningProvider;
  analyticsProvider: IAnalyticsProvider;
  behaviorProvider: IBehaviorProvider;
  trendProvider: ITrendProvider;
  evidenceProvider: IEvidenceProvider;
  feedbackProvider: IFeedbackProvider;
  knowledgeProvider: IKnowledgeProvider;
  idGenerator: IIdGenerator;
  clock: IClock;
}
