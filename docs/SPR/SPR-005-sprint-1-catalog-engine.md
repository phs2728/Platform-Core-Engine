# SPR-005 — Sprint 1: Catalog Engine (Reference Business Engine)

> 사장님 Platform Owner 확립 (2026-07-11):
> "Identity Engine이 Foundation의 기준이었듯이, **Catalog Engine은 이후 Inventory, Booking, Payment, Marketplace, POS가 모두 참고하는 기준 엔진**입니다."

| Sprint | 1 (Sprint 1) |
|---|---|
| Engine | Catalog |
| Status | **Draft (in progress)** |
| Branch | `feature/catalog-engine-sprint-1` |
| Date | 2026-07-11 |
| Owner | 사장님 (박흥식 / Tim Park) |

---

## Goal

**Catalog Engine RC1** — 사장님 확립 결정 8개 적용, 20 Use Cases 구현, 40+ tests, In-Memory Repository 6개, Reference Business Engine으로서의 기준 품질 확립.

**사장님 확립 Acceptance**:
> "Catalog Engine을 삭제하면 Inventory, Booking, Pricing, Media, Marketplace, POS가 모두 영향을 받는가?"
> → **YES**

---

## 결정 8개 사장님 확립 (2026-07-11)

| # | 결정 | **사장님 확립** |
|---|---|---|
| 1 | **Phase 위치** | ✅ **Phase 4** (Business Foundation) |
| 2 | **Organization Ownership** | ✅ **Org Required — 모든 Business Resource 예외 없이** |
| 3 | **CustomDataPolicy 시점** | ✅ **Use Case 진입 시 1회 (Business Logic 중간 호출 ❌)** |
| 4 | **attributes 스키마 강제** | ✅ **자유 JSON + Policy Validation** |
| 5 | **Slug 전략** | ✅ **Tenant 내 유니크** |
| 6 | **status 전이 모델** | ✅ **4-state (Draft/Active/Archived/Deleted)** |
| 7 | **Bundle 깊이** | ✅ **무제한 + cycle detection** |
| 8 | **Sprint 1 범위 / Event 수** | ✅ **~20 Use Cases / 18 Events 단위** |

---

## Scope

### Sprint 1 In-Scope (20 Use Cases)

| 영역 | Use Cases | 개수 |
|---|---|---|
| **Catalog Core** | `createCatalogUseCase`, `updateCatalogUseCase`, `archiveCatalogUseCase`, `restoreCatalogUseCase`, `deleteCatalogUseCase`, `getCatalogUseCase`, `listCatalogsUseCase`, `searchCatalogsUseCase` | **8** |
| **Category** | `createCategoryUseCase`, `updateCategoryUseCase`, `moveCategoryUseCase`, `deleteCategoryUseCase` | **4** |
| **Variant** | `createVariantUseCase`, `updateVariantUseCase`, `deleteVariantUseCase` | **3** |
| **Bundle** | `createBundleUseCase`, `updateBundleUseCase`, `deleteBundleUseCase` | **3** |
| **Reference** | `assignMediaRefUseCase`, `assignPricingRefUseCase` | **2** |
| **Total** | | **20** |

### Sprint 1 Not-Scope (Sprint 2+)

- Pricing Engine 자체는 ❌ (Catalog RC 후 시작)
- Media Engine 자체는 ❌ (Pricing 후 시작)
- Inventory / Booking / Order / Payment / Review
- Status Change (state machine 확장)
- Tag operations / Full text search
- Detach / Reassign Use Cases

### Domain 모델 (Sprint 1)

```
Catalog (root, Organization-owned, slug 유니크)
├── Category (계층 — parent/child, cycle detection)
│   └── Item (Catalog 내 entry, attributes 자유 JSON, CustomDataPolicy 검증)
│        ├── Variant (Item 옵션, sku 유니크 per Item)
│        └── Bundle (Item/Variant 정적 조합)
└── Reference
     ├── MediaRef (Item/Variant/Bundle에 Media ID 연결)
     └── PricingRef (Item/Variant/Bundle에 Pricing ID 연결)
```

**필드 이름 표준** (`docs/BUSINESS_ENGINE_STANDARD.md` §4):
- `attributes`: Industry-specific 자유 JSON (Type별 의미)
- `customFields`: Industry-specific named fields (선택)
- `metadata`: Tenant-scoped 임의 JSON

---

## Completed (구현 단계)

_(in progress - feature/catalog-engine-sprint-1)_

### 코드 구조 (예정)

```
engines/catalog/
├── README.md                      # 엔진 개요
├── engine.json                    # Phase 4 + depends_on
├── docs/
│   └── 01-prd.md                  # 사장님 확립 PRD v1.0
├── examples/
│   └── 01-full-lifecycle.ts       # Demo: Create → Variant → Bundle → assign
├── src/
│   ├── index.ts                   # Public API 진입점
│   ├── domain/
│   │   ├── audit.ts
│   │   ├── events.ts
│   │   ├── hierarchy.ts           # Category cycle detection
│   │   ├── statusTransition.ts    # 4-state machine
│   │   └── validation.ts          # zod schemas 18+개
│   ├── infrastructure/
│   │   ├── InMemoryEventBus.ts
│   │   ├── InMemoryCatalogRepository.ts
│   │   ├── InMemoryCategoryRepository.ts
│   │   ├── InMemoryVariantRepository.ts
│   │   ├── InMemoryBundleRepository.ts
│   │   ├── InMemoryReferenceRepository.ts
│   │   ├── InMemoryCatalogAuditRepository.ts
│   │   └── hostAdapters.ts        # ICustomDataPolicyProvider + verifiers
│   ├── interfaces/
│   │   └── index.ts               # 8개 도메인 인터페이스 + 6개 Repo interface
│   └── use-cases/
│       ├── types.ts
│       ├── CatalogCoreUseCases.ts        # 8개
│       ├── CategoryUseCases.ts           # 4개
│       ├── VariantUseCases.ts            # 3개
│       ├── BundleUseCases.ts             # 3개
│       └── ReferenceUseCases.ts          # 2개
└── test/
    ├── helpers.ts
    └── catalog.test.ts            # 40+ tests
```

### Use Case Pattern (사장님 확립 5-Step)

```
1. zod validate
2. Repo lookup (Multi-Tenant + Organization Ownership)
3. Business logic (Policy check + 검증)
4. Repo write
5. EventEnvelope + Audit + Result<T,E>
```

---

## Remaining (Sprint 2+)

Sprint 1 완료 시:

- **Sprint 2 — Catalog Hardening**: Status Change Use Cases (Catalog.status, Category.status), Pricing/Media Reference Detach, Tag operations, Full Text Search, RFC P1 backlog
- **Pricing Engine** (Catalog RC1 → Pricing 시작)
- **Media Engine** (Pricing RC1 → Media 시작)
- 이후: Inventory → Booking → Order → Payment → Review → Workflow → Search → Analytics → AI

---

## PRG Result (19-question gate)

| # | Question | Status |
|---|---|---|
| 1 | Domain이 Industry-Agnostic? | ✅ (Sprint 1 목표) |
| 2 | Engine-NOT-Application? | ✅ |
| 3 | 3-Layer DI? | ✅ |
| 4 | 모든 Use Case가 Result<T,E> 반환? | ✅ |
| 5 | throw 안 함? | ✅ |
| 6 | 모든 변경이 EventEnvelope 발행? | ✅ (18+ events) |
| 7 | Audit 기록? | ✅ |
| 8 | Repository 인터페이스? | ✅ (6개) |
| 9 | In-Memory Repository 제공? | ✅ (6개) |
| 10 | Multi-Tenant 격리? | ✅ |
| 11 | Event Bus 발행? | ✅ |
| 12 | 새 헌법/규칙 추가 ❌? | ✅ |
| 13 | 새로운 문서 추가 ❌ (PRD/SPR만)? | ✅ |
| 14 | Branch only? | ✅ (`feature/catalog-engine-sprint-1`) |
| 15 | Conventional Commits? | ✅ |
| 16 | Merge Gate 보고 형식 (PASS/N)? | ✅ |
| 17 | Engine Cert 단계? | 🟡 (Sprint 2+ 마무리) |
| 18 | Public API Snapshot? | ✅ |
| 19 | Documentation 일관성? | ✅ |

**판정**: Sprint 1 RC1 시 **CONDITIONAL PASS** (Identity Engine 패턴 동일).

---

## Coverage (Sprint 1 목표)

| 카테고리 | 기대 |
|---|---|
| UseCase 20개 happy path | 20+ tests |
| UseCase 20개 error paths | 20+ tests |
| Multi-Tenant 격리 | 2+ tests |
| Cycle detection (Category, Bundle) | 2+ tests |
| EventEnvelope 11 fields | 1+ test |
| CustomDataPolicy 검증 | 2+ tests |
| Audit Trail | 1+ test |
| status 4-state machine | 4+ tests |
| Repository tenant scope | 1+ test |
| **Total** | **≥ 40 tests** |

---

## Next Sprint

### Sprint 2 — Catalog Hardening (사장님 확립 후 시작)

**Scope**:
- Status Change (`changeCatalogStatusUseCase`, `changeCategoryStatusUseCase`)
- Tag operations (addItemTagUseCase, removeItemTagUseCase)
- PricingRef/MediaRef Detach Use Cases
- Full Text Search (Catalog.searchable_fields Engine 일부 구현)
- Hardening (Security 패턴, RFC P1 — race condition 등)

**Estimated**: 36+ Use Cases 전체 완성, 60+ tests.

**Stable 조건 충족 후** (사장님 확립 4조건):
1. GitHub Actions Green
2. PRG 최종 PASS
3. Engine Certification 최종 승인
4. 실제 Pricing/Media Engine에서 사용 검증

---

## Report Convention

- Conventional Commits §C-23 적용
- 한국어 주석, English code (사장님 스타일)
- 모든 보고는 PASS/N 간결 형식
- 새 RFC, Constitution, Platform Rule 추가 ❌

---

**보고 완료. SPR-005 Sprint 1 진행 중. RC1 Merge Gate Report 제출 대기.**
