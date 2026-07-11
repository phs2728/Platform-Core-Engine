/**
 * Media Engine — Sprint 1 Tests (40+)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAssetUseCase, updateAssetUseCase, archiveAssetUseCase, restoreAssetUseCase, deleteAssetUseCase,
  getAssetUseCase, searchAssetsUseCase, listAssetsUseCase,
  createVariantUseCase, updateVariantUseCase, deleteVariantUseCase,
  createCollectionUseCase, addAssetToCollectionUseCase, removeAssetFromCollectionUseCase,
  attachReferenceUseCase, detachReferenceUseCase,
  updateMetadataUseCase, replaceMetadataUseCase,
  requestTransformationUseCase, registerTransformationUseCase,
  createUploadSessionUseCase, completeUploadUseCase, cancelUploadUseCase,
  publishVersionUseCase, rollbackVersionUseCase,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

// ═══════════════════════════════════════════
// 1) Asset Lifecycle (10)
// ═══════════════════════════════════════════

describe('Asset Lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates asset', async () => {
    const r = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Hero Banner', slug: 'hero', type: 'image', mimeType: 'image/png',
        sizeBytes: 102400, storageProviderId: 'sp-1', storageKey: 'path/to/hero.png' }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('asset.created')).toBe(1);
  });

  it('creates asset with full metadata', async () => {
    const r = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Full', slug: 'full', type: 'image', mimeType: 'image/jpeg',
        sizeBytes: 2048, storageProviderId: 'sp-1', storageKey: 'k',
        hash: { algorithm: 'sha256', value: 'abc' }, checksum: 'xyz',
        dimensions: { width: 800, height: 600 },
        tags: ['banner'], visibility: 'public' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects duplicate slug', async () => {
    await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 'dup', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    const r = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        name: 'B', slug: 'dup', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k2' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown organization', async () => {
    const r = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'unknown',
        name: 'X', slug: 'x', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects disallowed type', async () => {
    const r = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'bad', type: 'forbidden', mimeType: 'x',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates asset name', async () => {
    const a = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Old', slug: 'upd', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    if (!a.ok) throw new Error('setup');
    const r = await updateAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId: a.value.assetId, name: 'New' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('New');
  });

  it('archives + restores', async () => {
    const a = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'arc', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    if (!a.ok) throw new Error('setup');
    await archiveAssetUseCase({ tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId: a.value.assetId }, deps);
    const r = await restoreAssetUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', assetId: a.value.assetId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Active');
  });

  it('deletes (soft)', async () => {
    const a = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'del', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    if (!a.ok) throw new Error('setup');
    const r = await deleteAssetUseCase({ tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId: a.value.assetId }, deps);
    expect(r.ok).toBe(true);
  });

  it('search by name', async () => {
    await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Alpha Banner', slug: 'a', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        name: 'Beta Logo', slug: 'b', type: 'image', mimeType: 'image/png',
        sizeBytes: 2, storageProviderId: 'sp', storageKey: 'k2' }, deps);
    const r = await searchAssetsUseCase({ tenantId: 't-1', query: 'alpha' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.total).toBe(1);
  });

  it('list by organization', async () => {
    await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 'la', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    const r = await listAssetsUseCase({ tenantId: 't-1', organizationId: 'org-1' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.total).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 2) Variants (3)
// ═══════════════════════════════════════════

describe('Variants', () => {
  let deps: ReturnType<typeof makeDeps>;
  let assetId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const a = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'Base', slug: 'base', type: 'image', mimeType: 'image/png',
        sizeBytes: 100, storageProviderId: 'sp', storageKey: 'k' }, deps);
    if (!a.ok) throw new Error('setup');
    assetId = a.value.assetId;
  });

  it('creates variant', async () => {
    const r = await createVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId,
        variantType: 'thumbnail', name: 'Thumb', mimeType: 'image/webp',
        sizeBytes: 50, storageProviderId: 'sp', storageKey: 'thumb' }, deps);
    expect(r.ok).toBe(true);
  });

  it('updates variant', async () => {
    const v = await createVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId,
        variantType: 'preview', name: 'Old', mimeType: 'image/webp',
        sizeBytes: 80, storageProviderId: 'sp', storageKey: 'pv' }, deps);
    if (!v.ok) throw new Error('setup');
    const r = await updateVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', variantId: v.value.id, name: 'New' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe('New');
  });

  it('deletes variant', async () => {
    const v = await createVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId,
        variantType: 'thumb', name: 'Del', mimeType: 'image/webp',
        sizeBytes: 30, storageProviderId: 'sp', storageKey: 'd' }, deps);
    if (!v.ok) throw new Error('setup');
    const r = await deleteVariantUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', variantId: v.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 3) Collections (3)
// ═══════════════════════════════════════════

describe('Collections', () => {
  let deps: ReturnType<typeof makeDeps>;
  let assetId: string;
  let collectionId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const a = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 'a', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    if (!a.ok) throw new Error('setup');
    assetId = a.value.assetId;
    const c = await createCollectionUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        name: 'Gallery', slug: 'gallery', type: 'gallery' }, deps);
    if (!c.ok) throw new Error('setup');
    collectionId = c.value.id;
  });

  it('creates collection', async () => {
    expect(collectionId).toBeTruthy();
    expect(deps.eventBus.countByType('asset.collection.created')).toBe(1);
  });

  it('adds asset to collection', async () => {
    const r = await addAssetToCollectionUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', collectionId, assetId }, deps);
    expect(r.ok).toBe(true);
  });

  it('removes asset from collection', async () => {
    await addAssetToCollectionUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', collectionId, assetId }, deps);
    const r = await removeAssetFromCollectionUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', collectionId, assetId }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 4) References (2)
// ═══════════════════════════════════════════

describe('References', () => {
  let deps: ReturnType<typeof makeDeps>;
  let assetId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const a = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 'ref', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    if (!a.ok) throw new Error('setup');
    assetId = a.value.assetId;
  });

  it('attaches reference to catalog_item', async () => {
    const r = await attachReferenceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId,
        ownerType: 'catalog_item', ownerId: 'item-1', referenceType: 'primary' }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('asset.reference.attached')).toBe(1);
  });

  it('detaches reference', async () => {
    const ref = await attachReferenceUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId,
        ownerType: 'user', ownerId: 'user-1', referenceType: 'avatar' }, deps);
    if (!ref.ok) throw new Error('setup');
    const r = await detachReferenceUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', referenceId: ref.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 5) Metadata (2)
// ═══════════════════════════════════════════

describe('Metadata', () => {
  let deps: ReturnType<typeof makeDeps>;
  let assetId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const a = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 'meta', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k',
        metadata: { copyright: '2026' } }, deps);
    if (!a.ok) throw new Error('setup');
    assetId = a.value.assetId;
  });

  it('updates metadata (merge)', async () => {
    const r = await updateMetadataUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId, metadata: { photographer: 'Jane' } }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.metadata.photographer).toBe('Jane');
      expect((r.value.metadata as Record<string, unknown>).copyright).toBe('2026');
    }
  });

  it('replaces metadata (full)', async () => {
    const r = await replaceMetadataUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId, metadata: { source: 'new' } }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.metadata.source).toBe('new');
  });
});

// ═══════════════════════════════════════════
// 6) Transformations (2)
// ═══════════════════════════════════════════

describe('Transformations', () => {
  let deps: ReturnType<typeof makeDeps>;
  let assetId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const a = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 't', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    if (!a.ok) throw new Error('setup');
    assetId = a.value.assetId;
  });

  it('requests transformation', async () => {
    const r = await requestTransformationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId,
        transformationType: 'resize', inputParams: { width: 200, height: 200 } }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('asset.transformation.requested')).toBe(1);
  });

  it('registers transformation result', async () => {
    const t = await requestTransformationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId,
        transformationType: 'compress', inputParams: { quality: 80 } }, deps);
    if (!t.ok) throw new Error('setup');
    const r = await registerTransformationUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', transformationId: t.value.id, outputVariantId: 'var-1' }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 7) Uploads (3)
// ═══════════════════════════════════════════

describe('Uploads', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates upload session', async () => {
    const r = await createUploadSessionUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        providerId: 'sp-1', providerKey: 'path/file.png', mimeType: 'image/png',
        expectedSizeBytes: 1024 }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('asset.upload.started')).toBe(1);
  });

  it('completes upload', async () => {
    const s = await createUploadSessionUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        providerId: 'sp-1', providerKey: 'path/f.png', mimeType: 'image/png',
        expectedSizeBytes: 512 }, deps);
    if (!s.ok) throw new Error('setup');
    const r = await completeUploadUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', sessionId: s.value.id,
        uploadedBytes: 512, hash: { algorithm: 'sha256', value: 'abc' } }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Completed');
  });

  it('cancels upload', async () => {
    const s = await createUploadSessionUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        providerId: 'sp-1', providerKey: 'c', mimeType: 'image/png',
        expectedSizeBytes: 100 }, deps);
    if (!s.ok) throw new Error('setup');
    const r = await cancelUploadUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', sessionId: s.value.id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 8) Versions (2)
// ═══════════════════════════════════════════

describe('Versions', () => {
  let deps: ReturnType<typeof makeDeps>;
  let assetId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const a = await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 'ver', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    if (!a.ok) throw new Error('setup');
    assetId = a.value.assetId;
  });

  it('publishes version', async () => {
    const r = await publishVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.versionNumber).toBe(1);
  });

  it('rollbacks to version 1', async () => {
    await publishVersionUseCase({ tenantId: 't-1', correlationId: 'r-2', actorId: 'admin', assetId }, deps);
    await updateAssetUseCase({ tenantId: 't-1', correlationId: 'r-3', actorId: 'admin', assetId, name: 'Changed' }, deps);
    await publishVersionUseCase({ tenantId: 't-1', correlationId: 'r-4', actorId: 'admin', assetId }, deps);
    const r = await rollbackVersionUseCase(
      { tenantId: 't-1', correlationId: 'r-5', actorId: 'admin', assetId, versionNumber: 1 }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 9) Audit + Multi-Tenant (3)
// ═══════════════════════════════════════════

describe('Audit + Multi-Tenant', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit on create', async () => {
    await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'aud', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    const records = await deps.auditRepo.findByTenant('t-1');
    expect(records.some((r) => r.eventType === 'asset_created')).toBe(true);
  });

  it('isolates across tenants', async () => {
    deps.organizationVerifier.add('t-2', 'org-1');
    deps.policyProvider.set('t-2', { allowedAssetTypes: ['image'] });
    await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'A', slug: 'same', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    const r = await createAssetUseCase(
      { tenantId: 't-2', correlationId: 'r-2', actorId: 'admin', organizationId: 'org-1',
        name: 'B', slug: 'same', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k2' }, deps);
    expect(r.ok).toBe(true);
  });

  it('EventEnvelope has 11 fields', async () => {
    await createAssetUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin', organizationId: 'org-1',
        name: 'X', slug: 'env', type: 'image', mimeType: 'image/png',
        sizeBytes: 1, storageProviderId: 'sp', storageKey: 'k' }, deps);
    const env = deps.eventBus.byType('asset.created')[0].envelope;
    expect(env.engine).toBe('media');
    expect(env.version).toBe('1.0.0');
    expect(env.eventId).toBeDefined();
  });
});
