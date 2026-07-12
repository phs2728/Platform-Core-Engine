/**
 * Media Engine — Example 04: Collections
 *
 * Flow: Create multiple assets → Create collection → Add assets → Remove
 */
import {
  createAssetUseCase, createCollectionUseCase, addAssetToCollectionUseCase, removeAssetFromCollectionUseCase,
  InMemoryAssetRepository, InMemoryAssetVariantRepository, InMemoryAssetCollectionRepository,
  InMemoryAssetReferenceRepository, InMemoryUploadSessionRepository,
  InMemoryAssetTransformationRepository, InMemoryAssetVersionRepository, InMemoryMediaAuditRepository,
  InMemoryOrganizationVerifier, StaticMediaPolicyProvider,
  InMemoryStorageProviderResolver, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Media Engine — 04 Collections ═══\n');
  const deps = {
    assetRepo: new InMemoryAssetRepository(),
    variantRepo: new InMemoryAssetVariantRepository(),
    collectionRepo: new InMemoryAssetCollectionRepository(),
    referenceRepo: new InMemoryAssetReferenceRepository(),
    uploadRepo: new InMemoryUploadSessionRepository(),
    transformationRepo: new InMemoryAssetTransformationRepository(),
    versionRepo: new InMemoryAssetVersionRepository(),
    auditRepo: new InMemoryMediaAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier: new InMemoryOrganizationVerifier(),
    policyProvider: new StaticMediaPolicyProvider(),
    storageResolver: new InMemoryStorageProviderResolver(),
    idGenerator: { generate: () => `demo-${Math.random().toString(36).slice(2, 8)}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  deps.organizationVerifier.add('demo', 'org-demo');
  deps.policyProvider.set('demo', { allowedAssetTypes: ['image', 'video', 'document', 'model_3d'] });
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Create Multiple Assets');
  const a1 = u(await createAssetUseCase(
    { tenantId: 'demo', correlationId: 'c1', actorId: 'admin', organizationId: 'org-demo',
      name: 'Shot A', slug: 'shot-a', type: 'image', mimeType: 'image/png',
      sizeBytes: 10000, storageProviderId: 'sp-1', storageKey: 'gallery/a.png' }, deps));
  const a2 = u(await createAssetUseCase(
    { tenantId: 'demo', correlationId: 'c2', actorId: 'admin', organizationId: 'org-demo',
      name: 'Shot B', slug: 'shot-b', type: 'image', mimeType: 'image/png',
      sizeBytes: 20000, storageProviderId: 'sp-1', storageKey: 'gallery/b.png' }, deps));
  console.log(`  ✓ assetIds=${a1.assetId}, ${a2.assetId}\n`);

  console.log('▶ 2) Create Collection');
  const coll = u(await createCollectionUseCase(
    { tenantId: 'demo', correlationId: 'c3', actorId: 'admin', organizationId: 'org-demo',
      name: 'Gallery', slug: 'gallery', type: 'gallery' }, deps));
  console.log(`  ✓ collectionId=${coll.id}\n`);

  console.log('▶ 3) Add Assets to Collection');
  u(await addAssetToCollectionUseCase(
    { tenantId: 'demo', correlationId: 'c4', actorId: 'admin', collectionId: coll.id, assetId: a1.assetId }, deps));
  u(await addAssetToCollectionUseCase(
    { tenantId: 'demo', correlationId: 'c5', actorId: 'admin', collectionId: coll.id, assetId: a2.assetId }, deps));
  console.log(`  ✓ added ${a1.assetId}, ${a2.assetId}\n`);

  console.log('▶ 4) Remove Asset from Collection');
  u(await removeAssetFromCollectionUseCase(
    { tenantId: 'demo', correlationId: 'c6', actorId: 'admin', collectionId: coll.id, assetId: a1.assetId }, deps));
  console.log(`  ✓ removed ${a1.assetId}\n`);

  console.log('═══ Example 04 Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
