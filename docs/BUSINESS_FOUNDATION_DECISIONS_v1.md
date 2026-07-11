# Business Foundation Phase — Decision Matrix v1.0 (Sprint 1: Catalog 단독)

**사장님 Platform Owner 확립 (2026-07-11)** — Sprint 1 = **Catalog 단독**.
Pricing / Media는 **Catalog RC1 후** 시작 (순서 의존성).

---

## 0. Sprint 1 사장님 확립 상태 (2026-07-11)

**Sprint 1 RC1 진행 엔진**: **Catalog 단독**

**사장님 확립 결정 8개 (Catalog 적용)**:

| # | 결정 | **사장님 확립** |
|---|---|---|
| 1 | **Phase 위치** | ✅ **Phase 4** (Business Foundation) |
| 2 | **Organization Ownership** | ✅ **Org Required — 모든 Business Resource 예외 없이** |
| 3 | **CustomDataPolicy 시점** | ✅ **Use Case 진입 시 1회 (Business Logic 중간 호출 ❌ — 복잡도 방지)** |
| 4 | **attributes 스키마 강제** | ✅ **자유 JSON + Policy Validation** |
| 5 | **Slug 전략** | ✅ **Tenant 내 유니크** |
| 6 | **status 전이 모델** | ✅ **4-state (Draft/Active/Archived/Deleted)** |
| 7 | **Bundle 깊이** | ✅ **무제한 + cycle detection** |
| 8 | **Sprint 1 범위 / Event 수** | ✅ **~20 Use Cases / 18 Events 단위**. Sprint 2 = 36 Use Cases 확장 |

### Sprint 1 Use Cases 분포 (20개)

| 영역 | Use Cases | 개수 |
|---|---|---|
| Catalog Core (root entity) | createCatalog, updateCatalog, archiveCatalog, restoreCatalog, deleteCatalog, getCatalog, listCatalogs, searchCatalogs | **8** |
| Category (계층 + cycle detection) | createCategory, updateCategory, moveCategory, deleteCategory | **4** |
| Variant (Item 옵션) | createVariant, updateVariant, deleteVariant | **3** |
| Bundle (Item/Collection 조합) | createBundle, updateBundle, deleteBundle | **3** |
| Reference (Media / Pricing ID 연결) | assignMediaRef, assignPricingRef | **2** |
| **Total** | | **20** |

### Domain 단순화 (사장님 spec)

PRD §0에서 **Catalog = Organization 단위 root entity**로 단순화:

```
Catalog (root)
├── Category (계층 — cycle detection)
│   └── Item(=Catalog.Subcatalog 또는 다른 표현)
│        ├── Variant (옵션)
│        └── Bundle (조합)
```

**Sprint 1 Domain 모델**:
- **Catalog** (Organization 단위 root, slug 유니크)
- **Category** (계층 depth unlimited, cycle detection)
- **Item** (Catalog 내 entry, attributes 자유 JSON)
- **Variant** (Item 옵션, sku 유니크 per Item)
- **Bundle** (Item들의 정적 조합)
- **Reference** (Item/Variant/Bundle에 Media/Pricing ID)
- **Attribute / customFields / metadata** (자유 JSON + CustomDataPolicy)

---

## 1. 사장님 확립 Business Foundation Phase 순서 (2026-07-11)

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

## 2. Sprint 2+ 보류 (Catalog 완성 후 결정)

- Pricing Engine (Catalog RC 후 시작)
- Media Engine (Pricing RC 후 시작)
- Inventory Engine (Catalog + Pricing + Media 후)
- 이후 Business Engines (Booking / Payment / Order / Review)

---

## 3. Sprint 1 RC1 Acceptance (Catalog)

다음 질문에 모두 YES면 Merge 가능:

> 1. **Industry-Agnostic** 검증 통과? (Catalog 자기 자신)
> 2. Organization Ownership 모든 Entity? **YES**
> 3. Multi-Tenant 격리 모든 Repo? **YES**
> 4. 5-Step Use Case 패턴 일관 적용? **YES**
> 5. CustomDataPolicy Use Case 진입 시 1회 호출? **YES**
> 6. Pricing/Media Engine의 실제 데이터 ❌ (Reference ID만)? **YES**
> 7. EventEnvelope 18+ 발행? **YES**
> 8. Audit Trail? **YES**
> 9. 20 Use Cases 구현 + 40+ tests? **YES**

YES → RC1 Merge.

Stable 조건 (사장님 확립 4조건):
- GitHub Actions Green
- PRG 최종 PASS
- Engine Cert 최종 승인 (Sprint 2+)
- 실제 다른 엔진에서 사용 검증

---

## 4. 헌법 준수

- ✅ C-1 Industry-Agnostic (추상 모델만: Catalog/Category/Item/Variant/Bundle/Reference)
- ✅ C-4 Boundary Discipline (Pricing/Media ❌ 실제 데이터, Reference ID만)
- ✅ C-15 Engine-NOT-Application
- ✅ C-17 Stop Designing (이번 Sprint 새 헌장/규칙 추가 ❌)
- ✅ 사장님 확립 5가지 표준 (Spec → Engine → Use Case → Repo → Event)
- ✅ 사장님 확립 Multi-Tenant SaaS 표준
- ✅ 사장님 확립 Organization Ownership 표준

---

**보고 완료. 사장님 확립 + Catalog Sprint 1 RC1 진입 대기.**
