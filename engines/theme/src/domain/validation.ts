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
