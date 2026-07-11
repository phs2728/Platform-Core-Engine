# Business Engine Standard v1.0 — Industry-Agnostic Foundation Model

**Version**: v1.0
**Status**: Draft (사장님 확립 대기, 2026-07-11)
**Effective Date**: 사장님 확립일
**Owner**: 사장님 (박흥식 / Tim Park)
**Review Cycle**: 1년

---

## 0. 문서 위치 (Positioning)

**Business Engine Standard**는 플랫폼 위에서 만들어지는 **모든 Business Engine**(Catalog, Pricing, Media, Booking, Payment, Order, Review, Workflow, Analytics, AI 등)이 따라야 하는 **공통 표준**입니다.

이 표준을 따르면:

- 어떤 산업 도메인에도 적용 가능한 **Industry-Agnostic Foundation Model**
- 모든 엔진이 **하나의 Multi-Tenant SaaS 패턴**으로 일관성 유지
- 모든 엔진이 **Organization을 Owner**로 사용 — 사장님 확립 표준
- 모든 엔진이 동일한 **5가지 표준 인터페이스**(Spec → Engine → Use Case → Repo → Event)를 따름

---

## 1. 목적 (Mission)

> 사장님 확립:
>
> **모든 Business Engine은 "특정 산업 도메인을 모른다".**
>
> 어떤 산업이 들어와도 같은 엔진이 작동한다.
>
> Hospitality, Marketplace, ERP, CRM, Church, School, NGO 모두 동일 엔진 사용.

### 1.1 책임 범위 (In Scope)

- **Industry-Agnostic**: 어떤 산업 도메인도 알지 못함 (헌법 §C-1)
- **Multi-Tenant SaaS**: Tenant 격리 + Organization Ownership 표준 (사장님 확립)
- **5가지 표준 인터페이스**: Spec → Engine → Use Case → Repo → Event
- **Boundary Discipline**: 다른 Foundation Engine의 책임 침범 금지
- **Event First**: 모든 변경은 EventEnvelope 발행
- **Audit Trail**: 모든 변경 기록
- **Strict Boundaries**: engine.json `strict_boundaries` 명확화

### 1.2 책임 범위 밖 (Out of Scope)

다음은 **절대** Business Engine에 포함되지 않습니다:

- ❌ 산업 특정 도메인 로직 (Booking/Payment/Order/Invoice/...)
- ❌ 인증 (Password, Session, OAuth) — Identity Engine
- ❌ 권한 (Permission, Role) — Authorization Engine
- ❌ 사용자 프로필 (Profile, Avatar) — User Engine
- ❌ 원시 주소/이메일 필드 — Address / Identity Engine
- ❌ 직접 외부 서비스 호출 (Host Interface 사용)

---

## 2. 5가지 표준 인터페이스

> **사장님 확립:**
>
> **Spec → Engine → Use Case → Repo → Event**
>
> 모든 Business Engine은 이 5가지 표준을 따른다.

### 2.1 Spec (도메인 인터페이스)
- 위치: `engines/<name>/src/interfaces/index.ts`
- 모든 도메인 타입 + 외부 참조 인터페이스
- **절대**: 도메인 워드 금지 (예: `Hotel`, `Restaurant`, `Tour`, `Order`)
- **대신**: 추상 모델 (`Entity`, `Item`, `Collection`, `Asset`)

### 2.2 Engine (진입점 + Use Case 묶음)
- 위치: `engines/<name>/src/index.ts`
- 공개 Use Case 함수 export
- Host Interface 정의 (3-Layer DI 패턴)

### 2.3 Use Case (비즈니스 로직)
- 위치: `engines/<name>/src/use-cases/`
- 5-Step Use Case Pattern:
  1. zod validate
  2. Repo lookup + uniqueness check
  3. Business logic (Policy check + 검증)
  4. Repo write
  5. EventEnvelope + Audit + Result<T,E>

### 2.4 Repo (데이터 접근 인터페이스)
- 위치: `engines/<name>/src/interfaces/index.ts` 안에 정의
- 위치: `engines/<name>/src/infrastructure/` 에 InMemory 구현
- 모든 Repo는 `tenantId::id` 격리 (Multi-Tenant)

### 2.5 Event (이벤트 발행)
- 위치: `engines/<name>/engine.json` `events_emitted`
- 모두 Core SDK EventEnvelope (11 필드) 형식
- 모두 industry-neutral event type (예: `entity.created` / `collection.updated` / `pricing.calculated`)

---

## 3. Industry-Agnostic Foundation Model

### 3.1 도메인 워드 회피 (헌법 §C-1)

**금지 단어 (모두)**:
- `tour`, `booking`, `hotel`, `restaurant`, `cafe`, `rentcar`
- `order`, `product` (Industry-specific), `payment`, `passport`, `travel_history`
- `reservation`, `hostel`, `guest_house`, `airbnb`, `luggage`
- `check_in`, `check_out`, `occupancy`, `room_rate`
- `table_reservation`, `menu_item`, `checkout`, `cart`
- `invoice`, `billing_address`, `shipping_address`

**금지 도메인 키워드 (예시)**:
- 구체적 산업 명 (Hilton, Marriott) — X
- 구체적 상품 타입 (Pillow, Coffee Mug) — X
- 구체적 산업 워크플로우 (Check-in workflow) — X

**허용 (추상 모델)**:
- `Entity`, `Item`, `Collection`, `Asset`
- `Owner`, `Ownership`
- `Price`, `Pricing`, `Rate`, `Tier`
- `Media`, `Metadata`

### 3.2 Industry 매핑 표준 (확장 가능)

산업은 **Host가 Catalog의 CustomField / CustomMetadata로 매핑**:

```
Catalog.Item
  ├── name:        string
  ├── type:        string  (예: 'lodging_unit', 'menu_item', 'tour_session')
  ├── attributes:  Record<string, unknown>  (Industry-specific attributes)
  ├── pricingRef:  Catalog.Pricing.id
  └── mediaRefs:   Media.Asset.id[]
```

**Industry-Specific 속성**은 `attributes` 필드에 자유 형식으로 보관.
**엔진은 절대 industry-specific 속성을 도메인 모델로 박지 않음.**

### 3.3 Custom Data Policy (사장님 확립, 2026-07-11)

**핵심 원칙**:
- 엔진은 Industry-specific 필드를 도메인 모델에 박지 않음
- 대신 **`attributes: Record<string, unknown>` 같은 자유 형식** 으로 보관
- Industry가 자기 데이터를 결정
- 변경하려면 **Industry 사장님이 CustomDataPolicy Validation Function**을 만들어 검증

**CustomDataPolicy 표준**:
```typescript
// Host가 제공
interface ICustomDataPolicy {
  // Industry가 데이터를 어떻게 검증할지 정의
  validateCustomAttributes<T>(
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<T, ValidationError>>;
}
```

**워크플로우**:
1. Industry 사장님이 `ICustomDataPolicy`를 자기 산업에 맞게 구현
2. Host가 이 policy를 engine에 주입 (3-Layer DI)
3. Engine은 모든 Host 값에 대해 `policyProvider.validateCustomAttributes()` 호출
4. 정책 위반 시 `Err(ValidationError)`

---

## 4. Multi-Tenant SaaS 표준 (사장님 확립)

### 4.1 Tenant 격리

- 모든 Repo 데이터는 `tenantId::id` 키
- 모든 Use Case는 `tenantId` 입력 받음
- Cross-tenant 접근 ❌ (Repo에서 차단)

### 4.2 Organization Ownership 표준 (사장님 확립)

**모든 Business Engine Resource는 Organization을 Owner로 가짐**:

```typescript
// 모든 Resource의 표준 패턴
interface OrganizationOwnedEntity {
  tenantId: string;
  organizationId: string;  // 👈 무조건 존재
  ...
}
```

**검증**: Host가 Owner 변경 시 Organization Engine의 existence 검증.

**이점**:
- 모든 Business Engine이 자동 Multi-Tenant SaaS 구조 채득
- Organization Engine이 SSoT 역할 강화
- Booking / Catalog / Inventory / Payment / Communication 모두 Organization별 격리 자동

### 4.3 Host Interface 표준

**모든 Business Engine은 다음 Host Interface를 사용**:

```typescript
// 1. User 검증
interface IUserVerifier {
  verify(tenantId: string, userId: string): Promise<boolean>;
}

// 2. Organization 검증
interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

// 3. Address 검증
interface IAddressVerifier {
  verify(tenantId: string, addressId: string): Promise<boolean>;
}

// 4. 정책 조회
interface ICustomPolicyProvider {
  getMaxItems(tenantId: string, ...): Promise<number>;
  getAllowedItemTypes(tenantId: string): Promise<readonly string[]>;
  validateCustomAttributes(...): Promise<Result<T, ValidationError>>;
}

// 5. Clock / EventBus / IdGenerator / Clock
interface IClock { now(): Date; }
interface IIdGenerator { generate(): string; }
interface IEventBus { emit<T>(env: EventEnvelope<T>): Promise<void>; }
```

**엔진은 DB / Cache / Email 직접 호출 ❌** — Host만 가능.

---

## 5. Engine Boundary Discipline

### 5.1 strict_boundaries 표준 (engine.json)

```json
{
  "strict_boundaries": {
    "owns": [
      "<엔진이 관리하는 모든 도메인>"
    ],
    "forbidden": [
      "Authentication", "Password", "Session", "OAuth", "MFA",
      "Permission", "Role", "Policy",
      "Booking", "Payment", "Order", "Invoice",
      "Inventory", "Product", "CatalogManagement",
      "Shipping", "Tax",
      "AddressRawField", "EmailRawField", "PhoneRawField"
    ]
  }
}
```

### 5.2 Import Boundary 표준 (헌법 §C-18)

- 모든 Business Engine은 core-sdk / event-bus / policy / user / address / organization / authorization / communication 중 **자기 Phase 이하**의 것만 import 가능
- Phase 순서는 engine.json `phase` 필드에 명시
- `tools/scripts/import-boundary-test.ts` 자동 검증

---

## 6. 표준 Use Case 패턴

```typescript
// 표준 UseCase 함수 시그니처
export async function someUseCase<TInput, TOutput, TError extends PlatformError>(
  input: TInput,
  deps: SomeUseCaseDeps,
): Promise<Result<TOutput, TError>> {
  // 1. zod validate
  // 2. Repo lookup (Multi-Tenant 격리)
  // 3. Business logic (Policy check + 검증)
  // 4. Repo write
  // 5. EventEnvelope + Audit + Result<T,E>
  // ❌ throw 절대 금지
}
```

**모든 Use Case는 `Result<T, E>` 반환** (헌법 §C-15).

---

## 7. 표준 Event Format

```typescript
// engine.json events_emitted (예시)
[
  "<engine-name>.<domain>.created",
  "<engine-name>.<domain>.updated",
  "<engine-name>.<domain>.deleted",
  ...
]
```

**규칙**:
- 이벤트명 Industry-neutral
- 11 fields EventEnvelope (Sprint 2B-1 Event Standard)
- semantic version (SemVer)
- `schemaRef` 매핑

---

## 8. Sprint Approach

### Sprint 1 — Business Foundation 3 Engines

| Engine | Phase | 책임 |
|---|---|---|
| Catalog | 4 | Entity/Item/Collection/Asset 정의 (Product-like) |
| Pricing | 4 | Price/Tier/Rate 정의 |
| Media | 4 | Media Library (asset storage metadata) |

### Sprint 2 — Business 레이어

| Engine | Phase | 책임 |
|---|---|---|
| Booking | 5 | Reservation/Schedule/Availability |
| Payment | 5 | Transaction/Refund |
| Order | 5 | Lifecycle |
| Review | 5 | Rating/Comment |

### Sprint 3 — Platform Layer

| Engine | Phase | 책임 |
|---|---|---|
| Search | 6 | Index/Query |
| Workflow | 6 | State machine |
| Analytics | 6 | Aggregation |
| AI | 6 | Embedding/Completion |

---

## 9. Acceptance

다음 질문에 **모두 YES**면 모든 Business Engine 승인:

> 1. Industry-Agnostic 검증 통과? **YES**
> 2. Organization Ownership 표준 준수? **YES**
> 3. Multi-Tenant 격리 적용? **YES**
> 4. 5가지 표준 인터페이스 준수? **YES**
> 5. CustomDataPolicy 통과? **YES**
> 6. Import Boundary 통과? **YES**
> 7. EventEnvelope 발행? **YES**
> 8. Audit 기록? **YES**

YES → Merge.

---

## 10. 결정 대기 항목 (사장님 확립)

| # | 결정 | 사장님 옵션 |
|---|---|---|
| 1 | 3 engines 진행 순서 | (a) Catalog → Pricing → Media / (b) Media → Catalog → Pricing / (c) Parallel |
| 2 | CustomDataPolicy validation을 UseCase 진입 시 호출? | (a) 매 호출 / (b) Host 캐시 |
| 3 | Organization 외 Owner 허용? | (a) Org only / (b) Org + User / (c) Org + Partner |
| 4 | attributes 스키마 강제? | (a) JSON Schema / (b) 자유 형식 / (c) Hybrid |
| 5 | Media storage 메타데이터 표준 | (a) S3 호환 / (b) R2 / (c) Custom |
| 6 | Pricing 정책 engine 의존? | (a) Policy Engine only / (b) Custom Policy / (c) 둘 다 |
| 7 | Phase 위치 (Business Foundation) | 4 |
| 8 | Sprint 1 범위 | (a) 1 engine만 (start with Catalog) / (b) 3 engines 동시 |

---

## 11. Industry Onboarding Workflow (CustomDataPolicy Validation Function)

**사장님 확립 (2026-07-11)**:

```
Industry 사장님 요구
   │
   ↓
CustomDataPolicy Validation Function 작성
   │
   ↓
Host가 ICustomDataPolicy 구현 (TypeScript 코드 50~200 LOC)
   │
   ↓
Host 코드 Review (sa장님 또는 Security Team)
   │
   ↓
Platform Engine Dependency 추가 (Host가 직접 호출)
   │
   ↓
Industry Custom Data 적용 (엔진은 자유 형식 attributes 그대로 통과)
   │
   ↓
Host는 Policy로 모든 입력 검증 (Use Case 진입 시)
   │
   ↓
검증 통과 → engine 정상 동작
검증 실패 → ValidationError 반환
```

**이점**:
- Foundation Engine은 Industry-specific 필드를 절대 모르도록 보장
- Industry 사장님이 표준화된 방식으로 자기 데이터 결정 가능
- 플랫폼 일관성 유지 (모든 엔진이 동일 패턴)

---

**작성 완료. 사장님 확립 대기.**
