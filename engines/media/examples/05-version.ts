/**
 * Media Engine — Example 05: Versions
 *
 * Flow: Create asset → Publish version → Rollback version
 */
import {
  createAssetUseCase, publishVersionUseCase, rollbackVersionUseCase,
  InMemoryAssetRepository, InMemoryAssetVariantRepository, InMemoryAssetCollectionRepository,
  InMemoryAssetReferenceRepository, InMemoryUploadSessionRepository,
  InMemoryAssetTransformationRepository, InMemoryAssetVersionRepository, InMemoryMediaAuditRepository,
  InMemoryOrganizationVerifier, StaticMediaPolicyProvider,
  InMemoryStorageProviderResolver, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Media Engine — 05 Versions ═══\n');
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
    { tenantId: 'demo', correlationId: 'v1', actorId: 'admin', organizationId: 'org-demo',
      name: 'Doc', slug: 'doc', type: 'document', mimeType: 'application/pdf',
      sizeBytes: 4000, storageProviderId: 'sp-1', storageKey: 'docs/spec.pdf' }, deps));
  console.log(`  ✓ assetId=${a.assetId}\n`);

  console.log('▶ 2) Publish Version');
  const v = u(await publishVersionUseCase(
    { tenantId: 'demo', correlationId: 'v2', actorId: 'admin', assetId: a.assetId }, deps));
  console.log(`  ✓ versionNumber=${v.versionNumber} status=${v.status}\n`);

  console.log('▶ 3) Rollback Version');
  const rb = u(await rollbackVersionUseCase(
    { tenantId: 'demo', correlationId: 'v3', actorId: 'admin', assetId: a.assetId,
      versionNumber: v.versionNumber }, deps));
  console.log(`  ✓ rolled back to versionNumber=${rb.versionNumber}\n`);

  console.log('═══ Example 05 Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
