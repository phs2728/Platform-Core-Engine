/** Search OS Tests — Intent, Recommendation, Session, AI, Universal Search */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  indexDocumentUseCase,
  recommendUseCase, relatedUseCase, nearbyUseCase, continueSearchUseCase,
  saveSearchUseCase, loadHistoryUseCase, clearHistoryUseCase, pinSearchUseCase,
  parseIntentUseCase, buildAnswerUseCase, explainResultsUseCase,
  universalSearchUseCase, semanticSearchUseCase, hybridSearchUseCase,
} from '../src/index.js';
import { makeDeps, indexDoc } from './helpers.js';

type Deps = ReturnType<typeof makeDeps>;

// ═══════════════════════════════════════════
// 11. Intent Parser (5 tests)
// ═══════════════════════════════════════════
describe('Intent Parser', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('parses keyword intent', async () => {
    const r = await parseIntentUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'luxury hotel' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.parsedQuery).toBe('luxury hotel');
    expect(r.value!.entities.length).toBeGreaterThan(0);
  });

  it('parses natural language intent', async () => {
    const r = await parseIntentUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'family friendly hotel', intentType: 'natural_language' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.type).toBe('natural_language');
  });

  it('extracts rating filter from text', async () => {
    const r = await parseIntentUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'hotel rating > 4.5' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.filters.length).toBeGreaterThan(0);
    const ratingFilter = r.value!.filters.find((f) => f.field === 'rating');
    expect(ratingFilter).toBeDefined();
  });

  it('extracts price filter from text', async () => {
    const r = await parseIntentUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'hotel under 100' }, deps);
    const priceFilter = r.value!.filters.find((f) => f.field === 'price');
    expect(priceFilter).toBeDefined();
    expect(priceFilter!.operator).toBe('lte');
  });

  it('returns empty filters for plain keyword', async () => {
    const r = await parseIntentUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'hotel' }, deps);
    expect(r.value!.filters.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// 12. Recommendation (5 tests)
// ═══════════════════════════════════════════
describe('Recommendation', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('returns trending recommendations', async () => {
    deps.recommendationProvider.addItem({ documentId: 'd-1', sourceType: 'catalog_item', sourceId: 's-1', title: 'Popular Item', score: 90, reason: 'trending' });
    const r = await recommendUseCase({ tenantId: 't-1', type: 'trending' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.items.length).toBe(1);
  });

  it('emits recommendation event', async () => {
    deps.recommendationProvider.addItem({ documentId: 'd-1', sourceType: 'catalog_item', sourceId: 's-1', title: 'X', score: 50, reason: 'popular' });
    await recommendUseCase({ tenantId: 't-1', type: 'popular' }, deps);
    expect(deps.eventBus.countByType('search.recommendation.updated')).toBe(1);
  });

  it('related returns similar items', async () => {
    await indexDoc(deps, { sourceId: 's-1', title: 'Item A', content: 'test' });
    const docs = await deps.searchRepo.findAll('t-1');
    deps.recommendationProvider.addItem({ documentId: docs[0]!.id, sourceType: 'catalog_item', sourceId: 's-1', title: 'Item A', score: 80, reason: 'similar' });
    const r = await relatedUseCase({ tenantId: 't-1', documentId: docs[0]!.id }, deps);
    expect(r.ok).toBe(true);
  });

  it('nearby returns geo results', async () => {
    deps.recommendationProvider.addItem({ documentId: 'd-1', sourceType: 'catalog_item', sourceId: 's-1', title: 'Nearby', score: 70, reason: 'nearby' });
    const r = await nearbyUseCase({ tenantId: 't-1', lat: 41.7, lng: 44.8, radiusKm: 10 }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.length).toBe(1);
  });

  it('continueSearch returns last search', async () => {
    await saveSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'hotel', domain: 'global', resultCount: 5 }, deps);
    const r = await continueSearchUseCase({ tenantId: 't-1', userId: 'u-1' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.query).toBe('hotel');
  });
});

// ═══════════════════════════════════════════
// 13. Session (6 tests)
// ═══════════════════════════════════════════
describe('Session', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('saves search to history', async () => {
    const r = await saveSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'test', domain: 'global', resultCount: 3 }, deps);
    expect(r.ok).toBe(true);
    const history = await deps.historyRepo.findByUser('t-1', 'u-1');
    expect(history.length).toBe(1);
  });

  it('creates session on first search', async () => {
    await saveSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'test', domain: 'catalog', resultCount: 1 }, deps);
    const session = await deps.sessionRepo.findByUser('t-1', 'u-1');
    expect(session).not.toBeNull();
    expect(session!.recentSearches).toContain('test');
    expect(session!.lastCategory).toBe('catalog');
  });

  it('updates recent searches (dedup)', async () => {
    await saveSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'a', domain: 'global', resultCount: 1 }, deps);
    await saveSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'b', domain: 'global', resultCount: 1 }, deps);
    await saveSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'a', domain: 'global', resultCount: 1 }, deps);
    const session = await deps.sessionRepo.findByUser('t-1', 'u-1');
    expect(session!.recentSearches[0]).toBe('a'); // moved to top
    expect(session!.recentSearches.length).toBe(2); // no duplicate
  });

  it('loads history', async () => {
    await saveSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'a', domain: 'global', resultCount: 1 }, deps);
    await saveSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'b', domain: 'global', resultCount: 1 }, deps);
    const r = await loadHistoryUseCase({ tenantId: 't-1', userId: 'u-1' }, deps);
    expect(r.value!.length).toBe(2);
  });

  it('clears history', async () => {
    await saveSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'a', domain: 'global', resultCount: 1 }, deps);
    await clearHistoryUseCase({ tenantId: 't-1', userId: 'u-1' }, deps);
    const r = await loadHistoryUseCase({ tenantId: 't-1', userId: 'u-1' }, deps);
    expect(r.value!.length).toBe(0);
  });

  it('pins a search', async () => {
    await pinSearchUseCase({ tenantId: 't-1', userId: 'u-1', query: 'favorite' }, deps);
    const session = await deps.sessionRepo.findByUser('t-1', 'u-1');
    expect(session!.pinnedSearches).toContain('favorite');
  });
});

// ═══════════════════════════════════════════
// 14. AI Answer (5 tests)
// ═══════════════════════════════════════════
describe('AI Answer', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('builds answer from results', async () => {
    await indexDoc(deps, { title: 'Grand Hotel', content: 'luxury' });
    const docs = await deps.searchRepo.findAll('t-1');
    const r = await buildAnswerUseCase({
      tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'hotel',
      results: [{ document: docs[0]!, score: 10, highlights: [], matchedTerms: ['hotel'] }],
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.summary).toContain('1 results');
    expect(r.value!.bestMatch).not.toBeNull();
  });

  it('answer has nextActions', async () => {
    const r = await buildAnswerUseCase({
      tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'test', results: [],
    }, deps);
    expect(r.value!.nextActions.length).toBeGreaterThan(0);
  });

  it('answer confidence is low with no results', async () => {
    const r = await buildAnswerUseCase({
      tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'test', results: [],
    }, deps);
    expect(r.value!.confidence).toBeLessThan(0.5);
  });

  it('emits ai.answer.created event', async () => {
    await indexDoc(deps, { title: 'Test', content: 'test' });
    const docs = await deps.searchRepo.findAll('t-1');
    await buildAnswerUseCase({
      tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'test',
      results: [{ document: docs[0]!, score: 5, highlights: [], matchedTerms: ['test'] }],
    }, deps);
    expect(deps.eventBus.countByType('search.ai.answer.created')).toBe(1);
  });

  it('explainResults returns explanation', async () => {
    const r = await explainResultsUseCase({ tenantId: 't-1', query: 'test', results: [] }, deps);
    expect(r.ok).toBe(true);
    expect(r.value).toContain('test');
  });
});

// ═══════════════════════════════════════════
// 15. Universal / Semantic / Hybrid Search (7 tests)
// ═══════════════════════════════════════════
describe('Universal / Semantic / Hybrid Search', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('universal search returns results + AI answer', async () => {
    await indexDoc(deps, { title: 'Luxury Hotel', content: 'amazing place' });
    await indexDoc(deps, { sourceId: 'i-2', title: 'Budget Hostel', content: 'cheap place' });
    const r = await universalSearchUseCase({ tenantId: 't-1', query: 'luxury' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.total).toBe(1);
    expect(r.value!.aiAnswer).not.toBeNull();
    expect(r.value!.intent).not.toBeNull();
  });

  it('universal search with no results returns low-confidence answer', async () => {
    const r = await universalSearchUseCase({ tenantId: 't-1', query: 'nonexistent' }, deps);
    expect(r.value!.total).toBe(0);
    expect(r.value!.aiAnswer!.confidence).toBeLessThan(0.5);
  });

  it('universal search emits events', async () => {
    await indexDoc(deps, { title: 'Test', content: 'test' });
    await universalSearchUseCase({ tenantId: 't-1', query: 'test' }, deps);
    expect(deps.eventBus.countByType('search.executed')).toBe(1);
    expect(deps.eventBus.countByType('search.ai.answer.created')).toBe(1);
  });

  it('semantic search parses intent and searches', async () => {
    await indexDoc(deps, { title: 'Family Resort', content: 'great for kids' });
    const r = await semanticSearchUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'family resort' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.intent).not.toBeNull();
    expect(r.value!.results.length).toBeGreaterThan(0);
  });

  it('semantic search returns AI answer', async () => {
    await indexDoc(deps, { title: 'Hotel', content: 'place to stay' });
    const r = await semanticSearchUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'hotel' }, deps);
    expect(r.value!.answer).not.toBeNull();
  });

  it('hybrid search returns both keyword and semantic results', async () => {
    await indexDoc(deps, { title: 'Grand Hotel', content: 'luxury stay' });
    await indexDoc(deps, { sourceId: 'i-2', title: 'Boutique Hotel', content: 'unique experience' });
    const r = await hybridSearchUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'hotel' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.keywordResults.length).toBeGreaterThan(0);
    expect(r.value!.semanticResults.length).toBeGreaterThan(0);
    expect(r.value!.intent).not.toBeNull();
  });

  it('hybrid search handles empty index', async () => {
    const r = await hybridSearchUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', query: 'test' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.keywordResults.length).toBe(0);
  });
});
