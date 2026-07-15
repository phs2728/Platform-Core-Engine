/** Experience Engine — Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  IMediaReferenceResolver, ISearchIntegration, IAIRecommendationEngine,
  IExperienceRepository, ILayoutRepository, IHeroRepository, IBannerRepository,
  INavigationRepository, IDashboardRepository, ISearchExperienceRepository,
  IPatternRepository, IPersonalizationRepository, IUXScoreRepository, IAuditRepository,
  Experience, Layout, Hero, Banner, Navigation, Dashboard, SearchExperience, UXPattern,
} from '../interfaces/index.js';

export interface ExperienceUseCaseDeps {
  experienceRepo: IExperienceRepository;
  layoutRepo: ILayoutRepository;
  heroRepo: IHeroRepository;
  bannerRepo: IBannerRepository;
  navigationRepo: INavigationRepository;
  dashboardRepo: IDashboardRepository;
  searchExperienceRepo: ISearchExperienceRepository;
  patternRepo: IPatternRepository;
  personalizationRepo: IPersonalizationRepository;
  uxScoreRepo: IUXScoreRepository;
  auditRepo: IAuditRepository;
  mediaResolver: IMediaReferenceResolver;
  searchIntegration: ISearchIntegration;
  aiEngine: IAIRecommendationEngine;
  eventBus: IEventBus;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: IPolicyProvider;
  idGenerator: IIdGenerator;
  clock: IClock;
}
