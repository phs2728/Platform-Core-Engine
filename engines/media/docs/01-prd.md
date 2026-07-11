# Media Engine — Product Requirements Document

**Version**: v1.0
**Status**: Draft (사장님 확립 대기, 2026-07-11)
**Effective Date**: 사장님 확립일
**Owner**: 사장님 (박흥식 / Tim Park)
**Review Cycle**: 1년

---

## 0. 문서 위치 (Positioning)

Media Engine은 **Platform Business Foundation 3번 엔진**입니다.

이 엔진은 **특정 산업을 전혀 알지 못합니다**(Industry Agnostic).
이 엔진은 **Media Asset의 메타데이터**만 관리합니다.

**실제 파일 저장/스트리밍/CDN은 Host 책임**.
엔진은 **메타데이터 + Reference만 표준화** — Industry 무관.

```
This is NOT an application.
This is NOT an demo.
This is NOT an MVP.
This is a reusable Platform Business Foundation Engine.
```

---

## 1. 목적 (Mission)

> 사장님 확립:
>
> **Media Engine은 media의 "메타데이터 카탈로그"다.**
>
> 실제 binary 저장은 Host가 하고, 엔진은 metadata + reference만 표준화한다.
>
> Industry 도메인 워드 ❌ (Photo, Image, Video 같은 산업 워드는 ❌ — `Asset` 추상 모델만).

### 1.1 책임 범위 (In Scope)

- **Asset** (메타데이터) — 파일 자체 ❌
- **AssetCollection** (Asset 묶음)
- **AssetReference** (다른 엔진에서 참조)
- **Storage Adapter 호환** (S3/R2/GCS/Local 모두 가능 — Host 결정)
- **Variant Track** (Original / Thumbnail / Preview / Web-optimized)
- **Tag / Taxonomy** (Asset 분류)
- **Multi-Tenant 격리 + Organization Ownership**
- **EventEnvelope 발행 + Audit Trail**
- **Industry CustomDataPolicy** (사장님 표준)

### 1.2 책임 범위 밖 (Out of Scope)

- ❌ 실제 파일 binary 저장 (Host Storage Adapter)
- ❌ CDN / Streaming / Video transcoding pipeline
- ❌ Image processing (resize, crop, filter) — Host 책임
- ❌ Authentication / Authorization / User Profile
- ❌ Catalog / Pricing 직접 호출 (MediaRef만 보관)
- ❌ Industry 도메인 워드 (Photo, Image, Video, Audio) — `Asset` 추상 모델만

---

## 2. 도메인 (Domain)

### 2.1 Asset (추상 모델)

```
Asset
{
  id, tenantId, organizationId,
  
  name: string,                      // 표시 이름
  slug: string,
  description?: string,
  status: 'Draft' | 'Active' | 'Archived' | 'Deleted',
  
  // 추상 type — Industry-specific 의미 ❌
  // 예: 'image', 'video', 'audio', 'document', 'model_3d', 'archive'
  type: string,                      
  
  // Media Category (business 의미) — Industry-specific 자유 형식
  category?: string,
  attributes: Record<string, unknown>,   // Industry CustomDataPolicy 검증
  
  storageRef: {
    storageAdapterId: string,     // Host Storage Adapter ID (S3/R2/GCS/Local/...)
    storageKey: string,            // Adapter 내부 key
    storageRegion?: string,
    publicUrl?: string,            // Optional (Host 구성)
    signedUrlTtl?: number,         // Optional signed URL TTL (sec)
  },
  
  // Variant tracks (Original, Thumbnail, WebP, MP4-low, ...)
  variants: AssetVariant[],
  defaultVariantId?: string,
  
  // Lifecycle metadata
  mimeType?: string,                 // 'image/jpeg', 'video/mp4', ...
  sizeBytes?: number,                // Optional (Host 제공)
  checksum?: string,                 // sha256 / md5 (Host 제공)
  
  // Media 메타 (원본 reference ❌ — Host 책임)
  dimensions?: { width: number, height: number, duration?: number },
  
  // Search
  searchKeywords: string[],
  searchBoost?: number,
  
  // Tag / Taxonomy
  tags: string[],
  collectionIds: string[],
  
  customDataPolicyRef?: string,
  
  metadata: ...,
  
  audit fields (createdAt/By, updatedAt/By, archivedAt, deletedAt)
}
```

### 2.2 AssetVariant (Variant tracks)

```
AssetVariant
{
  id, tenantId, organizationId,
  parentAssetId: string,
  
  variantType: 'original' | 'thumbnail' | 'preview' | 'optimized_web' | 'optimized_mobile',
  name: string,
  
  storageRef: {
    storageAdapterId: string,
    storageKey: string,
    storageRegion?: string,
  },
  
  mimeType?: string,
  sizeBytes?: number,
  
  dimensions?: { width: number, height: number },
  
  purpose: 'primary' | 'fallback' | 'preview' | 'thumb',
  
  metadata: ...,
  audit fields,
}
```

### 2.3 AssetCollection (Asset 묶음)

```
AssetCollection
{
  id, tenantId, organizationId,
  
  name: string,
  slug: string,
  description?: string,
  status: ...,
  
  type: 'gallery' | 'album' | 'asset_group' | 'themed_collection',
  attributes: ...,
  
  assetIds: string[],          // Member Asset IDs
  subcollectionIds: string[],  // 계층 (cycle detection)
  displayOrder: number,
  
  metadata: ...,
  audit fields,
}
```

### 2.4 AssetReference (다른 엔진에서 부착용)

```
AssetReference
{
  id, tenantId, organizationId,
  
  assetId: string,                 // Media Engine Asset ID
  ownerType: 'item' | 'variant' | 'bundle' | 'collection',  // Catalog Engine owner
  ownerId: string,                  // Catalog Engine ID
  
  role: 'primary' | 'gallery' | 'thumbnail' | 'preview' | 'attachment',
  displayOrder: number,
  
  metadata: ...,
  audit fields,
}
```

**이 reference 자체는 Catalog Engine 내부에 보관 가능**. 별도 엔티티로 둘지 결정.

---

## 3. Multi-Tenant & Organization Ownership

(사장님 확립 표준 — `docs/BUSINESS_ENGINE_STANDARD.md` 참조)

- 모든 Asset은 tenantId + organizationId 보유
- `slug`는 Tenant 내 유니크
- Host Interface: `IOrganizationVerifier`

---

## 4. Use Cases (Public API)

### 4.1 Asset Lifecycle (10개)

```
createAssetUseCase              // metadata만, storage ref
updateAssetUseCase
addVariantUseCase
removeVariantUseCase
setDefaultVariantUseCase
attachAssetToOwnerUseCase       // AssetRef
detachAssetFromOwnerUseCase
archiveAssetUseCase
deleteAssetUseCase
getAssetUseCase
```

### 4.2 AssetCollection Lifecycle (6개)

```
createCollectionUseCase
updateCollectionUseCase
addAssetToCollectionUseCase
removeAssetFromCollectionUseCase
archiveCollectionUseCase
deleteCollectionUseCase
```

### 4.3 Search & List (4개)

```
listAssetsUseCase
searchAssetsUseCase
listCollectionsUseCase
listVariantsUseCase
```

### 4.4 Status (3개)

```
changeAssetStatusUseCase
changeCollectionStatusUseCase
changeVariantStatusUseCase
```

### 4.5 CustomDataPolicy (2개)

```
attachCustomDataPolicyUseCase
detachCustomDataPolicyUseCase
```

### 4.6 Tag (3개)

```
addAssetTagUseCase
removeAssetTagUseCase
listTagsUseCase
```

### 4.7 Storage Adapter 참조 (2개)

```
registerStorageAdapterUseCase    // Host Storage Adapter 메타 등록
archiveStorageAdapterUseCase
```

**총 32개 Use Case (Sprint 1 MVP는 16개).**

---

## 5. 책임 경계

### 5.1 다른 엔진과의 경계

| 의존 | 방향 | Media 책임 | Media가 ❌ |
|---|---|---|---|
| Catalog | ← | AssetReference 보관 | Item 자체 |
| User | ← | createdBy/updatedBy | Profile |
| Organization | ← | organizationId | Profile |
| Storage Adapter | → | Adapter metadata 등록 | 실제 binary |
| Pricing | ← | (없음) | — |

### 5.2 Host Interface (3-Layer DI)

```typescript
interface IStorageAdapterResolver {
  resolve(storageAdapterId: string): Promise<Result<IStorageAdapter, NotFoundError>>;
  listAvailableAdapters(tenantId: string): Promise<readonly string[]>;
}

interface IStorageAdapter {
  id: string;
  type: 's3' | 'r2' | 'gcs' | 'local' | 'custom';
  
  // Host가 진짜 구현 (S3 SDK, R2 SDK, etc.)
  generateUploadUrl(storageKey: string, contentType: string): Promise<Result<{ url: string; expiresAt: string }, Error>>;
  resolveUrl(storageKey: string, ttlSeconds: number): Promise<Result<string, Error>>;
  delete(storageKey: string): Promise<Result<void, Error>>;
  exists(storageKey: string): Promise<Result<boolean, Error>>;
}

interface ICustomDataPolicyProvider {
  validateAssetAttributes(
    tenantId: string,
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, ValidationError>>;
  
  validateStorageAdapter(
    tenantId: string,
    adapterType: string,
    adapterId: string,
  ): Promise<Result<void, ValidationError>>;
  
  getAllowedAssetTypes(tenantId: string): Promise<readonly string[]>;
  getAllowedStorageAdapterTypes(tenantId: string): Promise<readonly string[]>;
  getMaxAssetsPerOrg(tenantId: string): Promise<number>;
  getMaxVariantsPerAsset(tenantId: string): Promise<number>;
}
```

**엔진은 DB / Storage / CDN 직접 호출 ❌** — Host만 가능.

---

## 6. Events

### 6.1 발행 Event (16개)

```
media.asset.created
media.asset.updated
media.asset.status.changed
media.asset.archived
media.asset.restored
media.asset.deleted
media.asset.variant.added
media.asset.variant.removed
media.asset.collection.added
media.asset.collection.removed
media.asset.policy.attached
media.asset.policy.detached
media.collection.created
media.collection.updated
media.collection.archived
media.audit.recorded
```

---

## 7. Strict Boundaries

### 7.1 owns

```
["MediaAsset", "AssetVariant", "MediaCollection",
 "AssetReference", "AssetTag", "MediaAudit",
 "StorageAdapterMetadata"]
```

### 7.2 forbidden

```
["Authentication", "Password", "Session", "OAuth", "MFA",
 "Permission", "Role", "Policy",
 "Booking", "Payment", "Order", "Invoice",
 "Inventory", "CatalogItem", "CatalogCollection",
 "AddressRawField", "EmailRawField", "PhoneRawField",
 "Photo", "Image", "Video", "Audio", "Document",
 "BinaryStorage", "Streaming", "CDN", "Transcoding",
 "IndustrySpecificField"]
```

---

## 8. 결정 대기 항목 (사장님 확립)

| # | 결정 | 사장님 옵션 |
|---|---|---|
| 1 | **Phase 위치** | (a) **Phase 4** (Business Foundation) / (b) Phase 5 (Business) |
| 2 | **storageRef 강제?** | (a) **storageRef 필수** / (b) metadata-only optional |
| 3 | **Variant tracks 표준** | (a) **original + thumbnail + optimized** / (b) Industry 자유 |
| 4 | **Mime Type 검증을 Host가?** | (a) **ICustomDataPolicy** / (b) Engine + Policy |
| 5 | **Cycle detection** | (a) **Subcollection 무제한 + cycle** / (b) depth limit |
| 6 | **Chunk upload 지원** | (a) Host 100% 책임 / (b) Multipart metadata Engine 일부 |
| 7 | **Public URL 자동 생성** | (a) Host 결정 / (b) Engine signedUrl helper |
| 8 | **AssetReference 보관 위치** | (a) **Media Engine 자체** / (b) **Catalog Engine 내부** |

---

## 9. Acceptance

다음 질문에 모두 YES면 Merge:

> 1. **Industry-Agnostic** 검증 통과? **YES**
> 2. Organization Ownership 모든 Asset에? **YES**
> 3. Multi-Tenant 격리 모든 Repo? **YES**
> 4. 5-Step Use Case 패턴? **YES**
> 5. **실제 binary 저장 ❌** (메타데이터 only)? **YES**
> 6. **Photo/Image/Video 워드 ❌** (Asset 추상)? **YES**
> 7. Storage Adapter는 Host Interface로? **YES**
> 8. CustomDataPolicy 게이트? **YES**
> 9. EventEnvelope 16+? **YES**
> 10. Audit Trail? **YES**

YES → RC1 Merge.

Stable 조건 충족 후 Stable.

---

## 10. 다음 단계

- **Sprint 1**: 16 Use Cases (MVP) + 16 Events + 35+ tests
- **Sprint 2**: 32 Use Cases 완성 + Storage Adapter 인터페이스 강화
- **Sprint 3**: Engine Cert + Stable 선언

이후 Phase 5: Booking (Media 활용) / Payment / Order / Review / Inventory

---

**작성 완료. 사장님 확립 대기.**
