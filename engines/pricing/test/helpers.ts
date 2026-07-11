/**
 * Test fixtures — Pricing Engine
 */

import type { PricingUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryPricingPlanRepository, InMemoryPriceRepository, InMemoryPriceComponentRepository,
  InMemoryTierPricingRepository, InMemoryTimePricingRepository,
  InMemoryCurrencyRepository, InMemoryExchangeRateRepository,
  InMemoryPriceVersionRepository, InMemoryPriceHistoryRepository,
  InMemoryPricingAuditRepository,
  InMemoryOrganizationVerifier, InMemoryCatalogVerifier,
  StaticPricingPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): PricingUseCaseDeps & {
  planRepo: InMemoryPricingPlanRepository;
  priceRepo: InMemoryPriceRepository;
  componentRepo: InMemoryPriceComponentRepository;
  tierRepo: InMemoryTierPricingRepository;
  timeRepo: InMemoryTimePricingRepository;
  currencyRepo: InMemoryCurrencyRepository;
  exchangeRepo: InMemoryExchangeRateRepository;
  versionRepo: InMemoryPriceVersionRepository;
  historyRepo: InMemoryPriceHistoryRepository;
  auditRepo: InMemoryPricingAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  catalogVerifier: InMemoryCatalogVerifier;
  policyProvider: StaticPricingPolicyProvider;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const planRepo = new InMemoryPricingPlanRepository();
  const priceRepo = new InMemoryPriceRepository();
  const componentRepo = new InMemoryPriceComponentRepository();
  const tierRepo = new InMemoryTierPricingRepository();
  const timeRepo = new InMemoryTimePricingRepository();
  const currencyRepo = new InMemoryCurrencyRepository();
  const exchangeRepo = new InMemoryExchangeRateRepository();
  const versionRepo = new InMemoryPriceVersionRepository();
  const historyRepo = new InMemoryPriceHistoryRepository();
  const auditRepo = new InMemoryPricingAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const catalogVerifier = new InMemoryCatalogVerifier();
  const policyProvider = new StaticPricingPolicyProvider();
  policyProvider.set('t-1', { allowedPlanTypes: ['flat', 'tiered', 'time_based'], allowedCurrencies: ['USD', 'EUR', 'KRW'] });

  organizationVerifier.add('t-1', 'org-1');
  catalogVerifier.add('t-1', 'catalog-1');

  let idCounter = 0;
  const idGenerator = {
    generate(): string {
      idCounter += 1;
      return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };

  return {
    planRepo, priceRepo, componentRepo, tierRepo, timeRepo,
    currencyRepo, exchangeRepo, versionRepo, historyRepo, auditRepo,
    eventBus, organizationVerifier, catalogVerifier, policyProvider,
    idGenerator, clock: makeClock(),
  };
}
