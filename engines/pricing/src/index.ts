/**
 * Pricing Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Business Foundation Phase 4:
 *   가격 정책 관리 엔진 (계산 ❌). Organization Ownership + CustomDataPolicy.
 */

export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

export type {
  PricingPlan, Price, PriceComponent, Currency, ExchangeRate,
  TierPricing, TierEntry, TimePricing, TimeSchedule,
  PriceVersion, PriceHistory,
  PricingStatus, Money,
  PricingSearchCriteria, PricingSearchResult,
  PricingAuditRecord, PricingAuditEventType,
} from './interfaces/index.js';

export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, ICatalogVerifier, ICustomDataPolicyProvider,
  IPricingPlanRepository, IPriceRepository, IPriceComponentRepository,
  ITierPricingRepository, ITimePricingRepository,
  ICurrencyRepository, IExchangeRateRepository,
  IPriceVersionRepository, IPriceHistoryRepository, IPricingAuditRepository,
} from './interfaces/index.js';

export {
  createPricingPlanUseCase, updatePricingPlanUseCase,
  archivePricingPlanUseCase, restorePricingPlanUseCase, deletePricingPlanUseCase,
  getPricingPlanUseCase, searchPricingPlansUseCase, listPricingPlansUseCase,
  createPriceUseCase, updatePriceUseCase,
  archivePriceUseCase, restorePriceUseCase,
  addPriceComponentUseCase, removePriceComponentUseCase,
  type CreatePlanInput, type UpdatePlanInput, type CreatePriceInput,
} from './use-cases/PricingPlanUseCases.js';

export {
  createTierPricingUseCase, updateTierPricingUseCase, deleteTierPricingUseCase,
  createTimePricingUseCase, updateTimePricingUseCase, deleteTimePricingUseCase,
  registerCurrencyUseCase, changeBaseCurrencyUseCase,
  updateExchangeRateUseCase,
} from './use-cases/TierTimeCurrencyUseCases.js';

export {
  publishPriceVersionUseCase, rollbackPriceVersionUseCase,
  getPriceHistoryUseCase,
  attachCatalogUseCase, detachCatalogUseCase,
} from './use-cases/VersionHistoryReferenceUseCases.js';

export type { PricingUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories (test/demo)
export {
  InMemoryPricingPlanRepository,
  InMemoryPriceRepository,
  InMemoryPriceComponentRepository,
  InMemoryTierPricingRepository,
  InMemoryTimePricingRepository,
  InMemoryCurrencyRepository,
  InMemoryExchangeRateRepository,
  InMemoryPriceVersionRepository,
  InMemoryPriceHistoryRepository,
  InMemoryPricingAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Stubs (test/demo)
export {
  InMemoryOrganizationVerifier,
  InMemoryCatalogVerifier,
  StaticPricingPolicyProvider,
  InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
