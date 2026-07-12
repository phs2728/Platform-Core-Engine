/**
 * Pricing Engine — Example 02: Tier Pricing
 *   Create plan → create price → create tier pricing → update → delete
 */
import {
  createPricingPlanUseCase, createPriceUseCase,
  createTierPricingUseCase, updateTierPricingUseCase, deleteTierPricingUseCase,
  InMemoryPricingPlanRepository, InMemoryPriceRepository, InMemoryPriceComponentRepository,
  InMemoryTierPricingRepository, InMemoryTimePricingRepository,
  InMemoryCurrencyRepository, InMemoryExchangeRateRepository,
  InMemoryPriceVersionRepository, InMemoryPriceHistoryRepository,
  InMemoryPricingAuditRepository,
  InMemoryOrganizationVerifier, InMemoryCatalogVerifier,
  StaticPricingPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Pricing Engine — Example 02: Tier Pricing ═══\n');
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
    idGenerator: { generate: () => `tier-${++seq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Create Pricing Plan (tiered)');
  const plan = u(await createPricingPlanUseCase(
    { tenantId: 'demo', correlationId: 't1', actorId: 'admin', organizationId: 'org-demo',
      name: 'Volume Plan', slug: 'volume', type: 'tiered', baseCurrency: 'USD' }, deps));
  console.log(`  ✓ planId=${plan.planId}\n`);

  console.log('▶ 2) Create Price');
  const price = u(await createPriceUseCase(
    { tenantId: 'demo', correlationId: 't2', actorId: 'admin', planId: plan.planId,
      name: 'Base Fee', amount: { amount: 50, currencyCode: 'USD' } }, deps));
  console.log(`  ✓ priceId=${price.id}\n`);

  console.log('▶ 3) Create Tier Pricing');
  const tier = u(await createTierPricingUseCase(
    { tenantId: 'demo', correlationId: 't3', actorId: 'admin', planId: plan.planId,
      name: 'Volume Discount', tierUnit: 'quantity',
      tiers: [{ fromValue: 1, toValue: 9, amount: { amount: 50, currencyCode: 'USD' } },
              { fromValue: 10, toValue: 49, amount: { amount: 40, currencyCode: 'USD' } },
              { fromValue: 50, toValue: null, amount: { amount: 30, currencyCode: 'USD' } }] }, deps));
  console.log(`  ✓ tierId=${tier.id}, tiers=${tier.tiers.length}\n`);

  console.log('▶ 4) Update Tier Pricing');
  const updated = u(await updateTierPricingUseCase(
    { tenantId: 'demo', correlationId: 't4', actorId: 'admin', tierId: tier.id,
      name: 'Volume Discount Pro',
      tiers: [{ fromValue: 1, toValue: 9, amount: { amount: 45, currencyCode: 'USD' } },
              { fromValue: 10, toValue: null, amount: { amount: 35, currencyCode: 'USD' } }] }, deps));
  console.log(`  ✓ name="${updated.name}", tiers=${updated.tiers.length}\n`);

  console.log('▶ 5) Delete Tier Pricing');
  u(await deleteTierPricingUseCase(
    { tenantId: 'demo', correlationId: 't5', actorId: 'admin', tierId: tier.id }, deps));
  console.log('  ✓ tier deleted\n');

  console.log('═══ Tier Pricing Example Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
