/**
 * Ranking + Analytics UseCases (8) —
 *   calculateRanking / boost / demote / reindexRanking +
 *   recordSearch / getSearchStatistics / getTrendingKeywords / getNoResultQueries
 */
import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordSearchAudit } from '../domain/audit.js';
import { boostSchema, recordSearchSchema } from '../domain/validation.js';
import { emitSearchEvent } from '../domain/events.js';
import type { SearchUseCaseDeps } from './types.js';
import type { RankingRule, SearchAnalytics, SearchDomain } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// RANKING (4)
// ═══════════════════════════════════════════

export async function calculateRankingUseCase(
  input: { tenantId: string; sourceType: string; sourceId: string },
  deps: SearchUseCaseDeps,
): Promise<Result<{ boost: number; popularity: number; totalScore: number }, ValidationError>> {
  if (!input.tenantId || !input.sourceType) return Err(new ValidationError('tenantId and sourceType required'));
  const boost = await deps.rankingProvider.getBoost(input.tenantId, input.sourceType, input.sourceId);
  const popularity = await deps.rankingProvider.getPopularity(input.tenantId, input.sourceType, input.sourceId);
  const totalScore = boost * 10 + popularity;
  return Ok({ boost, popularity, totalScore });
}

export async function boostUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; name: string; sourceType: string; sourceId?: string; multiplier: number },
  deps: SearchUseCaseDeps,
): Promise<Result<{ ruleId: string }, ValidationError>> {
  const v = boostSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const rid = deps.idGenerator.generate();
  const rule: RankingRule = {
    id: rid, tenantId: d.tenantId, name: d.name,
    sourceType: d.sourceType,
    ...(d.sourceId !== undefined ? { sourceId: d.sourceId } : { sourceId: null }),
    action: 'boost', multiplier: d.multiplier,
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.rankingRepo.insert(rule);

  const env: EventEnvelope<{ ruleId: string; action: string }> =
    await emitSearchEvent(deps, { aggregateId: rid, tenantId: d.tenantId, correlationId: d.correlationId },
      'search.ranking.updated', 'search.ranking.updated.v1', { ruleId: rid, action: 'boost' });
  await deps.eventBus.emit(env);

  return Ok({ ruleId: rid });
}

export async function demoteUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; name: string; sourceType: string; sourceId?: string; multiplier: number },
  deps: SearchUseCaseDeps,
): Promise<Result<{ ruleId: string }, ValidationError>> {
  const v = boostSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const rid = deps.idGenerator.generate();
  const rule: RankingRule = {
    id: rid, tenantId: d.tenantId, name: d.name,
    sourceType: d.sourceType,
    ...(d.sourceId !== undefined ? { sourceId: d.sourceId } : { sourceId: null }),
    action: 'demote', multiplier: d.multiplier < 1 ? d.multiplier : 1 / d.multiplier,
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.rankingRepo.insert(rule);

  const env: EventEnvelope<{ ruleId: string; action: string }> =
    await emitSearchEvent(deps, { aggregateId: rid, tenantId: d.tenantId, correlationId: d.correlationId },
      'search.ranking.updated', 'search.ranking.updated.v1', { ruleId: rid, action: 'demote' });
  await deps.eventBus.emit(env);

  return Ok({ ruleId: rid });
}

export async function reindexRankingUseCase(
  input: { tenantId: string; correlationId: string; actorId: string },
  deps: SearchUseCaseDeps,
): Promise<Result<{ reindexed: number }, ValidationError>> {
  const docs = await deps.searchRepo.findAll(input.tenantId);
  let reindexed = 0;
  const now = deps.clock.now().toISOString();

  for (const doc of docs) {
    const boost = await deps.rankingProvider.getBoost(input.tenantId, doc.sourceType, doc.sourceId);
    const popularity = await deps.rankingProvider.getPopularity(input.tenantId, doc.sourceType, doc.sourceId);
    if (doc.boost !== boost || doc.popularity !== popularity) {
      await deps.searchRepo.update(input.tenantId, doc.id, { boost, popularity });
      reindexed++;
    }
  }

  return Ok({ reindexed });
}

// ═══════════════════════════════════════════
// ANALYTICS (4)
// ═══════════════════════════════════════════

export async function recordSearchUseCase(
  input: {
    tenantId: string; query: string; domain: SearchDomain;
    resultCount: number; executionTimeMs: number;
    clicked: boolean; clickedDocId?: string; userId?: string;
  },
  deps: SearchUseCaseDeps,
): Promise<Result<{ logged: boolean }, ValidationError>> {
  const v = recordSearchSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const id = deps.idGenerator.generate();
  await deps.analyticsRepo.insertLog({
    id, tenantId: d.tenantId, query: d.query, domain: d.domain,
    resultCount: d.resultCount, executionTimeMs: d.executionTimeMs,
    clicked: d.clicked,
    ...(d.clickedDocId !== undefined ? { clickedDocId: d.clickedDocId } : { clickedDocId: null }),
    ...(d.userId !== undefined ? { userId: d.userId } : { userId: null }),
    timestamp: deps.clock.now().toISOString(),
  });

  return Ok({ logged: true });
}

export async function getSearchStatisticsUseCase(
  tenantId: string, deps: SearchUseCaseDeps,
): Promise<Result<SearchAnalytics, ValidationError>> {
  if (!tenantId) return Err(new ValidationError('tenantId required'));

  const logs = await deps.analyticsRepo.getLogs(tenantId, 1000);
  const totalSearches = logs.length;
  const totalClicks = logs.filter((l) => l.clicked).length;
  const clickThroughRate = totalSearches > 0 ? Math.round((totalClicks / totalSearches) * 100) : 0;
  const zeroResultQueries = logs.filter((l) => l.resultCount === 0).length;
  const zeroResultRate = totalSearches > 0 ? Math.round((zeroResultQueries / totalSearches) * 100) : 0;
  const avgResults = totalSearches > 0 ? Math.round(logs.reduce((s, l) => s + l.resultCount, 0) / totalSearches) : 0;

  const topKeywords = await deps.analyticsRepo.getTopKeywords(tenantId, 10);
  const noResultLogs = await deps.analyticsRepo.getZeroResultQueries(tenantId, 10);
  const noResultQueries = noResultLogs.map((l) => l.query);

  // Trending: compute recent keyword frequency delta
  const recentLogs = logs.slice(-50);
  const recentCounts = new Map<string, number>();
  for (const l of recentLogs) recentCounts.set(l.query, (recentCounts.get(l.query) ?? 0) + 1);
  const trendingKeywords = [...recentCounts.entries()]
    .map(([keyword, count]) => ({ keyword, trend: count }))
    .sort((a, b) => b.trend - a.trend)
    .slice(0, 10);

  const stats: SearchAnalytics = {
    id: deps.idGenerator.generate(), tenantId,
    totalSearches, totalClicks, clickThroughRate,
    zeroResultQueries, zeroResultRate, averageResultsPerPage: avgResults,
    topKeywords, trendingKeywords, noResultQueries,
    period: 'all', computedAt: deps.clock.now().toISOString(),
  };

  const env: EventEnvelope<{ totalSearches: number }> =
    await emitSearchEvent(deps, { aggregateId: stats.id, tenantId, correlationId: `stats-${Date.now()}` },
      'search.analytics.updated', 'search.analytics.updated.v1', { totalSearches });
  await deps.eventBus.emit(env);

  return Ok(stats);
}

export async function getTrendingKeywordsUseCase(
  tenantId: string, limit: number, deps: SearchUseCaseDeps,
): Promise<Result<{ keyword: string; count: number }[], ValidationError>> {
  if (!tenantId) return Err(new ValidationError('tenantId required'));
  return Ok(await deps.analyticsRepo.getTopKeywords(tenantId, limit));
}

export async function getNoResultQueriesUseCase(
  tenantId: string, limit: number, deps: SearchUseCaseDeps,
): Promise<Result<string[], ValidationError>> {
  if (!tenantId) return Err(new ValidationError('tenantId required'));
  const logs = await deps.analyticsRepo.getZeroResultQueries(tenantId, limit);
  return Ok([...new Set(logs.map((l) => l.query))]);
}
