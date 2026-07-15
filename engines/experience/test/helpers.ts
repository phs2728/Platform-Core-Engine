/** Test fixtures — Experience Engine */
import type { ExperienceUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryExperienceRepository, InMemoryLayoutRepository, InMemoryHeroRepository,
  InMemoryBannerRepository, InMemoryNavigationRepository, InMemoryDashboardRepository,
  InMemorySearchExperienceRepository, InMemoryPatternRepository,
  InMemoryPersonalizationRepository, InMemoryUXScoreRepository, InMemoryAuditRepository,
} from '../src/infrastructure/InMemoryRepositories.js';
import {
  InMemoryOrganizationVerifier, StaticExperiencePolicyProvider,
  InMemoryMediaResolver, InMemorySearchIntegration, InMemoryAIEngine, InMemoryEventBus,
} from '../src/infrastructure/hostAdapters.js';

export function makeDeps(): ExperienceUseCaseDeps & {
  experienceRepo: InMemoryExperienceRepository;
  layoutRepo: InMemoryLayoutRepository;
  heroRepo: InMemoryHeroRepository;
  bannerRepo: InMemoryBannerRepository;
  navigationRepo: InMemoryNavigationRepository;
  dashboardRepo: InMemoryDashboardRepository;
  searchExperienceRepo: InMemorySearchExperienceRepository;
  patternRepo: InMemoryPatternRepository;
  personalizationRepo: InMemoryPersonalizationRepository;
  uxScoreRepo: InMemoryUXScoreRepository;
  auditRepo: InMemoryAuditRepository;
  mediaResolver: InMemoryMediaResolver;
  searchIntegration: InMemorySearchIntegration;
  aiEngine: InMemoryAIEngine;
  organizationVerifier: InMemoryOrganizationVerifier;
  policyProvider: StaticExperiencePolicyProvider;
  eventBus: InMemoryEventBus;
} {
  const orgVerifier = new InMemoryOrganizationVerifier();
  orgVerifier.add('tenant-test', 'org-test');
  return {
    experienceRepo: new InMemoryExperienceRepository(),
    layoutRepo: new InMemoryLayoutRepository(),
    heroRepo: new InMemoryHeroRepository(),
    bannerRepo: new InMemoryBannerRepository(),
    navigationRepo: new InMemoryNavigationRepository(),
    dashboardRepo: new InMemoryDashboardRepository(),
    searchExperienceRepo: new InMemorySearchExperienceRepository(),
    patternRepo: new InMemoryPatternRepository(),
    personalizationRepo: new InMemoryPersonalizationRepository(),
    uxScoreRepo: new InMemoryUXScoreRepository(),
    auditRepo: new InMemoryAuditRepository(),
    mediaResolver: new InMemoryMediaResolver(),
    searchIntegration: new InMemorySearchIntegration(),
    aiEngine: new InMemoryAIEngine(),
    organizationVerifier: orgVerifier,
    policyProvider: new StaticExperiencePolicyProvider(),
    eventBus: new InMemoryEventBus(),
    idGenerator: { generate: () => `id-${Math.random().toString(36).slice(2, 10)}` },
    clock: { now: () => new Date('2026-07-14T00:00:00.000Z') },
  };
}
