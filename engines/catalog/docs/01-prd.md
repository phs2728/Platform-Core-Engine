# Catalog Engine — Product Requirements Document

**Version**: v1.0
**Status**: Draft (사장님 확립 대기, 2026-07-11)
**Effective Date**: 사장님 확립일
**Owner**: 사장님 (박흥식 / Tim Park)
**Review Cycle**: 1년

---

## 0. 문서 위치 (Positioning)

Catalog Engine은 **Platform Business Foundation 1번 엔진**입니다.

이 엔진은 **특정 산업을 전혀 알지 못합니다**(Industry Agnostic).
이 엔진은 **Product/Item/Inventory Catalog의 추상 모델**만 관리합니다.

이 엔진은 앞으로 개발될 **모든 Business Engine**이 공통으로 사용합니다:

- Inventory Engine (Phase 4)
- Pricing Engine (Phase 4)
- Booking Engine (Phase 5)
- Payment Engine (Phase 5)
- Order Engine (Phase 5)
- Review Engine (Phase 5)
- Search Engine (Phase 6)
- Analytics Engine (Phase 6)
- AI Engine (Phase 6)

```
This is NOT an application.
This is NOT an demo.
This is NOT an MVP.
This is a reusable Platform Business Foundation Engine.
Every design decision must maximize extensibility, configurability and long-term maintainability.
```

---

## 1. 목적 (Mission)

> 사장님 확립:
>
> **Catalog Engine은 "특정 산업을 전혀 모르는 Catalog 도메인 엔진"이다.**
>
> 이 엔진은 Item, Collection, Variant, AssetReference 같은 **추상 모델**만 관리한다.
>
> "Product", "Service", "Menu", "Room" 같은 산업 특정 단어를 절대 사용하지 않는다.
>
> Hospitality, Marketplace, ERP, CRM, Church, School, NGO 모두 동일 엔진 사용 가능.

### 1.1 책임 범위 (In Scope)

- **Entity** (Item/Collection/Variant/Bundle) 정의
- **Entity Attribute** (free-form metadata)
- **Entity Status** (Active / Draft / Archived / Deleted)
- **Entity Relationship** (Cross-reference: Item ↔ Variant, Item ↔ Bundle, Item ↔ Asset)
- **Pricing Reference** (Pricing Engine reference, 실제 가격 ❌)
- **Media Reference** (Media Engine reference, 실제 media ❌)
- **Taxonomy** (Tag / Category / Group) — 자유 분류
- **Searchable Index** (Search Engine reference, 실제 검색 ❌)
- **Multi-Tenant 격리** (tenantId)
- **Organization Ownership** (모든 Entity는 Organization 소유)
- **EventEnvelope 발행** (모든 변경)
- **Audit Trail** (모든 변경 기록)

### 1.2 책임 범위 밖 (Out of Scope)

다음은 **절대** Catalog Engine에 포함되지 않습니다:

- ❌ 산업 도메인 워드 (Product, Service, Menu, Room, Tour, Lodging, ...)
- ❌ Pricing 계산 (Pricing Engine)
- ❌ Media Storage (Media Engine)
- ❌ Booking/Reservation (Booking Engine)
- ❌ Payment/Transaction (Payment Engine)
- ❌ Order Lifecycle (Order Engine)
- ❌ Review/Rating (Review Engine)
- ❌ Authentication (Identity Engine)
- ❌ Authorization (Authorization Engine)
- ❌ User Profile (User Engine)
- ❌ Raw Address Field (Address Engine)
- ❌ Raw Email/Phone Field (Identity Engine)
- ❌ Inventory (Inventory Engine) — Catalog는 Item의 의미만 관리, 수량/물류 ❌
- ❌ Search Engine (Search Engine) — Catalog는 searchable attribute 제공, 검색 자체 ❌

---

## 2. 도메인 (Domain)

### 2.1 Entity 추상 모델

Catalog는 **5가지 핵심 엔터티**로 구성:

```
Item          (가장 작은 단위)
  ↑
Collection    (Item의 묶음 또는 카테고리)
  ↑
Bundle        (여러 Item/Collection 조합, 정적)
  ↑
Variant       (Item의 세부 옵션, e.g., size, color, version)
```

**모두 Industry-Agnostic 추상 모델** — 실제 의미는 Industry 사장님이 `attributes`로 정의.

### 2.2 Item (핵심 엔터티)

```
Item
{
  id: string,
  tenantId: string,
  organizationId: string,  // Organization Ownership
  
  name: string,             // 표시 이름
  slug: string,             // URL-safe identifier
  description?: string,
  status: ItemStatus,       // 'Draft' | 'Active' | 'Archived' | 'Deleted'
  
  type: string,             // Industry-agnostic type 식별자 (free-form)
                             // 예: 'lodging_unit', 'menu_item', 'tour_session', 'service_hour'
  
  attributes: Record<string, unknown>,  // Industry-specific data
                                          // CustomDataPolicy로 검증
                                          // Type별로 다른 schema
  
  pricingRefs: PricingRef[],   // Pricing Engine reference
  mediaRefs: MediaRef[],       // Media Engine reference
  variantIds: string[],        // Item 하위 Variant ID 목록
  parentBundleIds: string[],   // 이 Item이 속한 Bundle ID 목록
  collectionIds: string[],     // 이 Item이 속한 Collection ID 목록
  
  searchKeywords: string[],    // Search Engine이 사용할 키워드
  searchBoost?: number,        // 검색 우선순위 boost
  
  tags: string[],              // 자유 태그
  categoryRefs: string[],      // Taxonomy reference
  
  metadata: Record<string, unknown>,  // Tenant-scoped 임의 metadata
  
  createdAt: string,
  createdBy: string,
  updatedAt: string,
  updatedBy: string,
  archivedAt: string | null,
  deletedAt: string | null,
}
```

**규칙**:
- `attributes`는 Industry-specific 자유 형식
- `type`은 Industry가 정의하는 자유 분류자
- `pricingRefs`, `mediaRefs`는 **다른 엔진 ID 참조** (실제 가격/미디어 ❌)

### 2.3 Collection (Item의 묶음)

```
Collection
{
  id, tenantId, organizationId,
  
  name: string,
  slug: string,
  description?: string,
  status: ...,
  
  type: string,             // 'menu_section', 'product_category', ...
  attributes: ...,
  
  itemIds: string[],         // 이 Collection에 속한 Item ID 목록
  subcollectionIds: string[],  // 계층 (depth unlimited, cycle detection)
  
  displayOrder: number,
  
  ... 동일한 metadata/audit fields
}
```

### 2.4 Variant (Item의 옵션)

```
Variant
{
  id, tenantId, organizationId,
  parentItemId: string,      // 이 Variant가 속한 Item
  
  name: string,              // 예: "Red / Large / 2024"
  sku: string,               // Inventory Engine이 사용할 SKU
  attributes: {...},         // Industry-specific variant attributes
  
  pricingRefs: PricingRef[],
  mediaRefs: MediaRef[],
  
  isDefault: boolean,        // Default variant 표시
  
  status: ...,
  
  ... metadata/audit fields
}
```

**Variant는 항상 Item에 속함** (Standalone 없음).

### 2.5 Bundle (Item/Collection 조합)

```
Bundle
{
  id, tenantId, organizationId,
  
  name: string,
  description: string,
  status: ...,
  
  components: BundleComponent[],
  
  pricingRefs: PricingRef[],
  mediaRefs: MediaRef[],
  
  type: string,             // 'fixed_bundle', 'mix_match_bundle', ...
  
  ... metadata/audit fields
}

BundleComponent
{
  refType: 'item' | 'collection' | 'variant',
  refId: string,
  quantity: number,
  attributes: Record<string, unknown>,
}
```

### 2.6 Taxonomy (Tag / Category)

```
Category
{
  id, tenantId, organizationId,
  parentCategoryId: string | null,  // 계층
  name: string,
  slug: string,
  description?: string,
  displayOrder: number,
}
```

Tag는 단순 `string[]` (자유 형식).

---

## 3. Multi-Tenant & Organization Ownership (사장님 표준)

### 3.1 Multi-Tenant 격리

- 모든 Entity는 `tenantId` 보유
- Repository 키 = `${tenantId}::${id}`
- 같은 Tenant 내 `slug`/`sku` 유니크

### 3.2 Organization Ownership (사장님 확립)

**모든 Entity는 `organizationId` 보유**:
- Catalog는 Organization Engine의 `Organization.Owner` 존재를 host 통해 검증
- Host Interface: `IOrganizationVerifier.verify(tenantId, organizationId)`
- Cross-organization 접근 ❌

---

## 4. 책임 경계 (Boundary Discipline)

### 4.1 다른 엔진과의 경계

| 도메인 | 책임 엔진 | Catalog가 호출 | Catalog가 ❌ |
|---|---|---|---|
| Pricing | Pricing Engine | PricingRef만 보관 | 실제 가격 ❌ |
| Media | Media Engine | MediaRef만 보관 | 실제 media ❌ |
| Organization | Organization Engine | organizationId 보관 | Profile ❌ |
| User | User Engine | createdBy/updatedBy ID | Profile ❌ |
| Inventory | Inventory Engine | sku 보관 | 재고 수량 ❌ |
| Search | Search Engine | searchKeywords | 검색 결과 ❌ |
| Booking | Booking Engine | Item ID 참조 | 예약 lifecycle ❌ |
| Payment | Payment Engine | Item ID 참조 | 결제 ❌ |
| Address | Address Engine | LocationRef 보관 | raw 주소 ❌ |

### 4.2 Host Interface (3-Layer DI)

```typescript
// 검증/조회 인터페이스 (Host가 구현 주입)
interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

interface IUserVerifier {
  verify(tenantId: string, userId: string): Promise<boolean>;
}

interface IAddressVerifier {
  verify(tenantId: string, addressId: string): Promise<boolean>;
}

interface ICustomDataPolicyProvider {
  validateAttributes(
    tenantId: string,
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, ValidationError>>;
  
  getAllowedTypes(tenantId: string): Promise<readonly string[]>;
  getMaxItemsPerOrg(tenantId: string): Promise<number>;
  getMaxVariantsPerItem(tenantId: string): Promise<number>;
  getMaxBundleSize(tenantId: string): Promise<number>;
}
```

**엔진은 DB / Cache / Email 직접 호출 ❌** — Host만 가능.

---

## 5. Use Cases (Public API)

> 사장님 spec §Public API — Sprint 1 = ~20 Use Cases (Reference Business Engine).
> Sprint 2+ 는 PRD §5.x 확장 영역.

### 5.1 Catalog Core (8개) — 사장님 확립 Sprint 1

```
createCatalogUseCase           // 새 Catalog 생성 (Organization 단위 root)
updateCatalogUseCase
archiveCatalogUseCase
restoreCatalogUseCase
deleteCatalogUseCase
getCatalogUseCase
listCatalogsUseCase
searchCatalogsUseCase
```

### 5.2 Category (4개) — 사장님 확립 Sprint 1

```
createCategoryUseCase
updateCategoryUseCase
moveCategoryUseCase             // Parent 재배치 + cycle detection
deleteCategoryUseCase
```

### 5.3 Variant (3개) — 사장님 확립 Sprint 1

```
createVariantUseCase
updateVariantUseCase
deleteVariantUseCase
```

### 5.4 Bundle (3개) — 사장님 확립 Sprint 1

```
createBundleUseCase
updateBundleUseCase
deleteBundleUseCase
```

### 5.5 Reference (2개) — 사장님 확립 Sprint 1

```
assignMediaRefUseCase          // Catalog.Item/Variant/Bundle에 Media ID 연결
assignPricingRefUseCase        // Catalog.Item/Variant/Bundle에 Pricing ID 연결
```

**Sprint 1 = 20 Use Cases (사장님 확립).
Sprint 2에서 PRD §5.6-5.8 (Status Change, Pricing Ref Detach, Media Ref Detach, Tag operations, 추가 lifecycle) 확장.**

**Note**: 사장님 spec에 따라 "Catalog = Organization 단위 root entity"로 단순화. Item/Collection/Variant/Bundle/Catalog 모두 Catalog 도메인 Entity로 동일 패턴 (Item이 없고 Catalog 자체가 Entity). 이 구조는 Sprint 2에 다시 평가.

### 5.6~5.8 (Sprint 2+ 보류)

- Status Change (collection.status 등)
- Pricing Ref Detach / Media Ref Detach
- Tag operations
- Full Text Search (Catalog.fields)

사장님 권고: Sprint 1 = Reference Business Engine 마무리. Sprint 2 = 36 Use Case 전체 확장.

---

## 6. Events

### 6.1 발행 Event (18개)

```
catalog.item.created
catalog.item.updated
catalog.item.attributes.updated
catalog.item.archived
catalog.item.restored
catalog.item.deleted
catalog.item.status.changed
catalog.collection.created
catalog.collection.updated
catalog.collection.item.added
catalog.collection.item.removed
catalog.collection.archived
catalog.collection.deleted
catalog.variant.added
catalog.variant.updated
catalog.variant.removed
catalog.bundle.created
catalog.bundle.components.updated
catalog.bundle.archived
catalog.pricing.ref.attached
catalog.pricing.ref.detached
catalog.media.ref.attached
catalog.media.ref.detached
catalog.taxonomy.tag.added
catalog.taxonomy.tag.removed
catalog.audit.recorded
```

**모두 Industry-neutral** (예: `catalog.item.created` — Hospitality도 Marketplace도 동일).

---

## 7. 표준 Use Case 패턴 (5-step)

```typescript
export async function createItemUseCase(
  input: CreateItemInput,
  deps: CatalogUseCaseDeps,
): Promise<Result<Item, ValidationError | ConflictError>> {
  // 1. zod validate
  // 2. Repo lookup (tenant isolation)
  // 3. Business logic:
  //    - Organization Ownership 검증 (IOrganizationVerifier)
  //    - CustomDataPolicy.validateAttributes()
  //    - pricingRef/mediaRef 검증 (어댑터 verify)
  //    - Uniqueness check (slug/sku)
  // 4. Repo write
  // 5. EventEnvelope + Audit + Result<T,E>
}
```

**모든 Use Case는 `Result<T, E>` 반환** (헌법 §C-15).

---

## 8. Strict Boundaries (engine.json §strict_boundaries)

### 8.1 owns

```
[
  "CatalogItem", "CatalogCollection", "CatalogVariant",
  "CatalogBundle", "CatalogTaxonomy", "CatalogCategory",
  "CatalogTag", "CatalogPricingRef", "CatalogMediaRef",
  "CatalogAudit"
]
```

### 8.2 forbidden

```
[
  "Authentication", "Password", "Session", "OAuth", "MFA",
  "Permission", "Role", "Policy",
  "Booking", "Payment", "Order", "Invoice",
  "Inventory", "StockQuantity",
  "Shipping", "Tax",
  "PricingCalculation", "PricingRule",
  "MediaStorage", "MediaUpload",
  "SearchEngine", "SearchIndex",
  "AddressRawField", "EmailRawField", "PhoneRawField",
  "Product", "Service", "Menu", "Room", "Tour", "Lodging",
  "IndustrySpecificField"
]
```

---

## 9. Industry Onboarding — CustomDataPolicy

> **사장님 확립 (2026-07-11)**:
> Industry가 자기 도메인 데이터를 정의하고 싶을 때, Industry 사장님이
> CustomDataPolicy Validation Function을 만든다. 엔진은 자유 형식 `attributes`로
> 데이터를 받고, Host가 제공한 policy로 검증한다.

### 9.1 표준 워크플로우

```
Hospitality 사장님 (새 산업 진입)
   ↓
"Hospitality Item Type" 정의
   e.g., 'lodging_unit', 'meeting_room', 'spa_package'
   ↓
"Hospitality attributes schema" 작성
   e.g., { bedCount, maxOccupancy, amenities[] }
   ↓
CustomDataPolicy Validation Function 작성 (TypeScript 50~200 LOC)
   ↓
Host에 등록 (Org Engine 통해)
   ↓
Host가 Catalog Engine에 policy 주입 (3-Layer DI)
   ↓
Catalog Engine은 industry-specific keyword 없이 동작
   ↓
Hospitality Item 생성 시 policy 통과 → OK
                          위반 → ValidationError
```

### 9.2 예시 — Hospitality의 CustomDataPolicy

```typescript
// Host가 제공
const hospitalityPolicy: ICustomDataPolicyProvider = {
  async validateAttributes(tenantId, type, attributes) {
    if (type === 'lodging_unit') {
      if (typeof attributes.bedCount !== 'number') {
        return Err(new ValidationError('bedCount required for lodging_unit'));
      }
      if (typeof attributes.maxOccupancy !== 'number') {
        return Err(new ValidationError('maxOccupancy required'));
      }
      // ...
    }
    return Ok(attributes);
  },
  // ...
};
```

**Catalog는 TypeScript 타입에 Industry별 keyword 없이 자유 형식만 받고, Host policy가 검증한다.**

---

## 10. Multi-Tenant + Organization Ownership (사장님 표준)

### 10.1 모든 Entity는 tenantId + organizationId 보유

- Tenant 격리: Repo key = `${tenantId}::${id}`
- Organization Ownership: 모든 Entity → Organization Engine 검증

### 10.2 Use Case 진입 시 검증

```typescript
async function createItemUseCase(input, deps) {
  // 1. zod validate
  // 2. Org verification
  const orgOk = await deps.organizationVerifier.verify(input.tenantId, input.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  // ...
}
```

---

## 11. 결정 확립 (사장님 Platform Owner, 2026-07-11)

| # | 결정 | **사장님 확립** |
|---|---|---|
| 1 | **Phase 위치** | ✅ **Phase 4** (Business Foundation) |
| 2 | **Organization Ownership** | ✅ **Org Required — 모든 Business Resource 예외 없이** |
| 3 | **CustomDataPolicy 시점** | ✅ **Use Case 진입 시 1회 (Business Logic 중간 호출 ❌ — 복잡도 방지)** |
| 4 | **attributes 스키마 강제** | ✅ **자유 JSON + Policy Validation** (attributes/customFields/metadata) |
| 5 | **Slug 전략** | ✅ **Tenant 내 유니크** |
| 6 | **status 전이 모델** | ✅ **4-state (Draft/Active/Archived/Deleted)** |
| 7 | **Bundle 깊이** | ✅ **무제한 + cycle detection** |
| 8 | **Sprint 1 범위 / Event 수** | ✅ **Sprint 1 = ~20 Use Cases / 18 Events 단위**. Sprint 2 = 36 Use Cases 확장 |

### 사장님 확립 Business Foundation Phase 순서 (2026-07-11)

```
① Catalog (현재 Sprint 1)
   ↓
② Pricing (Catalog RC 후 시작)
   ↓
③ Media (Pricing 후 시작)

↓ (Business Foundation 완료 후)

④ Inventory → ⑤ Booking → ⑥ Order → ⑦ Payment → ⑧ Review
   ↓ (Business Foundation 2차)
⑨ Workflow

↓

Platform Services:
   ⑩ Search → ⑪ Analytics → ⑫ AI
```

**Pricing은 반드시 Catalog를 참조해야 함** → Catalog 완성 후 시작.
**Media는 Catalog + Organization + User 사용** → Catalog 이후 시작.

---

## 12. Acceptance

다음 질문에 **모두 YES**면 Merge 가능:

> 1. **Industry-Agnostic** 검증 통과? **YES**
> 2. Organization Ownership **모든 Entity에 강제**? **YES**
> 3. Multi-Tenant 격리 모든 Repo 적용? **YES**
> 4. 5-Step Use Case 패턴 일관 적용? **YES**
> 5. CustomDataPolicy Validation Function 게이트 적용? **YES**
> 6. Pricing/Media/Inventory Engine의 실제 데이터 ❌ (Reference만)? **YES**
> 7. EventEnvelope 발행 (18+)? **YES**
> 8. Audit Trail (모든 변경)? **YES**
> 9. 36 Use Case 구현? **YES** (Sprint 1은 18개 MVP)
> 10. Import Boundary 통과? **YES**

YES → RC1 Merge.

Stable 조건: 사장님 Stable 4조건 충족 후.

---

## 13. 다음 단계

- **Sprint 1**: 18 Use Case + In-Memory Repo + 18 Events + 64+ tests (MVP RC1)
- **Sprint 2**: Hardening + 36 Use Case 완성 + RFC P1 (CustomDataPolicy 세부)
- **Sprint 3**: Production Readiness Audit + Engine Cert + Stable 선언
- 이후: **Pricing Engine**, **Media Engine** (Phase 4 동료 엔진)
- 이후 Phase 5: Inventory / Booking / Payment / Order / Review

---

**작성 완료. 사장님 확립 대기.**
