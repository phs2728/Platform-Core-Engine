/** Component Engine — Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  IExperienceProvider, IThemeProvider, ICreativeIntelligenceProvider,
  ILearningProvider, ISearchProvider, IAIProvider, IRuntimeProvider,
  IComponentRendererProvider, IAnimationProvider, IAccessibilityProvider,
  IPreviewProvider, IAnalyticsProvider, ILearningPluginProvider,
  IComponentRepository, IComponentSubEntityRepository,
  ICompositionRepository, IScoreRepository, IReviewRepository,
  IPatternRepository, IVersionRepository, IMarketplaceRepository,
  IComponentAuditRepository,
  ComponentVariant, ComponentPreset, ComponentSlot, ComponentTokenReference,
  ComponentState, ComponentInteraction, ComponentAnimation,
  ComponentAccessibility, ComponentBehavior,
} from '../interfaces/index.js';

export interface ComponentUseCaseDeps {
  componentRepo: IComponentRepository;
  variantRepo: IComponentSubEntityRepository<ComponentVariant>;
  presetRepo: IComponentSubEntityRepository<ComponentPreset>;
  slotRepo: IComponentSubEntityRepository<ComponentSlot>;
  tokenRefRepo: IComponentSubEntityRepository<ComponentTokenReference>;
  stateRepo: IComponentSubEntityRepository<ComponentState>;
  interactionRepo: IComponentSubEntityRepository<ComponentInteraction>;
  animationRepo: IComponentSubEntityRepository<ComponentAnimation>;
  accessibilityRepo: IComponentSubEntityRepository<ComponentAccessibility>;
  behaviorRepo: IComponentSubEntityRepository<ComponentBehavior>;
  compositionRepo: ICompositionRepository;
  scoreRepo: IScoreRepository;
  reviewRepo: IReviewRepository;
  patternRepo: IPatternRepository;
  versionRepo: IVersionRepository;
  marketplaceRepo: IMarketplaceRepository;
  auditRepo: IComponentAuditRepository;
  eventBus: IEventBus;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: IPolicyProvider;
  experienceProvider: IExperienceProvider;
  themeProvider: IThemeProvider;
  creativeIntelligenceProvider: ICreativeIntelligenceProvider;
  learningProvider: ILearningProvider;
  searchProvider: ISearchProvider;
  aiProvider: IAIProvider;
  runtimeProvider: IRuntimeProvider;
  rendererProvider: IComponentRendererProvider;
  animationProvider: IAnimationProvider;
  accessibilityProvider: IAccessibilityProvider;
  previewProvider: IPreviewProvider;
  analyticsProvider: IAnalyticsProvider;
  learningPluginProvider: ILearningPluginProvider;
  idGenerator: IIdGenerator;
  clock: IClock;
}
