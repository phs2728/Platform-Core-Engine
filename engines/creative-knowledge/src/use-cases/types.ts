/** Creative Knowledge Engine — Use Case Deps */
import type {
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
} from '../interfaces/index.js';

export interface KnowledgeUseCaseDeps {
  researchRepo: IResearchRepository;
  interviewRepo: IInterviewRepository;
  businessProfileRepo: IBusinessProfileRepository;
  auditResultRepo: IAuditResultRepository;
  competitorRepo: ICompetitorRepository;
  knowledgeRepo: IKnowledgeRepository;
  evidenceRepo: IEvidenceRepository;
  recommendationRepo: IRecommendationRepository;
  benchmarkRepo: IBenchmarkRepository;
  patternRepo: IPatternRepository;
  briefRepo: IBriefRepository;
  memoryRepo: IMemoryRepository;
  gapAnalysisRepo: IGapAnalysisRepository;
  auditRepo: IKnowledgeAuditRepository;
  eventBus: IEventBus;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: IPolicyProvider;
  websiteAuditProvider: IWebsiteAuditProvider;
  competitorProvider: ICompetitorProvider;
  screenshotProvider: IScreenshotProvider;
  htmlProvider: IHTMLProvider;
  seoProvider: ISEOProvider;
  performanceProvider: IPerformanceProvider;
  accessibilityProvider: IAccessibilityProvider;
  researchProvider: IResearchProvider;
  llmProvider: ILLMProvider;
  idGenerator: IIdGenerator;
  clock: IClock;
}
