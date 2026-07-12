/**
 * Catalog Engine — Demo 05: Search & List
 *
 * Create multiple catalogs → search by query → filter by type → list all
 */

import {
  createCatalogUseCase,
  searchCatalogsUseCase, listCatalogsUseCase,
  InMemoryCatalogRepository, InMemoryCategoryRepository, InMemoryItemRepository,
  InMemoryVariantRepository, InMemoryBundleRepository, InMemoryCatalogAuditRepository,
  InMemoryOrganizationVerifier, InMemoryUserVerifier,
  InMemoryMediaVerifier, InMemoryPricingVerifier,
  StaticCatalogPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Catalog Engine — Demo 05: Search & List ═══\n');

  // ── Build deps (same shape as test/helpers.ts makeDeps())
  const catalogRepo = new InMemoryCatalogRepository();
  const categoryRepo = new InMemoryCategoryRepository();
  const itemRepo = new InMemoryItemRepository();
  const variantRepo = new InMemoryVariantRepository();
  const bundleRepo = new InMemoryBundleRepository();
  const auditRepo = new InMemoryCatalogAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const userVerifier = new InMemoryUserVerifier();
  const mediaVerifier = new InMemoryMediaVerifier();
  const pricingVerifier = new InMemoryPricingVerifier();
  const policyProvider = new StaticCatalogPolicyProvider();
  policyProvider.set('demo', { allowedTypes: ['entity_type_a', 'entity_type_b', 'service', 'default'] });
  organizationVerifier.add('demo', 'org-demo');
  mediaVerifier.add('demo', 'media-demo');
  pricingVerifier.add('demo', 'pricing-demo');

  let idSeq = 0;
  const deps = {
    catalogRepo, categoryRepo, itemRepo, variantRepo, bundleRepo, auditRepo,
    eventBus, organizationVerifier, userVerifier, mediaVerifier, pricingVerifier,
    policyProvider,
    idGenerator: { generate: () => `demo-${++idSeq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };

  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'error'));
    return r.value as T;
  };

  // 1) Create multiple catalogs
  console.log('▶ 1) Create 3 Catalogs');
  await createCatalogUseCase(
    { tenantId: 'demo', correlationId: 's-1', actorId: 'admin',
      organizationId: 'org-demo', name: 'Pro Cameras', slug: 'pro-cameras', type: 'entity_type_a',
      tags: ['gear', 'photo'], searchKeywords: ['pro', 'camera'] }, deps);
  await createCatalogUseCase(
    { tenantId: 'demo', correlationId: 's-2', actorId: 'admin',
      organizationId: 'org-demo', name: 'Pro Lenses', slug: 'pro-lenses', type: 'entity_type_a',
      tags: ['gear'], searchKeywords: ['lens'] }, deps);
  await createCatalogUseCase(
    { tenantId: 'demo', correlationId: 's-3', actorId: 'admin',
      organizationId: 'org-demo', name: 'Cleaning Service', slug: 'cleaning-service', type: 'service',
      tags: ['care'], searchKeywords: ['clean'] }, deps);
  console.log('  ✓ created 3 catalogs\n');

  // 2) Search by query "pro"
  console.log('▶ 2) Search query = "pro"');
  const byQuery = u(await searchCatalogsUseCase(
    { tenantId: 'demo', query: 'pro' }, deps));
  console.log(`  ✓ found ${byQuery.total} catalogs:`);
  for (const c of byQuery.catalogs) console.log(`      - ${c.name} (${c.slug}, type=${c.type})`);
  console.log('');

  // 3) Search by type filter
  console.log('▶ 3) Search type = "service"');
  const byType = u(await searchCatalogsUseCase(
    { tenantId: 'demo', type: 'service' }, deps));
  console.log(`  ✓ found ${byType.total} catalogs:`);
  for (const c of byType.catalogs) console.log(`      - ${c.name} (${c.slug})`);
  console.log('');

  // 4) List all for the organization
  console.log('▶ 4) List all catalogs (org-demo)');
  const all = u(await listCatalogsUseCase(
    { tenantId: 'demo', organizationId: 'org-demo' }, deps));
  console.log(`  ✓ total = ${all.total}`);
  for (const c of all.catalogs) console.log(`      - ${c.name}  [${c.tags.join(', ')}]`);
  console.log('');

  // Summary
  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);

  console.log('\n═══ Demo 05 Complete ═══');
}

main().catch((e) => { console.error('Demo failed:', e); process.exit(1); });
