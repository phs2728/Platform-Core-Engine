/** Learning Engine — Validation Schemas */
import { z } from '@platform/core-sdk';

// ── Learning Project ──
export const createLearningSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), organizationId: z.string().min(1),
  name: z.string().min(1).max(200), slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(), sourceRef: z.string().min(1),
});
export const startLearningSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1), phase: z.string().min(1),
});
export const completeLearningSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
});
export const archiveLearningSchema = completeLearningSchema;

// ── Pattern Learning ──
export const learnPatternSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  type: z.enum(['Success', 'Failure']), category: z.enum(['Design','UX','Copy','SEO','Conversion','Accessibility','Navigation','Search','Trust','Performance','Brand','Content']),
  name: z.string().min(1), description: z.string().min(1), observation: z.string().min(1),
  impact: z.number().min(0).max(100), frequency: z.number().int().min(1), contexts: z.array(z.string()),
});

// ── Trend Detection ──
export const detectTrendSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  category: z.enum(['Design','UX','Copy','SEO','Conversion','Accessibility','Navigation','Search','Trust','Performance','Brand','Content']),
  region: z.string().min(1),
});

// ── Learning Model ──
export const updateModelSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  category: z.enum(['Design','UX','Copy','SEO','Conversion','Accessibility','Navigation','Search','Trust','Performance','Brand','Content']),
});

// ── Recommendation ──
export const recordRecommendationSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  recommendationId: z.string().min(1),
  category: z.enum(['Design','UX','Copy','SEO','Conversion','Accessibility','Navigation','Search','Trust','Performance','Brand','Content']),
  outcome: z.enum(['accepted','rejected','ignored']), impactScore: z.number().min(0).max(100), contextRef: z.string().min(1), notes: z.string(),
});
export const learnRecommendationSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
});
export const recommendImprovementSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  category: z.enum(['Design','UX','Copy','SEO','Conversion','Accessibility','Navigation','Search','Trust','Performance','Brand','Content']),
});

// ── Design / UX / Copy / Search Learning ──
export const learnInsightSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  insight: z.string().min(1), score: z.number().min(0).max(100), sourceRef: z.string().min(1),
});
export const learnDesignSchema = learnInsightSchema.extend({ designType: z.string().min(1) });

// ── Knowledge ──
export const updateKnowledgeSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  knowledgeId: z.string().min(1), change: z.string().min(1), reason: z.string().min(1),
});
export const evolveKnowledgeSchema = updateKnowledgeSchema;
export const searchMemorySchema = z.object({
  tenantId: z.string().min(1), projectId: z.string().min(1), query: z.string().min(1),
});

// ── Analytics ──
export const calculateScoreSchema = z.object({
  tenantId: z.string().min(1), projectId: z.string().min(1),
});
export const trendAnalysisSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
});

// ── Outcome / Feedback ──
export const recordOutcomeSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  recommendationId: z.string().min(1), category: z.enum(['Design','UX','Copy','SEO','Conversion','Accessibility','Navigation','Search','Trust','Performance','Brand','Content']),
  outcome: z.enum(['accepted','rejected','ignored']), impactScore: z.number().min(0).max(100), contextRef: z.string().min(1), notes: z.string(),
});
