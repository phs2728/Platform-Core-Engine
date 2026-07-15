/**
 * Experience Engine — Public API
 *
 * Phase 6: UX Standardization.
 *   Defines all UX models across the platform.
 *   NOT a UI framework — data models only.
 */
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

export type {
  Experience, Layout, GridLayoutConfig, Hero, Banner, Navigation, NavigationItem,
  Dashboard, DashboardWidget, SearchExperience, SearchFeatures,
  UXPattern, ResponsiveProfile, AccessibilityProfile, AnimationProfile,
  PersonalizationProfile, UXScore, CTA, Section,
  ExperienceStatus, LayoutType, NavigationType, BannerType, CTAType, SectionType,
  DeviceType, Breakpoint, MediaReference, RecommendationResult,
  ExperienceSearchCriteria, ExperienceSearchResult,
  ExperienceAuditRecord, ExperienceAuditEventType,
} from './interfaces/index.js';

export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  IMediaReferenceResolver, ISearchIntegration, IAIRecommendationEngine,
  IExperienceRepository, ILayoutRepository, IHeroRepository, IBannerRepository,
  INavigationRepository, IDashboardRepository, ISearchExperienceRepository,
  IPatternRepository, IPersonalizationRepository, IUXScoreRepository, IAuditRepository,
} from './interfaces/index.js';

export {
  createExperienceUseCase, updateExperienceUseCase, deleteExperienceUseCase,
  archiveExperienceUseCase, restoreExperienceUseCase,
  getExperienceUseCase, listExperiencesUseCase, searchExperiencesUseCase,
} from './use-cases/ExperienceUseCases.js';

export {
  createLayoutUseCase, updateLayoutUseCase, publishLayoutUseCase,
  cloneLayoutUseCase, validateLayoutUseCase,
  createHeroUseCase, updateHeroUseCase, publishHeroUseCase,
  createBannerUseCase, updateBannerUseCase, publishBannerUseCase,
  createNavigationUseCase, updateNavigationUseCase, publishNavigationUseCase,
  createDashboardUseCase, updateDashboardUseCase, publishDashboardUseCase,
} from './use-cases/ComponentUseCases.js';

export {
  validateExperienceUseCase, calculateUXScoreUseCase,
  createSearchExperienceUseCase, updateSearchExperienceUseCase, publishSearchExperienceUseCase,
  createPersonalizationUseCase, updatePersonalizationUseCase,
  registerPatternUseCase, publishPatternUseCase, clonePatternUseCase,
  recommendExperienceUseCase,
} from './use-cases/UXPatternUseCases.js';

export { EXPERIENCE_EVENTS, type ExperienceEventType, EXPERIENCE_EVENT_SCHEMAS } from './domain/events.js';

export type { ExperienceUseCaseDeps } from './use-cases/types.js';

export {
  InMemoryExperienceRepository, InMemoryLayoutRepository, InMemoryHeroRepository,
  InMemoryBannerRepository, InMemoryNavigationRepository, InMemoryDashboardRepository,
  InMemorySearchExperienceRepository, InMemoryPatternRepository,
  InMemoryPersonalizationRepository, InMemoryUXScoreRepository, InMemoryAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

export {
  InMemoryOrganizationVerifier, StaticExperiencePolicyProvider,
  InMemoryMediaResolver, InMemorySearchIntegration, InMemoryAIEngine,
  InMemoryEventBus, type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
