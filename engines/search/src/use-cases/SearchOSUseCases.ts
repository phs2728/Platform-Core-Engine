/**
 * Search OS UseCases (14) —
 *   Recommendation (4): recommend / related / nearby / continueSearch
 *   Session (4): saveSearch / loadHistory / clearHistory / pinSearch
 *   AI (3): parseIntent / buildAnswer / explainResults
 *   Provider (3): universalSearch / semanticSearch / hybridSearch
 */
import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordSearchAudit } from '../domain/audit.js';
import { emitSearchEvent } from '../domain/events.js';
import { parseIntent, extractFiltersFromText } from '../intent/intentParser.js';
import type { SearchUseCaseDeps } from './types.js';
import type {
  Recommendation, RecommendationItem, RecommendationType,
  SearchSession, SearchHistoryEntry, AIAnswer, SearchIntent, IntentType,
  SearchQuery, SearchResponse, SearchResult,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// RECOMMENDATION (4)
// ═══════════════════════════════════════════

export async function recommendUseCase(
  input: { tenantId: string; type: RecommendationType; targetRef?: string; limit?: number },
  deps: SearchUseCaseDeps,
): Promise<Result<Recommendation, ValidationError>> {
  if (!input.tenantId || !input.type) return Err(new ValidationError('tenantId and type required'));

  const providerResult = await deps.recommendationProvider.getRecommendations(
    input.tenantId, input.type, input.targetRef,
  );

  const items = providerResult.ok ? providerResult.value.slice(0, input.limit ?? 10) : [];
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const rec: Recommendation = {
    id, tenantId: input.tenantId,
    type: input.type,
    targetRef: input.targetRef ?? null,
    targetType: 'user',
    items,
    reason: `Recommended based on ${input.type}`,
    createdAt: now,
  };

  await deps.recommendationRepo.insert(rec);

  const env: EventEnvelope<{ recId: string; type: string; count: number }> =
    await emitSearchEvent(deps, { aggregateId: id, tenantId: input.tenantId, correlationId: `rec-${id}` },
      'search.recommendation.updated', 'search.recommendation.updated.v1',
      { recId: id, type: input.type, count: items.length });
  await deps.eventBus.emit(env);

  return Ok(rec);
}

export async function relatedUseCase(
  input: { tenantId: string; documentId: string; limit?: number },
  deps: SearchUseCaseDeps,
): Promise<Result<RecommendationItem[], ValidationError | NotFoundError>> {
  const doc = await deps.searchRepo.findById(input.tenantId, input.documentId);
  if (!doc) return Err(new NotFoundError('Document not found'));

  const r = await deps.recommendationProvider.getSimilar(input.tenantId, input.documentId);
  return Ok(r.ok ? r.value.slice(0, input.limit ?? 5) : []);
}

export async function nearbyUseCase(
  input: { tenantId: string; lat: number; lng: number; radiusKm: number; limit?: number },
  deps: SearchUseCaseDeps,
): Promise<Result<RecommendationItem[], ValidationError>> {
  if (!input.tenantId) return Err(new ValidationError('tenantId required'));
  const r = await deps.recommendationProvider.getNearby(input.tenantId, { lat: input.lat, lng: input.lng, radiusKm: input.radiusKm });
  return Ok(r.ok ? r.value.slice(0, input.limit ?? 10) : []);
}

export async function continueSearchUseCase(
  input: { tenantId: string; userId: string },
  deps: SearchUseCaseDeps,
): Promise<Result<SearchHistoryEntry | null, ValidationError>> {
  if (!input.tenantId || !input.userId) return Err(new ValidationError('tenantId and userId required'));
  const history = await deps.historyRepo.findByUser(input.tenantId, input.userId, 1);
  return Ok(history.length > 0 ? history[0]! : null);
}

// ═══════════════════════════════════════════
// SESSION (4)
// ═══════════════════════════════════════════

export async function saveSearchUseCase(
  input: { tenantId: string; userId: string; query: string; domain: import('../interfaces/index.js').SearchDomain; resultCount: number },
  deps: SearchUseCaseDeps,
): Promise<Result<{ saved: boolean }, ValidationError>> {
  if (!input.tenantId || !input.userId || !input.query) return Err(new ValidationError('tenantId, userId, query required'));

  // Save to history
  const entry: SearchHistoryEntry = {
    id: deps.idGenerator.generate(),
    tenantId: input.tenantId, userId: input.userId,
    query: input.query, domain: input.domain, resultCount: input.resultCount,
    timestamp: deps.clock.now().toISOString(),
  };
  await deps.historyRepo.insert(entry);

  // Update session
  let session = await deps.sessionRepo.findByUser(input.tenantId, input.userId);
  const now = deps.clock.now().toISOString();

  if (!session) {
    const sid = deps.idGenerator.generate();
    session = {
      id: sid, tenantId: input.tenantId, userId: input.userId,
      recentSearches: [input.query], pinnedSearches: [], savedFilters: [],
      lastCategory: input.domain, lastActiveAt: now, createdAt: now,
    };
    await deps.sessionRepo.upsert(session);
  } else {
    const recent = [input.query, ...session.recentSearches.filter((q) => q !== input.query)].slice(0, 20);
    await deps.sessionRepo.update(input.tenantId, session.id, {
      recentSearches: recent, lastCategory: input.domain, lastActiveAt: now,
    });
  }

  const env: EventEnvelope<{ userId: string; query: string }> =
    await emitSearchEvent(deps, { aggregateId: 'session', tenantId: input.tenantId, correlationId: `sess-${Date.now()}` },
      'search.session.saved', 'search.session.saved.v1', { userId: input.userId, query: input.query });
  await deps.eventBus.emit(env);

  return Ok({ saved: true });
}

export async function loadHistoryUseCase(
  input: { tenantId: string; userId: string; limit?: number },
  deps: SearchUseCaseDeps,
): Promise<Result<SearchHistoryEntry[], ValidationError>> {
  if (!input.tenantId || !input.userId) return Err(new ValidationError('tenantId and userId required'));
  return Ok(await deps.historyRepo.findByUser(input.tenantId, input.userId, input.limit ?? 20));
}

export async function clearHistoryUseCase(
  input: { tenantId: string; userId: string },
  deps: SearchUseCaseDeps,
): Promise<Result<{ cleared: boolean }, ValidationError>> {
  if (!input.tenantId || !input.userId) return Err(new ValidationError('tenantId and userId required'));
  await deps.historyRepo.clearByUser(input.tenantId, input.userId);
  return Ok({ cleared: true });
}

export async function pinSearchUseCase(
  input: { tenantId: string; userId: string; query: string },
  deps: SearchUseCaseDeps,
): Promise<Result<{ pinned: boolean }, ValidationError | NotFoundError>> {
  let session = await deps.sessionRepo.findByUser(input.tenantId, input.userId);
  if (!session) {
    const sid = deps.idGenerator.generate();
    const now = deps.clock.now().toISOString();
    session = {
      id: sid, tenantId: input.tenantId, userId: input.userId,
      recentSearches: [], pinnedSearches: [input.query], savedFilters: [],
      lastCategory: null, lastActiveAt: now, createdAt: now,
    };
    await deps.sessionRepo.upsert(session);
  } else {
    const pinned = [...new Set([...session.pinnedSearches, input.query])];
    await deps.sessionRepo.update(input.tenantId, session.id, { pinnedSearches: pinned });
  }
  return Ok({ pinned: true });
}

// ═══════════════════════════════════════════
// AI (3)
// ═══════════════════════════════════════════

export async function parseIntentUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; query: string; intentType?: IntentType },
  deps: SearchUseCaseDeps,
): Promise<Result<SearchIntent, ValidationError>> {
  if (!input.tenantId || !input.query) return Err(new ValidationError('tenantId and query required'));
  const type = input.intentType ?? 'keyword';
  const r = await parseIntent(deps.intentParserProvider, input.query, type, input.tenantId, deps.idGenerator, deps.clock);
  if (!r.ok) return Err(new ValidationError(`Intent parsing failed: ${r.error.message}`));

  // Extract filters from text
  const textFilters = extractFiltersFromText(input.query);
  if (textFilters.length > 0) {
    const intent = r.value;
    intent.filters = [...intent.filters, ...textFilters];
  }

  return Ok(r.value);
}

export async function buildAnswerUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; query: string; results: SearchResult[] },
  deps: SearchUseCaseDeps,
): Promise<Result<AIAnswer, ValidationError>> {
  if (!input.tenantId || !input.query) return Err(new ValidationError('tenantId and query required'));

  const r = await deps.aiProvider.buildAnswer(input.tenantId, input.query, input.results);
  if (!r.ok) return Err(new ValidationError(`AI answer failed: ${r.error.message}`));

  const env: EventEnvelope<{ answerId: string; query: string }> =
    await emitSearchEvent(deps, { aggregateId: r.value.id, tenantId: input.tenantId, correlationId: input.correlationId },
      'search.ai.answer.created', 'search.ai.answer.created.v1', { answerId: r.value.id, query: input.query });
  await deps.eventBus.emit(env);

  await recordSearchAudit(deps.auditRepo, {
    tenantId: input.tenantId, actorId: input.actorId, correlationId: input.correlationId,
    eventType: 'search_executed', metadata: { ai: true, query: input.query, confidence: r.value.confidence },
  });

  return Ok(r.value);
}

export async function explainResultsUseCase(
  input: { tenantId: string; query: string; results: SearchResult[] },
  deps: SearchUseCaseDeps,
): Promise<Result<string, ValidationError>> {
  if (!input.tenantId || !input.query) return Err(new ValidationError('tenantId and query required'));
  const r = await deps.aiProvider.explainResults(input.tenantId, input.query, input.results);
  if (!r.ok) return Err(new ValidationError(`Explain failed: ${r.error.message}`));
  return Ok(r.value);
}

// ═══════════════════════════════════════════
// UNIVERSAL SEARCH (1) — search all domains + AI answer
// ═══════════════════════════════════════════

export async function universalSearchUseCase(
  query: SearchQuery, deps: SearchUseCaseDeps,
): Promise<Result<SearchResponse & { aiAnswer: AIAnswer | null; intent: SearchIntent | null }, ValidationError>> {
  // 1. Parse intent
  const intentResult = await parseIntentUseCase({
    tenantId: query.tenantId, correlationId: `us-${Date.now()}`, actorId: 'system',
    query: query.query, intentType: 'natural_language',
  }, deps);

  // 2. Merge intent filters into query
  const mergedQuery: SearchQuery = { ...query };
  if (intentResult.ok && intentResult.value.filters.length > 0) {
    mergedQuery.filters = [...(query.filters ?? []), ...intentResult.value.filters];
    mergedQuery.query = intentResult.value.parsedQuery || query.query;
  }

  // 3. Execute search (reuse core search logic via provider plugin)
  const docs = await deps.searchRepo.findAll(query.tenantId);
  const searchResult = await deps.searchProviderPlugin.search(mergedQuery, docs);

  const results = searchResult.ok ? searchResult.value : [];
  const total = results.length;
  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;
  const paged = results.slice(offset, offset + limit);

  // 4. Build AI answer
  let aiAnswer: AIAnswer | null = null;
  const aiResult = await deps.aiProvider.buildAnswer(query.tenantId, query.query, paged);
  if (aiResult.ok) {
    aiAnswer = aiResult.value;
    const env: EventEnvelope<{ answerId: string }> =
      await emitSearchEvent(deps, { aggregateId: aiAnswer.id, tenantId: query.tenantId, correlationId: `us-${Date.now()}` },
        'search.ai.answer.created', 'search.ai.answer.created.v1', { answerId: aiAnswer.id });
    await deps.eventBus.emit(env);
  }

  // 5. Emit search event
  const env: EventEnvelope<{ query: string; total: number }> =
    await emitSearchEvent(deps, { aggregateId: 'search', tenantId: query.tenantId, correlationId: `us-${Date.now()}` },
      'search.executed', 'search.executed.v1', { query: query.query, total });
  await deps.eventBus.emit(env);

  return Ok({
    results: paged, total, limit, offset,
    facets: [], executionTimeMs: 0,
    correctedQuery: null, suggestions: [],
    aiAnswer,
    intent: intentResult.ok ? intentResult.value : null,
  });
}

// ═══════════════════════════════════════════
// SEMANTIC SEARCH (1) — AI-enhanced search
// ═══════════════════════════════════════════

export async function semanticSearchUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; query: string; limit?: number },
  deps: SearchUseCaseDeps,
): Promise<Result<{ results: SearchResult[]; intent: SearchIntent | null; answer: AIAnswer | null }, ValidationError>> {
  // Parse intent via AI
  const intentResult = await parseIntentUseCase({
    tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId,
    query: input.query, intentType: 'natural_language',
  }, deps);

  const parsedQuery = intentResult.ok ? intentResult.value.parsedQuery : input.query;

  // Search using parsed query
  const docs = await deps.searchRepo.findAll(input.tenantId);
  const searchQuery: SearchQuery = {
    tenantId: input.tenantId, query: parsedQuery,
    limit: input.limit ?? 20,
  };
  const searchResult = await deps.searchProviderPlugin.search(searchQuery, docs);
  const results = searchResult.ok ? searchResult.value : [];

  // Build answer
  let answer: AIAnswer | null = null;
  const aiResult = await deps.aiProvider.buildAnswer(input.tenantId, input.query, results);
  if (aiResult.ok) answer = aiResult.value;

  return Ok({
    results,
    intent: intentResult.ok ? intentResult.value : null,
    answer,
  });
}

// ═══════════════════════════════════════════
// HYBRID SEARCH (1) — combines keyword + AI
// ═══════════════════════════════════════════

export async function hybridSearchUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; query: string; limit?: number },
  deps: SearchUseCaseDeps,
): Promise<Result<{ keywordResults: SearchResult[]; semanticResults: SearchResult[]; intent: SearchIntent | null }, ValidationError>> {
  // Keyword search
  const docs = await deps.searchRepo.findAll(input.tenantId);
  const keywordQuery: SearchQuery = {
    tenantId: input.tenantId, query: input.query,
    matchType: 'full_text', limit: input.limit ?? 10,
  };
  const keywordResult = await deps.searchProviderPlugin.search(keywordQuery, docs);
  const keywordResults = keywordResult.ok ? keywordResult.value : [];

  // Semantic search (via AI intent parsing)
  const intentResult = await parseIntentUseCase({
    tenantId: input.tenantId, correlationId: input.correlationId, actorId: input.actorId,
    query: input.query, intentType: 'natural_language',
  }, deps);
  const parsedQuery = intentResult.ok ? intentResult.value.parsedQuery : input.query;

  const semanticQuery: SearchQuery = {
    tenantId: input.tenantId, query: parsedQuery,
    matchType: 'fuzzy', fuzzyDistance: 2, limit: input.limit ?? 10,
  };
  const semanticResult = await deps.searchProviderPlugin.search(semanticQuery, docs);
  const semanticResults = semanticResult.ok ? semanticResult.value : [];

  return Ok({
    keywordResults,
    semanticResults,
    intent: intentResult.ok ? intentResult.value : null,
  });
}
