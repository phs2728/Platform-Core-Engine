/** Creative Intelligence RC2 — Validation Schemas */
import { z } from '@platform/core-sdk';

const baseFields = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
};

// ── Art Direction ──
export const createArtDirectionSchema = z.object({
  ...baseFields,
  style: z.enum(['Luxury', 'Premium', 'Editorial', 'Boutique', 'Corporate', 'Minimal', 'Modern', 'Playful']),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  motionPrinciples: z.array(z.string()).optional(),
  colorPrinciples: z.array(z.string()).optional(),
  typographyPrinciples: z.array(z.string()).optional(),
  layoutPrinciples: z.array(z.string()).optional(),
  rules: z.array(z.object({
    category: z.enum(['motion', 'color', 'typography', 'layout', 'photography', 'interaction']),
    principle: z.string().min(1),
    rationale: z.string(),
  })).optional(),
});

export const artDirectionActionSchema = z.object({
  ...baseFields,
  artDirectionId: z.string().min(1),
});

// ── Review (shared base for visual reviews) ──
export const reviewPageSchema = z.object({
  ...baseFields,
  pageRef: z.string().min(1),
  style: z.enum(['Luxury', 'Premium', 'Editorial', 'Boutique', 'Corporate', 'Minimal', 'Modern', 'Playful']).optional(),
  // Page content snapshot for review (provided by host)
  contentSnapshot: z.record(z.string(), z.unknown()).optional(),
});

// ── Approve/Reject ──
export const approvalSchema = z.object({
  ...baseFields,
  pageRef: z.string().min(1),
  approvalId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(2000).optional(),
});

// ── Generate ──
export const generateCritiqueSchema = z.object({
  ...baseFields,
  pageRef: z.string().min(1),
  tone: z.enum(['senior-art-director', 'principal-designer', 'creative-director']).optional(),
});

export const generateArtDirectionSchema = z.object({
  ...baseFields,
  style: z.enum(['Luxury', 'Premium', 'Editorial', 'Boutique', 'Corporate', 'Minimal', 'Modern', 'Playful']),
  industry: z.string().optional(),
});

export const generatePhotographyGuideSchema = z.object({
  ...baseFields,
  pageRef: z.string().min(1),
  style: z.enum(['Luxury', 'Premium', 'Editorial', 'Boutique', 'Corporate', 'Minimal', 'Modern', 'Playful']).optional(),
});

export const generateMotionGuideSchema = z.object({
  ...baseFields,
  pageRef: z.string().min(1),
  intensity: z.enum(['none', 'subtle', 'moderate', 'dynamic', 'energetic']).default('subtle'),
});

export const generateInteractionGuideSchema = z.object({
  ...baseFields,
  pageRef: z.string().min(1),
});

export const generateVisualRecommendationsSchema = z.object({
  ...baseFields,
  pageRef: z.string().min(1),
  focusArea: z.enum(['photography', 'layout', 'motion', 'cta', 'hierarchy', 'typography', 'copy', 'color']).optional(),
});

// ── Report ──
export const generateReportSchema = z.object({
  ...baseFields,
  pageRef: z.string().min(1),
  reportType: z.enum([
    'creative-review', 'art-direction', 'premium', 'luxury',
    'three-second', 'design-critique', 'design-recommendation',
  ]),
});