/**
 * Pricing Engine — Example 05: History
 *   Create plan → publish multiple versions → get history
 */
import {
  createPricingPlanUseCase, updatePricingPlanUseCase,
  publishPriceVersionUseCase, rollbackPriceVersionUseCase,
  getPriceHistoryUseCase,
  InMemoryPricingPlanRepository, InMemoryPriceRepository, InMemoryPriceComponentRepository,
  InMemoryTierPricingRepository, InMemoryTimePricingRepository,
  InMemoryCurrencyRepository, InMemoryExchangeRateRepository,
  InMemoryPriceVersionRepository, InMemoryPriceHistoryRepository,
  InMemoryPricingAuditRepository,
  InMemoryOrganizationVerifier, InMemoryCatalogVerifier,
  StaticPricingPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Pricing Engine — Example 05: History ═══\n');
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
    idGenerator: { generate: () => `his-${++seq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Create Pricing Plan');
  const plan = u(await createPricingPlanUseCase(
    { tenantId: 'demo', correlationId: 'h1', actorId: 'admin', organizationId: 'org-demo',
      name: 'History Plan', slug: 'history', type: 'flat', baseCurrency: 'USD' }, deps));
  console.log(`  ✓ planId=${plan.planId}\n`);

  console.log('▶ 2) Publish Version 1');
  u(await publishPriceVersionUseCase(
    { tenantId: 'demo', correlationId: 'h2', actorId: 'admin', planId: plan.planId }, deps));
  console.log('  ✓ v1 published\n');

  console.log('▶ 3) Update Plan → Publish Version 2');
  await u(await updatePricingPlanUseCase(
    { tenantId: 'demo', correlationId: 'h3', actorId: 'admin', planId: plan.planId,
      name: 'History Plan v2' }, deps));
  u(await publishPriceVersionUseCase(
    { tenantId: 'demo', correlationId: 'h4', actorId: 'admin', planId: plan.planId }, deps));
  console.log('  ✓ v2 published\n');

  console.log('▶ 4) Update Plan → Publish Version 3');
  await u(await updatePricingPlanUseCase(
    { tenantId: 'demo', correlationId: 'h5', actorId: 'admin', planId: plan.planId,
      name: 'History Plan v3' }, deps));
  u(await publishPriceVersionUseCase(
    { tenantId: 'demo', correlationId: 'h6', actorId: 'admin', planId: plan.planId }, deps));
  console.log('  ✓ v3 published\n');

  console.log('▶ 5) Rollback to Version 1');
  u(await rollbackPriceVersionUseCase(
    { tenantId: 'demo', correlationId: 'h7', actorId: 'admin', planId: plan.planId,
      versionNumber: 1 }, deps));
  console.log('  ✓ rolled back to v1\n');

  console.log('▶ 6) Get Price History');
  const history = u(await getPriceHistoryUseCase(
    { tenantId: 'demo', planId: plan.planId }, deps));
  console.log(`  ✓ ${history.length} history entries:`);
  for (const h of history) {
    console.log(`    • ${h.eventType} (v${(h.metadata as { versionNumber?: number }).versionNumber})`);
  }
  console.log('');

  console.log('═══ History Example Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
