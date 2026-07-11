/**
 * Catalog Engine — Demo: Full Lifecycle
 *
 * 사장님 spec: Create → Category → Item → Variant → Bundle → Assign Media → Assign Pricing
 */

import {
  createCatalogUseCase, createCategoryUseCase, createItemUseCase,
  createVariantUseCase, createBundleUseCase,
  archiveCatalogUseCase, restoreCatalogUseCase,
  assignMediaRefUseCase, assignPricingRefUseCase,
  InMemoryCatalogRepository, InMemoryCategoryRepository, InMemoryItemRepository,
  InMemoryVariantRepository, InMemoryBundleRepository, InMemoryCatalogAuditRepository,
  InMemoryOrganizationVerifier, InMemoryUserVerifier,
  InMemoryMediaVerifier, InMemoryPricingVerifier,
  StaticCatalogPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Catalog Engine — Demo ═══\n');

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
    { tenantId: 'demo', correlationId: 'd-1', actorId: 'admin',
      organizationId: 'org-demo', name: 'Grand Catalog', slug: 'grand-catalog', type: 'entity_type_a',
      description: 'Demo catalog for units' }, deps));
  console.log(`  ✓ catalogId = ${cat.catalogId}\n`);

  // 2) Create Category
  console.log('▶ 2) Create Category');
  const rootCat = u(await createCategoryUseCase(
    { tenantId: 'demo', correlationId: 'd-2', actorId: 'admin',
      catalogId: cat.catalogId, name: 'Units', slug: 'units' }, deps));
  console.log(`  ✓ categoryId = ${rootCat.id}\n`);

  // 3) Create Item
  console.log('▶ 3) Create Item');
  const item = u(await createItemUseCase(
    { tenantId: 'demo', correlationId: 'd-3', actorId: 'admin',
      catalogId: cat.catalogId, categoryId: rootCat.id,
      name: 'Deluxe Unit', slug: 'deluxe-unit', type: 'entity_type_a',
      attributes: { capacity: 2, amenities: ['wifi', 'tv'] } }, deps));
  console.log(`  ✓ itemId = ${item.id}\n`);

  // 4) Create Variant
  console.log('▶ 4) Create Variant');
  const variant = u(await createVariantUseCase(
    { tenantId: 'demo', correlationId: 'd-4', actorId: 'admin',
      catalogId: cat.catalogId, itemId: item.id,
      name: 'King Bed', sku: 'DEL-KING-001' }, deps));
  console.log(`  ✓ variantId = ${variant.id}\n`);

  // 5) Create Bundle
  console.log('▶ 5) Create Bundle');
  const bundle = u(await createBundleUseCase(
    { tenantId: 'demo', correlationId: 'd-5', actorId: 'admin',
      catalogId: cat.catalogId, name: 'Weekend Package', slug: 'weekend-pkg',
      components: [{ refType: 'item', refId: item.id, quantity: 2, attributes: {} }] }, deps));
  console.log(`  ✓ bundleId = ${bundle.id}\n`);

  // 6) Assign Media Ref
  console.log('▶ 6) Assign Media Ref');
  u(await assignMediaRefUseCase(
    { tenantId: 'demo', correlationId: 'd-6', actorId: 'admin',
      catalogId: cat.catalogId, ownerType: 'item', ownerId: item.id,
      mediaRef: { mediaId: 'media-demo', role: 'primary', displayOrder: 0 } }, deps));
  console.log(`  ✓ media assigned to item\n`);

  // 7) Assign Pricing Ref
  console.log('▶ 7) Assign Pricing Ref');
  u(await assignPricingRefUseCase(
    { tenantId: 'demo', correlationId: 'd-7', actorId: 'admin',
      catalogId: cat.catalogId, ownerType: 'variant', ownerId: variant.id,
      pricingRef: { pricingId: 'pricing-demo', role: 'default', displayOrder: 0 } }, deps));
  console.log(`  ✓ pricing assigned to variant\n`);

  // 8) Archive + Restore
  console.log('▶ 8) Archive → Restore');
  u(await archiveCatalogUseCase(
    { tenantId: 'demo', correlationId: 'd-8', actorId: 'admin', catalogId: cat.catalogId }, deps));
  console.log(`  ✓ archived`);
  u(await restoreCatalogUseCase(
    { tenantId: 'demo', correlationId: 'd-9', actorId: 'admin', catalogId: cat.catalogId }, deps));
  console.log(`  ✓ restored\n`);

  // Summary
  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);

  console.log('\n═══ Demo Complete ═══');
}

main().catch((e) => { console.error('Demo failed:', e); process.exit(1); });
