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

// In-Memory Repositories
export {
  InMemoryThemeRepository, InMemoryBrandRepository, InMemoryTokenSetRepository,
  InMemoryTokenSystemRepository,
  InMemoryThemeVariantRepository, InMemoryResponsiveTokensRepository,
  InMemoryWhiteLabelRepository, InMemoryThemeAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Adapters
export {
  InMemoryOrganizationVerifier, StaticThemePolicyProvider,
  MockThemeCompilerProvider, InMemoryEventBus, type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
