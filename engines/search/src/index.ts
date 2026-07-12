/**
 * Search Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 6 — Universal Search Engine.
 *   Consumes Query Engine projections → builds inverted index → provides search API.
 *
 * Sprint 1 Use Cases: 35
 *   Index (7) + Search/Autocomplete/Synonym (14) + Ranking/Analytics (8) + domain search (7 as wrappers)
 */
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

export type {
  IndexedDocument, SearchIndex, SearchResult, SearchHighlight,
  SearchFacet, SearchQuery, SearchFilter, SearchResponse,
  AutocompleteEntry, RankingRule, SearchAnalytics, SearchLog,
  SynonymGroup, SpellCorrection, ProjectionSearchDoc,
  SearchDomain, SearchMatchType, IndexType, IndexStatus, FacetType, SortBy,
  SearchAuditRecord, SearchAuditEventType,
} from './interfaces/index.js';

export type {
  IClock, IIdGenerator, IEventBus,
  IProjectionProvider, IRankingProvider, ISynonymProvider, ISpellChecker, ICustomDataPolicyProvider,
} from './interfaces/index.js';

export type {
  ISearchRepository, IIndexRepository, IAutocompleteRepository,
  IRankingRepository, IAnalyticsRepository, ISynonymRepository, ISearchAuditRepository,
} from './interfaces/index.js';

// Index UseCases (7)
export {
  indexDocumentUseCase, updateDocumentUseCase, deleteDocumentUseCase,
  rebuildIndexUseCase, refreshIndexUseCase, getIndexUseCase, listIndexesUseCase,
  type IndexDocumentInput,
} from './use-cases/IndexUseCases.js';

// Search + Autocomplete UseCases (14)
export {
  searchUseCase, searchCatalogUseCase, searchOrganizationUseCase,
  searchBookingUseCase, searchReviewUseCase, searchMediaUseCase,
  searchUserUseCase, searchPaymentUseCase,
  autocompleteUseCase, suggestUseCase, popularSearchesUseCase,
  addSynonymUseCase, getSynonymsUseCase,
} from './use-cases/SearchUseCases.js';

// Ranking + Analytics UseCases (8)
export {
  calculateRankingUseCase, boostUseCase, demoteUseCase, reindexRankingUseCase,
  recordSearchUseCase, getSearchStatisticsUseCase, getTrendingKeywordsUseCase, getNoResultQueriesUseCase,
} from './use-cases/RankingAnalyticsUseCases.js';

// Core search functions (for testing)
export {
  tokenize, matchDocument, levenshtein, wildcardMatch,
  applyFilters, highlightMatch, computeFacets,
} from './domain/searchEngine.js';

export type { SearchUseCaseDeps } from './use-cases/types.js';

// ═══════════════════════════════════════════
// Search OS — Types
// ═══════════════════════════════════════════
export type {
  SearchIntent, IntentEntity, IntentType,
  Recommendation, RecommendationItem, RecommendationType,
  SearchSession, SavedFilter, SearchHistoryEntry,
  AIAnswer,
  SearchProviderType,
  IIntentParserProvider, IRecommendationProvider, IAIProvider, ISearchProviderPlugin,
  IRecommendationRepository, ISessionRepository, IHistoryRepository,
} from './interfaces/index.js';

// ═══════════════════════════════════════════
// Search OS — UseCases (14)
// ═══════════════════════════════════════════
export {
  recommendUseCase, relatedUseCase, nearbyUseCase, continueSearchUseCase,
  saveSearchUseCase, loadHistoryUseCase, clearHistoryUseCase, pinSearchUseCase,
  parseIntentUseCase, buildAnswerUseCase, explainResultsUseCase,
  universalSearchUseCase, semanticSearchUseCase, hybridSearchUseCase,
} from './use-cases/SearchOSUseCases.js';

// ═══════════════════════════════════════════
// Intent Parser
// ═══════════════════════════════════════════
export { parseKeywordIntent, extractFiltersFromText } from './intent/intentParser.js';

// In-Memory Repositories
export {
  InMemorySearchRepository, InMemoryIndexRepository, InMemoryAutocompleteRepository,
  InMemoryRankingRepository, InMemoryAnalyticsRepository, InMemorySynonymRepository,
  InMemorySearchAuditRepository,
  InMemoryRecommendationRepository, InMemorySessionRepository, InMemoryHistoryRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Stubs
export {
  MockProjectionProvider, MockRankingProvider, MockSynonymProvider,
  MockSpellChecker, StaticSearchPolicyProvider, InMemoryEventBus, type RecordedEnvelope,
  MockIntentParserProvider, MockRecommendationProvider, MockAIProvider,
  MemorySearchProviderPlugin,
} from './infrastructure/hostAdapters.js';
