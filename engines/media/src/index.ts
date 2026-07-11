/**
 * Media Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Business Foundation Phase 4:
 *   Platform SSoT for all digital assets. Storage Provider Plugin.
 */

export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

export type {
  Asset, AssetVariant, AssetCollection, AssetReference,
  UploadSession, AssetTransformation, AssetVersion,
  AssetStatus, Visibility, Dimensions, AssetHash, StorageMetadata,
  AssetSearchCriteria, AssetSearchResult,
  MediaAuditRecord, MediaAuditEventType,
} from './interfaces/index.js';

export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, ICustomDataPolicyProvider,
  IStorageProvider, IStorageProviderResolver,
  IAssetRepository, IAssetVariantRepository, IAssetCollectionRepository,
  IAssetReferenceRepository, IUploadSessionRepository,
  IAssetTransformationRepository, IAssetVersionRepository,
  IMediaAuditRepository,
} from './interfaces/index.js';

// Use Cases — Asset Lifecycle (8) + Variants (3) + Collections (3) + References (2)
export {
  createAssetUseCase, updateAssetUseCase,
  archiveAssetUseCase, restoreAssetUseCase, deleteAssetUseCase,
  getAssetUseCase, searchAssetsUseCase, listAssetsUseCase,
  createVariantUseCase, updateVariantUseCase, deleteVariantUseCase,
  createCollectionUseCase, addAssetToCollectionUseCase, removeAssetFromCollectionUseCase,
  attachReferenceUseCase, detachReferenceUseCase,
  type CreateAssetInput,
} from './use-cases/AssetLifecycleUseCases.js';

// Use Cases — Metadata (2) + Transform (2) + Upload (3) + Version (2)
export {
  updateMetadataUseCase, replaceMetadataUseCase,
  requestTransformationUseCase, registerTransformationUseCase,
  createUploadSessionUseCase, completeUploadUseCase, cancelUploadUseCase,
  publishVersionUseCase, rollbackVersionUseCase,
} from './use-cases/MetadataTransformUploadVersionUseCases.js';

export type { MediaUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories + Host Adapters
export {
  InMemoryAssetRepository,
  InMemoryAssetVariantRepository,
  InMemoryAssetCollectionRepository,
  InMemoryAssetReferenceRepository,
  InMemoryUploadSessionRepository,
  InMemoryAssetTransformationRepository,
  InMemoryAssetVersionRepository,
  InMemoryMediaAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

export {
  InMemoryOrganizationVerifier,
  StaticMediaPolicyProvider,
  InMemoryStorageProvider,
  InMemoryStorageProviderResolver,
  InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';
