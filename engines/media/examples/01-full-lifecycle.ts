/**
 * Media Engine — Demo
 */
import {
  createAssetUseCase, createVariantUseCase, createCollectionUseCase, addAssetToCollectionUseCase,
  attachReferenceUseCase, createUploadSessionUseCase, completeUploadUseCase,
  requestTransformationUseCase, registerTransformationUseCase,
  publishVersionUseCase, archiveAssetUseCase, restoreAssetUseCase,
  InMemoryAssetRepository, InMemoryAssetVariantRepository, InMemoryAssetCollectionRepository,
  InMemoryAssetReferenceRepository, InMemoryUploadSessionRepository,
  InMemoryAssetTransformationRepository, InMemoryAssetVersionRepository, InMemoryMediaAuditRepository,
  InMemoryOrganizationVerifier, StaticMediaPolicyProvider,
  InMemoryStorageProviderResolver, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Media Engine — Demo ═══\n');
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
  deps.organizationVerifier.add('demo', 'org-1');
  deps.policyProvider.set('demo', { allowedAssetTypes: ['image', 'video', 'document'] });
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Create Asset');
  const a = u(await createAssetUseCase(
    { tenantId: 'demo', correlationId: 'd1', actorId: 'admin', organizationId: 'org-1',
      name: 'Banner', slug: 'banner', type: 'image', mimeType: 'image/png',
      sizeBytes: 50000, storageProviderId: 'sp-1', storageKey: 'banners/hero.png',
      dimensions: { width: 1920, height: 1080 } }, deps));
  console.log(`  ✓ assetId=${a.assetId}\n`);

  console.log('▶ 2) Create Variant (thumbnail)');
  u(await createVariantUseCase(
    { tenantId: 'demo', correlationId: 'd2', actorId: 'admin', assetId: a.assetId,
      variantType: 'thumbnail', name: 'Thumb', mimeType: 'image/webp',
      sizeBytes: 5000, storageProviderId: 'sp-1', storageKey: 'banners/thumb.webp' }, deps));
  console.log('  ✓ variant created\n');

  console.log('▶ 3) Create Collection + Add Asset');
  const coll = u(await createCollectionUseCase(
    { tenantId: 'demo', correlationId: 'd3', actorId: 'admin', organizationId: 'org-1',
      name: 'Website Assets', slug: 'web-assets', type: 'gallery' }, deps));
  u(await addAssetToCollectionUseCase(
    { tenantId: 'demo', correlationId: 'd4', actorId: 'admin', collectionId: coll.id, assetId: a.assetId }, deps));
  console.log('  ✓ asset added to collection\n');

  console.log('▶ 4) Attach Reference');
  u(await attachReferenceUseCase(
    { tenantId: 'demo', correlationId: 'd5', actorId: 'admin', assetId: a.assetId,
      ownerType: 'catalog_item', ownerId: 'item-1', referenceType: 'primary' }, deps));
  console.log('  ✓ reference attached\n');

  console.log('▶ 5) Upload Session');
  const sess = u(await createUploadSessionUseCase(
    { tenantId: 'demo', correlationId: 'd6', actorId: 'admin', organizationId: 'org-1',
      providerId: 'sp-1', providerKey: 'uploads/new.png', mimeType: 'image/png',
      expectedSizeBytes: 8000 }, deps));
  u(await completeUploadUseCase(
    { tenantId: 'demo', correlationId: 'd7', actorId: 'admin', sessionId: sess.id, uploadedBytes: 8000 }, deps));
  console.log('  ✓ upload completed\n');

  console.log('▶ 6) Transformation');
  const t = u(await requestTransformationUseCase(
    { tenantId: 'demo', correlationId: 'd8', actorId: 'admin', assetId: a.assetId,
      transformationType: 'resize', inputParams: { width: 400, height: 300 } }, deps));
  u(await registerTransformationUseCase(
    { tenantId: 'demo', correlationId: 'd9', actorId: 'admin', transformationId: t.id, outputVariantId: 'var-1' }, deps));
  console.log('  ✓ transformation registered\n');

  console.log('▶ 7) Publish Version');
  u(await publishVersionUseCase(
    { tenantId: 'demo', correlationId: 'd10', actorId: 'admin', assetId: a.assetId }, deps));
  console.log('  ✓ version 1 published\n');

  console.log('▶ 8) Archive → Restore');
  u(await archiveAssetUseCase(
    { tenantId: 'demo', correlationId: 'd11', actorId: 'admin', assetId: a.assetId }, deps));
  u(await restoreAssetUseCase(
    { tenantId: 'demo', correlationId: 'd12', actorId: 'admin', assetId: a.assetId }, deps));
  console.log('  ✓ archived + restored\n');

  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of deps.eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [t, c] of [...counts.entries()].sort()) console.log(`  ${t}: ${c}`);
  console.log('\n═══ Demo Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
