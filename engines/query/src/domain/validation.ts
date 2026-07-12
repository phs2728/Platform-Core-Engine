/**
 * Query Engine — Validation Schemas (zod)
 */
import { z } from '@platform/core-sdk';

export const projectionTypeSchema = z.enum(['realtime', 'scheduled', 'snapshot', 'incremental', 'full_rebuild']);
export const projectionStatusSchema = z.enum(['Building', 'Ready', 'Stale', 'Failed', 'Archived']);
export const dashboardTypeSchema = z.enum(['customer', 'organization', 'sales', 'operations']);
export const summaryTypeSchema = z.enum(['booking', 'order', 'payment', 'review', 'inventory', 'catalog']);
export const timelineTypeSchema = z.enum(['activity', 'audit', 'booking', 'payment', 'review']);

export const createProjectionSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  name: z.string().min(1).max(300),
  type: projectionTypeSchema,
  sourceEngine: z.string().min(1).max(128),
  sourceEventTypes: z.array(z.string().min(1)),
  targetType: z.string().min(1).max(100),
  targetRef: z.string().min(1).max(256),
});

export const rebuildProjectionSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  projectionId: z.string().min(1),
});

export const refreshProjectionSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  projectionId: z.string().min(1),
});

export const archiveProjectionSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  projectionId: z.string().min(1),
});

export const getDashboardSchema = z.object({
  tenantId: z.string().min(1),
  type: dashboardTypeSchema,
  targetRef: z.string().min(1).max(256),
});

export const getSummarySchema = z.object({
  tenantId: z.string().min(1),
  type: summaryTypeSchema,
  targetRef: z.string().max(256).optional(),
});

export const getTimelineSchema = z.object({
  tenantId: z.string().min(1),
  type: timelineTypeSchema.optional(),
  aggregateId: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const buildSearchDocSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  sourceEngine: z.string().min(1).max(128),
  sourceType: z.string().min(1).max(100),
  sourceId: z.string().min(1).max(128),
  title: z.string().min(1).max(500),
  content: z.string().max(10000),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const buildAIContextSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  contextType: z.string().min(1).max(100),
  targetRef: z.string().min(1).max(256),
  summary: z.string().min(1).max(5000),
  facts: z.record(z.unknown()),
  sentiment: z.number().min(-1).max(1).optional(),
  riskLevel: z.string().max(50).optional(),
});

export const getMetricsSchema = z.object({
  tenantId: z.string().min(1),
  type: z.string().min(1).max(100),
  targetRef: z.string().max(256).optional(),
});

export const processEventSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  projectionId: z.string().min(1),
  event: z.object({
    eventId: z.string().min(1),
    engine: z.string().min(1),
    eventType: z.string().min(1),
    aggregateId: z.string().min(1),
    tenantId: z.string().min(1),
    payload: z.record(z.unknown()),
    occurredAt: z.string().min(1),
    position: z.number().int().min(0),
  }),
});
