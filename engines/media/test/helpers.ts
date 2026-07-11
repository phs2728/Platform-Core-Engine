/**
 * Test fixtures — Media Engine
 */
import type { MediaUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryAssetRepository, InMemoryAssetVariantRepository,
  InMemoryAssetCollectionRepository, InMemoryAssetReferenceRepository,
  InMemoryUploadSessionRepository, InMemoryAssetTransformationRepository,
  InMemoryAssetVersionRepository, InMemoryMediaAuditRepository,
  InMemoryOrganizationVerifier, StaticMediaPolicyProvider,
  InMemoryStorageProviderResolver, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let o = 0;
  return { now: () => new Date(new Date('2026-07-11T08:00:00.000Z').getTime() + o++ * 1000) };
}

export function makeDeps(): MediaUseCaseDeps & {
  assetRepo: InMemoryAssetRepository; variantRepo: InMemoryAssetVariantRepository;
  collectionRepo: InMemoryAssetCollectionRepository; referenceRepo: InMemoryAssetReferenceRepository;
  uploadRepo: InMemoryUploadSessionRepository; transformationRepo: InMemoryAssetTransformationRepository;
  versionRepo: InMemoryAssetVersionRepository; auditRepo: InMemoryMediaAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  policyProvider: StaticMediaPolicyProvider;
  storageResolver: InMemoryStorageProviderResolver;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const assetRepo = new InMemoryAssetRepository();
  const variantRepo = new InMemoryAssetVariantRepository();
  const collectionRepo = new InMemoryAssetCollectionRepository();
  const referenceRepo = new InMemoryAssetReferenceRepository();
  const uploadRepo = new InMemoryUploadSessionRepository();
  const transformationRepo = new InMemoryAssetTransformationRepository();
  const versionRepo = new InMemoryAssetVersionRepository();
  const auditRepo = new InMemoryMediaAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const policyProvider = new StaticMediaPolicyProvider();
  policyProvider.set('t-1', { allowedAssetTypes: ['image', 'video', 'document', 'model_3d'] });
  organizationVerifier.add('t-1', 'org-1');
  const storageResolver = new InMemoryStorageProviderResolver();

  let idCounter = 0;
  return {
    assetRepo, variantRepo, collectionRepo, referenceRepo, uploadRepo,
    transformationRepo, versionRepo, auditRepo, eventBus,
    organizationVerifier, policyProvider, storageResolver,
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random()*1e6).toString(36)}` },
    clock: makeClock(),
  };
}
