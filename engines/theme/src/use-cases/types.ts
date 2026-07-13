/** Theme Engine — Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider, IThemeCompilerProvider,
  IThemeRepository, IBrandRepository, ITokenSetRepository,
  ITokenSystemRepository, IThemeVariantRepository, IResponsiveTokensRepository,
  IWhiteLabelRepository, IThemeAuditRepository,
  TypographyScale, ColorPalette, SpacingSystem, MotionSpec, ElevationSystem,
  // RC2
  ICreativeIntelligenceProvider, IComponentThemeProvider,
  IBrandPersonalityRepository, IBrandVoiceRepository,
  IDesignLanguageRepository, IThemeManifestRepository, IThemeIntelligenceRepository,
} from '../interfaces/index.js';

export interface ThemeUseCaseDeps {
  themeRepo: IThemeRepository;
  brandRepo: IBrandRepository;
  tokenSetRepo: ITokenSetRepository;
  typographyRepo: ITokenSystemRepository<TypographyScale>;
  colorRepo: ITokenSystemRepository<ColorPalette>;
  spacingRepo: ITokenSystemRepository<SpacingSystem>;
  motionRepo: ITokenSystemRepository<MotionSpec>;
  elevationRepo: ITokenSystemRepository<ElevationSystem>;
  variantRepo: IThemeVariantRepository;
  responsiveRepo: IResponsiveTokensRepository;
  whiteLabelRepo: IWhiteLabelRepository;
  auditRepo: IThemeAuditRepository;
  eventBus: IEventBus;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: IPolicyProvider;
  themeCompiler: IThemeCompilerProvider;
  idGenerator: IIdGenerator;
  clock: IClock;
  // RC2: Brand & Design Language
  personalityRepo: IBrandPersonalityRepository;
  voiceRepo: IBrandVoiceRepository;
  designLanguageRepo: IDesignLanguageRepository;
  manifestRepo: IThemeManifestRepository;
  intelligenceRepo: IThemeIntelligenceRepository;
  creativeIntelligenceProvider: ICreativeIntelligenceProvider;
  componentThemeProvider: IComponentThemeProvider;
}
