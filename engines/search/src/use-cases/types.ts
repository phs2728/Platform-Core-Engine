/** Search Engine — Shared Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  ISearchRepository, IIndexRepository, IAutocompleteRepository,
  IRankingRepository, IAnalyticsRepository, ISynonymRepository, ISearchAuditRepository,
  IProjectionProvider, IRankingProvider, ISynonymProvider, ISpellChecker, ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface SearchUseCaseDeps {
  searchRepo: ISearchRepository;
  indexRepo: IIndexRepository;
  autocompleteRepo: IAutocompleteRepository;
  rankingRepo: IRankingRepository;
  analyticsRepo: IAnalyticsRepository;
  synonymRepo: ISynonymRepository;
  auditRepo: ISearchAuditRepository;
  projectionProvider: IProjectionProvider;
  rankingProvider: IRankingProvider;
  synonymProvider: ISynonymProvider;
  spellChecker: ISpellChecker;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
