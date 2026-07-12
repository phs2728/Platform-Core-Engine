/**
 * Catalog Engine — Demo 04: Bundle Lifecycle
 *
 * Create catalog → create items → create bundle → update → delete
 */

import {
  createCatalogUseCase,
  createItemUseCase,
  createBundleUseCase, updateBundleUseCase, deleteBundleUseCase,
  InMemoryCatalogRepository, InMemoryCategoryRepository, InMemoryItemRepository,
  InMemoryVariantRepository, InMemoryBundleRepository, InMemoryCatalogAuditRepository,
  InMemoryOrganizationVerifier, InMemoryUserVerifier,
  InMemoryMediaVerifier, InMemoryPricingVerifier,
  StaticCatalogPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Catalog Engine — Demo 04: Bundle Lifecycle ═══\n');

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

  // 1) Create Catalog
  console.log('▶ 1) Create Catalog');
  const cat = u(await createCatalogUseCase(
    { tenantId: 'demo', correlationId: 'b-1', actorId: 'admin',
      organizationId: 'org-demo', name: 'Bundle Play Catalog', slug: 'bundle-play', type: 'entity_type_a' }, deps));
  console.log(`  ✓ catalogId = ${cat.catalogId}\n`);

  // 2) Create Items (bundle components)
  console.log('▶ 2) Create Items (a, b)');
  const itemA = u(await createItemUseCase(
    { tenantId: 'demo', correlationId: 'b-2', actorId: 'admin',
      catalogId: cat.catalogId, name: 'Camera Body', slug: 'camera-body', type: 'entity_type_a' }, deps));
  const itemB = u(await createItemUseCase(
    { tenantId: 'demo', correlationId: 'b-3', actorId: 'admin',
      catalogId: cat.catalogId, name: 'Lens 50mm', slug: 'lens-50mm', type: 'entity_type_a' }, deps));
  console.log(`  ✓ itemA = ${itemA.id}, itemB = ${itemB.id}\n`);

  // 3) Create Bundle (components reference the items)
  console.log('▶ 3) Create Bundle');
  const bundle = u(await createBundleUseCase(
    { tenantId: 'demo', correlationId: 'b-4', actorId: 'admin',
      catalogId: cat.catalogId, name: 'Starter Kit', slug: 'starter-kit',
      description: 'Camera + lens combo',
      components: [
        { refType: 'item', refId: itemA.id, quantity: 1, attributes: {} },
        { refType: 'item', refId: itemB.id, quantity: 2, attributes: {} },
      ] }, deps));
  console.log(`  ✓ bundleId = ${bundle.id}  (${bundle.components.length} components)\n`);

  // 4) Update Bundle (rename + swap components)
  console.log('▶ 4) Update Bundle');
  const updated = u(await updateBundleUseCase(
    { tenantId: 'demo', correlationId: 'b-5', actorId: 'admin',
      catalogId: cat.catalogId, bundleId: bundle.id,
      name: 'Pro Starter Kit',
      components: [
        { refType: 'item', refId: itemA.id, quantity: 1, attributes: {} },
      ] }, deps));
  console.log(`  ✓ name = "${updated.name}", components now = ${updated.components.length}\n`);

  // 5) Delete Bundle
  console.log('▶ 5) Delete Bundle');
  const del = u(await deleteBundleUseCase(
    { tenantId: 'demo', correlationId: 'b-6', actorId: 'admin',
      catalogId: cat.catalogId, bundleId: bundle.id }, deps));
  console.log(`  ✓ deleted bundleId = ${del.bundleId}\n`);

  // Summary
  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);

  console.log('\n═══ Demo 04 Complete ═══');
}

main().catch((e) => { console.error('Demo failed:', e); process.exit(1); });
