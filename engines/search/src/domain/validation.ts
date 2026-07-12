/** Search Engine — Validation Schemas (zod) */
import { z } from '@platform/core-sdk';

export const searchDomainSchema = z.enum(['catalog', 'organization', 'booking', 'review', 'media', 'user', 'payment', 'global']);
export const matchTypeSchema = z.enum(['full_text', 'exact', 'prefix', 'fuzzy', 'wildcard', 'phrase', 'boolean']);
export const indexTypeSchema = z.enum(['realtime', 'incremental', 'snapshot', 'full_rebuild']);
export const sortBySchema = z.enum(['relevance', 'popularity', 'recency', 'rating', 'price_asc', 'price_desc', 'title']);

export const searchSchema = z.object({
  tenantId: z.string().min(1),
  query: z.string().min(1).max(500),
  domain: searchDomainSchema.optional(),
  matchType: matchTypeSchema.optional(),
  filters: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'range']),
    value: z.unknown(),
  })).optional(),
  facets: z.array(z.string()).optional(),
  sortBy: sortBySchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  highlight: z.boolean().optional(),
  fuzzy: z.boolean().optional(),
  fuzzyDistance: z.number().int().min(1).max(2).optional(),
});

export const indexDocumentSchema = z.object({
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
  metadata: z.record(z.unknown()).optional(),
});

export const deleteDocumentSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  documentId: z.string().min(1),
});

export const rebuildIndexSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  domain: searchDomainSchema,
});

export const autocompleteSchema = z.object({
  tenantId: z.string().min(1),
  prefix: z.string().min(1).max(100),
  domain: searchDomainSchema.optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export const boostSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  name: z.string().min(1).max(200),
  sourceType: z.string().min(1).max(100),
  sourceId: z.string().min(1).max(128).optional(),
  multiplier: z.number().min(0).max(10),
});

export const addSynonymSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  terms: z.array(z.string().min(1)).min(2),
});

export const recordSearchSchema = z.object({
  tenantId: z.string().min(1),
  query: z.string().min(1).max(500),
  domain: searchDomainSchema,
  resultCount: z.number().int().min(0),
  executionTimeMs: z.number().int().min(0),
  clicked: z.boolean(),
  clickedDocId: z.string().optional(),
  userId: z.string().optional(),
});
