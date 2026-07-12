/**
 * Media Engine — Example 03: References
 *
 * Flow: Create asset → Attach reference to external entity → Detach
 */
import {
  createAssetUseCase, attachReferenceUseCase, detachReferenceUseCase,
  InMemoryAssetRepository, InMemoryAssetVariantRepository, InMemoryAssetCollectionRepository,
  InMemoryAssetReferenceRepository, InMemoryUploadSessionRepository,
  InMemoryAssetTransformationRepository, InMemoryAssetVersionRepository, InMemoryMediaAuditRepository,
  InMemoryOrganizationVerifier, StaticMediaPolicyProvider,
  InMemoryStorageProviderResolver, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Media Engine — 03 References ═══\n');
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

  console.log('▶ 1) Create Asset');
  const a = u(await createAssetUseCase(
    { tenantId: 'demo', correlationId: 'r1', actorId: 'admin', organizationId: 'org-demo',
      name: 'Product Render', slug: 'product-render', type: 'image', mimeType: 'image/png',
      sizeBytes: 80000, storageProviderId: 'sp-1', storageKey: 'products/render.png',
      dimensions: { width: 1024, height: 1024 } }, deps));
  console.log(`  ✓ assetId=${a.assetId}\n`);

  console.log('▶ 2) Attach Reference (catalog item → primary)');
  const ref = u(await attachReferenceUseCase(
    { tenantId: 'demo', correlationId: 'r2', actorId: 'admin', assetId: a.assetId,
      ownerType: 'catalog_item', ownerId: 'item-42', referenceType: 'primary' }, deps));
  console.log(`  ✓ referenceId=${ref.id} ownerType=${ref.ownerType} ownerId=${ref.ownerId}\n`);

  console.log('▶ 3) Detach Reference');
  u(await detachReferenceUseCase(
    { tenantId: 'demo', correlationId: 'r3', actorId: 'admin', referenceId: ref.id }, deps));
  console.log('  ✓ reference detached\n');

  console.log('═══ Example 03 Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
