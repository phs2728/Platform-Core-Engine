# Business Foundation Phase — Decision Matrix v1.0

**사장님 확립 대기, 2026-07-11**

3개 엔진(Catalog / Pricing / Media) 모두 동일한 8개 결정 패턴.
사장님 확립 후 Sprint 1 RC1 진입 가능.

---

## Q1 — Authority: 결정 확립 주체

| 엔진 | 결정 |
|---|---|
| Catalog | 사장님이 직접 결정. AI 추측 ❌ |
| Pricing | 사장님이 직접 결정. AI 추측 ❌ |
| Media | 사장님이 직접 결정. AI 추측 ❌ |

> **"Identity Engine도 결정 8개를 먼저 확립한 후 Sprint 2 시작" 패턴** (헌장 `business-os-architecture` skill).

---

## Q1 — 결정 8개 (3 엔진 공통)

각 엔진에 대해 다음 8개 결정이 사장님 확립 대기. **PRD §11 참조**.

---

### 결정 1 — Phase 위치

| 엔진 | 사장님 옵션 (PRD §11.1) |
|---|---|
| **Catalog** | (a) **Phase 4** (Business Foundation — 사장님 패턴) / (b) Phase 5 (Business) |
| **Pricing** | (a) **Phase 4** / (b) Phase 5 |
| **Media** | (a) **Phase 4** / (b) Phase 5 |

**사장님 확립 대기.**

**제안(사장님 권한 內)**: Phase 4 (Business Foundation 명시 — `Catalog → Inventory → Pricing` 순서).

---

### 결정 2 — Organization Ownership 강제 여부

PRD §10 (`docs/BUSINESS_ENGINE_STANDARD.md` 참조).

| 엔진 | 사장님 옵션 |
|---|---|
| **Catalog** | (a) **Org Required** / (b) Org Optional / (c) User도 가능 |
| **Pricing** | (a) **Org Required** / (b) Org Optional / (c) User도 가능 |
| **Media** | (a) **Org Required** / (b) Org Optional / (c) User도 가능 |

**사장님 확립 대기.**

**제안**: Org Required (모든 Business Engine Resource는 Organization을 Owner로 사용 — 사장님 확립).

---

### 결정 3 — CustomDataPolicy 적용 시점

| 엔진 | 사장님 옵션 |
|---|---|
| **Catalog** | (a) **Use Case 진입 시 매번** / (b) Host 캐시 / (c) 비동기 |
| **Pricing** | (a) **Use Case 진입 시 동기 호출** / (b) 비동기 / (c) Hybrid |
| **Media** | (a) **Use Case 진입 시 동기 호출** / (b) 비동기 / (c) Hybrid |

**사장님 확립 대기.**

**제안**: Use Case 진입 시 동기 호출 (Industry Custom Data 검증 의무화).

---

### 결정 4 — attributes 스키마 강제 여부

| 엔진 | 사장님 옵션 |
|---|---|
| **Catalog** | (a) **자유 형식 + Policy 검증** / (b) JSON Schema 강제 / (c) Hybrid |
| **Pricing** | (a) **자유 형식 + Policy 검증** / (b) JSON Schema 강제 / (c) Hybrid |
| **Media** | (a) **자유 형식 + Policy 검증** / (b) JSON Schema 강제 / (c) Hybrid |

**사장님 확립 대기.**

**제안**: 자유 형식 + Policy 검증 (사장님 확립 표준 — Industry 사장님이 결정).

---

### 결정 5 — Engine 고유 결정

| 엔진 | 사장님 옵션 |
|---|---|
| **Catalog** Slug 전략 | (a) Tenant-내 유니크 / (b) Global / (c) Hierarchy |
| **Catalog** status 전이 | (a) **Active/Archived/Deleted** / (b) + Draft / (c) + Pending Review |
| **Catalog** Bundle 깊이 | (a) **무제한 + cycle detection** / (b) 1-level / (c) 3-level |
| **Pricing** Currency | (a) **Tenant 허용 화폐만** / (b) Global |
| **Pricing** PricingPlan↔Catalog 관계 | (a) **PricingRef 직접 연결** / (b) 별도 매핑 테이블 |
| **Media** Variant Tracks | (a) **original + thumbnail + optimized 표준** / (b) Industry 자유 |
| **Media** Storage Adapter | (a) **Host 100% 책임 + Engine metadata** / (b) Engine 일부 |
| **Media** AssetReference 보관 | (a) **Media Engine 자체** / (b) **Catalog Engine 내부** |

**사장님 확립 대기.**

**제안**:
- Catalog slug: Tenant 내 유니크 / status: + Draft (4-state) / Bundle: 무제한 + cycle
- Pricing Currency: Tenant 허용 화폐 / PricingRef: 직접 연결
- Media Variants: 표준 (original/thumbnail/optimized_web/optimized_mobile) / Storage: Host / AssetReference: Catalog Engine 내부

---

### 결정 6 — 이벤트 數

사장님 Identity Engine 패턴: events_emitted 도 적은 단위부터 시작 (Identity 기본 12개).

| 엔진 | 사장님 옵션 (PRD §6 참조) |
|---|---|
| **Catalog** | (a) **18개 단위** (Item/Collection/Variant 기본) / (b) 26개 전체 / (c) 36개 모두 |
| **Pricing** | (a) **14개 단위** (Currency/Plan/Component/Tier 기본) / (b) 28개 전체 |
| **Media** | (a) **16개 단위** (Asset/Variant/Collection 기본) / (b) 32개 전체 |

**사장님 확립 대기.**

**제안**: Sprint 1 = 단위 (18 / 14 / 16). Sprint 2 = 전체 확장.

---

### 결정 7 — CustomDataPolicy 인터페이스 표준화 (모든 엔진 공통)

```
interface ICustomDataPolicyProvider {
  validateAttributes(
    tenantId: string,
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, ValidationError>>;
  
  getAllowedTypes(tenantId: string): Promise<readonly string[]>;
  getMaxXxxPerOwner(tenantId: string): Promise<number>;
}
```

**사장님 확립 대기.**

**제안**: 모든 엔진이 동일한 ICustomDataPolicy 인터페이스 사용. 차이는 `validateXxx` 메서드 시그니처뿐.

---

### 결정 8 — Sprint 1 범위

| 엔진 | 사장님 옵션 |
|---|---|
| **Catalog** | (a) 18/36 Use Case (MVP) / (b) 36개 전체 |
| **Pricing** | (a) 14/28 Use Case (MVP) / (b) 28개 전체 |
| **Media** | (a) 16/32 Use Case (MVP) / (b) 32개 전체 |

**사장님 확립 대기.**

**제안**: Sprint 1 = MVP (18/14/16 Use Cases) + InMemory Repo + CustomDataPolicy + 35+ tests per engine.

---

## Acceptance (사장님 확립 후)

각 엔진 8개 결정 모두 확립 후:

```
✅ Engine-NOT-Application (헌법 §C-15)
✅ Industry-Agnostic (헌법 §C-1)
✅ Multi-Tenant (헌법 §C-2)
✅ Organization Ownership (사장님 표준)
✅ CustomDataPolicy (사장님 표준)
✅ 5-Step Use Case Pattern
✅ Result<T,E> / EventEnvelope / Audit
✅ Engine Cert 초안
```

YES → Sprint 1 RC1 가능.

---

**보고 완료. 사장님 확립 대기.**
