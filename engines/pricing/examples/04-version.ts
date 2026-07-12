/**
 * Pricing Engine — Example 04: Versioning
 *   Create plan → publish version → rollback version → verify
 */
import {
  createPricingPlanUseCase, updatePricingPlanUseCase,
  publishPriceVersionUseCase, rollbackPriceVersionUseCase,
  getPricingPlanUseCase,
  InMemoryPricingPlanRepository, InMemoryPriceRepository, InMemoryPriceComponentRepository,
  InMemoryTierPricingRepository, InMemoryTimePricingRepository,
  InMemoryCurrencyRepository, InMemoryExchangeRateRepository,
  InMemoryPriceVersionRepository, InMemoryPriceHistoryRepository,
  InMemoryPricingAuditRepository,
  InMemoryOrganizationVerifier, InMemoryCatalogVerifier,
  StaticPricingPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Pricing Engine — Example 04: Versioning ═══\n');
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
    idGenerator: { generate: () => `ver-${++seq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Create Pricing Plan');
  const plan = u(await createPricingPlanUseCase(
    { tenantId: 'demo', correlationId: 'v1', actorId: 'admin', organizationId: 'org-demo',
      name: 'Original Plan', slug: 'versioned', type: 'flat', baseCurrency: 'USD' }, deps));
  console.log(`  ✓ planId=${plan.planId}, name="${plan.planId ? 'Original Plan' : ''}"\n`);

  console.log('▶ 2) Publish Version 1');
  const v1 = u(await publishPriceVersionUseCase(
    { tenantId: 'demo', correlationId: 'v2', actorId: 'admin', planId: plan.planId }, deps));
  console.log(`  ✓ versionNumber=${v1.versionNumber}, status=${v1.status}\n`);

  console.log('▶ 3) Update Plan (rename)');
  await u(await updatePricingPlanUseCase(
    { tenantId: 'demo', correlationId: 'v3', actorId: 'admin', planId: plan.planId,
      name: 'Renamed Plan' }, deps));
  const afterRename = u(await getPricingPlanUseCase(
    { tenantId: 'demo', planId: plan.planId }, deps));
  console.log(`  ✓ plan name now="${afterRename?.name}"\n`);

  console.log('▶ 4) Rollback to Version 1');
  const rolled = u(await rollbackPriceVersionUseCase(
    { tenantId: 'demo', correlationId: 'v4', actorId: 'admin', planId: plan.planId,
      versionNumber: 1 }, deps));
  console.log(`  ✓ rolled back to v${rolled.versionNumber}, status=${rolled.status}\n`);

  console.log('▶ 5) Verify Plan Restored');
  const restored = u(await getPricingPlanUseCase(
    { tenantId: 'demo', planId: plan.planId }, deps));
  console.log(`  ✓ plan name now="${restored?.name}" (expected "Original Plan")\n`);

  console.log('═══ Versioning Example Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
