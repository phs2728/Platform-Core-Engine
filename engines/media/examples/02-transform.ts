/**
 * Media Engine — Example 02: Transformations
 *
 * Flow: Create asset → Register transformation → Request transformation
 */
import {
  createAssetUseCase, requestTransformationUseCase, registerTransformationUseCase,
  InMemoryAssetRepository, InMemoryAssetVariantRepository, InMemoryAssetCollectionRepository,
  InMemoryAssetReferenceRepository, InMemoryUploadSessionRepository,
  InMemoryAssetTransformationRepository, InMemoryAssetVersionRepository, InMemoryMediaAuditRepository,
  InMemoryOrganizationVerifier, StaticMediaPolicyProvider,
  InMemoryStorageProviderResolver, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Media Engine — 02 Transformations ═══\n');
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
    { tenantId: 'demo', correlationId: 't1', actorId: 'admin', organizationId: 'org-demo',
      name: 'Photo', slug: 'photo', type: 'image', mimeType: 'image/jpeg',
      sizeBytes: 120000, storageProviderId: 'sp-1', storageKey: 'photos/shot.jpg',
      dimensions: { width: 4000, height: 3000 } }, deps));
  console.log(`  ✓ assetId=${a.assetId}\n`);

  console.log('▶ 2) Register Transformation (create a thumbnail transform)');
  const requested = u(await requestTransformationUseCase(
    { tenantId: 'demo', correlationId: 't2', actorId: 'admin', assetId: a.assetId,
      transformationType: 'resize', inputParams: { width: 200, height: 200 } }, deps));
  console.log(`  ✓ transformationId=${requested.id} status=${requested.status}\n`);

  console.log('▶ 3) Register Transformation output');
  const registered = u(await registerTransformationUseCase(
    { tenantId: 'demo', correlationId: 't3', actorId: 'admin',
      transformationId: requested.id, outputVariantId: 'var-thumb' }, deps));
  console.log(`  ✓ status=${registered.status} outputVariantId=${registered.outputVariantId}\n`);

  console.log('═══ Example 02 Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
