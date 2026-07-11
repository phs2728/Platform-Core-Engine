/**
 * Pricing Engine — Demo
 */
import {
  createPricingPlanUseCase, createPriceUseCase, addPriceComponentUseCase,
  createTierPricingUseCase, registerCurrencyUseCase, updateExchangeRateUseCase,
  publishPriceVersionUseCase, attachCatalogUseCase,
  archivePricingPlanUseCase, restorePricingPlanUseCase,
  InMemoryPricingPlanRepository, InMemoryPriceRepository, InMemoryPriceComponentRepository,
  InMemoryTierPricingRepository, InMemoryTimePricingRepository,
  InMemoryCurrencyRepository, InMemoryExchangeRateRepository,
  InMemoryPriceVersionRepository, InMemoryPriceHistoryRepository,
  InMemoryPricingAuditRepository,
  InMemoryOrganizationVerifier, InMemoryCatalogVerifier,
  StaticPricingPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Pricing Engine — Demo ═══\n');
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
  const orgVerifier = new InMemoryOrganizationVerifier();
  const catalogVerifier = new InMemoryCatalogVerifier();
  const policy = new StaticPricingPolicyProvider();
  policy.set('demo', { allowedPlanTypes: ['flat', 'tiered'], allowedCurrencies: ['USD', 'EUR'] });
  orgVerifier.add('demo', 'org-1');
  catalogVerifier.add('demo', 'cat-1');
  let seq = 0;
  const deps = {
    planRepo, priceRepo, componentRepo, tierRepo, timeRepo,
    currencyRepo, exchangeRepo, versionRepo, historyRepo, auditRepo,
    eventBus, organizationVerifier: orgVerifier, catalogVerifier, policyProvider: policy,
    idGenerator: { generate: () => `demo-${++seq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Create Pricing Plan');
  const plan = u(await createPricingPlanUseCase(
    { tenantId: 'demo', correlationId: 'd1', actorId: 'admin', organizationId: 'org-1',
      name: 'Standard Plan', slug: 'standard', type: 'flat', baseCurrency: 'USD' }, deps));
  console.log(`  ✓ planId=${plan.planId}\n`);

  console.log('▶ 2) Register Currency');
  u(await registerCurrencyUseCase(
    { tenantId: 'demo', correlationId: 'd2', actorId: 'admin', code: 'USD', symbol: '$', decimals: 2, isBase: true }, deps));
  console.log('  ✓ USD registered as base\n');

  console.log('▶ 3) Create Price');
  const price = u(await createPriceUseCase(
    { tenantId: 'demo', correlationId: 'd3', actorId: 'admin', planId: plan.planId,
      name: 'Monthly Fee', amount: { amount: 99, currencyCode: 'USD' } }, deps));
  console.log(`  ✓ priceId=${price.id}\n`);

  console.log('▶ 4) Add Price Component');
  u(await addPriceComponentUseCase(
    { tenantId: 'demo', correlationId: 'd4', actorId: 'admin', priceId: price.id,
      componentType: 'tax_ref', name: 'Tax', percentage: 8 }, deps));
  console.log('  ✓ component added\n');

  console.log('▶ 5) Create Tier Pricing');
  u(await createTierPricingUseCase(
    { tenantId: 'demo', correlationId: 'd5', actorId: 'admin', planId: plan.planId,
      name: 'Volume Discount', tierUnit: 'quantity',
      tiers: [{ fromValue: 1, toValue: 9, amount: { amount: 99, currencyCode: 'USD' } },
              { fromValue: 10, toValue: null, amount: { amount: 79, currencyCode: 'USD' } }] }, deps));
  console.log('  ✓ tier pricing created\n');

  console.log('▶ 6) Update Exchange Rate');
  u(await updateExchangeRateUseCase(
    { tenantId: 'demo', correlationId: 'd6', actorId: 'admin',
      fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.92 }, deps));
  console.log('  ✓ USD→EUR rate set\n');

  console.log('▶ 7) Publish Version');
  u(await publishPriceVersionUseCase(
    { tenantId: 'demo', correlationId: 'd7', actorId: 'admin', planId: plan.planId }, deps));
  console.log('  ✓ version 1 published\n');

  console.log('▶ 8) Attach Catalog');
  u(await attachCatalogUseCase(
    { tenantId: 'demo', correlationId: 'd8', actorId: 'admin', planId: plan.planId, catalogId: 'cat-1' }, deps));
  console.log('  ✓ catalog attached\n');

  console.log('▶ 9) Archive → Restore');
  u(await archivePricingPlanUseCase(
    { tenantId: 'demo', correlationId: 'd9', actorId: 'admin', planId: plan.planId }, deps));
  console.log('  ✓ archived');
  u(await restorePricingPlanUseCase(
    { tenantId: 'demo', correlationId: 'd10', actorId: 'admin', planId: plan.planId }, deps));
  console.log('  ✓ restored\n');

  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [t, c] of [...counts.entries()].sort()) console.log(`  ${t}: ${c}`);
  console.log('\n═══ Demo Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
