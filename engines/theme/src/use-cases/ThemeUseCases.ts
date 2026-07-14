/**
 * Theme Engine — Core Use Cases
 *
 * Theme CRUD + lifecycle, Brand, TokenSet, Typography/Color/Spacing/Motion/Elevation,
 * Variant, ResponsiveTokens, WhiteLabel, Compile, Validate, Score, Report
 */
import { Ok, Err, type Result, ValidationError, ConflictError, NotFoundError, z } from '@platform/core-sdk';
import {
  createThemeSchema, updateThemeSchema, themeActionSchema,
  createBrandSchema, createTokenSetSchema, createTypographySchema, createColorSchema,
  createSpacingSchema, createMotionSchema, createElevationSchema,
  createVariantSchema, compileThemeSchema, createWhiteLabelSchema, createResponsiveSchema,
} from '../domain/validation.js';
import { THEME_EVENTS, THEME_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { ThemeUseCaseDeps } from './types.js';
import type {
  Theme, Brand, TokenSet, TypographyScale, ColorPalette, SpacingSystem,
  MotionSpec, ElevationSystem, ThemeVariant, ResponsiveTokens, WhiteLabelTheme,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// THEME (7)
// ═══════════════════════════════════════════

export async function createThemeUseCase(
  input: z.infer<typeof createThemeSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ themeId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createThemeSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  if (await deps.themeRepo.existsBySlug(d.tenantId, d.slug)) return Err(new ConflictError('slug already exists'));
  const maxThemes = await deps.policyProvider.getMaxThemesPerOrg(d.tenantId);
  const current = await deps.themeRepo.countByOrganization(d.tenantId, d.organizationId);
  if (current >= maxThemes) return Err(new ConflictError(`Max themes (${maxThemes}) reached`));

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const theme: Theme = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, name: d.name, slug: d.slug,
    description: d.description ?? '', status: 'Draft', brandId: null, tokenSetIds: [], variantIds: [],
    defaultMode: d.defaultMode ?? 'Light', isWhiteLabel: false, parentThemeId: null,
    attributes: {}, createdAt: now, createdBy: d.actorId, updatedAt: now,
  };
  await deps.themeRepo.insert(theme);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, THEME_EVENTS.THEME_CREATED, THEME_EVENT_SCHEMAS['theme.created'], { themeId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_created', { name: d.name }, id);
  return Ok({ themeId: id, createdAt: now });
}

export async function updateThemeUseCase(
  input: z.infer<typeof updateThemeSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ themeId: string }, ValidationError | NotFoundError>> {
  const v = updateThemeSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<Theme> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.description !== undefined) patch.description = d.description;
  await deps.themeRepo.update(d.tenantId, d.themeId, patch);
  await deps.eventBus.emit(envelope(deps, d.themeId, d.tenantId, d.correlationId, THEME_EVENTS.THEME_UPDATED, THEME_EVENT_SCHEMAS['theme.updated'], { themeId: d.themeId }));
  await auditLog(deps, t.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_updated', {}, d.themeId);
  return Ok({ themeId: d.themeId });
}

export async function getThemeUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<Theme, NotFoundError>> {
  const t = await deps.themeRepo.findById(tenantId, themeId);
  if (!t) return Err(new NotFoundError('Theme not found'));
  return Ok(t);
}

export async function listThemesUseCase(tenantId: string, deps: ThemeUseCaseDeps): Promise<Result<Theme[], NotFoundError>> {
  return Ok(await deps.themeRepo.findAll(tenantId));
}

export async function activateThemeUseCase(
  input: z.infer<typeof themeActionSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ themeId: string; activated: boolean }, ValidationError | NotFoundError>> {
  const v = themeActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const now = deps.clock.now().toISOString();
  await deps.themeRepo.update(d.tenantId, d.themeId, { status: 'Active', updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.themeId, d.tenantId, d.correlationId, THEME_EVENTS.THEME_ACTIVATED, THEME_EVENT_SCHEMAS['theme.activated'], { themeId: d.themeId }));
  await auditLog(deps, t.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_activated', {}, d.themeId);
  return Ok({ themeId: d.themeId, activated: true });
}

export async function archiveThemeUseCase(
  input: z.infer<typeof themeActionSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ themeId: string }, ValidationError | NotFoundError>> {
  const v = themeActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const now = deps.clock.now().toISOString();
  await deps.themeRepo.update(d.tenantId, d.themeId, { status: 'Archived', updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.themeId, d.tenantId, d.correlationId, THEME_EVENTS.THEME_ARCHIVED, THEME_EVENT_SCHEMAS['theme.archived'], { themeId: d.themeId }));
  await auditLog(deps, t.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_archived', {}, d.themeId);
  return Ok({ themeId: d.themeId });
}

// ═══════════════════════════════════════════
// BRAND (3)
// ═══════════════════════════════════════════

export async function createBrandUseCase(
  input: z.infer<typeof createBrandSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ brandId: string }, ValidationError>> {
  const v = createBrandSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } })); const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const brand: Brand = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, name: d.name,
    personality: d.personality, voice: d.voice, logoRef: null, faviconRef: null,
    primaryColor: d.primaryColor, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.brandRepo.insert(brand);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, THEME_EVENTS.BRAND_CREATED, THEME_EVENT_SCHEMAS['brand.created'], { brandId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'brand_created', { name: d.name });
  return Ok({ brandId: id });
}

export async function updateBrandUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; brandId: string; name?: string; voice?: string; primaryColor?: string }, deps: ThemeUseCaseDeps,
): Promise<Result<{ brandId: string }, NotFoundError>> {
  const b = await deps.brandRepo.findById(input.tenantId, input.brandId);
  if (!b) return Err(new NotFoundError('Brand not found'));
  const patch: Partial<Brand> = { updatedAt: deps.clock.now().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.voice !== undefined) patch.voice = input.voice;
  if (input.primaryColor !== undefined) patch.primaryColor = input.primaryColor;
  await deps.brandRepo.update(input.tenantId, input.brandId, patch);
  await deps.eventBus.emit(envelope(deps, input.brandId, input.tenantId, input.correlationId, THEME_EVENTS.BRAND_UPDATED, THEME_EVENT_SCHEMAS['brand.updated'], { brandId: input.brandId }));
  return Ok({ brandId: input.brandId });
}

export async function getBrandUseCase(tenantId: string, brandId: string, deps: ThemeUseCaseDeps): Promise<Result<Brand, NotFoundError>> {
  const b = await deps.brandRepo.findById(tenantId, brandId);
  if (!b) return Err(new NotFoundError('Brand not found'));
  return Ok(b);
}

export async function listBrandsUseCase(tenantId: string, organizationId: string, deps: ThemeUseCaseDeps): Promise<Result<Brand[], NotFoundError>> {
  return Ok(await deps.brandRepo.findByOrganization(tenantId, organizationId));
}

// ═══════════════════════════════════════════
// TOKEN SET (4)
// ═══════════════════════════════════════════

export async function createTokenSetUseCase(
  input: z.infer<typeof createTokenSetSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ tokenSetId: string }, ValidationError | NotFoundError>> {
  const v = createTokenSetSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } })); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const ts: TokenSet = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, themeId: d.themeId,
    category: d.category, name: d.name, tokens: d.tokens, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.tokenSetRepo.insert(ts);
  await deps.themeRepo.update(d.tenantId, d.themeId, { tokenSetIds: [...t.tokenSetIds, id], updatedAt: now });
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, THEME_EVENTS.TOKENSET_CREATED, THEME_EVENT_SCHEMAS['tokenset.created'], { tokenSetId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'tokenset_created', { category: d.category }, d.themeId);
  return Ok({ tokenSetId: id });
}

export async function updateTokenSetUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; tokenSetId: string; name?: string; tokens?: { key: string; value: string; description: string }[] }, deps: ThemeUseCaseDeps,
): Promise<Result<{ tokenSetId: string }, NotFoundError>> {
  const ts = await deps.tokenSetRepo.findById(input.tenantId, input.tokenSetId);
  if (!ts) return Err(new NotFoundError('TokenSet not found'));
  const patch: Partial<TokenSet> = { updatedAt: deps.clock.now().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.tokens !== undefined) patch.tokens = input.tokens;
  await deps.tokenSetRepo.update(input.tenantId, input.tokenSetId, patch);
  await deps.eventBus.emit(envelope(deps, input.tokenSetId, input.tenantId, input.correlationId, THEME_EVENTS.TOKENSET_UPDATED, THEME_EVENT_SCHEMAS['tokenset.updated'], { tokenSetId: input.tokenSetId }));
  return Ok({ tokenSetId: input.tokenSetId });
}

export async function getTokenSetUseCase(tenantId: string, tokenSetId: string, deps: ThemeUseCaseDeps): Promise<Result<TokenSet, NotFoundError>> {
  const ts = await deps.tokenSetRepo.findById(tenantId, tokenSetId);
  if (!ts) return Err(new NotFoundError('TokenSet not found'));
  return Ok(ts);
}

export async function listTokenSetsUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<TokenSet[], NotFoundError>> {
  return Ok(await deps.tokenSetRepo.findByTheme(tenantId, themeId));
}

// ═══════════════════════════════════════════
// TOKEN SYSTEMS (Typography/Color/Spacing/Motion/Elevation) (10)
// ═══════════════════════════════════════════

export async function createTypographyScaleUseCase(
  input: z.infer<typeof createTypographySchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ typographyId: string }, ValidationError | NotFoundError>> {
  const v = createTypographySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const entity: TypographyScale = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, themeId: d.themeId,
    fontFamilies: d.fontFamilies, sizes: d.sizes, baseSize: d.baseSize, scaleRatio: d.scaleRatio,
    attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.typographyRepo.insert(entity);
  return Ok({ typographyId: id });
}

export async function getTypographyScaleUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<TypographyScale, NotFoundError>> {
  const e = await deps.typographyRepo.findByTheme(tenantId, themeId);
  if (!e) return Err(new NotFoundError('Typography scale not found'));
  return Ok(e);
}

export async function createColorPaletteUseCase(
  input: z.infer<typeof createColorSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ colorId: string }, ValidationError | NotFoundError>> {
  const v = createColorSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const entity: ColorPalette = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, themeId: d.themeId,
    primary: d.primary, secondary: d.secondary, accent: d.accent, neutral: d.neutral,
    background: d.background, foreground: d.foreground, shades: d.shades, semantic: d.semantic,
    attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.colorRepo.insert(entity);
  return Ok({ colorId: id });
}

export async function getColorPaletteUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<ColorPalette, NotFoundError>> {
  const e = await deps.colorRepo.findByTheme(tenantId, themeId);
  if (!e) return Err(new NotFoundError('Color palette not found'));
  return Ok(e);
}

export async function createSpacingSystemUseCase(
  input: z.infer<typeof createSpacingSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ spacingId: string }, ValidationError | NotFoundError>> {
  const v = createSpacingSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const entity: SpacingSystem = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, themeId: d.themeId,
    baseUnit: d.baseUnit, scale: d.scale, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.spacingRepo.insert(entity);
  return Ok({ spacingId: id });
}

export async function getSpacingSystemUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<SpacingSystem, NotFoundError>> {
  const e = await deps.spacingRepo.findByTheme(tenantId, themeId);
  if (!e) return Err(new NotFoundError('Spacing system not found'));
  return Ok(e);
}

export async function createMotionSpecUseCase(
  input: z.infer<typeof createMotionSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ motionId: string }, ValidationError | NotFoundError>> {
  const v = createMotionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const entity: MotionSpec = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, themeId: d.themeId,
    durations: d.durations, easings: d.easings, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.motionRepo.insert(entity);
  return Ok({ motionId: id });
}

export async function getMotionSpecUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<MotionSpec, NotFoundError>> {
  const e = await deps.motionRepo.findByTheme(tenantId, themeId);
  if (!e) return Err(new NotFoundError('Motion spec not found'));
  return Ok(e);
}

export async function createElevationSystemUseCase(
  input: z.infer<typeof createElevationSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ elevationId: string }, ValidationError | NotFoundError>> {
  const v = createElevationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const entity: ElevationSystem = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, themeId: d.themeId,
    levels: d.levels, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.elevationRepo.insert(entity);
  return Ok({ elevationId: id });
}

export async function getElevationSystemUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<ElevationSystem, NotFoundError>> {
  const e = await deps.elevationRepo.findByTheme(tenantId, themeId);
  if (!e) return Err(new NotFoundError('Elevation system not found'));
  return Ok(e);
}

// ═══════════════════════════════════════════
// VARIANT (5)
// ═══════════════════════════════════════════

export async function createThemeVariantUseCase(
  input: z.infer<typeof createVariantSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ variantId: string }, ValidationError | NotFoundError>> {
  const v = createVariantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const variant: ThemeVariant = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, themeId: d.themeId,
    mode: d.mode, tokenOverrides: d.tokenOverrides, isDefault: d.isDefault ?? false,
    attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.variantRepo.insert(variant);
  await deps.themeRepo.update(d.tenantId, d.themeId, { variantIds: [...t.variantIds, id], updatedAt: now });
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, THEME_EVENTS.VARIANT_CREATED, THEME_EVENT_SCHEMAS['variant.created'], { variantId: id, mode: d.mode }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'variant_created', { mode: d.mode }, d.themeId);
  return Ok({ variantId: id });
}

export async function updateThemeVariantUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; variantId: string; tokenOverrides?: Record<string, string>; isDefault?: boolean }, deps: ThemeUseCaseDeps,
): Promise<Result<{ variantId: string }, NotFoundError>> {
  const v = await deps.variantRepo.findById(input.tenantId, input.variantId);
  if (!v) return Err(new NotFoundError('Variant not found'));
  const patch: Partial<ThemeVariant> = { updatedAt: deps.clock.now().toISOString() };
  if (input.tokenOverrides !== undefined) patch.tokenOverrides = input.tokenOverrides;
  if (input.isDefault !== undefined) patch.isDefault = input.isDefault;
  await deps.variantRepo.update(input.tenantId, input.variantId, patch);
  await deps.eventBus.emit(envelope(deps, input.variantId, input.tenantId, input.correlationId, THEME_EVENTS.VARIANT_UPDATED, THEME_EVENT_SCHEMAS['variant.updated'], { variantId: input.variantId }));
  return Ok({ variantId: input.variantId });
}

export async function getThemeVariantUseCase(tenantId: string, variantId: string, deps: ThemeUseCaseDeps): Promise<Result<ThemeVariant, NotFoundError>> {
  const v = await deps.variantRepo.findById(tenantId, variantId);
  if (!v) return Err(new NotFoundError('Variant not found'));
  return Ok(v);
}

export async function listVariantsUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<ThemeVariant[], NotFoundError>> {
  return Ok(await deps.variantRepo.findByTheme(tenantId, themeId));
}

export async function getDarkModeVariantUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<ThemeVariant, NotFoundError>> {
  const v = await deps.variantRepo.findByMode(tenantId, themeId, 'Dark');
  if (!v) return Err(new NotFoundError('Dark mode variant not found'));
  return Ok(v);
}

export async function getLightModeVariantUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<ThemeVariant, NotFoundError>> {
  const v = await deps.variantRepo.findByMode(tenantId, themeId, 'Light');
  if (!v) return Err(new NotFoundError('Light mode variant not found'));
  return Ok(v);
}

// ═══════════════════════════════════════════
// COMPILE / EXPORT / IMPORT (4)
// ═══════════════════════════════════════════

export async function compileThemeUseCase(
  input: z.infer<typeof compileThemeSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ compiled: string; tokenCount: number; format: string }, ValidationError | NotFoundError>> {
  const v = compileThemeSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));

  // Gather all tokens
  const tokenSets = await deps.tokenSetRepo.findByTheme(d.tenantId, d.themeId);
  const tokens: Record<string, string> = {};
  for (const ts of tokenSets) for (const tok of ts.tokens) tokens[tok.key] = tok.value;

  // Add color palette tokens
  const colors = await deps.colorRepo.findByTheme(d.tenantId, d.themeId);
  if (colors) { tokens['--color-primary'] = colors.primary; tokens['--color-secondary'] = colors.secondary; tokens['--color-accent'] = colors.accent; }

  // Add spacing tokens
  const spacing = await deps.spacingRepo.findByTheme(d.tenantId, d.themeId);
  if (spacing) { tokens['--spacing-base'] = spacing.baseUnit; for (const s of spacing.scale) tokens[`--spacing-${s.name}`] = s.value; }

  const format = d.format ?? 'css';
  const result = await deps.themeCompiler.compile({ themeId: d.themeId, themeName: t.name, tokens, format });
  if (!result.ok) return Err(new ValidationError('Compilation failed'));

  await deps.eventBus.emit(envelope(deps, d.themeId, d.tenantId, d.correlationId, THEME_EVENTS.THEME_COMPILED, THEME_EVENT_SCHEMAS['theme.compiled'], { format, tokenCount: result.value.tokenCount }));
  await auditLog(deps, t.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_compiled', { format, tokenCount: result.value.tokenCount }, d.themeId);
  return Ok({ compiled: result.value.compiled, tokenCount: result.value.tokenCount, format });
}

export async function previewThemeUseCase(
  input: z.infer<typeof compileThemeSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ preview: string }, ValidationError | NotFoundError>> {
  const r = await compileThemeUseCase(input, deps);
  if (!r.ok) return Err(r.error);
  return Ok({ preview: r.value.compiled });
}

export async function exportThemeUseCase(
  input: z.infer<typeof themeActionSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ exported: Record<string, unknown>; themeId: string }, ValidationError | NotFoundError>> {
  const v = themeActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));

  const tokenSets = await deps.tokenSetRepo.findByTheme(d.tenantId, d.themeId);
  const variants = await deps.variantRepo.findByTheme(d.tenantId, d.themeId);
  const typography = await deps.typographyRepo.findByTheme(d.tenantId, d.themeId);
  const colors = await deps.colorRepo.findByTheme(d.tenantId, d.themeId);
  const spacing = await deps.spacingRepo.findByTheme(d.tenantId, d.themeId);
  const motion = await deps.motionRepo.findByTheme(d.tenantId, d.themeId);
  const elevation = await deps.elevationRepo.findByTheme(d.tenantId, d.themeId);

  const exported = { theme: t, tokenSets, variants, typography, colors, spacing, motion, elevation };
  await deps.eventBus.emit(envelope(deps, d.themeId, d.tenantId, d.correlationId, THEME_EVENTS.THEME_EXPORTED, THEME_EVENT_SCHEMAS['theme.exported'], { themeId: d.themeId }));
  await auditLog(deps, t.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_exported', {}, d.themeId);
  return Ok({ exported, themeId: d.themeId });
}

export async function importThemeUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; data: Record<string, unknown>; slug: string; name: string }, deps: ThemeUseCaseDeps,
): Promise<Result<{ themeId: string }, ValidationError | ConflictError>> {
  // Create a new theme from imported data
  const r = await createThemeUseCase({ tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId, organizationId: input.organizationId, name: input.name, slug: input.slug }, deps);
  if (!r.ok) return Err(r.error);
  await deps.eventBus.emit(envelope(deps, r.value.themeId, input.tenantId, input.correlationId, THEME_EVENTS.THEME_IMPORTED, THEME_EVENT_SCHEMAS['theme.imported'], { themeId: r.value.themeId }));
  return Ok({ themeId: r.value.themeId });
}

// ═══════════════════════════════════════════
// WHITE LABEL (2)
// ═══════════════════════════════════════════

export async function createWhiteLabelThemeUseCase(
  input: z.infer<typeof createWhiteLabelSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ whiteLabelId: string }, ValidationError | NotFoundError>> {
  const v = createWhiteLabelSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const baseTheme = await deps.themeRepo.findById(d.tenantId, d.baseThemeId);
  if (!baseTheme) return Err(new NotFoundError('Base theme not found'));

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const wl: WhiteLabelTheme = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, baseThemeId: d.baseThemeId,
    overrides: d.overrides, isActive: true, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.whiteLabelRepo.insert(wl);
  return Ok({ whiteLabelId: id });
}

export async function applyWhiteLabelUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; whiteLabelId: string }, deps: ThemeUseCaseDeps,
): Promise<Result<{ applied: boolean }, NotFoundError>> {
  const wl = await deps.whiteLabelRepo.findById(input.tenantId, input.whiteLabelId);
  if (!wl) return Err(new NotFoundError('White label not found'));
  await deps.whiteLabelRepo.update(input.tenantId, input.whiteLabelId, { isActive: true, updatedAt: deps.clock.now().toISOString() });
  return Ok({ applied: true });
}

// ═══════════════════════════════════════════
// RESPONSIVE TOKENS (2)
// ═══════════════════════════════════════════

export async function createResponsiveTokensUseCase(
  input: z.infer<typeof createResponsiveSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ responsiveId: string }, ValidationError | NotFoundError>> {
  const v = createResponsiveSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const rt: ResponsiveTokens = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, themeId: d.themeId,
    breakpoint: d.breakpoint, tokenOverrides: d.tokenOverrides, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.responsiveRepo.insert(rt);
  return Ok({ responsiveId: id });
}

export async function updateResponsiveTokensUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; responsiveId: string; tokenOverrides?: Record<string, string> }, deps: ThemeUseCaseDeps,
): Promise<Result<{ responsiveId: string }, NotFoundError>> {
  const rt = await deps.responsiveRepo.findById(input.tenantId, input.responsiveId);
  if (!rt) return Err(new NotFoundError('Responsive tokens not found'));
  const patch: Partial<ResponsiveTokens> = { updatedAt: deps.clock.now().toISOString() };
  if (input.tokenOverrides !== undefined) patch.tokenOverrides = input.tokenOverrides;
  await deps.responsiveRepo.update(input.tenantId, input.responsiveId, patch);
  return Ok({ responsiveId: input.responsiveId });
}

export async function getResponsiveTokensUseCase(tenantId: string, themeId: string, deps: ThemeUseCaseDeps): Promise<Result<ResponsiveTokens[], NotFoundError>> {
  return Ok(await deps.responsiveRepo.findByTheme(tenantId, themeId));
}

// ═══════════════════════════════════════════
// VALIDATE / SCORE / REPORT (3)
// ═══════════════════════════════════════════

export async function validateThemeUseCase(
  input: z.infer<typeof themeActionSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ valid: boolean; errors: string[]; warnings: string[] }, ValidationError | NotFoundError>> {
  const v = themeActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));

  const errors: string[] = [];
  const warnings: string[] = [];

  const tokenSets = await deps.tokenSetRepo.findByTheme(d.tenantId, d.themeId);
  const colors = await deps.colorRepo.findByTheme(d.tenantId, d.themeId);
  const spacing = await deps.spacingRepo.findByTheme(d.tenantId, d.themeId);
  const typography = await deps.typographyRepo.findByTheme(d.tenantId, d.themeId);

  if (tokenSets.length === 0) warnings.push('No token sets defined');
  if (!colors) errors.push('No color palette defined');
  if (!spacing) warnings.push('No spacing system defined');
  if (!typography) warnings.push('No typography scale defined');

  // Check for contrast issues (simplified)
  if (colors) {
    if (colors.background === colors.foreground) errors.push('Background and foreground colors are identical');
  }

  const valid = errors.length === 0;
  await deps.eventBus.emit(envelope(deps, d.themeId, d.tenantId, d.correlationId, THEME_EVENTS.THEME_VALIDATED, THEME_EVENT_SCHEMAS['theme.validated'], { valid, errorCount: errors.length }));
  await auditLog(deps, t.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_validated', { valid }, d.themeId);
  return Ok({ valid, errors, warnings });
}

export async function calculateThemeScoreUseCase(
  input: z.infer<typeof themeActionSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ score: number; breakdown: Record<string, number> }, ValidationError | NotFoundError>> {
  const v = themeActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));

  const tokenSets = await deps.tokenSetRepo.findByTheme(d.tenantId, d.themeId);
  const colors = await deps.colorRepo.findByTheme(d.tenantId, d.themeId);
  const spacing = await deps.spacingRepo.findByTheme(d.tenantId, d.themeId);
  const typography = await deps.typographyRepo.findByTheme(d.tenantId, d.themeId);
  const motion = await deps.motionRepo.findByTheme(d.tenantId, d.themeId);
  const elevation = await deps.elevationRepo.findByTheme(d.tenantId, d.themeId);
  const variants = await deps.variantRepo.findByTheme(d.tenantId, d.themeId);

  const breakdown: Record<string, number> = {
    tokenSets: Math.min(20, tokenSets.length * 4),
    colors: colors ? 20 : 0,
    spacing: spacing ? 15 : 0,
    typography: typography ? 15 : 0,
    motion: motion ? 10 : 0,
    elevation: elevation ? 10 : 0,
    variants: Math.min(10, variants.length * 5),
  };
  const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));

  await deps.eventBus.emit(envelope(deps, d.themeId, d.tenantId, d.correlationId, THEME_EVENTS.THEME_SCORED, THEME_EVENT_SCHEMAS['theme.scored'], { score }));
  await auditLog(deps, t.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_scored', { score }, d.themeId);
  return Ok({ score, breakdown });
}

export async function generateThemeReportUseCase(
  input: z.infer<typeof themeActionSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ reportId: string; summary: string; metrics: Record<string, number> }, ValidationError | NotFoundError>> {
  const v = themeActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const t = await deps.themeRepo.findById(d.tenantId, d.themeId); if (!t) return Err(new NotFoundError('Theme not found'));

  const tokenSets = await deps.tokenSetRepo.findByTheme(d.tenantId, d.themeId);
  const variants = await deps.variantRepo.findByTheme(d.tenantId, d.themeId);
  const score = unwrap(await calculateThemeScoreUseCase(input, deps));

  const metrics: Record<string, number> = {
    tokenSetCount: tokenSets.length,
    tokenCount: tokenSets.reduce((sum, ts) => sum + ts.tokens.length, 0),
    variantCount: variants.length,
    themeScore: score.score,
  };

  const summary = `Theme "${t.name}": ${metrics.tokenCount} tokens across ${metrics.tokenSetCount} sets, ${metrics.variantCount} variants. Score: ${score.score}/100.`;
  const reportId = deps.idGenerator.generate();
  return Ok({ reportId, summary, metrics });
}

// Helper
function unwrap<T>(r: { ok: boolean; value?: T; error?: unknown }): T { if (!r.ok) throw new Error('unwrap failed'); return r.value as T; }
