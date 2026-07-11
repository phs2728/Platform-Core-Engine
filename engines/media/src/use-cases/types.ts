/**
 * Media Engine — Shared Use Case Deps
 */

import type {
  IClock, IIdGenerator, IEventBus,
  IAssetRepository, IAssetVariantRepository, IAssetCollectionRepository,
  IAssetReferenceRepository, IUploadSessionRepository,
  IAssetTransformationRepository, IAssetVersionRepository,
  IMediaAuditRepository,
  IOrganizationVerifier, ICustomDataPolicyProvider,
  IStorageProviderResolver,
} from '../interfaces/index.js';

export interface MediaUseCaseDeps {
  assetRepo: IAssetRepository;
  variantRepo: IAssetVariantRepository;
  collectionRepo: IAssetCollectionRepository;
  referenceRepo: IAssetReferenceRepository;
  uploadRepo: IUploadSessionRepository;
  transformationRepo: IAssetTransformationRepository;
  versionRepo: IAssetVersionRepository;
  auditRepo: IMediaAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: ICustomDataPolicyProvider;
  storageResolver: IStorageProviderResolver;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
