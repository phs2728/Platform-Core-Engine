/** Example helpers — Component Engine */
import type { ComponentUseCaseDeps } from '../src/index.js';
import {
  InMemoryComponentRepository, InMemoryVariantRepository, InMemoryPresetRepository,
  InMemorySlotRepository, InMemoryTokenRefRepository, InMemoryStateRepository,
  InMemoryInteractionRepository, InMemoryAnimationRepository,
  InMemoryAccessibilityRepository, InMemoryBehaviorRepository,
  InMemoryCompositionRepository, InMemoryScoreRepository,
  InMemoryReviewRepository, InMemoryPatternRepository,
  InMemoryVersionRepository, InMemoryMarketplaceRepository,
  InMemoryComponentAuditRepository,
  InMemoryOrganizationVerifier, StaticComponentPolicyProvider, InMemoryEventBus,
  MockExperienceProvider, MockThemeManifestConsumer, MockCreativeIntelligenceProvider,
  MockLearningProvider, MockSearchProvider, MockAIProvider, MockRuntimeProvider,
  MockComponentRendererProvider, MockAnimationProvider, MockAccessibilityProvider,
  MockPreviewProvider, MockAnalyticsProvider, MockLearningPluginProvider,
} from '../src/index.js';
import type { Result } from '../src/index.js';

export function makeDemoDeps(): ComponentUseCaseDeps {
  const organizationVerifier = new InMemoryOrganizationVerifier();
  organizationVerifier.add('t-1', 'org-1');
  const policyProvider = new StaticComponentPolicyProvider();
  policyProvider.set('t-1', { maxComponents: 100 });
  const themeManifestConsumer = new MockThemeManifestConsumer();
  themeManifestConsumer.set('t-1', 'theme-1', {
    manifestId: 'manifest-1', themeId: 'theme-1', brandId: 'brand-1', version: '1.0.0',
    resolvedTokens: { '--brand-whitespace': 'medium', '--color.primary': '#7c2d3a' },
    manifestHash: 'hash-test',
  });
  let idCounter = 0;
  return {
    componentRepo: new InMemoryComponentRepository(),
    variantRepo: new InMemoryVariantRepository(),
    presetRepo: new InMemoryPresetRepository(),
    slotRepo: new InMemorySlotRepository(),
    tokenRefRepo: new InMemoryTokenRefRepository(),
    stateRepo: new InMemoryStateRepository(),
    interactionRepo: new InMemoryInteractionRepository(),
    animationRepo: new InMemoryAnimationRepository(),
    accessibilityRepo: new InMemoryAccessibilityRepository(),
    behaviorRepo: new InMemoryBehaviorRepository(),
    compositionRepo: new InMemoryCompositionRepository(),
    scoreRepo: new InMemoryScoreRepository(),
    reviewRepo: new InMemoryReviewRepository(),
    patternRepo: new InMemoryPatternRepository(),
    versionRepo: new InMemoryVersionRepository(),
    marketplaceRepo: new InMemoryMarketplaceRepository(),
    auditRepo: new InMemoryComponentAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier, policyProvider,
    experienceProvider: new MockExperienceProvider(),
    themeManifestConsumer,
    creativeIntelligenceProvider: new MockCreativeIntelligenceProvider(),
    learningProvider: new MockLearningProvider(),
    searchProvider: new MockSearchProvider(),
    aiProvider: new MockAIProvider(),
    runtimeProvider: new MockRuntimeProvider(),
    rendererProvider: new MockComponentRendererProvider(),
    animationProvider: new MockAnimationProvider(),
    accessibilityProvider: new MockAccessibilityProvider(),
    previewProvider: new MockPreviewProvider(),
    analyticsProvider: new MockAnalyticsProvider(),
    learningPluginProvider: new MockLearningPluginProvider(),
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}` },
    clock: { now: () => new Date('2026-07-13T08:00:00.000Z') },
  };
}

export function unwrap<T>(r: Result<T, Error>): T {
  if (!r.ok) throw new Error(`Expected Ok but got Err: ${JSON.stringify(r.error)}`);
  return r.value;
}

export const base = {
  tenantId: 't-1',
  organizationId: 'org-1',
  correlationId: 'demo-corr-1',
  actorId: 'demo-user',
};
