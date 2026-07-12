/**
 * Pricing Engine — Example 03: Currency Management
 *   Register currencies → change base currency → update exchange rate
 */
import {
  registerCurrencyUseCase, changeBaseCurrencyUseCase, updateExchangeRateUseCase,
  InMemoryPricingPlanRepository, InMemoryPriceRepository, InMemoryPriceComponentRepository,
  InMemoryTierPricingRepository, InMemoryTimePricingRepository,
  InMemoryCurrencyRepository, InMemoryExchangeRateRepository,
  InMemoryPriceVersionRepository, InMemoryPriceHistoryRepository,
  InMemoryPricingAuditRepository,
  InMemoryOrganizationVerifier, InMemoryCatalogVerifier,
  StaticPricingPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Pricing Engine — Example 03: Currency Management ═══\n');
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
  policyProvider.set('demo', { allowedPlanTypes: ['flat', 'tiered', 'time_based'], allowedCurrencies: ['USD', 'EUR', 'KRW'] });
  organizationVerifier.add('demo', 'org-demo');
  catalogVerifier.add('demo', 'catalog-demo');
  let seq = 0;
  const deps = {
    planRepo, priceRepo, componentRepo, tierRepo, timeRepo,
    currencyRepo, exchangeRepo, versionRepo, historyRepo, auditRepo,
    eventBus, organizationVerifier, catalogVerifier, policyProvider,
    idGenerator: { generate: () => `cur-${++seq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Register Base Currency (USD)');
  const usd = u(await registerCurrencyUseCase(
    { tenantId: 'demo', correlationId: 'c1', actorId: 'admin',
      code: 'USD', symbol: '$', decimals: 2, isBase: true }, deps));
  console.log(`  ✓ ${usd.code} registered, isBase=${usd.isBase}\n`);

  console.log('▶ 2) Register EUR');
  const eur = u(await registerCurrencyUseCase(
    { tenantId: 'demo', correlationId: 'c2', actorId: 'admin',
      code: 'EUR', symbol: '€', decimals: 2 }, deps));
  console.log(`  ✓ ${eur.code} registered, isBase=${eur.isBase}\n`);

  console.log('▶ 3) Register KRW');
  const krw = u(await registerCurrencyUseCase(
    { tenantId: 'demo', correlationId: 'c3', actorId: 'admin',
      code: 'KRW', symbol: '₩', decimals: 0 }, deps));
  console.log(`  ✓ ${krw.code} registered, isBase=${krw.isBase}\n`);

  console.log('▶ 4) Change Base Currency to EUR');
  const baseChange = u(await changeBaseCurrencyUseCase(
    { tenantId: 'demo', correlationId: 'c4', actorId: 'admin', newBaseCode: 'EUR' }, deps));
  console.log(`  ✓ new base=${baseChange.newBaseCode}\n`);

  console.log('▶ 5) Update Exchange Rate (EUR → USD)');
  const rate1 = u(await updateExchangeRateUseCase(
    { tenantId: 'demo', correlationId: 'c5', actorId: 'admin',
      fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.09, source: 'ECB' }, deps));
  console.log(`  ✓ ${rate1.fromCurrency}→${rate1.toCurrency} @ ${rate1.rate}\n`);

  console.log('▶ 6) Update Exchange Rate (EUR → KRW)');
  const rate2 = u(await updateExchangeRateUseCase(
    { tenantId: 'demo', correlationId: 'c6', actorId: 'admin',
      fromCurrency: 'EUR', toCurrency: 'KRW', rate: 1450, source: 'ECB' }, deps));
  console.log(`  ✓ ${rate2.fromCurrency}→${rate2.toCurrency} @ ${rate2.rate}\n`);

  console.log('═══ Currency Management Example Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
