/**
 * Theme Engine RC2 — Brand & Design Language Use Cases
 *
 * BrandPersonality, BrandVoice, BrandEmotion, DesignLanguage, MotionProfile,
 * AccessibilityProfile, ContentStyle, BrandConstraint,
 * ThemeManifest, ThemeIntelligence
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  createPersonalitySchema, createVoiceSchema, createEmotionSchema,
  createDesignLanguageSchema, createMotionProfileSchema,
  createAccessibilityProfileSchema, createContentStyleSchema,
  createBrandConstraintSchema, createManifestSchema, manifestActionSchema,
  generateIntelligenceSchema, resolveManifestSchema,
} from '../domain/validation.js';
import { THEME_EVENTS, THEME_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { ThemeUseCaseDeps } from './types.js';
import type {
  BrandPersonality, BrandVoice, BrandEmotion, DesignLanguage,
  MotionProfile, AccessibilityProfile, ContentStyle, BrandConstraint,
  ThemeManifest, ThemeIntelligence,
} from '../interfaces/index.js';

const now = (deps: ThemeUseCaseDeps) => deps.clock.now().toISOString();

// ═══════════════════════════════════════════
// BRAND PERSONALITY (2)
// ═══════════════════════════════════════════

export async function createBrandPersonalityUseCase(
  input: z.infer<typeof createPersonalitySchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ personalityId: string }, ValidationError | NotFoundError>> {
  const v = createPersonalitySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const brand = await deps.brandRepo.findById(d.tenantId, d.brandId);
  if (!brand) return Err(new NotFoundError('Brand not found'));
  const id = deps.idGenerator.generate();
  const entity: BrandPersonality = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, brandId: d.brandId,
    traits: d.traits, archetypes: d.archetypes, attributes: {},
    createdAt: now(deps), updatedAt: now(deps),
  };
  await deps.personalityRepo.insert(entity);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, THEME_EVENTS.PERSONALITY_CREATED, THEME_EVENT_SCHEMAS['brand.personality.created'], { personalityId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'brand_created', { type: 'personality' });
  return Ok({ personalityId: id });
}

export async function getBrandPersonalityUseCase(
  tenantId: string, brandId: string, deps: ThemeUseCaseDeps,
): Promise<Result<BrandPersonality, NotFoundError>> {
  const p = await deps.personalityRepo.findByBrand(tenantId, brandId);
  if (!p) return Err(new NotFoundError('Brand personality not found'));
  return Ok(p);
}

// ═══════════════════════════════════════════
// BRAND VOICE (2)
// ═══════════════════════════════════════════

export async function createBrandVoiceUseCase(
  input: z.infer<typeof createVoiceSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ voiceId: string }, ValidationError | NotFoundError>> {
  const v = createVoiceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const brand = await deps.brandRepo.findById(d.tenantId, d.brandId);
  if (!brand) return Err(new NotFoundError('Brand not found'));
  const id = deps.idGenerator.generate();
  const entity: BrandVoice = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, brandId: d.brandId,
    tone: d.tone, vocabulary: d.vocabulary, forbiddenWords: d.forbiddenWords,
    sentenceStyle: d.sentenceStyle, attributes: {},
    createdAt: now(deps), updatedAt: now(deps),
  };
  await deps.voiceRepo.insert(entity);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, THEME_EVENTS.VOICE_CREATED, THEME_EVENT_SCHEMAS['brand.voice.created'], { voiceId: id }));
  return Ok({ voiceId: id });
}

export async function getBrandVoiceUseCase(
  tenantId: string, brandId: string, deps: ThemeUseCaseDeps,
): Promise<Result<BrandVoice, NotFoundError>> {
  const v = await deps.voiceRepo.findByBrand(tenantId, brandId);
  if (!v) return Err(new NotFoundError('Brand voice not found'));
  return Ok(v);
}

// ═══════════════════════════════════════════
// DESIGN LANGUAGE (2)
// ═══════════════════════════════════════════

export async function createDesignLanguageUseCase(
  input: z.infer<typeof createDesignLanguageSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ designLanguageId: string }, ValidationError | NotFoundError>> {
  const v = createDesignLanguageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const brand = await deps.brandRepo.findById(d.tenantId, d.brandId);
  if (!brand) return Err(new NotFoundError('Brand not found'));
  const id = deps.idGenerator.generate();
  const entity: DesignLanguage = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, brandId: d.brandId,
    style: d.style, whitespace: d.whitespace, visualHierarchy: d.visualHierarchy,
    informationDensity: d.informationDensity, attributes: {},
    createdAt: now(deps), updatedAt: now(deps),
  };
  await deps.designLanguageRepo.insert(entity);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, THEME_EVENTS.DESIGN_LANGUAGE_CREATED, THEME_EVENT_SCHEMAS['designlanguage.created'], { designLanguageId: id }));
  return Ok({ designLanguageId: id });
}

export async function getDesignLanguageUseCase(
  tenantId: string, brandId: string, deps: ThemeUseCaseDeps,
): Promise<Result<DesignLanguage, NotFoundError>> {
  const dl = await deps.designLanguageRepo.findByBrand(tenantId, brandId);
  if (!dl) return Err(new NotFoundError('Design language not found'));
  return Ok(dl);
}

// ═══════════════════════════════════════════
// THEME MANIFEST (4)
// ═══════════════════════════════════════════

export async function createThemeManifestUseCase(
  input: z.infer<typeof createManifestSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ manifestId: string }, ValidationError | NotFoundError>> {
  const v = createManifestSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const theme = await deps.themeRepo.findById(d.tenantId, d.themeId);
  if (!theme) return Err(new NotFoundError('Theme not found'));
  const brand = await deps.brandRepo.findById(d.tenantId, d.brandId);
  if (!brand) return Err(new NotFoundError('Brand not found'));
  const id = deps.idGenerator.generate();
  const manifest: ThemeManifest = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    themeId: d.themeId, brandId: d.brandId, version: d.version,
    personality: d.personality, voice: d.voice, emotion: d.emotion,
    designLanguage: d.designLanguage,
    visual: { whitespace: d.whitespace, hierarchy: d.hierarchy, density: d.density },
    motion: { intensity: d.motionIntensity, duration: d.motionDuration, easing: d.motionEasing },
    accessibility: { wcagLevel: d.wcagLevel, contrastRatio: d.contrastRatio },
    content: { photography: d.photography, illustration: d.illustration, iconography: d.iconography },
    constraints: d.constraints, status: 'Draft', attributes: {},
    createdAt: now(deps), updatedAt: now(deps),
  };
  await deps.manifestRepo.insert(manifest);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, THEME_EVENTS.MANIFEST_CREATED, THEME_EVENT_SCHEMAS['themanifest.created'], { manifestId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_created', { type: 'manifest' }, d.themeId);
  return Ok({ manifestId: id });
}

export async function publishThemeManifestUseCase(
  input: z.infer<typeof manifestActionSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ manifestId: string; published: boolean }, ValidationError | NotFoundError>> {
  const v = manifestActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const m = await deps.manifestRepo.findById(d.tenantId, d.manifestId);
  if (!m) return Err(new NotFoundError('Manifest not found'));
  await deps.manifestRepo.update(d.tenantId, d.manifestId, { status: 'Published', updatedAt: now(deps) });
  // notify component engine that theme changed
  await deps.componentThemeProvider.notifyThemeChanged(d.tenantId, m.themeId);
  await deps.eventBus.emit(envelope(deps, d.manifestId, d.tenantId, d.correlationId, THEME_EVENTS.MANIFEST_PUBLISHED, THEME_EVENT_SCHEMAS['themanifest.published'], { manifestId: d.manifestId }));
  return Ok({ manifestId: d.manifestId, published: true });
}

export async function getThemeManifestUseCase(
  tenantId: string, themeId: string, deps: ThemeUseCaseDeps,
): Promise<Result<ThemeManifest, NotFoundError>> {
  const m = await deps.manifestRepo.findByTheme(tenantId, themeId);
  if (!m) return Err(new NotFoundError('Theme manifest not found'));
  return Ok(m);
}

export async function resolveThemeManifestUseCase(
  input: z.infer<typeof resolveManifestSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ manifest: ThemeManifest; resolvedTokens: Record<string, string> }, ValidationError | NotFoundError>> {
  const v = resolveManifestSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const m = await deps.manifestRepo.findByTheme(d.tenantId, d.themeId);
  if (!m) return Err(new NotFoundError('Manifest not found for theme'));
  // build resolved tokens from manifest
  const resolvedTokens: Record<string, string> = {
    '--brand-whitespace': m.visual.whitespace,
    '--brand-hierarchy': m.visual.hierarchy,
    '--brand-density': m.visual.density,
    '--brand-motion-intensity': m.motion.intensity,
    '--brand-motion-duration': m.motion.duration,
    '--brand-motion-easing': m.motion.easing,
    '--brand-wcag-level': m.accessibility.wcagLevel,
    '--brand-contrast-ratio': String(m.accessibility.contrastRatio),
    '--brand-photography': m.content.photography,
    '--brand-illustration': m.content.illustration,
    '--brand-iconography': m.content.iconography,
  };
  for (let i = 0; i < m.personality.length; i++) {
    resolvedTokens[`--brand-personality-${i + 1}`] = m.personality[i]!;
  }
  await deps.eventBus.emit(envelope(deps, d.themeId, d.tenantId, '', THEME_EVENTS.MANIFEST_RESOLVED, THEME_EVENT_SCHEMAS['themanifest.resolved'], { tokenCount: Object.keys(resolvedTokens).length }));
  return Ok({ manifest: m, resolvedTokens });
}

// ═══════════════════════════════════════════
// THEME INTELLIGENCE (2)
// ═══════════════════════════════════════════

export async function generateThemeIntelligenceUseCase(
  input: z.infer<typeof generateIntelligenceSchema>, deps: ThemeUseCaseDeps,
): Promise<Result<{ intelligenceId: string; confidence: number }, ValidationError | NotFoundError>> {
  const v = generateIntelligenceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const brand = await deps.brandRepo.findById(d.tenantId, d.brandId);
  if (!brand) return Err(new NotFoundError('Brand not found'));
  // call creative intelligence provider
  const dirResult = await deps.creativeIntelligenceProvider.generateBrandDirection(d.tenantId, {
    industry: d.industry, targetAudience: d.targetAudience,
    positioning: d.positioning, competitors: d.competitors,
  });
  if (!dirResult.ok) return Err(new ValidationError('Creative intelligence generation failed'));
  const dir = dirResult.value;
  const id = deps.idGenerator.generate();
  const intelligence: ThemeIntelligence = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, brandId: d.brandId,
    industry: d.industry, targetAudience: d.targetAudience,
    positioning: d.positioning, competitors: d.competitors,
    generatedPersonality: dir.personality, generatedVoice: dir.voice,
    generatedEmotion: dir.emotion, generatedDesignLanguage: dir.designLanguage,
    recommendations: dir.recommendations, confidence: 85,
    attributes: {}, createdAt: now(deps), updatedAt: now(deps),
  };
  await deps.intelligenceRepo.insert(intelligence);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, THEME_EVENTS.INTELLIGENCE_GENERATED, THEME_EVENT_SCHEMAS['intelligence.generated'], { intelligenceId: id, confidence: intelligence.confidence }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'theme_created', { type: 'intelligence', industry: d.industry });
  return Ok({ intelligenceId: id, confidence: intelligence.confidence });
}

export async function getThemeIntelligenceUseCase(
  tenantId: string, brandId: string, deps: ThemeUseCaseDeps,
): Promise<Result<ThemeIntelligence, NotFoundError>> {
  const i = await deps.intelligenceRepo.findByBrand(tenantId, brandId);
  if (!i) return Err(new NotFoundError('Theme intelligence not found'));
  return Ok(i);
}
