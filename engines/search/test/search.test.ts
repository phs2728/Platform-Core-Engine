/** Search Engine — Tests (70+) */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  indexDocumentUseCase, updateDocumentUseCase, deleteDocumentUseCase,
  rebuildIndexUseCase, refreshIndexUseCase, getIndexUseCase, listIndexesUseCase,
  searchUseCase, searchCatalogUseCase, searchOrganizationUseCase, searchReviewUseCase,
  autocompleteUseCase, suggestUseCase, popularSearchesUseCase,
  addSynonymUseCase, getSynonymsUseCase,
  calculateRankingUseCase, boostUseCase, demoteUseCase, reindexRankingUseCase,
  recordSearchUseCase, getSearchStatisticsUseCase, getTrendingKeywordsUseCase, getNoResultQueriesUseCase,
  tokenize, levenshtein, wildcardMatch,
} from '../src/index.js';
import { makeDeps, indexDoc } from './helpers.js';

type Deps = ReturnType<typeof makeDeps>;

// ═══════════════════════════════════════════
// 1. Indexing (8 tests)
// ═══════════════════════════════════════════
describe('Indexing', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('indexes a document', async () => {
    const r = await indexDoc(deps, { title: 'Deluxe Room', content: 'A beautiful deluxe room with sea view' });
    expect(r.ok).toBe(true);
    expect(r.value!.indexed).toBe(true);
  });

  it('upserts existing document', async () => {
    await indexDoc(deps, { sourceId: 'i-1', title: 'V1', content: 'first' });
    const r = await indexDoc(deps, { sourceId: 'i-1', title: 'V2', content: 'second' });
    expect(r.ok).toBe(true);
    const docs = await deps.searchRepo.findAll('t-1');
    expect(docs.length).toBe(1);
    expect(docs[0]!.title).toBe('V2');
  });

  it('tokenizes title and content', async () => {
    await indexDoc(deps, { title: 'Luxury Hotel Suite', content: 'Five star accommodation' });
    const docs = await deps.searchRepo.findAll('t-1');
    expect(docs[0]!.titleTokens).toContain('luxury');
    expect(docs[0]!.titleTokens).toContain('hotel');
    expect(docs[0]!.contentTokens).toContain('five');
    expect(docs[0]!.contentTokens).toContain('star');
  });

  it('deletes a document', async () => {
    const r = await indexDoc(deps, { title: 'Test', content: 'test' });
    const del = await deleteDocumentUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', documentId: r.value!.documentId }, deps);
    expect(del.ok).toBe(true);
    const docs = await deps.searchRepo.findAll('t-1');
    expect(docs.length).toBe(0);
  });

  it('rejects delete of unknown document', async () => {
    const r = await deleteDocumentUseCase({ tenantId: 't-1', correlationId: 'c-2', actorId: 'a', documentId: 'unknown' }, deps);
    expect(r.ok).toBe(false);
  });

  it('extracts facets from metadata', async () => {
    await indexDoc(deps, { title: 'Item', content: 'test', metadata: { category: 'electronics', status: 'active' } });
    const docs = await deps.searchRepo.findAll('t-1');
    expect(docs[0]!.facets.category).toBe('electronics');
    expect(docs[0]!.facets.status).toBe('active');
  });

  it('emits search.document.indexed event', async () => {
    await indexDoc(deps, { title: 'Test', content: 'test' });
    expect(deps.eventBus.countByType('search.document.indexed')).toBe(1);
  });

  it('rebuilds index from projections', async () => {
    // Add projection docs
    deps.projectionProvider.add({
      id: 'p1', tenantId: 't-1', sourceEngine: 'catalog', sourceType: 'catalog_item', sourceId: 's-1',
      title: 'Item A', content: 'Great product', keywords: ['great'], tags: ['featured'],
      metadata: {}, version: 1, updatedAt: '2026-07-11T08:00:00.000Z',
    });
    deps.projectionProvider.add({
      id: 'p2', tenantId: 't-1', sourceEngine: 'catalog', sourceType: 'catalog_item', sourceId: 's-2',
      title: 'Item B', content: 'Another product', keywords: ['another'], tags: [],
      metadata: {}, version: 1, updatedAt: '2026-07-11T08:00:00.000Z',
    });
    const r = await rebuildIndexUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', domain: 'catalog' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.documentCount).toBe(2);
  });
});

// ═══════════════════════════════════════════
// 2. Full Text Search (8 tests)
// ═══════════════════════════════════════════
describe('Full Text Search', () => {
  let deps: Deps;
  beforeEach(async () => { deps = makeDeps(); });

  it('finds by title match', async () => {
    await indexDoc(deps, { title: 'Luxury Hotel', content: 'Great place' });
    await indexDoc(deps, { sourceId: 'i-2', title: 'Budget Hostel', content: 'Cheap place' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'luxury' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.total).toBe(1);
    expect(r.value!.results[0]!.document.title).toBe('Luxury Hotel');
  });

  it('finds by content match', async () => {
    await indexDoc(deps, { title: 'Item A', content: 'This is a luxury product' });
    await indexDoc(deps, { sourceId: 'i-2', title: 'Item B', content: 'Budget option' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'luxury' }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('finds by keyword match', async () => {
    await indexDoc(deps, { title: 'Product', content: 'desc', keywords: ['premium', 'luxury'] });
    const r = await searchUseCase({ tenantId: 't-1', query: 'premium' }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('returns empty for no match', async () => {
    await indexDoc(deps, { title: 'Item A', content: 'test' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'nonexistent' }, deps);
    expect(r.value!.total).toBe(0);
  });

  it('respects limit and offset', async () => {
    for (let i = 0; i < 5; i++) {
      await indexDoc(deps, { sourceId: `i-${i}`, title: `Product ${i}`, content: 'test product' });
    }
    const r = await searchUseCase({ tenantId: 't-1', query: 'product', limit: 2, offset: 0 }, deps);
    expect(r.value!.results.length).toBe(2);
    expect(r.value!.total).toBe(5);
  });

  it('scores title matches higher than content', async () => {
    await indexDoc(deps, { sourceId: 't', title: 'Amazing Product', content: 'standard description' });
    await indexDoc(deps, { sourceId: 'c', title: 'Standard Item', content: 'amazing deal here' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'amazing', sortBy: 'relevance' }, deps);
    expect(r.value!.results[0]!.document.sourceId).toBe('t'); // title match scores higher
  });

  it('sorts by popularity', async () => {
    await indexDoc(deps, { sourceId: 'a', title: 'test', content: 'test' });
    await indexDoc(deps, { sourceId: 'b', title: 'test', content: 'test' });
    deps.rankingProvider.setPopularity('t-1', 'catalog_item', 'b', 100);
    // Re-index to apply popularity
    await indexDoc(deps, { sourceId: 'b', title: 'test', content: 'test' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'test', sortBy: 'popularity' }, deps);
    expect(r.value!.results[0]!.document.sourceId).toBe('b');
  });

  it('sorts by recency', async () => {
    await indexDoc(deps, { sourceId: 'old', title: 'test', content: 'old' });
    await indexDoc(deps, { sourceId: 'new', title: 'test', content: 'new' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'test', sortBy: 'recency' }, deps);
    expect(r.value!.results[0]!.document.sourceId).toBe('new');
  });
});

// ═══════════════════════════════════════════
// 3. Match Types (6 tests)
// ═══════════════════════════════════════════
describe('Match Types', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('prefix match', async () => {
    await indexDoc(deps, { title: 'Programming', content: 'code' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'prog', matchType: 'prefix' }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('exact match', async () => {
    await indexDoc(deps, { title: 'cat', content: 'feline' });
    await indexDoc(deps, { sourceId: 'i-2', title: 'category', content: 'group' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'cat', matchType: 'exact' }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('fuzzy match finds similar terms', async () => {
    await indexDoc(deps, { title: 'booking', content: 'reservation' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'booKing', matchType: 'fuzzy', fuzzyDistance: 1 }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('fuzzy does not match distant terms', async () => {
    await indexDoc(deps, { title: 'hello', content: 'world' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'xyz', matchType: 'fuzzy', fuzzyDistance: 1 }, deps);
    expect(r.value!.total).toBe(0);
  });

  it('wildcard match', async () => {
    await indexDoc(deps, { title: 'testing', content: 'test' });
    await indexDoc(deps, { sourceId: 'i-2', title: 'other', content: 'data' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'test*', matchType: 'wildcard' }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('Levenshtein distance is correct', () => {
    expect(levenshtein('cat', 'cat')).toBe(0);
    expect(levenshtein('cat', 'bat')).toBe(1);
    expect(levenshtein('cat', 'dog')).toBe(3);
  });
});

// ═══════════════════════════════════════════
// 4. Filters & Facets (8 tests)
// ═══════════════════════════════════════════
describe('Filters & Facets', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('filters by category eq', async () => {
    await indexDoc(deps, { sourceId: 'a', title: 'test', content: 'x', metadata: { category: 'electronics' } });
    await indexDoc(deps, { sourceId: 'b', title: 'test', content: 'x', metadata: { category: 'clothing' } });
    const r = await searchUseCase({
      tenantId: 't-1', query: 'test',
      filters: [{ field: 'category', operator: 'eq', value: 'electronics' }],
    }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('filters by numeric range', async () => {
    await indexDoc(deps, { sourceId: 'a', title: 'test', content: 'x', metadata: { price: 100 } });
    await indexDoc(deps, { sourceId: 'b', title: 'test', content: 'x', metadata: { price: 500 } });
    const r = await searchUseCase({
      tenantId: 't-1', query: 'test',
      filters: [{ field: 'price', operator: 'range', value: { min: 50, max: 200 } }],
    }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('filters by status in', async () => {
    await indexDoc(deps, { sourceId: 'a', title: 'test', content: 'x', metadata: { status: 'active' } });
    await indexDoc(deps, { sourceId: 'b', title: 'test', content: 'x', metadata: { status: 'draft' } });
    const r = await searchUseCase({
      tenantId: 't-1', query: 'test',
      filters: [{ field: 'status', operator: 'in', value: ['active', 'published'] }],
    }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('computes category facets', async () => {
    await indexDoc(deps, { sourceId: 'a', title: 'item', content: 'x', metadata: { category: 'electronics' } });
    await indexDoc(deps, { sourceId: 'b', title: 'item', content: 'x', metadata: { category: 'electronics' } });
    await indexDoc(deps, { sourceId: 'c', title: 'item', content: 'x', metadata: { category: 'clothing' } });
    const r = await searchUseCase({
      tenantId: 't-1', query: 'item', facets: ['category'],
    }, deps);
    const catFacet = r.value!.facets.find((f) => f.field === 'category');
    expect(catFacet).toBeDefined();
    expect(catFacet!.values.find((v) => v.value === 'electronics')!.count).toBe(2);
    expect(catFacet!.values.find((v) => v.value === 'clothing')!.count).toBe(1);
  });

  it('computes status facets', async () => {
    await indexDoc(deps, { sourceId: 'a', title: 'item', content: 'x', metadata: { status: 'active' } });
    await indexDoc(deps, { sourceId: 'b', title: 'item', content: 'x', metadata: { status: 'inactive' } });
    const r = await searchUseCase({ tenantId: 't-1', query: 'item', facets: ['status'] }, deps);
    expect(r.value!.facets.length).toBe(1);
  });

  it('combines multiple filters with AND', async () => {
    await indexDoc(deps, { sourceId: 'a', title: 'test', content: 'x', metadata: { category: 'elec', status: 'active' } });
    await indexDoc(deps, { sourceId: 'b', title: 'test', content: 'x', metadata: { category: 'elec', status: 'inactive' } });
    const r = await searchUseCase({
      tenantId: 't-1', query: 'test',
      filters: [
        { field: 'category', operator: 'eq', value: 'elec' },
        { field: 'status', operator: 'eq', value: 'active' },
      ],
    }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('highlight returns highlighted fragments', async () => {
    await indexDoc(deps, { title: 'Amazing Product', content: 'This is amazing' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'amazing', highlight: true }, deps);
    expect(r.value!.results[0]!.highlights.length).toBe(2);
    expect(r.value!.results[0]!.highlights[0]!.fragment).toContain('<em>');
  });

  it('highlight disabled returns empty highlights', async () => {
    await indexDoc(deps, { title: 'Amazing Product', content: 'x' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'amazing', highlight: false }, deps);
    expect(r.value!.results[0]!.highlights.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// 5. Autocomplete (5 tests)
// ═══════════════════════════════════════════
describe('Autocomplete', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('returns autocomplete suggestions from search history', async () => {
    await deps.autocompleteRepo.incrementFrequency('t-1', 'luxury hotel', 'global');
    await deps.autocompleteRepo.incrementFrequency('t-1', 'luxury hotel', 'global');
    await deps.autocompleteRepo.incrementFrequency('t-1', 'budget travel', 'global');
    const r = await autocompleteUseCase({ tenantId: 't-1', prefix: 'lux' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.length).toBe(1);
    expect(r.value![0]).toBe('luxury hotel');
  });

  it('returns suggestions from indexed titles', async () => {
    await indexDoc(deps, { title: 'Programming Guide', content: 'x' });
    await indexDoc(deps, { sourceId: 'i-2', title: 'Program Management', content: 'x' });
    const r = await autocompleteUseCase({ tenantId: 't-1', prefix: 'prog' }, deps);
    expect(r.value!.length).toBeGreaterThan(0);
  });

  it('suggest completes the last word', async () => {
    await deps.autocompleteRepo.incrementFrequency('t-1', 'hotel', 'global');
    const r = await suggestUseCase({ tenantId: 't-1', query: 'luxury ho' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.length).toBeGreaterThan(0);
  });

  it('popular searches returns sorted by frequency', async () => {
    await deps.autocompleteRepo.incrementFrequency('t-1', 'popular', 'global');
    await deps.autocompleteRepo.incrementFrequency('t-1', 'popular', 'global');
    await deps.autocompleteRepo.incrementFrequency('t-1', 'rare', 'global');
    const r = await popularSearchesUseCase('t-1', 10, deps);
    expect(r.value![0]!.term).toBe('popular');
  });

  it('emits autocomplete event', async () => {
    await autocompleteUseCase({ tenantId: 't-1', prefix: 'test' }, deps);
    expect(deps.eventBus.countByType('search.autocomplete')).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 6. Synonyms (4 tests)
// ═══════════════════════════════════════════
describe('Synonyms', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('adds synonym group', async () => {
    const r = await addSynonymUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', terms: ['hotel', 'lodging', 'accommodation'] }, deps);
    expect(r.ok).toBe(true);
  });

  it('getSynonyms returns related terms', async () => {
    deps.synonymProvider.addGroup('s-1', 't-1', ['hotel', 'lodging']);
    const r = await getSynonymsUseCase('t-1', 'hotel', deps);
    expect(r.value).toContain('lodging');
  });

  it('search expands query with synonyms', async () => {
    deps.synonymProvider.addGroup('s-1', 't-1', ['hotel', 'lodging']);
    await indexDoc(deps, { title: 'Great Lodging', content: 'place to stay' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'hotel' }, deps);
    expect(r.value!.total).toBe(1); // found via synonym
  });

  it('returns empty for unknown term', async () => {
    const r = await getSynonymsUseCase('t-1', 'unknown', deps);
    expect(r.value!.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// 7. Ranking (5 tests)
// ═══════════════════════════════════════════
describe('Ranking', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('calculates ranking score', async () => {
    deps.rankingProvider.setBoost('t-1', 'catalog_item', 'i-1', 2.5);
    deps.rankingProvider.setPopularity('t-1', 'catalog_item', 'i-1', 80);
    const r = await calculateRankingUseCase({ tenantId: 't-1', sourceType: 'catalog_item', sourceId: 'i-1' }, deps);
    expect(r.value!.boost).toBe(2.5);
    expect(r.value!.totalScore).toBe(2.5 * 10 + 80);
  });

  it('boosts a document', async () => {
    const r = await boostUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', name: 'Boost Item', sourceType: 'catalog_item', sourceId: 'i-1', multiplier: 3 }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('search.ranking.updated')).toBe(1);
  });

  it('demotes a document', async () => {
    const r = await demoteUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a', name: 'Demote Item', sourceType: 'catalog_item', sourceId: 'i-1', multiplier: 2 }, deps);
    expect(r.ok).toBe(true);
  });

  it('boosted docs rank higher', async () => {
    await indexDoc(deps, { sourceId: 'a', title: 'test', content: 'test' });
    await indexDoc(deps, { sourceId: 'b', title: 'test', content: 'test' });
    deps.rankingProvider.setBoost('t-1', 'catalog_item', 'b', 5);
    await indexDoc(deps, { sourceId: 'b', title: 'test', content: 'test' }); // re-index
    const r = await searchUseCase({ tenantId: 't-1', query: 'test' }, deps);
    expect(r.value!.results[0]!.document.sourceId).toBe('b');
  });

  it('reindex ranking updates all docs', async () => {
    await indexDoc(deps, { sourceId: 'a', title: 'test', content: 'test' });
    deps.rankingProvider.setBoost('t-1', 'catalog_item', 'a', 5);
    const r = await reindexRankingUseCase({ tenantId: 't-1', correlationId: 'c-1', actorId: 'a' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.reindexed).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 8. Analytics (6 tests)
// ═══════════════════════════════════════════
describe('Analytics', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('records a search', async () => {
    const r = await recordSearchUseCase({ tenantId: 't-1', query: 'test', domain: 'global', resultCount: 5, executionTimeMs: 10, clicked: true }, deps);
    expect(r.ok).toBe(true);
  });

  it('getSearchStatistics returns aggregated stats', async () => {
    await recordSearchUseCase({ tenantId: 't-1', query: 'hotel', domain: 'global', resultCount: 5, executionTimeMs: 10, clicked: true }, deps);
    await recordSearchUseCase({ tenantId: 't-1', query: 'hotel', domain: 'global', resultCount: 0, executionTimeMs: 5, clicked: false }, deps);
    const r = await getSearchStatisticsUseCase('t-1', deps);
    expect(r.value!.totalSearches).toBe(2);
    expect(r.value!.totalClicks).toBe(1);
    expect(r.value!.zeroResultQueries).toBe(1);
  });

  it('getTrendingKeywords returns top keywords', async () => {
    await recordSearchUseCase({ tenantId: 't-1', query: 'popular', domain: 'global', resultCount: 1, executionTimeMs: 1, clicked: false }, deps);
    await recordSearchUseCase({ tenantId: 't-1', query: 'popular', domain: 'global', resultCount: 1, executionTimeMs: 1, clicked: false }, deps);
    await recordSearchUseCase({ tenantId: 't-1', query: 'rare', domain: 'global', resultCount: 1, executionTimeMs: 1, clicked: false }, deps);
    const r = await getTrendingKeywordsUseCase('t-1', 10, deps);
    expect(r.value![0]!.keyword).toBe('popular');
    expect(r.value![0]!.count).toBe(2);
  });

  it('getNoResultQueries returns zero-result queries', async () => {
    await recordSearchUseCase({ tenantId: 't-1', query: 'found', domain: 'global', resultCount: 5, executionTimeMs: 1, clicked: false }, deps);
    await recordSearchUseCase({ tenantId: 't-1', query: 'notfound', domain: 'global', resultCount: 0, executionTimeMs: 1, clicked: false }, deps);
    const r = await getNoResultQueriesUseCase('t-1', 10, deps);
    expect(r.value).toContain('notfound');
  });

  it('click through rate is computed', async () => {
    await recordSearchUseCase({ tenantId: 't-1', query: 'a', domain: 'global', resultCount: 1, executionTimeMs: 1, clicked: true }, deps);
    await recordSearchUseCase({ tenantId: 't-1', query: 'b', domain: 'global', resultCount: 1, executionTimeMs: 1, clicked: false }, deps);
    const r = await getSearchStatisticsUseCase('t-1', deps);
    expect(r.value!.clickThroughRate).toBe(50);
  });

  it('emits analytics event', async () => {
    await recordSearchUseCase({ tenantId: 't-1', query: 'x', domain: 'global', resultCount: 0, executionTimeMs: 1, clicked: false }, deps);
    await getSearchStatisticsUseCase('t-1', deps);
    expect(deps.eventBus.countByType('search.analytics.updated')).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 9. Domain Search + Events (6 tests)
// ═══════════════════════════════════════════
describe('Domain Search + Events', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('searchCatalog searches catalog domain', async () => {
    await indexDoc(deps, { sourceType: 'catalog_item', title: 'Product A', content: 'great' });
    await indexDoc(deps, { sourceId: 'r-1', sourceType: 'review', sourceEngine: 'review', title: 'Product A Review', content: 'great' });
    const r = await searchCatalogUseCase({ tenantId: 't-1', query: 'product' }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('searchReview searches review domain', async () => {
    await indexDoc(deps, { sourceId: 'r-1', sourceType: 'review', sourceEngine: 'review', title: 'Great Experience', content: 'amazing' });
    const r = await searchReviewUseCase({ tenantId: 't-1', query: 'great' }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('searchOrganization searches organization domain', async () => {
    await indexDoc(deps, { sourceId: 'o-1', sourceType: 'organization', sourceEngine: 'organization', title: 'Acme Corp', content: 'company' });
    const r = await searchOrganizationUseCase({ tenantId: 't-1', query: 'acme' }, deps);
    expect(r.value!.total).toBe(1);
  });

  it('global search searches all domains', async () => {
    await indexDoc(deps, { sourceType: 'catalog_item', title: 'Special', content: 'x' });
    await indexDoc(deps, { sourceId: 'r-1', sourceType: 'review', sourceEngine: 'review', title: 'Special Review', content: 'x' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'special' }, deps);
    expect(r.value!.total).toBe(2);
  });

  it('emits search.executed event', async () => {
    await indexDoc(deps, { title: 'test', content: 'test' });
    await searchUseCase({ tenantId: 't-1', query: 'test' }, deps);
    expect(deps.eventBus.countByType('search.executed')).toBe(1);
  });

  it('spell correction returns suggestions', async () => {
    deps.spellChecker.addCorrection('hotle', 'hotel');
    await indexDoc(deps, { title: 'Grand Hotel', content: 'luxury' });
    const r = await searchUseCase({ tenantId: 't-1', query: 'hotle' }, deps);
    expect(r.value!.correctedQuery).toBe('hotel');
  });
});

// ═══════════════════════════════════════════
// 10. Tokenizer (4 tests)
// ═══════════════════════════════════════════
describe('Tokenizer', () => {
  it('tokenizes simple text', () => {
    const tokens = tokenize('Hello World');
    expect(tokens).toEqual(['hello', 'world']);
  });

  it('removes stop words', () => {
    const tokens = tokenize('the quick brown fox');
    expect(tokens).not.toContain('the');
    expect(tokens).toContain('quick');
  });

  it('lowercases all tokens', () => {
    const tokens = tokenize('LUXURY Hotel');
    expect(tokens).toContain('luxury');
    expect(tokens).toContain('hotel');
  });

  it('wildcard match works', () => {
    expect(wildcardMatch('test*', 'testing')).toBe(true);
    expect(wildcardMatch('test*', 'other')).toBe(false);
    expect(wildcardMatch('h?t', 'hot')).toBe(true);
  });
});
