/**
 * Theme Engine — Public API
 */

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

// Types
export type {
  Theme, Brand, TokenSet, TokenEntry, TypographyScale, ColorPalette, SpacingSystem,
  MotionSpec, ElevationSystem, ThemeVariant, ResponsiveTokens, WhiteLabelTheme,
  ThemeStatus, ThemeMode, TokenCategory,
  ThemeCompilationInput, ThemeCompilationOutput,
  ThemeAuditRecord, ThemeAuditEventType,
} from './interfaces/index.js';

// Interface types
export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider, IThemeCompilerProvider,
  IThemeRepository, IBrandRepository, ITokenSetRepository,
  ITokenSystemRepository, IThemeVariantRepository, IResponsiveTokensRepository,
  IWhiteLabelRepository, IThemeAuditRepository,
} from './interfaces/index.js';

// Use Cases
export {
  createThemeUseCase, updateThemeUseCase, getThemeUseCase, listThemesUseCase,
  activateThemeUseCase, archiveThemeUseCase,
  createBrandUseCase, updateBrandUseCase, getBrandUseCase, listBrandsUseCase,
  createTokenSetUseCase, updateTokenSetUseCase, getTokenSetUseCase, listTokenSetsUseCase,
  createTypographyScaleUseCase, getTypographyScaleUseCase,
  createColorPaletteUseCase, getColorPaletteUseCase,
  createSpacingSystemUseCase, getSpacingSystemUseCase,
  createMotionSpecUseCase, getMotionSpecUseCase,
  createElevationSystemUseCase, getElevationSystemUseCase,
  createThemeVariantUseCase, updateThemeVariantUseCase, getThemeVariantUseCase,
  listVariantsUseCase, getDarkModeVariantUseCase, getLightModeVariantUseCase,
  compileThemeUseCase, previewThemeUseCase, exportThemeUseCase, importThemeUseCase,
  createWhiteLabelThemeUseCase, applyWhiteLabelUseCase,
  createResponsiveTokensUseCase, updateResponsiveTokensUseCase, getResponsiveTokensUseCase,
  validateThemeUseCase, calculateThemeScoreUseCase, generateThemeReportUseCase,
} from './use-cases/ThemeUseCases.js';

// Events
export { THEME_EVENTS, type ThemeEventType, THEME_EVENT_SCHEMAS } from './domain/events.js';

export type { ThemeUseCaseDeps } from './use-cases/types.js';

// RC2: Brand & Design Language Use Cases
export {
  createBrandPersonalityUseCase, getBrandPersonalityUseCase,
  createBrandVoiceUseCase, getBrandVoiceUseCase,
  createDesignLanguageUseCase, getDesignLanguageUseCase,
  createThemeManifestUseCase, publishThemeManifestUseCase,
  getThemeManifestUseCase, resolveThemeManifestUseCase,
  generateThemeIntelligenceUseCase, getThemeIntelligenceUseCase,
} from './use-cases/BrandDesignLanguageUseCases.js';

// RC2: Brand & Design Language Types
export type {
  BrandPersonality, BrandVoice, BrandEmotion, DesignLanguage,
  MotionProfile, AccessibilityProfile, ContentStyle, BrandConstraint,
  ThemeManifest, ThemeIntelligence,
  BrandDirectionInput, BrandDirection,
  DensityLevel, WhitespaceLevel, MotionIntensity, WCAGLevel as ThemeWCAGLevel,
  ICreativeIntelligenceProvider, IComponentThemeProvider,
  IBrandPersonalityRepository, IBrandVoiceRepository,
  IDesignLanguageRepository, IThemeManifestRepository, IThemeIntelligenceRepository,
} from './interfaces/index.js';

// In-Memory Repositories
export {
  InMemoryThemeRepository, InMemoryBrandRepository, InMemoryTokenSetRepository,
  InMemoryTokenSystemRepository,
  InMemoryThemeVariantRepository, InMemoryResponsiveTokensRepository,
  InMemoryWhiteLabelRepository, InMemoryThemeAuditRepository,
  // RC2
  InMemoryBrandPersonalityRepository, InMemoryBrandVoiceRepository,
  InMemoryDesignLanguageRepository, InMemoryThemeManifestRepository,
  InMemoryThemeIntelligenceRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Adapters
export {
  InMemoryOrganizationVerifier, StaticThemePolicyProvider,
  MockThemeCompilerProvider, InMemoryEventBus, type RecordedEnvelope,
  // RC2
  MockCreativeIntelligenceProvider, MockComponentThemeProvider,
} from './infrastructure/hostAdapters.js';
