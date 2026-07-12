/**
 * Catalog Engine — Demo 03: Variant Lifecycle
 *
 * Create catalog → create item → create variant → update → delete
 */

import {
  createCatalogUseCase,
  createItemUseCase,
  createVariantUseCase, updateVariantUseCase, deleteVariantUseCase,
  InMemoryCatalogRepository, InMemoryCategoryRepository, InMemoryItemRepository,
  InMemoryVariantRepository, InMemoryBundleRepository, InMemoryCatalogAuditRepository,
  InMemoryOrganizationVerifier, InMemoryUserVerifier,
  InMemoryMediaVerifier, InMemoryPricingVerifier,
  StaticCatalogPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Catalog Engine — Demo 03: Variant Lifecycle ═══\n');

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
    { tenantId: 'demo', correlationId: 'v-1', actorId: 'admin',
      organizationId: 'org-demo', name: 'Variant Play Catalog', slug: 'variant-play', type: 'entity_type_a' }, deps));
  console.log(`  ✓ catalogId = ${cat.catalogId}\n`);

  // 2) Create Item
  console.log('▶ 2) Create Item');
  const item = u(await createItemUseCase(
    { tenantId: 'demo', correlationId: 'v-2', actorId: 'admin',
      catalogId: cat.catalogId,
      name: 'T-Shirt', slug: 't-shirt', type: 'entity_type_a',
      attributes: { material: 'cotton', colors: ['black', 'white'] } }, deps));
  console.log(`  ✓ itemId = ${item.id}\n`);

  // 3) Create Variant
  console.log('▶ 3) Create Variant');
  const variant = u(await createVariantUseCase(
    { tenantId: 'demo', correlationId: 'v-3', actorId: 'admin',
      catalogId: cat.catalogId, itemId: item.id,
      name: 'Black / M', sku: 'TSHIRT-BLK-M', isDefault: true,
      attributes: { color: 'black', size: 'M' } }, deps));
  console.log(`  ✓ variantId = ${variant.id}  (sku = ${variant.sku}, isDefault = ${variant.isDefault})\n`);

  // 4) Update Variant
  console.log('▶ 4) Update Variant');
  const updated = u(await updateVariantUseCase(
    { tenantId: 'demo', correlationId: 'v-4', actorId: 'admin',
      catalogId: cat.catalogId, variantId: variant.id,
      name: 'Black / L', attributes: { color: 'black', size: 'L' } }, deps));
  console.log(`  ✓ name = "${updated.name}", attributes = ${JSON.stringify(updated.attributes)}\n`);

  // 5) Delete Variant
  console.log('▶ 5) Delete Variant');
  const del = u(await deleteVariantUseCase(
    { tenantId: 'demo', correlationId: 'v-5', actorId: 'admin',
      catalogId: cat.catalogId, variantId: variant.id }, deps));
  console.log(`  ✓ deleted variantId = ${del.variantId}\n`);

  // Summary
  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);

  console.log('\n═══ Demo 03 Complete ═══');
}

main().catch((e) => { console.error('Demo failed:', e); process.exit(1); });
