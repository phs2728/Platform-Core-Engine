/**
 * Pricing Engine — Shared Use Case Deps (3-Layer DI)
 */

import type {
  IClock, IIdGenerator, IEventBus,
  IPricingPlanRepository, IPriceRepository, IPriceComponentRepository,
  ITierPricingRepository, ITimePricingRepository,
  ICurrencyRepository, IExchangeRateRepository,
  IPriceVersionRepository, IPriceHistoryRepository,
  IPricingAuditRepository,
  IOrganizationVerifier, ICatalogVerifier, ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface PricingUseCaseDeps {
  planRepo: IPricingPlanRepository;
  priceRepo: IPriceRepository;
  componentRepo: IPriceComponentRepository;
  tierRepo: ITierPricingRepository;
  timeRepo: ITimePricingRepository;
  currencyRepo: ICurrencyRepository;
  exchangeRepo: IExchangeRateRepository;
  versionRepo: IPriceVersionRepository;
  historyRepo: IPriceHistoryRepository;
  auditRepo: IPricingAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  catalogVerifier: ICatalogVerifier;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
