/**
 * Search Feed + AI Context + Analytics UseCases (11) —
 *   buildSearchDocument / listSearchDocuments / reindexProjection +
 *   buildAIContext / getAIContext / rebuildAIContext +
 *   getMetrics / getTrend / getStatistics / getTopEntities +
 *   listProjections
 */
import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordQueryAudit } from '../domain/audit.js';
import {
  buildSearchDocSchema, buildAIContextSchema, getMetricsSchema,
} from '../domain/validation.js';
import { emitQueryEvent } from '../domain/events.js';
import type { QueryUseCaseDeps } from './types.js';
import type {
  SearchDocument, AIContext, AnalyticsMetrics,
  Projection, ProjectionSearchCriteria, ProjectionSearchResult,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// SEARCH FEED (3)
// ═══════════════════════════════════════════

export interface BuildSearchDocInput {
  tenantId: string; correlationId: string; actorId: string;
  sourceEngine: string; sourceType: string; sourceId: string;
  title: string; content: string;
  keywords?: string[]; tags?: string[];
}

export async function buildSearchDocumentUseCase(
  input: BuildSearchDocInput, deps: QueryUseCaseDeps,
): Promise<Result<{ docId: string; version: number }, ValidationError>> {
  const v = buildSearchDocSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Check existing (upsert)
  const existing = await deps.searchFeedRepo.findBySource(d.tenantId, d.sourceEngine, d.sourceId);
  const now = deps.clock.now().toISOString();

  if (existing) {
    const newVersion = existing.version + 1;
    await deps.searchFeedRepo.update(d.tenantId, existing.id, {
      title: d.title, content: d.content,
      keywords: d.keywords ?? existing.keywords,
      tags: d.tags ?? existing.tags,
      version: newVersion, updatedAt: now,
    });

    const env: EventEnvelope<{ docId: string; sourceId: string }> =
      await emitQueryEvent(deps, { aggregateId: existing.id, tenantId: d.tenantId, correlationId: d.correlationId },
        'search.document.updated', 'search.document.updated.v1', { docId: existing.id, sourceId: d.sourceId });
    await deps.eventBus.emit(env);

    return Ok({ docId: existing.id, version: newVersion });
  }

  const docId = deps.idGenerator.generate();
  const doc: SearchDocument = {
    id: docId, tenantId: d.tenantId,
    sourceEngine: d.sourceEngine, sourceType: d.sourceType, sourceId: d.sourceId,
    title: d.title, content: d.content,
    keywords: d.keywords ?? [], tags: d.tags ?? [],
    metadata: {}, version: 1, createdAt: now, updatedAt: now,
  };
  await deps.searchFeedRepo.insert(doc);

  const env: EventEnvelope<{ docId: string; sourceType: string }> =
    await emitQueryEvent(deps, { aggregateId: docId, tenantId: d.tenantId, correlationId: d.correlationId },
      'search.document.created', 'search.document.created.v1', { docId, sourceType: d.sourceType });
  await deps.eventBus.emit(env);

  return Ok({ docId, version: 1 });
}

export async function listSearchDocumentsUseCase(
  input: { tenantId: string; sourceEngine?: string; limit?: number }, deps: QueryUseCaseDeps,
): Promise<Result<SearchDocument[], ValidationError>> {
  if (!input.tenantId) return Err(new ValidationError('tenantId required'));
  if (input.sourceEngine !== undefined) {
    return Ok(await deps.searchFeedRepo.listBySource(input.tenantId, input.sourceEngine, input.limit));
  }
  return Ok(await deps.searchFeedRepo.listByTenant(input.tenantId, input.limit));
}

export async function reindexProjectionUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; projectionId: string },
  deps: QueryUseCaseDeps,
): Promise<Result<{ reindexed: number }, ValidationError | NotFoundError>> {
  const projection = await deps.projectionRepo.findById(input.tenantId, input.projectionId);
  if (!projection) return Err(new NotFoundError('Projection not found'));

  // Build search doc from projection data
  const title = `${projection.targetType}: ${projection.targetRef}`;
  const content = JSON.stringify(projection.data);
  const keywords = Object.keys(projection.data).map((k) => k.replace(/_/g, ' '));

  const r = await buildSearchDocumentUseCase({
    tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId,
    sourceEngine: 'query', sourceType: projection.targetType, sourceId: projection.targetRef,
    title, content, keywords,
  }, deps);

  return Ok({ reindexed: r.ok ? 1 : 0 });
}

// ═══════════════════════════════════════════
// AI CONTEXT (3)
// ═══════════════════════════════════════════

export interface BuildAIContextInput {
  tenantId: string; correlationId: string; actorId: string;
  contextType: string; targetRef: string;
  summary: string; facts: Record<string, unknown>;
  sentiment?: number; riskLevel?: string;
}

export async function buildAIContextUseCase(
  input: BuildAIContextInput, deps: QueryUseCaseDeps,
): Promise<Result<{ ctxId: string; version: number }, ValidationError>> {
  const v = buildAIContextSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.aiContextRepo.findByTarget(d.tenantId, d.contextType, d.targetRef);
  const now = deps.clock.now().toISOString();

  if (existing) {
    const newVersion = existing.version + 1;
    await deps.aiContextRepo.update(d.tenantId, existing.id, {
      summary: d.summary, facts: d.facts,
      ...(d.sentiment !== undefined ? { sentiment: d.sentiment } : {}),
      ...(d.riskLevel !== undefined ? { riskLevel: d.riskLevel } : {}),
      version: newVersion, computedAt: now,
    });

    const env: EventEnvelope<{ ctxId: string; contextType: string }> =
      await emitQueryEvent(deps, { aggregateId: existing.id, tenantId: d.tenantId, correlationId: d.correlationId },
        'ai.context.updated', 'ai.context.updated.v1', { ctxId: existing.id, contextType: d.contextType });
    await deps.eventBus.emit(env);

    return Ok({ ctxId: existing.id, version: newVersion });
  }

  const ctxId = deps.idGenerator.generate();
  const ctx: AIContext = {
    id: ctxId, tenantId: d.tenantId, contextType: d.contextType, targetRef: d.targetRef,
    summary: d.summary, facts: d.facts,
    sentiment: d.sentiment ?? null, riskLevel: d.riskLevel ?? null,
    metadata: {}, version: 1, computedAt: now,
  };
  await deps.aiContextRepo.insert(ctx);

  const env: EventEnvelope<{ ctxId: string; contextType: string }> =
    await emitQueryEvent(deps, { aggregateId: ctxId, tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.context.updated', 'ai.context.updated.v1', { ctxId, contextType: d.contextType });
  await deps.eventBus.emit(env);

  return Ok({ ctxId, version: 1 });
}

export async function getAIContextUseCase(
  input: { tenantId: string; contextType: string; targetRef: string }, deps: QueryUseCaseDeps,
): Promise<Result<AIContext | null, ValidationError>> {
  if (!input.tenantId || !input.contextType || !input.targetRef) return Err(new ValidationError('all fields required'));
  return Ok(await deps.aiContextRepo.findByTarget(input.tenantId, input.contextType, input.targetRef));
}

export async function rebuildAIContextUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; projectionId: string },
  deps: QueryUseCaseDeps,
): Promise<Result<{ ctxId: string }, ValidationError | NotFoundError>> {
  const projection = await deps.projectionRepo.findById(input.tenantId, input.projectionId);
  if (!projection) return Err(new NotFoundError('Projection not found'));

  const summary = `Projection ${projection.targetType} for ${projection.targetRef} with ${projection.eventCount} events.`;
  const facts: Record<string, unknown> = {
    targetType: projection.targetType, targetRef: projection.targetRef,
    eventCount: projection.eventCount, version: projection.version,
    lastEventAt: projection.lastEventAt,
  };

  const r = await buildAIContextUseCase({
    tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId,
    contextType: projection.targetType, targetRef: projection.targetRef,
    summary, facts,
  }, deps);

  if (!r.ok) return Err(new ValidationError('Failed to build AI context'));
  return Ok({ ctxId: r.value.ctxId });
}

// ═══════════════════════════════════════════
// ANALYTICS (4)
// ═══════════════════════════════════════════

export async function getMetricsUseCase(
  input: { tenantId: string; type: string; targetRef?: string }, deps: QueryUseCaseDeps,
): Promise<Result<AnalyticsMetrics | null, ValidationError>> {
  const v = getMetricsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const list = await deps.analyticsRepo.findByType(d.tenantId, d.type, 1);
  return Ok(list.length > 0 ? list[0]! : null);
}

export async function getTrendUseCase(
  input: { tenantId: string; type: string; periods?: number }, deps: QueryUseCaseDeps,
): Promise<Result<{ period: string; value: number }[], ValidationError>> {
  if (!input.tenantId || !input.type) return Err(new ValidationError('tenantId and type required'));
  const list = await deps.analyticsRepo.findByType(input.tenantId, input.type, input.periods ?? 10);
  // Combine all trends
  const trends: { period: string; value: number }[] = [];
  for (const m of list) trends.push(...m.trend);
  return Ok(trends);
}

export async function getStatisticsUseCase(
  input: { tenantId: string; type: string }, deps: QueryUseCaseDeps,
): Promise<Result<{ count: number; sum: number; average: number }, ValidationError>> {
  if (!input.tenantId || !input.type) return Err(new ValidationError('tenantId and type required'));
  const list = await deps.analyticsRepo.findByType(input.tenantId, input.type);
  const count = list.reduce((s, m) => s + m.count, 0);
  const sum = list.reduce((s, m) => s + m.sum, 0);
  const average = count > 0 ? sum / count : 0;
  return Ok({ count, sum, average });
}

export async function getTopEntitiesUseCase(
  input: { tenantId: string; type: string; limit?: number }, deps: QueryUseCaseDeps,
): Promise<Result<{ targetRef: string; score: number }[], ValidationError>> {
  if (!input.tenantId || !input.type) return Err(new ValidationError('tenantId and type required'));
  const list = await deps.analyticsRepo.findByType(input.tenantId, input.type);
  const entities: { targetRef: string; score: number }[] = [];
  for (const m of list) {
    if (m.targetRef) entities.push({ targetRef: m.targetRef, score: m.sum });
  }
  entities.sort((a, b) => b.score - a.score);
  return Ok(entities.slice(0, input.limit ?? 10));
}

// ═══════════════════════════════════════════
// LIST PROJECTIONS
// ═══════════════════════════════════════════

export async function listProjectionsUseCase(
  criteria: ProjectionSearchCriteria, deps: QueryUseCaseDeps,
): Promise<Result<ProjectionSearchResult, ValidationError>> {
  if (!criteria.tenantId) return Err(new ValidationError('tenantId required'));
  return Ok(await deps.projectionRepo.search(criteria));
}
