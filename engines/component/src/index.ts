/**
 * Experience Component Engine — Public API
 */

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

// Types
export type {
  ExperienceComponent, ComponentVariant, ComponentPreset, ComponentComposition,
  ComponentSlot, ComponentTokenReference, ComponentState, ComponentInteraction,
  ComponentAnimation, ComponentAccessibility, ComponentScore, ComponentReview,
  ComponentPattern, ComponentBehavior, ComponentVersion, MarketplaceEntry,
  ComponentStatus, ComponentTier, MarketplaceTier,
  ExperienceType, AtomicType, ComponentStateName, AnimationType,
  InteractionType, ResponsiveDevice, ScoreDimension,
  ComponentAuditRecord, ComponentAuditEventType,
  AccessibilityViolation,
  ComponentRenderInput, ComponentRenderOutput,
  AnimationGenerationInput, AnimationGenerationOutput,
  AccessibilityAuditInput, AccessibilityAuditOutput,
  PreviewInput, PreviewOutput,
  AnalyticsEvent, ComponentMetrics,
  LearningInput, LearningOutput,
  // RC2: Theme Manifest Consumer (Sprint B)
  IThemeManifestConsumer, ResolvedManifest, ThemeChangedEvent,
  ExperienceRef, CreativeDirectionRef,
  ComponentOutcomeRef, ComponentSearchResult,
  ComponentRecommendationContext, ComponentRecommendation, ComponentHealth,
} from './interfaces/index.js';

// Interface types
export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  IExperienceProvider, ICreativeIntelligenceProvider,
  ILearningProvider, ISearchProvider, IAIProvider, IRuntimeProvider,
  IComponentRendererProvider, IAnimationProvider, IAccessibilityProvider,
  IPreviewProvider, IAnalyticsProvider, ILearningPluginProvider,
  IComponentRepository, IComponentSubEntityRepository,
  ICompositionRepository, IScoreRepository, IReviewRepository,
  IPatternRepository, IVersionRepository, IMarketplaceRepository,
  IComponentAuditRepository,
} from './interfaces/index.js';

// Use Cases — Lifecycle
export {
  createComponentUseCase, updateComponentUseCase, getComponentUseCase,
  listComponentsUseCase, archiveComponentUseCase, restoreComponentUseCase,
  deleteComponentUseCase, publishComponentUseCase, cloneComponentUseCase,
  createVariantUseCase, updateVariantUseCase, getVariantUseCase, recommendVariantUseCase,
  createPresetUseCase, applyPresetUseCase,
  createVersionUseCase, getVersionHistoryUseCase, rollbackVersionUseCase,
} from './use-cases/ComponentLifecycleUseCases.js';

// Use Cases — Composition & Quality
export {
  composeExperienceUseCase, decomposeExperienceUseCase, validateCompositionUseCase,
  createSlotUseCase, assignSlotUseCase,
  createTokenReferenceUseCase, resolveTokenReferencesUseCase,
  registerStateUseCase, transitionStateUseCase,
  createBehaviorUseCase, assignBehaviorUseCase,
  createAnimationUseCase, createResponsiveRuleUseCase,
  reviewComponentUseCase, calculateComponentScoreUseCase,
  validateAccessibilityUseCase, evaluatePerformanceUseCase,
  createPatternUseCase, getPatternUseCase, listPatternsUseCase,
  improveComponentUseCase,
} from './use-cases/CompositionQualityUseCases.js';

// Use Cases — Intelligence & Marketplace
export {
  learnComponentUseCase, recordComponentOutcomeUseCase,
  recommendComponentUseCase, findBestComponentUseCase, generateComponentReportUseCase,
  registerMarketplaceComponentUseCase, installMarketplaceComponentUseCase,
  listMarketplaceComponentsUseCase,
  type ComponentReport,
} from './use-cases/IntelligenceMarketplaceUseCases.js';

// Use Cases — RC2 Manifest Consumer (Sprint B)
export {
  resolveThemeManifestUseCase,
  subscribeToThemeChangedUseCase, reResolveComponentTokensUseCase,
  recalculateComponentScoresUseCase, regenerateComponentPreviewUseCase,
  createPublishCandidateUseCase, getComponentsByManifestThemeUseCase,
} from './use-cases/ManifestConsumerUseCases.js';

// Events
export { COMPONENT_EVENTS, type ComponentEventType, COMPONENT_EVENT_SCHEMAS } from './domain/events.js';

export type { ComponentUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryComponentRepository, InMemoryVariantRepository, InMemoryPresetRepository,
  InMemorySlotRepository, InMemoryTokenRefRepository, InMemoryStateRepository,
  InMemoryInteractionRepository, InMemoryAnimationRepository,
  InMemoryAccessibilityRepository, InMemoryBehaviorRepository,
  InMemoryCompositionRepository, InMemoryScoreRepository,
  InMemoryReviewRepository, InMemoryPatternRepository,
  InMemoryVersionRepository, InMemoryMarketplaceRepository,
  InMemoryComponentAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Adapters
export {
  InMemoryOrganizationVerifier, StaticComponentPolicyProvider,
  InMemoryEventBus, type RecordedEnvelope,
  MockExperienceProvider, MockThemeManifestConsumer, MockCreativeIntelligenceProvider,
  MockLearningProvider, MockSearchProvider, MockAIProvider, MockRuntimeProvider,
  MockComponentRendererProvider, MockAnimationProvider, MockAccessibilityProvider,
  MockPreviewProvider, MockAnalyticsProvider, MockLearningPluginProvider,
} from './infrastructure/hostAdapters.js';
