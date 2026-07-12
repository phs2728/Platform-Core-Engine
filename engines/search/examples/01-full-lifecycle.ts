/**
 * Search Engine — Demo
 */
import {
  indexDocumentUseCase, rebuildIndexUseCase,
  searchUseCase, autocompleteUseCase,
  boostUseCase, getSearchStatisticsUseCase, recordSearchUseCase,
  InMemorySearchRepository, InMemoryIndexRepository, InMemoryAutocompleteRepository,
  InMemoryRankingRepository, InMemoryAnalyticsRepository, InMemorySynonymRepository,
  InMemorySearchAuditRepository,
  MockProjectionProvider, MockRankingProvider, MockSynonymProvider,
  MockSpellChecker, StaticSearchPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Search Engine — Demo ═══\n');
  const searchRepo = new InMemorySearchRepository();
  const indexRepo = new InMemoryIndexRepository();
  const autocompleteRepo = new InMemoryAutocompleteRepository();
  const rankingRepo = new InMemoryRankingRepository();
  const analyticsRepo = new InMemoryAnalyticsRepository();
  const synonymRepo = new InMemorySynonymRepository();
  const auditRepo = new InMemorySearchAuditRepository();
  const eventBus = new InMemoryEventBus();
  const projectionProvider = new MockProjectionProvider();
  const rankingProvider = new MockRankingProvider();
  const synonymProvider = new MockSynonymProvider();
  const spellChecker = new MockSpellChecker();
  const policyProvider = new StaticSearchPolicyProvider();
  policyProvider.set('demo', {});

  let idSeq = 0;
  const deps = {
    searchRepo, indexRepo, autocompleteRepo, rankingRepo, analyticsRepo, synonymRepo, auditRepo, eventBus,
    projectionProvider, rankingProvider, synonymProvider, spellChecker, policyProvider,
    idGenerator: { generate: () => `demo-${++idSeq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  const u = <T>(r: { ok: boolean; value?: T }): T => r.value as T;

  // 1) Index documents
  console.log('▶ 1) Index Documents');
  u(await indexDocumentUseCase({ tenantId: 'demo', correlationId: 'd-1', actorId: 'admin', sourceEngine: 'catalog', sourceType: 'catalog_item', sourceId: 'i-1', title: 'Deluxe Sea View Room', content: 'Luxury accommodation with ocean view', keywords: ['luxury', 'ocean'], tags: ['featured'], metadata: { category: 'rooms', price: 200 } }, deps));
  u(await indexDocumentUseCase({ tenantId: 'demo', correlationId: 'd-2', actorId: 'admin', sourceEngine: 'catalog', sourceType: 'catalog_item', sourceId: 'i-2', title: 'Budget Standard Room', content: 'Affordable comfort near downtown', keywords: ['budget'], tags: [], metadata: { category: 'rooms', price: 50 } }, deps));
  u(await indexDocumentUseCase({ tenantId: 'demo', correlationId: 'd-3', actorId: 'admin', sourceEngine: 'review', sourceType: 'review', sourceId: 'r-1', title: 'Amazing Stay', content: 'The luxury room exceeded expectations', keywords: ['luxury'], tags: [], metadata: { rating: 5 } }, deps));
  console.log('  ✓ 3 documents indexed\n');

  // 2) Search
  console.log('▶ 2) Search "luxury"');
  const results = u(await searchUseCase({ tenantId: 'demo', query: 'luxury' }, deps));
  console.log(`  ✓ ${results.total} results in ${results.executionTimeMs}ms\n`);

  // 3) Filtered search
  console.log('▶ 3) Search with price filter');
  const filtered = u(await searchUseCase({ tenantId: 'demo', query: 'room', filters: [{ field: 'price', operator: 'range', value: { min: 0, max: 100 } }] }, deps));
  console.log(`  ✓ ${filtered.total} results under 100\n`);

  // 4) Autocomplete
  console.log('▶ 4) Autocomplete "lux"');
  const ac = u(await autocompleteUseCase({ tenantId: 'demo', prefix: 'lux' }, deps));
  console.log(`  ✓ suggestions: ${ac.join(', ')}\n`);

  // 5) Facets
  console.log('▶ 5) Search with facets');
  const faceted = u(await searchUseCase({ tenantId: 'demo', query: 'room', facets: ['category'] }, deps));
  const facetSummary = faceted.facets.map((f) => `${f.field}: ${f.values.length}`).join(', ');
  console.log(`  ✓ facets: ${facetSummary}\n`);

  // 6) Boost
  console.log('▶ 6) Boost Budget Room');
  rankingProvider.setBoost('demo', 'catalog_item', 'i-2', 5);
  u(await indexDocumentUseCase({ tenantId: 'demo', correlationId: 'd-4', actorId: 'admin', sourceEngine: 'catalog', sourceType: 'catalog_item', sourceId: 'i-2', title: 'Budget Standard Room', content: 'Affordable comfort', metadata: { category: 'rooms', price: 50 } }, deps));
  const boosted = u(await searchUseCase({ tenantId: 'demo', query: 'room' }, deps));
  console.log(`  ✓ top result: ${boosted.results[0]!.document.title}\n`);

  // 7) Analytics
  console.log('▶ 7) Record search + get statistics');
  u(await recordSearchUseCase({ tenantId: 'demo', query: 'luxury', domain: 'global', resultCount: 2, executionTimeMs: 5, clicked: true }, deps));
  const stats = u(await getSearchStatisticsUseCase('demo', deps));
  console.log(`  ✓ totalSearches: ${stats.totalSearches}, CTR: ${stats.clickThroughRate}%\n`);

  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);
  console.log('\n═══ Demo Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
