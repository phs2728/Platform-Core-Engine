/** Release Manager — Validation Schemas */
import { z } from '@platform/core-sdk';

export const createReleaseSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  engineId: z.string().min(1).max(128),
  title: z.string().min(1).max(300),
  description: z.string().max(2000),
  branch: z.string().min(1).max(200),
  commitSha: z.string().optional(),
  hasBreakingChanges: z.boolean().optional(),
  hasNewFeatures: z.boolean().optional(),
  initialStatus: z.enum(['Draft', 'RC1']).optional(),
});

export const approveReleaseSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1),
  releaseId: z.string().min(1), approverId: z.string().min(1),
  approverRole: z.string().min(1), reason: z.string().max(1000),
});

export const rejectReleaseSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1),
  releaseId: z.string().min(1), approverId: z.string().min(1),
  reason: z.string().min(1).max(1000),
});

export const createTagSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  releaseId: z.string().min(1), message: z.string().max(500).optional(),
});

export const generateNoteSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  releaseId: z.string().min(1),
  features: z.array(z.string()).optional(),
  bugFixes: z.array(z.string()).optional(),
  breakingChanges: z.array(z.string()).optional(),
});

export const runPipelineSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  releaseId: z.string().min(1),
});
