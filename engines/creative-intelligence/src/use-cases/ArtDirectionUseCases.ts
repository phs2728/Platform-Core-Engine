/**
 * Creative Intelligence RC2 — Art Direction Use Cases
 *
 * Sprint: Senior Art Director Upgrade
 * 8 styles: Luxury / Premium / Editorial / Boutique / Corporate / Minimal / Modern / Playful
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import { createArtDirectionSchema, artDirectionActionSchema } from '../domain/validation.js';
import { CREATIVE_EVENTS, CREATIVE_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog, now } from './helpers.js';
import type { CreativeUseCaseDeps } from './types.js';
import type { ArtDirection, ArtDirectionStyle } from '../interfaces/index.js';

const DEFAULT_RULES: Record<ArtDirectionStyle, { motion: string[]; color: string[]; typography: string[]; layout: string[] }> = {
  Luxury: {
    motion: ['Generous timing 400-600ms', 'Easing: ease-out cubic', 'No bouncy animations', 'Subtle scale 1.02 on hover'],
    color: ['High contrast monochrome base', 'Single accent color max', 'Generous use of off-white', 'Black + cream + single accent'],
    typography: ['Display serif for headlines (Editorial)', 'Light weight 300-400', 'Generous letter spacing 0.02em', 'Editorial scale 96/64/24/16'],
    layout: ['Generous whitespace 50%+ ratio', 'Single hero CTA', 'Editorial column structure', 'Strong vertical rhythm'],
  },
  Premium: {
    motion: ['Refined timing 300-400ms', 'Easing: ease-in-out', 'Premium micro-interactions', 'Hover scale 1.03'],
    color: ['Refined neutral palette', 'Sophisticated accent', 'Layered tonal values', 'Texture + gradient subtlety'],
    typography: ['Premium sans-serif (Inter, Manrope)', 'Medium weight 500-600', 'Tight letter spacing', 'Premium scale 72/48/20/16'],
    layout: ['Asymmetric grid', 'Negative space focal points', 'Premium 12-col grid', 'Editorial + functional'],
  },
  Editorial: {
    motion: ['Long-form scroll-driven', 'Parallax subtle', 'Magazine transitions', 'Slow reveals 800ms'],
    color: ['Print magazine palette', 'Sepia/cream/black', 'Single dramatic accent', 'High-contrast B&W'],
    typography: ['Editorial display fonts', 'Long-form readability', 'Drop caps for stories', 'Magazine column scale'],
    layout: ['Multi-column layouts', 'Pull quotes', 'Hero photography full-bleed', 'Section dividers'],
  },
  Boutique: {
    motion: ['Personal, hand-crafted feel', 'Slight asymmetry in timing', 'Custom cursor effects', 'Hand-drawn elements'],
    color: ['Warm, hand-picked palette', 'Earth tones', 'Local artisan colors', 'Imperfect harmony'],
    typography: ['Independent typefaces', 'Hand-written accents', 'Personal voice', 'Mixed serif/sans'],
    layout: ['Curated, not templated', 'Personal touches', 'Story-driven sections', 'Founder/team visibility'],
  },
  Corporate: {
    motion: ['Conservative timing 200-300ms', 'Easing: ease', 'Trustworthy transitions', 'No playful elements'],
    color: ['Blue + grey professional', 'Trust palette', 'WCAG AA+ compliance', 'Brand-safe colors'],
    typography: ['Professional sans-serif', 'Regular weight 400', 'Standard letter spacing', 'Functional hierarchy'],
    layout: ['Predictable grid', 'Clear information hierarchy', 'Trust signals visible', 'Compliance footer'],
  },
  Minimal: {
    motion: ['Subtle, single-element focus', 'Slow reveals 500ms', 'No decoration', 'White space is motion'],
    color: ['Monochrome or 2-tone max', 'Pure white background', 'Black text', 'Negative space dominant'],
    typography: ['Single typeface family', 'Light/Regular only', 'Wide letter spacing', 'Minimal scale'],
    layout: ['Single focal point per screen', '60%+ whitespace', 'No decoration', 'Pure composition'],
  },
  Modern: {
    motion: ['Bold, asymmetric motion', 'Scroll-triggered animations', 'Quick transitions 200ms', 'Layered parallax'],
    color: ['Vibrant accent', 'Dark mode default', 'Gradient overlays', 'High-saturation pops'],
    typography: ['Modern sans-serif (Geist, Inter)', 'Variable fonts', 'Bold weight 700-800', 'Oversized headlines'],
    layout: ['Asymmetric grid', 'Bold visual hierarchy', 'Mixed media scale', 'Layered z-axis'],
  },
  Playful: {
    motion: ['Bouncy, energetic', 'Bezier curves', 'Spring physics', 'Hover state surprises'],
    color: ['Vibrant, saturated palette', 'Multiple accents', 'Bright backgrounds', 'Color blocks'],
    typography: ['Fun sans-serif (Comic Sans alternative)', 'Bold weight', 'Mixed scale', 'Personality-driven'],
    layout: ['Asymmetric creative', 'Overlap elements', 'Illustration-forward', 'Surprise moments'],
  },
};

// ═══════════════════════════════════════════
// ART DIRECTION (3)
// ═══════════════════════════════════════════

export async function createArtDirectionUseCase(
  input: z.infer<typeof createArtDirectionSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ artDirectionId: string }, ValidationError>> {
  const v = createArtDirectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  const id = deps.idGenerator.generate();
  const defaults = DEFAULT_RULES[d.style];
  const ad: ArtDirection = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    style: d.style, name: d.name, description: d.description ?? '',
    rules: d.rules ?? defaults.motion.map(p => ({ category: 'motion' as const, principle: p, rationale: 'Style default for ' + d.style })),
    motionPrinciples: d.motionPrinciples ?? defaults.motion,
    colorPrinciples: d.colorPrinciples ?? defaults.color,
    typographyPrinciples: d.typographyPrinciples ?? defaults.typography,
    layoutPrinciples: d.layoutPrinciples ?? defaults.layout,
    status: 'Draft', attributes: {},
    createdAt: now(deps), updatedAt: now(deps),
  };
  await deps.artDirectionRepo.insert(ad);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CREATIVE_EVENTS.ART_DIRECTION_CREATED, CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { artDirectionId: id, style: d.style }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_created', { style: d.style }, id);
  return Ok({ artDirectionId: id });
}

export async function activateArtDirectionUseCase(
  input: z.infer<typeof artDirectionActionSchema>, deps: CreativeUseCaseDeps,
): Promise<Result<{ artDirectionId: string; activated: boolean }, ValidationError | NotFoundError>> {
  const v = artDirectionActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ad = await deps.artDirectionRepo.findById(d.tenantId, d.artDirectionId);
  if (!ad) return Err(new NotFoundError('Art direction not found'));
  await deps.artDirectionRepo.update(d.tenantId, d.artDirectionId, { status: 'Active', updatedAt: now(deps) });
  await deps.eventBus.emit(envelope(deps, d.artDirectionId, d.tenantId, d.correlationId, CREATIVE_EVENTS.ART_DIRECTION_ACTIVATED, CREATIVE_EVENT_SCHEMAS['ci.art_direction.activated'], { artDirectionId: d.artDirectionId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'art_direction_activated', { style: ad.style }, d.artDirectionId);
  return Ok({ artDirectionId: d.artDirectionId, activated: true });
}

export async function getArtDirectionByStyleUseCase(
  input: { tenantId: string; style: ArtDirectionStyle }, deps: CreativeUseCaseDeps,
): Promise<Result<ArtDirection | null, ValidationError>> {
  if (!input.tenantId || !input.style) return Err(new ValidationError('Invalid input'));
  const ad = await deps.artDirectionRepo.findByStyle(input.tenantId, input.style);
  return Ok(ad ? { ...ad } : null);
}

export async function generateArtDirectionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; organizationId: string; style: ArtDirectionStyle; industry?: string }, deps: CreativeUseCaseDeps,
): Promise<Result<{ artDirectionId: string }, ValidationError>> {
  const id = deps.idGenerator.generate();
  const defaults = DEFAULT_RULES[input.style];
  const ad: ArtDirection = {
    id, tenantId: input.tenantId, organizationId: input.organizationId,
    style: input.style, name: `${input.style} Art Direction`, description: `Auto-generated for ${input.style}`,
    rules: [], motionPrinciples: defaults.motion, colorPrinciples: defaults.color,
    typographyPrinciples: defaults.typography, layoutPrinciples: defaults.layout,
    status: 'Draft', attributes: { generated: true, industry: input.industry ?? null },
    createdAt: now(deps), updatedAt: now(deps),
  };
  await deps.artDirectionRepo.insert(ad);
  await deps.eventBus.emit(envelope(deps, id, input.tenantId, input.correlationId, CREATIVE_EVENTS.ART_DIRECTION_CREATED, CREATIVE_EVENT_SCHEMAS['ci.art_direction.created'], { artDirectionId: id, style: input.style, autoGenerated: true }));
  await auditLog(deps, input.organizationId, input.tenantId, input.actorId, input.correlationId, 'art_direction_created', { style: input.style, generated: true }, id);
  return Ok({ artDirectionId: id });
}