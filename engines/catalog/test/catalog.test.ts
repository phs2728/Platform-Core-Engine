/**
 * Catalog Engine — Sprint 1 Tests (40+)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCatalogUseCase, updateCatalogUseCase,
  archiveCatalogUseCase, restoreCatalogUseCase, deleteCatalogUseCase,
  getCatalogUseCase, searchCatalogsUseCase, listCatalogsUseCase,
  createCategoryUseCase, updateCategoryUseCase,
  moveCategoryUseCase, deleteCategoryUseCase,
  createItemUseCase,
  createVariantUseCase, updateVariantUseCase, deleteVariantUseCase,
  createBundleUseCase, updateBundleUseCase, deleteBundleUseCase,
  assignMediaRefUseCase, assignPricingRefUseCase,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

// ═══════════════════════════════════════════
// 1) Catalog Core (8 Use Cases)
// ═══════════════════════════════════════════

describe('Catalog Core', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates catalog with required fields', async () => {
    const r = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Alpha Catalog', slug: 'lodging', type: 'entity_type_a' },
      deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.catalogId).toBeTruthy();
    expect(deps.eventBus.countByType('catalog.created')).toBe(1);
  });

  it('creates catalog with full attributes', async () => {
    const r = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Full', slug: 'full', type: 'entity_type_a',
        description: 'Test', attributes: { capacity: 10 }, customFields: { region: 'KR' },
        tags: ['premium'], searchKeywords: ['alpha', 'unit'] },
      deps);
    expect(r.ok).toBe(true);
  });

  it('rejects duplicate slug in same tenant', async () => {
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'A', slug: 'same-slug', type: 'entity_type_a' }, deps);
    const r = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        organizationId: 'org-1', name: 'B', slug: 'same-slug', type: 'entity_type_a' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown organization', async () => {
    const r = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'unknown-org', name: 'X', slug: 'x', type: 'entity_type_a' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed type by policy', async () => {
    const r = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Bad', slug: 'bad', type: 'entity_forbidden' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects invalid slug format', async () => {
    const r = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'Invalid Slug!', type: 'entity_type_a' }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates catalog name and attributes', async () => {
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Old', slug: 'upd', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    const r = await updateCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId: c.value.catalogId, name: 'New', tags: ['updated'] }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('New');
  });

  it('archives catalog', async () => {
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'arc', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    const r = await archiveCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId: c.value.catalogId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Archived');
  });

  it('restores archived catalog', async () => {
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'rst', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    await archiveCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId: c.value.catalogId }, deps);
    const r = await restoreCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId: c.value.catalogId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Active');
  });

  it('rejects restore of non-archived catalog', async () => {
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'rst2', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    const r = await restoreCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId: c.value.catalogId }, deps);
    expect(r.ok).toBe(false);
  });

  it('deletes catalog (soft)', async () => {
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'del', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    const r = await deleteCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId: c.value.catalogId }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects double delete', async () => {
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'dd', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    await deleteCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId: c.value.catalogId }, deps);
    const r = await deleteCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId: c.value.catalogId }, deps);
    expect(r.ok).toBe(false);
  });

  it('getCatalog returns catalog', async () => {
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'get', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    const r = await getCatalogUseCase(
      { tenantId: 't-1', catalogId: c.value.catalogId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok && r.value) expect(r.value.name).toBe('X');
  });

  it('getCatalog returns null for wrong tenant', async () => {
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'wt', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    const r = await getCatalogUseCase(
      { tenantId: 't-2', catalogId: c.value.catalogId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeNull();
  });

  it('searchCatalogs by name query', async () => {
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Alpha Unit', slug: 'alpha', type: 'entity_type_a' }, deps);
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        organizationId: 'org-1', name: 'Beta Unit', slug: 'beta', type: 'entity_type_b' }, deps);
    const r = await searchCatalogsUseCase(
      { tenantId: 't-1', query: 'alpha' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.total).toBe(1);
  });

  it('listCatalogs by organization', async () => {
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'A', slug: 'la', type: 'entity_type_a' }, deps);
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        organizationId: 'org-1', name: 'B', slug: 'lb', type: 'entity_type_b' }, deps);
    const r = await listCatalogsUseCase(
      { tenantId: 't-1', organizationId: 'org-1' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.total).toBe(2);
  });

  it('emits correct engine field in events', async () => {
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'evt', type: 'entity_type_a' }, deps);
    const envs = deps.eventBus.byType('catalog.created');
    expect(envs[0].envelope.engine).toBe('catalog');
  });
});

// ═══════════════════════════════════════════
// 2) Category (4 Use Cases)
// ═══════════════════════════════════════════

describe('Category', () => {
  let deps: ReturnType<typeof makeDeps>;
  let catalogId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Cat', slug: 'cat-test', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    catalogId = c.value.catalogId;
  });

  it('creates root category', async () => {
    const r = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId, name: 'Root', slug: 'root' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.parentCategoryId).toBeNull();
  });

  it('creates nested category (parent → child)', async () => {
    const parent = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId, name: 'Parent', slug: 'parent' }, deps);
    if (!parent.ok) throw new Error('setup');
    const r = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, parentCategoryId: parent.value.id, name: 'Child', slug: 'child' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.parentCategoryId).toBe(parent.value.id);
  });

  it('updates category name', async () => {
    const cat = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId, name: 'Old', slug: 'upd-cat' }, deps);
    if (!cat.ok) throw new Error('setup');
    const r = await updateCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, categoryId: cat.value.id, name: 'New' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('New');
  });

  it('moves category to different parent (no cycle)', async () => {
    const a = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId, name: 'A', slug: 'a' }, deps);
    const b = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, name: 'B', slug: 'b' }, deps);
    if (!a.ok || !b.ok) throw new Error('setup');
    const r = await moveCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        catalogId, categoryId: b.value.id, newParentCategoryId: a.value.id }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.parentCategoryId).toBe(a.value.id);
  });

  it('rejects move that would create a cycle', async () => {
    const a = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId, name: 'A', slug: 'a' }, deps);
    if (!a.ok) throw new Error('setup');
    const b = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, parentCategoryId: a.value.id, name: 'B', slug: 'b' }, deps);
    if (!b.ok) throw new Error('setup');
    // Move A under B → cycle
    const r = await moveCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        catalogId, categoryId: a.value.id, newParentCategoryId: b.value.id }, deps);
    expect(r.ok).toBe(false);
  });

  it('deletes leaf category', async () => {
    const cat = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId, name: 'Del', slug: 'del-cat' }, deps);
    if (!cat.ok) throw new Error('setup');
    const r = await deleteCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, categoryId: cat.value.id }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects delete of category with children', async () => {
    const parent = await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId, name: 'Parent', slug: 'pdel' }, deps);
    if (!parent.ok) throw new Error('setup');
    await createCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, parentCategoryId: parent.value.id, name: 'Child', slug: 'cdel' }, deps);
    const r = await deleteCategoryUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        catalogId, categoryId: parent.value.id }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 3) Variant (3 Use Cases)
// ═══════════════════════════════════════════

describe('Variant', () => {
  let deps: ReturnType<typeof makeDeps>;
  let itemId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Cat', slug: 'var-test', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    const item = await createItemUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId: c.value.catalogId, name: 'Room', slug: 'room', type: 'entity_type_a' }, deps);
    if (!item.ok) throw new Error('setup');
    itemId = item.value.id;
  });

  it('creates variant with sku', async () => {
    const r = await createVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId: deps.catalogRepo['store'].values().next().value?.id ?? '',
        itemId, name: 'Deluxe', sku: 'DEL-001' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.sku).toBe('DEL-001');
  });

  it('rejects duplicate sku per item', async () => {
    const catalogId = deps.catalogRepo['store'].values().next().value?.id ?? '';
    await createVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, itemId, name: 'V1', sku: 'SAME' }, deps);
    const r = await createVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        catalogId, itemId, name: 'V2', sku: 'SAME' }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates variant name', async () => {
    const catalogId = deps.catalogRepo['store'].values().next().value?.id ?? '';
    const v = await createVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, itemId, name: 'Old', sku: 'UPD-001' }, deps);
    if (!v.ok) throw new Error('setup');
    const r = await updateVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        catalogId, variantId: v.value.id, name: 'New' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('New');
  });

  it('deletes variant', async () => {
    const catalogId = deps.catalogRepo['store'].values().next().value?.id ?? '';
    const v = await createVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, itemId, name: 'Del', sku: 'DEL-VAR' }, deps);
    if (!v.ok) throw new Error('setup');
    const r = await deleteVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        catalogId, variantId: v.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 4) Bundle (3 Use Cases)
// ═══════════════════════════════════════════

describe('Bundle', () => {
  let deps: ReturnType<typeof makeDeps>;
  let catalogId: string;
  let itemId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Cat', slug: 'bun-test', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    catalogId = c.value.catalogId;
    const item = await createItemUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId, name: 'Room', slug: 'room', type: 'entity_type_a' }, deps);
    if (!item.ok) throw new Error('setup');
    itemId = item.value.id;
  });

  it('creates bundle with components', async () => {
    const r = await createBundleUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, name: 'Weekend Package', slug: 'weekend',
        components: [{ refType: 'item', refId: itemId, quantity: 2, attributes: {} }] }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.components.length).toBe(1);
  });

  it('updates bundle name', async () => {
    const b = await createBundleUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, name: 'Old', slug: 'old-bun',
        components: [{ refType: 'item', refId: itemId, quantity: 1, attributes: {} }] }, deps);
    if (!b.ok) throw new Error('setup');
    const r = await updateBundleUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        catalogId, bundleId: b.value.id, name: 'New' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('New');
  });

  it('deletes bundle', async () => {
    const b = await createBundleUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, name: 'Del', slug: 'del-bun',
        components: [{ refType: 'item', refId: itemId, quantity: 1, attributes: {} }] }, deps);
    if (!b.ok) throw new Error('setup');
    const r = await deleteBundleUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'user-1',
        catalogId, bundleId: b.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 5) Reference (2 Use Cases)
// ═══════════════════════════════════════════

describe('Reference', () => {
  let deps: ReturnType<typeof makeDeps>;
  let catalogId: string;
  let itemId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Cat', slug: 'ref-test', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    catalogId = c.value.catalogId;
    const item = await createItemUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId, name: 'Room', slug: 'room', type: 'entity_type_a' }, deps);
    if (!item.ok) throw new Error('setup');
    itemId = item.value.id;
  });

  it('assigns media ref to item', async () => {
    const r = await assignMediaRefUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, ownerType: 'item', ownerId: itemId,
        mediaRef: { mediaId: 'media-1', role: 'primary', displayOrder: 0 } }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('reference.media.assigned')).toBe(1);
  });

  it('rejects unknown media id', async () => {
    const r = await assignMediaRefUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, ownerType: 'item', ownerId: itemId,
        mediaRef: { mediaId: 'unknown-media', role: 'primary', displayOrder: 0 } }, deps);
    expect(r.ok).toBe(false);
  });

  it('assigns pricing ref to item', async () => {
    const r = await assignPricingRefUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, ownerType: 'item', ownerId: itemId,
        pricingRef: { pricingId: 'pricing-1', role: 'default', displayOrder: 0 } }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('reference.pricing.assigned')).toBe(1);
  });

  it('rejects unknown pricing id', async () => {
    const r = await assignPricingRefUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId, ownerType: 'item', ownerId: itemId,
        pricingRef: { pricingId: 'unknown-pricing', role: 'default', displayOrder: 0 } }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 6) Audit + Multi-Tenant
// ═══════════════════════════════════════════

describe('Audit & Multi-Tenant', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit on create', async () => {
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'aud', type: 'entity_type_a' }, deps);
    const records = await deps.auditRepo.findByTenant('t-1');
    expect(records.some((r) => r.eventType === 'catalog_created')).toBe(true);
  });

  it('isolates catalogs across tenants', async () => {
    deps.organizationVerifier.add('t-2', 'org-1');
    deps.policyProvider.set('t-2', { allowedTypes: ['entity_type_a', 'entity_type_b', 'service', 'default'] });
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'A', slug: 'same', type: 'entity_type_a' }, deps);
    const r = await createCatalogUseCase(
      { tenantId: 't-2', correlationId: 'r-2', actorId: 'user-1',
        organizationId: 'org-1', name: 'B', slug: 'same', type: 'entity_type_a' }, deps);
    expect(r.ok).toBe(true); // same slug OK in different tenant
  });

  it('EventEnvelope has all 11 fields', async () => {
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'env11', type: 'entity_type_a' }, deps);
    const env = deps.eventBus.byType('catalog.created')[0].envelope;
    expect(env.eventId).toBeDefined();
    expect(env.aggregateId).toBeDefined();
    expect(env.occurredAt).toBeDefined();
    expect(env.version).toBe('1.0.0');
    expect(env.tenantId).toBe('t-1');
    expect(env.correlationId).toBe('r-1');
    expect(typeof env.causationId).toBe('string');
    expect(env.engine).toBe('catalog');
    expect(env.eventType).toBe('catalog.created');
    expect(env.schemaRef).toBe('catalog.created.v1');
    expect(env.payload).toBeDefined();
  });
});


// ═══════════════════════════════════════════
// 7) Additional (2 tests for 40+ coverage)
// ═══════════════════════════════════════════

describe('Additional Coverage', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('rejects update of archived catalog', async () => {
    const c = await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'X', slug: 'arc-upd', type: 'entity_type_a' }, deps);
    if (!c.ok) throw new Error('setup');
    await archiveCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        catalogId: c.value.catalogId }, deps);
    const r = await updateCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'user-1',
        catalogId: c.value.catalogId, name: 'Cannot' }, deps);
    expect(r.ok).toBe(false);
  });

  it('searchCatalogs filters by type', async () => {
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'user-1',
        organizationId: 'org-1', name: 'Lodge', slug: 'type-l', type: 'entity_type_a' }, deps);
    await createCatalogUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'user-1',
        organizationId: 'org-1', name: 'Dine', slug: 'type-d', type: 'entity_type_b' }, deps);
    const r = await searchCatalogsUseCase(
      { tenantId: 't-1', type: 'entity_type_b' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.total).toBe(1);
  });
});
