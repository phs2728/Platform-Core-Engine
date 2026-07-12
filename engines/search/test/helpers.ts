/** Test fixtures — Search Engine */
import type { SearchUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemorySearchRepository, InMemoryIndexRepository, InMemoryAutocompleteRepository,
  InMemoryRankingRepository, InMemoryAnalyticsRepository, InMemorySynonymRepository,
  InMemorySearchAuditRepository,
  MockProjectionProvider, MockRankingProvider, MockSynonymProvider,
  MockSpellChecker, StaticSearchPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): SearchUseCaseDeps & {
  searchRepo: InMemorySearchRepository; indexRepo: InMemoryIndexRepository;
  autocompleteRepo: InMemoryAutocompleteRepository; rankingRepo: InMemoryRankingRepository;
  analyticsRepo: InMemoryAnalyticsRepository; synonymRepo: InMemorySynonymRepository;
  auditRepo: InMemorySearchAuditRepository;
  projectionProvider: MockProjectionProvider; rankingProvider: MockRankingProvider;
  synonymProvider: MockSynonymProvider; spellChecker: MockSpellChecker;
  policyProvider: StaticSearchPolicyProvider; eventBus: InMemoryEventBus;
  idGenerator: { generate(): string }; clock: { now(): Date };
} {
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

  policyProvider.set('t-1', { allowedDomains: ['catalog', 'organization', 'booking', 'review', 'media', 'user', 'payment', 'global'] });

  let idCounter = 0;
  const idGenerator = {
    generate(): string { idCounter++; return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`; },
  };

  return {
    searchRepo, indexRepo, autocompleteRepo, rankingRepo, analyticsRepo, synonymRepo,
    auditRepo, eventBus, projectionProvider, rankingProvider, synonymProvider, spellChecker,
    policyProvider, idGenerator, clock: makeClock(),
  };
}

/** Helper: index a document for testing */
export async function indexDoc(deps: ReturnType<typeof makeDeps>, opts: {
  tenantId?: string; sourceEngine?: string; sourceType?: string; sourceId?: string;
  title: string; content: string; keywords?: string[]; tags?: string[];
  metadata?: Record<string, unknown>;
}) {
  const { indexDocumentUseCase } = await import('../src/index.js');
  const r = await indexDocumentUseCase({
    tenantId: opts.tenantId ?? 't-1', correlationId: 'c-1', actorId: 'tester',
    sourceEngine: opts.sourceEngine ?? 'catalog', sourceType: opts.sourceType ?? 'catalog_item',
    sourceId: opts.sourceId ?? `item-${Date.now()}`,
    title: opts.title, content: opts.content,
    keywords: opts.keywords, tags: opts.tags, metadata: opts.metadata,
  }, deps);
  return r;
}
