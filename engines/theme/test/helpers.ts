/** Test fixtures — Theme Engine */
import type { ThemeUseCaseDeps } from '../src/index.js';
import {
  InMemoryThemeRepository, InMemoryBrandRepository, InMemoryTokenSetRepository,
  InMemoryTokenSystemRepository, InMemoryThemeVariantRepository,
  InMemoryResponsiveTokensRepository, InMemoryWhiteLabelRepository,
  InMemoryThemeAuditRepository,
  InMemoryBrandPersonalityRepository, InMemoryBrandVoiceRepository,
  InMemoryDesignLanguageRepository, InMemoryThemeManifestRepository,
  InMemoryThemeIntelligenceRepository,
  InMemoryOrganizationVerifier, StaticThemePolicyProvider,
  MockThemeCompilerProvider, InMemoryEventBus,
  MockCreativeIntelligenceProvider, MockComponentThemeProvider,
} from '../src/index.js';
import type { TypographyScale, ColorPalette, SpacingSystem, MotionSpec, ElevationSystem } from '../src/index.js';

export function makeClock() { let o = 0; return { now: () => new Date(new Date('2026-07-12T08:00:00.000Z').getTime() + o++ * 1000) }; }

export function makeDeps(): ThemeUseCaseDeps & {
  themeRepo: InMemoryThemeRepository; brandRepo: InMemoryBrandRepository;
  tokenSetRepo: InMemoryTokenSetRepository;
  typographyRepo: InMemoryTokenSystemRepository<TypographyScale>;
  colorRepo: InMemoryTokenSystemRepository<ColorPalette>;
  spacingRepo: InMemoryTokenSystemRepository<SpacingSystem>;
  motionRepo: InMemoryTokenSystemRepository<MotionSpec>;
  elevationRepo: InMemoryTokenSystemRepository<ElevationSystem>;
  variantRepo: InMemoryThemeVariantRepository;
  responsiveRepo: InMemoryResponsiveTokensRepository;
  whiteLabelRepo: InMemoryWhiteLabelRepository;
  auditRepo: InMemoryThemeAuditRepository; eventBus: InMemoryEventBus;
  organizationVerifier: InMemoryOrganizationVerifier; policyProvider: StaticThemePolicyProvider;
  themeCompiler: MockThemeCompilerProvider;
  personalityRepo: InMemoryBrandPersonalityRepository;
  voiceRepo: InMemoryBrandVoiceRepository;
  designLanguageRepo: InMemoryDesignLanguageRepository;
  manifestRepo: InMemoryThemeManifestRepository;
  intelligenceRepo: InMemoryThemeIntelligenceRepository;
  creativeIntelligenceProvider: MockCreativeIntelligenceProvider;
  componentThemeProvider: MockComponentThemeProvider;
} {
  const organizationVerifier = new InMemoryOrganizationVerifier(); organizationVerifier.add('t-1', 'org-1');
  const policyProvider = new StaticThemePolicyProvider(); policyProvider.set('t-1', { maxThemes: 50 });
  let idCounter = 0;
  return {
    themeRepo: new InMemoryThemeRepository(), brandRepo: new InMemoryBrandRepository(),
    tokenSetRepo: new InMemoryTokenSetRepository(),
    typographyRepo: new InMemoryTokenSystemRepository<TypographyScale>(),
    colorRepo: new InMemoryTokenSystemRepository<ColorPalette>(),
    spacingRepo: new InMemoryTokenSystemRepository<SpacingSystem>(),
    motionRepo: new InMemoryTokenSystemRepository<MotionSpec>(),
    elevationRepo: new InMemoryTokenSystemRepository<ElevationSystem>(),
    variantRepo: new InMemoryThemeVariantRepository(),
    responsiveRepo: new InMemoryResponsiveTokensRepository(),
    whiteLabelRepo: new InMemoryWhiteLabelRepository(),
    auditRepo: new InMemoryThemeAuditRepository(), eventBus: new InMemoryEventBus(),
    organizationVerifier, policyProvider, themeCompiler: new MockThemeCompilerProvider(),
    personalityRepo: new InMemoryBrandPersonalityRepository(),
    voiceRepo: new InMemoryBrandVoiceRepository(),
    designLanguageRepo: new InMemoryDesignLanguageRepository(),
    manifestRepo: new InMemoryThemeManifestRepository(),
    intelligenceRepo: new InMemoryThemeIntelligenceRepository(),
    creativeIntelligenceProvider: new MockCreativeIntelligenceProvider(),
    componentThemeProvider: new MockComponentThemeProvider(),
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random()*1e6).toString(36)}` },
    clock: makeClock(),
  } as ReturnType<typeof makeDeps>;
}
