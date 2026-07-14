/** Creative Knowledge Engine — Validation Schemas */
import { z } from '@platform/core-sdk';

// ── Research Project ──
export const createResearchSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), organizationId: z.string().min(1),
  name: z.string().min(1).max(200), slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(), industry: z.string().min(1),
});
export const startSessionSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  projectId: z.string().min(1), phase: z.string().min(1),
});
export const completeResearchSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
});
export const archiveResearchSchema = completeResearchSchema;

// ── Client Interview ──
export const conductInterviewSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  businessGoal: z.string().min(1), targetAudience: z.string().min(1), targetRegion: z.string().min(1),
  competitors: z.array(z.string()), brandPersonality: z.string(), preferredStyle: z.string(),
  dislikedStyle: z.string(), businessModel: z.string(), revenueModel: z.string(),
  budget: z.string(), timeline: z.string(), successMetrics: z.array(z.string()),
});
export const updateBusinessProfileSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  companyName: z.string().min(1), industry: z.string().min(1), description: z.string(),
  targetMarket: z.string(), competitiveAdvantage: z.string(), revenueModel: z.string(), maturity: z.string(),
});

// ── Audit ──
export const auditWebsiteSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  url: z.string().min(1),
});
export const auditUXSchema = auditWebsiteSchema;
export const auditSEOSchema = auditWebsiteSchema;
export const auditAccessibilitySchema = auditWebsiteSchema;
export const auditPerformanceSchema = auditWebsiteSchema;
export const auditContentSchema = auditWebsiteSchema;

// ── Competitor ──
export const analyzeCompetitorSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  name: z.string().min(1), url: z.string().min(1),
});
export const compareCompetitorsSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
});
export const generateBenchmarkSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  referenceApp: z.string().min(1),
});

// ── Knowledge ──
export const createKnowledgeSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  title: z.string().min(1).max(200), slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  category: z.string().min(1), tags: z.array(z.string()).optional(), content: z.string().min(1),
  sources: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export const updateKnowledgeSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), knowledgeId: z.string().min(1),
  title: z.string().optional(), content: z.string().optional(), tags: z.array(z.string()).optional(),
});
export const searchKnowledgeSchema = z.object({
  tenantId: z.string().min(1), query: z.string().min(1), limit: z.number().int().min(1).max(50).optional(),
});

// ── Recommendation ──
export const generateRecommendationsSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
});
export const generateGapAnalysisSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
});
export const generateEvidenceSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  claim: z.string().min(1), source: z.string().min(1), sourceType: z.enum(['audit','competitor','market','user','benchmark','interview']),
  data: z.record(z.string(), z.unknown()), confidence: z.number().min(0).max(1),
});
export const calculateConfidenceSchema = z.object({
  tenantId: z.string().min(1), projectId: z.string().min(1),
});

// ── Patterns ──
export const extractPatternsSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1), projectId: z.string().min(1),
  type: z.enum(['Visual', 'Layout', 'Copy']),
});
