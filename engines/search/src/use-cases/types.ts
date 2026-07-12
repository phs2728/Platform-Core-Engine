/** Search Engine — Shared Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  ISearchRepository, IIndexRepository, IAutocompleteRepository,
  IRankingRepository, IAnalyticsRepository, ISynonymRepository, ISearchAuditRepository,
  IProjectionProvider, IRankingProvider, ISynonymProvider, ISpellChecker, ICustomDataPolicyProvider,
  IIntentParserProvider, IRecommendationProvider, IAIProvider, ISearchProviderPlugin,
  IRecommendationRepository, ISessionRepository, IHistoryRepository,
} from '../interfaces/index.js';

export interface SearchUseCaseDeps {
  // Sprint 1 repos
  searchRepo: ISearchRepository;
  indexRepo: IIndexRepository;
  autocompleteRepo: IAutocompleteRepository;
  rankingRepo: IRankingRepository;
  analyticsRepo: IAnalyticsRepository;
  synonymRepo: ISynonymRepository;
  auditRepo: ISearchAuditRepository;
  // Sprint 2 repos (Search OS)
  recommendationRepo: IRecommendationRepository;
  sessionRepo: ISessionRepository;
  historyRepo: IHistoryRepository;
  // Host providers
  projectionProvider: IProjectionProvider;
  rankingProvider: IRankingProvider;
  synonymProvider: ISynonymProvider;
  spellChecker: ISpellChecker;
  policyProvider: ICustomDataPolicyProvider;
  intentParserProvider: IIntentParserProvider;
  recommendationProvider: IRecommendationProvider;
  aiProvider: IAIProvider;
  searchProviderPlugin: ISearchProviderPlugin;
  // Infra
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
