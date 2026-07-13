/** Theme Engine — Validation Schemas */
import { z } from '@platform/core-sdk';

const optionalStr = z.string().max(2000).optional();
const baseFields = {
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), organizationId: z.string().min(1),
};

// ── Theme ──
export const createThemeSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200), slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: optionalStr, defaultMode: z.enum(['Light', 'Dark']).optional(),
});
export const updateThemeSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), themeId: z.string().min(1),
  name: z.string().min(1).max(200).optional(), description: optionalStr,
});
export const themeActionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), themeId: z.string().min(1),
});

// ── Brand ──
export const createBrandSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200), personality: z.array(z.string()), voice: z.string(),
  primaryColor: z.string().min(1),
});

// ── TokenSet ──
export const createTokenSetSchema = z.object({
  ...baseFields, themeId: z.string().min(1),
  category: z.enum(['Typography','Color','Spacing','Motion','Elevation','Radius','ZIndex','Breakpoint','Semantic']),
  name: z.string().min(1), tokens: z.array(z.object({ key: z.string(), value: z.string(), description: z.string() })),
});

// ── Typography ──
export const createTypographySchema = z.object({
  ...baseFields, themeId: z.string().min(1),
  fontFamilies: z.array(z.object({ name: z.string(), stack: z.array(z.string()) })),
  sizes: z.array(z.object({ name: z.string(), size: z.string(), lineHeight: z.string(), weight: z.string() })),
  baseSize: z.string().min(1), scaleRatio: z.string().min(1),
});

// ── Color ──
export const createColorSchema = z.object({
  ...baseFields, themeId: z.string().min(1),
  primary: z.string().min(1), secondary: z.string().min(1), accent: z.string().min(1),
  neutral: z.string().min(1), background: z.string().min(1), foreground: z.string().min(1),
  shades: z.record(z.string(), z.string()), semantic: z.object({ success: z.string(), warning: z.string(), error: z.string(), info: z.string() }),
});

// ── Spacing ──
export const createSpacingSchema = z.object({
  ...baseFields, themeId: z.string().min(1),
  baseUnit: z.string().min(1), scale: z.array(z.object({ name: z.string(), value: z.string() })),
});

// ── Motion ──
export const createMotionSchema = z.object({
  ...baseFields, themeId: z.string().min(1),
  durations: z.array(z.object({ name: z.string(), value: z.string() })),
  easings: z.array(z.object({ name: z.string(), value: z.string() })),
});

// ── Elevation ──
export const createElevationSchema = z.object({
  ...baseFields, themeId: z.string().min(1),
  levels: z.array(z.object({ name: z.string(), zIndex: z.number(), shadow: z.string() })),
});

// ── Variant ──
export const createVariantSchema = z.object({
  ...baseFields, themeId: z.string().min(1),
  mode: z.enum(['Light', 'Dark']), tokenOverrides: z.record(z.string(), z.string()), isDefault: z.boolean().optional(),
});

// ── Compile ──
export const compileThemeSchema = z.object({
  ...baseFields, themeId: z.string().min(1), format: z.enum(['css', 'tailwind', 'scss', 'json']).optional(),
});

// ── WhiteLabel ──
export const createWhiteLabelSchema = z.object({
  ...baseFields, baseThemeId: z.string().min(1), overrides: z.record(z.string(), z.unknown()),
});

// ── Responsive ──
export const createResponsiveSchema = z.object({
  ...baseFields, themeId: z.string().min(1), breakpoint: z.string().min(1), tokenOverrides: z.record(z.string(), z.string()),
});

// ═══════════════════════════════════════════
// RC2: Brand & Design Language
// ═══════════════════════════════════════════

// ── Brand Personality ──
export const createPersonalitySchema = z.object({
  ...baseFields, brandId: z.string().min(1),
  traits: z.array(z.string().min(1)).min(1), archetypes: z.array(z.string()),
});

// ── Brand Voice ──
export const createVoiceSchema = z.object({
  ...baseFields, brandId: z.string().min(1),
  tone: z.array(z.string().min(1)).min(1), vocabulary: z.array(z.string()),
  forbiddenWords: z.array(z.string()), sentenceStyle: z.string().min(1),
});

// ── Brand Emotion ──
export const createEmotionSchema = z.object({
  ...baseFields, brandId: z.string().min(1),
  primaryEmotions: z.array(z.string().min(1)).min(1), secondaryEmotions: z.array(z.string()),
  emotionalJourney: z.array(z.object({ stage: z.string(), emotion: z.string() })),
});

// ── Design Language ──
export const createDesignLanguageSchema = z.object({
  ...baseFields, brandId: z.string().min(1),
  style: z.array(z.string().min(1)).min(1),
  whitespace: z.enum(['minimal', 'low', 'medium', 'high', 'generous']),
  visualHierarchy: z.enum(['strong', 'moderate', 'subtle']),
  informationDensity: z.enum(['ultra-low', 'low', 'medium', 'high', 'ultra-high']),
});

// ── Motion Profile ──
export const createMotionProfileSchema = z.object({
  ...baseFields, brandId: z.string().min(1),
  intensity: z.enum(['none', 'subtle', 'moderate', 'dynamic', 'energetic']),
  defaultDuration: z.string().min(1), defaultEasing: z.string().min(1),
  principles: z.array(z.string()),
});

// ── Accessibility Profile ──
export const createAccessibilityProfileSchema = z.object({
  ...baseFields, brandId: z.string().min(1),
  wcagLevel: z.enum(['A', 'AA', 'AAA']),
  targetContrastRatio: z.number().min(1).max(21),
  minTouchTargetPx: z.number().min(1),
  focusIndicatorPolicy: z.string(), motionReductionPolicy: z.string(),
});

// ── Content Style ──
export const createContentStyleSchema = z.object({
  ...baseFields, brandId: z.string().min(1),
  photographyStyle: z.string().min(1), illustrationStyle: z.string().min(1),
  iconographyStyle: z.string().min(1), videoStyle: z.string(),
});

// ── Brand Constraint ──
export const createBrandConstraintSchema = z.object({
  ...baseFields, brandId: z.string().min(1),
  type: z.enum(['color', 'typography', 'layout', 'motion', 'content']),
  rule: z.string().min(1), enforcement: z.enum(['strict', 'recommended']),
  description: z.string(),
});

// ── Theme Manifest ──
export const createManifestSchema = z.object({
  ...baseFields, themeId: z.string().min(1), brandId: z.string().min(1),
  version: z.string().min(1).regex(/^\d+\.\d+\.\d+/),
  personality: z.array(z.string()), voice: z.array(z.string()),
  emotion: z.array(z.string()), designLanguage: z.array(z.string()),
  whitespace: z.enum(['minimal', 'low', 'medium', 'high', 'generous']),
  hierarchy: z.enum(['strong', 'moderate', 'subtle']),
  density: z.enum(['ultra-low', 'low', 'medium', 'high', 'ultra-high']),
  motionIntensity: z.enum(['none', 'subtle', 'moderate', 'dynamic', 'energetic']),
  motionDuration: z.string(), motionEasing: z.string(),
  wcagLevel: z.enum(['A', 'AA', 'AAA']), contrastRatio: z.number().min(1).max(21),
  photography: z.string(), illustration: z.string(), iconography: z.string(),
  constraints: z.array(z.string()),
});

export const manifestActionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), manifestId: z.string().min(1),
});

// ── Theme Intelligence ──
export const generateIntelligenceSchema = z.object({
  ...baseFields, brandId: z.string().min(1),
  industry: z.string().min(1), targetAudience: z.string().min(1),
  positioning: z.string().min(1), competitors: z.array(z.string()),
});

// ── Resolve Manifest (lookup by themeId) ──
export const resolveManifestSchema = z.object({
  tenantId: z.string().min(1), themeId: z.string().min(1),
});
