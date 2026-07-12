/**
 * Catalog Engine — Demo 02: Category Lifecycle
 *
 * Create catalog → create categories (root + child) → update → move → delete
 */

import {
  createCatalogUseCase,
  createCategoryUseCase, updateCategoryUseCase, moveCategoryUseCase, deleteCategoryUseCase,
  InMemoryCatalogRepository, InMemoryCategoryRepository, InMemoryItemRepository,
  InMemoryVariantRepository, InMemoryBundleRepository, InMemoryCatalogAuditRepository,
  InMemoryOrganizationVerifier, InMemoryUserVerifier,
  InMemoryMediaVerifier, InMemoryPricingVerifier,
  StaticCatalogPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Catalog Engine — Demo 02: Category Lifecycle ═══\n');

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
    { tenantId: 'demo', correlationId: 'c-1', actorId: 'admin',
      organizationId: 'org-demo', name: 'Category Play Catalog', slug: 'category-play', type: 'entity_type_a' }, deps));
  console.log(`  ✓ catalogId = ${cat.catalogId}\n`);

  // 2) Create root category
  console.log('▶ 2) Create Root Category');
  const root = u(await createCategoryUseCase(
    { tenantId: 'demo', correlationId: 'c-2', actorId: 'admin',
      catalogId: cat.catalogId, name: 'Electronics', slug: 'electronics',
      description: 'Electronic products root' }, deps));
  console.log(`  ✓ root categoryId = ${root.id}\n`);

  // 3) Create child category under root
  console.log('▶ 3) Create Child Category (under root)');
  const child = u(await createCategoryUseCase(
    { tenantId: 'demo', correlationId: 'c-3', actorId: 'admin',
      catalogId: cat.catalogId, parentCategoryId: root.id,
      name: 'Phones', slug: 'phones', displayOrder: 1 }, deps));
  console.log(`  ✓ child categoryId = ${child.id}  (parent = ${child.parentCategoryId})\n`);

  // 4) Update child category
  console.log('▶ 4) Update Child Category');
  const updated = u(await updateCategoryUseCase(
    { tenantId: 'demo', correlationId: 'c-4', actorId: 'admin',
      catalogId: cat.catalogId, categoryId: child.id,
      name: 'Smartphones', description: 'All smartphones', displayOrder: 5 }, deps));
  console.log(`  ✓ name = "${updated.name}", displayOrder = ${updated.displayOrder}\n`);

  // 5) Move category to root (newParentCategoryId = null)
  console.log('▶ 5) Move "Smartphones" to root');
  const moved = u(await moveCategoryUseCase(
    { tenantId: 'demo', correlationId: 'c-5', actorId: 'admin',
      catalogId: cat.catalogId, categoryId: child.id, newParentCategoryId: null }, deps));
  console.log(`  ✓ parentCategoryId = ${moved.parentCategoryId}\n`);

  // 6) Delete child (now a root, no children) → success
  console.log('▶ 6) Delete "Smartphones"');
  const del = u(await deleteCategoryUseCase(
    { tenantId: 'demo', correlationId: 'c-6', actorId: 'admin',
      catalogId: cat.catalogId, categoryId: child.id }, deps));
  console.log(`  ✓ deleted categoryId = ${del.categoryId}\n`);

  // Summary
  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);

  console.log('\n═══ Demo 02 Complete ═══');
}

main().catch((e) => { console.error('Demo failed:', e); process.exit(1); });
