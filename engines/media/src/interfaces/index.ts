/**
 * Media Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Business Foundation Phase 4:
 *  - Media = Platform SSoT for all digital assets
 *  - Storage Provider Plugin (S3/Cloudinary/Azure/GCS ❌ — Interface만)
 *  - Organization Ownership 필수
 *  - CustomDataPolicy = Use Case 진입 시 1회 호출
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface ICustomDataPolicyProvider {
  validateAttributes(
    tenantId: string,
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>>;
  getAllowedAssetTypes(tenantId: string): Promise<readonly string[]>;
  getMaxAssetsPerOrg(tenantId: string): Promise<number>;
  getMaxVariantsPerAsset(tenantId: string): Promise<number>;
  getMaxCollectionsPerOrg(tenantId: string): Promise<number>;
}

/**
 * Storage Provider Plugin — 사장님 확립 Plugin Architecture.
 * Host가 진짜 구현 (S3, Cloudinary, Azure, GCS, Local, ...).
 * Engine은 IStorageProvider 인터페이스만 사용.
 */
export interface IStorageProvider {
  readonly providerId: string;
  readonly providerType: string;

  upload(providerKey: string, data: Uint8Array, mimeType: string): Promise<Result<{ key: string; sizeBytes: number }, Error>>;
  download(providerKey: string): Promise<Result<Uint8Array, Error>>;
  delete(providerKey: string): Promise<Result<void, Error>>;
  generateSignedUrl(providerKey: string, ttlSeconds: number): Promise<Result<string, Error>>;
  exists(providerKey: string): Promise<Result<boolean, Error>>;
  getMetadata(providerKey: string): Promise<Result<StorageMetadata, Error>>;
}

export interface StorageMetadata {
  sizeBytes: number;
  mimeType: string;
  etag?: string;
  lastModified?: string;
}

/**
 * Storage Provider Resolver — Host가 어떤 provider를 사용할지 결정.
 */
export interface IStorageProviderResolver {
  resolve(providerId: string): Promise<Result<IStorageProvider, Error>>;
  getDefault(tenantId: string): Promise<Result<IStorageProvider, Error>>;
}

// ═══════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════

export type AssetStatus = 'Draft' | 'Active' | 'Archived' | 'Deleted';
export type UploadSessionStatus = 'Pending' | 'Completed' | 'Cancelled' | 'Failed';
export type Visibility = 'private' | 'tenant' | 'public';

export interface Dimensions {
  width?: number;
  height?: number;
  duration?: number;
}

export interface AssetHash {
  algorithm: string;   // 'sha256' | 'md5' | ...
  value: string;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface Asset {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  status: AssetStatus;
  type: string;                          // 'image', 'video', 'audio', 'document', 'model_3d', 'archive', etc.
  mimeType: string;
  sizeBytes: number;
  dimensions?: Dimensions;
  hash?: AssetHash;
  checksum?: string;
  language?: string;

  storageProviderId: string;
  storageKey: string;

  visibility: Visibility;
  accessPolicyRef?: string;

  tags: string[];
  attributes: Record<string, unknown>;
  customFields: Record<string, unknown>;
  metadata: Record<string, unknown>;

  variantIds: string[];
  collectionIds: string[];

  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

export interface AssetVariant {
  id: string;
  tenantId: string;
  assetId: string;
  variantType: string;             // 'thumbnail', 'preview', 'optimized_web', 'optimized_mobile', etc.
  name: string;
  mimeType: string;
  sizeBytes: number;
  dimensions?: Dimensions;
  storageProviderId: string;
  storageKey: string;
  isDefault: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCollection {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  type: string;                    // 'gallery', 'album', 'asset_group', etc.
  assetIds: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AssetReference {
  id: string;
  tenantId: string;
  assetId: string;
  ownerType: string;               // free-form owner type (e.g., user, org, catalog_item, etc.)
  ownerId: string;
  referenceType: string;           // 'primary' | 'gallery' | 'thumbnail' | 'attachment' | 'avatar' | 'logo' | ...
  displayOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface UploadSession {
  id: string;
  tenantId: string;
  organizationId: string;
  assetId: string | null;          // null until complete → creates/links asset
  providerId: string;
  providerKey: string;
  mimeType: string;
  expectedSizeBytes: number;
  status: UploadSessionStatus;
  uploadedBytes: number;
  hash?: AssetHash;
  createdAt: string;
  completedAt: string | null;
}

export interface AssetTransformation {
  id: string;
  tenantId: string;
  assetId: string;
  transformationType: string;       // 'resize' | 'compress' | 'convert' | 'extract_thumbnail' | ...
  inputParams: Record<string, unknown>;
  outputVariantId: string | null;
  status: 'Requested' | 'Registered' | 'Failed';
  providerId?: string;
  createdAt: string;
  completedAt: string | null;
}

export interface AssetVersion {
  id: string;
  tenantId: string;
  assetId: string;
  versionNumber: number;
  snapshot: Record<string, unknown>;
  status: 'Published' | 'RolledBack';
  publishedAt: string;
  publishedBy: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface AssetSearchCriteria {
  tenantId: string;
  organizationId?: string;
  query?: string;
  type?: string;
  status?: AssetStatus;
  tags?: string[];
  mimeType?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'sizeBytes';
  sortOrder?: 'asc' | 'desc';
}

export interface AssetSearchResult {
  assets: Asset[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type MediaAuditEventType =
  | 'asset_created' | 'asset_updated' | 'asset_archived' | 'asset_restored' | 'asset_deleted'
  | 'variant_created' | 'variant_updated' | 'variant_deleted'
  | 'collection_created' | 'asset_added_to_collection' | 'asset_removed_from_collection'
  | 'reference_attached' | 'reference_detached'
  | 'metadata_updated' | 'metadata_replaced'
  | 'transformation_requested' | 'transformation_registered'
  | 'upload_started' | 'upload_completed' | 'upload_cancelled'
  | 'version_published' | 'version_rollback';

export interface MediaAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  assetId?: string;
  actorId: string;
  correlationId: string;
  eventType: MediaAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IAssetRepository {
  insert(asset: Asset): Promise<void>;
  findById(tenantId: string, id: string): Promise<Asset | null>;
  findBySlug(tenantId: string, slug: string): Promise<Asset | null>;
  update(tenantId: string, id: string, patch: Partial<Asset>): Promise<void>;
  search(criteria: AssetSearchCriteria): Promise<AssetSearchResult>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
  countByOrganization(tenantId: string, organizationId: string): Promise<number>;
}

export interface IAssetVariantRepository {
  insert(variant: AssetVariant): Promise<void>;
  findById(tenantId: string, id: string): Promise<AssetVariant | null>;
  findByAsset(tenantId: string, assetId: string): Promise<AssetVariant[]>;
  update(tenantId: string, id: string, patch: Partial<AssetVariant>): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
  countByAsset(tenantId: string, assetId: string): Promise<number>;
}

export interface IAssetCollectionRepository {
  insert(collection: AssetCollection): Promise<void>;
  findById(tenantId: string, id: string): Promise<AssetCollection | null>;
  findByOrganization(tenantId: string, organizationId: string): Promise<AssetCollection[]>;
  update(tenantId: string, id: string, patch: Partial<AssetCollection>): Promise<void>;
}

export interface IAssetReferenceRepository {
  insert(reference: AssetReference): Promise<void>;
  findById(tenantId: string, id: string): Promise<AssetReference | null>;
  findByAsset(tenantId: string, assetId: string): Promise<AssetReference[]>;
  findByOwner(tenantId: string, ownerType: string, ownerId: string): Promise<AssetReference[]>;
  remove(tenantId: string, id: string): Promise<void>;
}

export interface IUploadSessionRepository {
  insert(session: UploadSession): Promise<void>;
  findById(tenantId: string, id: string): Promise<UploadSession | null>;
  update(tenantId: string, id: string, patch: Partial<UploadSession>): Promise<void>;
}

export interface IAssetTransformationRepository {
  insert(transformation: AssetTransformation): Promise<void>;
  findById(tenantId: string, id: string): Promise<AssetTransformation | null>;
  findByAsset(tenantId: string, assetId: string): Promise<AssetTransformation[]>;
  update(tenantId: string, id: string, patch: Partial<AssetTransformation>): Promise<void>;
}

export interface IAssetVersionRepository {
  insert(version: AssetVersion): Promise<void>;
  findAll(tenantId: string, assetId: string): Promise<AssetVersion[]>;
  findByNumber(tenantId: string, assetId: string, versionNumber: number): Promise<AssetVersion | null>;
  update(tenantId: string, id: string, patch: Partial<AssetVersion>): Promise<void>;
}

export interface IMediaAuditRepository {
  insert(record: Omit<MediaAuditRecord, 'id' | 'createdAt'>): Promise<MediaAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<MediaAuditRecord[]>;
  findByAsset(tenantId: string, assetId: string, limit?: number): Promise<MediaAuditRecord[]>;
}

export { type Result, type EventEnvelope };
