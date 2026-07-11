# Pricing Engine — Product Requirements Document

**Version**: v1.0
**Status**: Draft (사장님 확립 대기, 2026-07-11)
**Effective Date**: 사장님 확립일
**Owner**: 사장님 (박흥식 / Tim Park)
**Review Cycle**: 1년

---

## 0. 문서 위치 (Positioning)

Pricing Engine은 **Platform Business Foundation 2번 엔진**입니다.

이 엔진은 **특정 산업을 전혀 알지 못합니다**(Industry Agnostic).
이 엔진은 **Pricing / Rate / Tier / Discount / Tax 자체를 절대 계산하지 않습니다**.

**엔진은 가격 계산의 추상 모델만 관리**합니다.
실제 화폐 가치 + 세금 + 환율은 **Host의 CustomDataPolicy가 검증**.

이 엔진은 모든 Business Engine이 공통으로 사용:

- Catalog Engine (PricingRef 보관)
- Booking Engine (Reservation 생성 시 Pricing 참조)
- Payment Engine (Payment Amount 검증 시 Pricing 참조)
- Order Engine (Order LineItem 가격 참조)
- Review Engine (Price-aware review)

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
> **Pricing Engine은 "가격 모델"만 관리한다.**
>
> 이 엔진은 화폐, 세율, 환율을 절대 모른다.
>
> 이 엔진은 산업 특정 pricing 모델 (Hotel night rate, Restaurant menu price, Tour session price)
> 같은 구체적 의미를 가지지 않는다. 모두 **추상 모델** (Amount, Unit, Component, Modifier).
>
> Industry Pricing 정책은 Host의 CustomDataPolicy가 검증한다.

### 1.1 책임 범위 (In Scope)

- **Price** 모델 정의 (Amount + Currency)
- **Rate** 모델 정의 (시간/수량 단위당 가격)
- **Tier** 모델 정의 (단계별 가격)
- **Discount/Modifier** 모델 정의 (할인/조정)
- **Pricing Plan** (Item/Variant에 부착 가능한 가격 정의 모음)
- **Pricing Component** (Plan의 구성 요소 — base / surcharge / tax / fee / discount)
- **Time-based Pricing** (기간별 / 요일별 가격)
- **Volume Pricing** (수량 단계별 가격)
- **Bundle Pricing** (묶음 가격)
- **Custom Data Policy 표준** (산업별 가격 검증)
- **Multi-Tenant 격리 + Organization Ownership**
- **EventEnvelope 발행 + Audit Trail**

### 1.2 책임 범위 밖 (Out of Scope)

다음은 **절대** Pricing Engine에 포함되지 않습니다:

- ❌ 실제 화폐 가치 (USD, EUR, KRW, ...) — Host/Industry 정의 (Currency는 단순 코드)
- ❌ 세율 계산 (Tax Rate %) — CustomDataPolicy 검증
- ❌ 환율 변환 — Pricing Engine 외부
- ❌ 가격의 실제 청구/결제 — Payment Engine
- ❌ 가격의 부가세/VAT 계산 — Tax Engine (향후)
- ❌ 산업 도메인 워드 (Hotel night, Restaurant menu price, Tour session fee, ...)
- ❌ Authentication / Authorization / User Profile
- ❌ Catalog의 실제 Item — PricingRef만 보관
- ❌ Currency 정책 (어떤 화폐 지원) — Host 결정
- ❌ Tax rule 정의 — Tax Engine (별도)

---

## 2. 도메인 (Domain)

### 2.1 Currency (단순 코드)

Pricing Engine은 Currency **코드만** 보관. 실제 화폐 가치는 ❌.

```
Currency
  {
    code: string,       // ISO 4217 alpha-3 (USD, EUR, KRW, JPY, GEL, ...)
    symbol?: string,    // 표시용 symbol (실제 계산 ❌)
    decimals: number,   // 표시 decimals (예: 2 for USD, 0 for JPY/KRW)
  }
```

**엔진은 환율 변환 ❌** — `Conversion from USD to KRW = X` 같은 로직 ❌.

### 2.2 Money (추상 금액)

```
Money
  {
    amount: number,         // BigInt or Number (Currency에 따라)
    currency: Currency,     // 위 Currency 참조
  }
```

**`amount`는 abstract number**. 실제 가치 비교는 CustomDataPolicy 또는 Industry 결정.

### 2.3 PricingPlan (핵심 엔터티)

```
PricingPlan
{
  id, tenantId, organizationId,
  
  name: string,
  slug: string,
  description?: string,
  status: 'Draft' | 'Active' | 'Archived' | 'Deleted',
  
  type: string,             // Industry-agnostic type
                             // 예: 'time_based', 'volume_tiered', 'bundle_fixed',
                             //     'per_unit', 'flat', 'recurring'
  
  attributes: Record<string, unknown>,  // Type별 attribute
  
  ownerRef: {
    ownerType: 'item' | 'variant' | 'bundle' | 'collection',
    ownerId: string,                      // Catalog Engine ID
  },
  
  components: PricingComponent[],
  
  validFrom?: string,       // ISO 8601 (optional valid period)
  validUntil?: string,
  
  tierPricing?: TierPricing,    // Volume / 단계별 가격
  timePricing?: TimePricing,    // 시간 기반 가격 (peak/off-peak/etc)
  
  customDataPolicyRef?: string,    // Host 등록한 Custom Policy ID
  
  metadata: ...,
  
  createdAt/By, updatedAt/By, archivedAt, deletedAt,
}
```

### 2.4 PricingComponent (Plan의 구성)

```
PricingComponent
{
  id, tenantId, organizationId,
  planId: string,
  
  type: 'base' | 'surcharge' | 'discount' | 'fee' | 'tax' | 'addon',
  name: string,
  description?: string,
  
  amount?: Money,            // Fixed amount
  ratePerUnit?: number,       // Per unit amount
  rateUnit?: string,          // 'hour', 'night', 'session', 'unit', 'km' (free-form)
  
  percentage?: number,        // 0~100 (Industry-agnostic)
  basis?: string,             // 'gross' | 'net' | 'subtotal' (free-form)
  
  conditions?: PricingCondition[],   // 적용 조건
  
  displayOrder: number,
  
  metadata: ...,
  
  audit fields,
}
```

**규칙**:
- `amount` 또는 `ratePerUnit` 또는 `percentage` 중 1개 사용 (계산 ❌, 표현 ❌)
- 실제 적용은 Host가 CustomDataPolicy로

### 2.5 TierPricing (Volume / 단계)

```
TierPricing
{
  id, tenantId, organizationId,
  planId: string,
  
  tiers: PricingTier[],
  
  tierUnit: 'quantity' | 'duration' | 'weight' | 'volume' | 'custom',
  customTierUnit?: string,    // 'lodging_night', 'service_hour'
}

PricingTier
{
  fromValue: number,            // Inclusive start
  toValue?: number,             // Inclusive end (null = unbounded)
  amount: Money,                // 또는 ratePerUnit
  ratePerUnit?: number,
  rateUnit?: string,
}
```

### 2.6 TimePricing (시간 기반)

```
TimePricing
{
  id, tenantId, organizationId,
  planId: string,
  
  schedule: TimeSchedule[],
  
  defaultPlanId?: string,        // Schedule 외 시간대 fallback
  timezone: string,              // IANA tz
}

TimeSchedule
{
  name: string,                  // 'peak', 'off_peak', 'weekend'
  daysOfWeek: number[],          // 1~7 (Mon~Sun)
  startTime: string,             // 'HH:MM'
  endTime: string,               // 'HH:MM'
  
  validFrom: string,             // ISO date
  validUntil?: string,
  
  amount?: Money,
  ratePerUnit?: number,
  rateUnit?: string,
}
```

**실제 시간대 매칭 로직 ❌** (Host가 결정).

### 2.7 CustomDataPolicyRef (사장님 표준)

```
CustomDataPolicyReference
{
  refId: string,
  refType: 'attribute_validator' | 'pricing_validator' | 'tier_validator',
}
```

**Pricing은 Industry CustomDataPolicy와 강하게 연결**.
Industry 사장님이 Pricing Validation Function 제공 → Host가 등록 → Pricing Engine이 호출.

---

## 3. Multi-Tenant & Organization Ownership

(사장님 확립 표준 — `docs/BUSINESS_ENGINE_STANDARD.md` 참조)

- 모든 PricingPlan은 tenantId + organizationId 보유
- Host Interface: `IOrganizationVerifier`
- Cross-tenant 격리

---

## 4. Use Cases (Public API)

### 4.1 PricingPlan Lifecycle (10개)

```
createPricingPlanUseCase
updatePricingPlanUseCase
addPricingComponentUseCase
removePricingComponentUseCase
setTierPricingUseCase
setTimePricingUseCase
archivePricingPlanUseCase
deletePricingPlanUseCase
getPricingPlanUseCase
listPricingPlansUseCase
```

### 4.2 Currency (4개)

```
registerCurrencyUseCase          // ISO 4217 코드만 등록 (실제 가치 ❌)
updateCurrencyUseCase
listCurrenciesUseCase
archiveCurrencyUseCase
```

### 4.3 CustomDataPolicy 연결 (4개)

```
attachCustomDataPolicyUseCase
detachCustomDataPolicyUseCase
validatePricingPlanUseCase       // CustomDataPolicy 실행
verifyPolicyActiveUseCase
```

### 4.4 Status Change (4개)

```
changePricingPlanStatusUseCase
changePricingTierStatusUseCase
changeTimeScheduleStatusUseCase
changeCurrencyStatusUseCase
```

### 4.5 TierPricing (3개)

```
addPricingTierUseCase
removePricingTierUseCase
reorderPricingTiersUseCase
```

### 4.6 TimePricing (3개)

```
addTimeScheduleUseCase
removeTimeScheduleUseCase
reorderTimeSchedulesUseCase
```

**총 28개 Use Case (Sprint 1 MVP는 14개).**

---

## 5. 책임 경계

### 5.1 다른 엔진과의 경계

| 의존 | 방향 | Pricing 책임 | Pricing이 ❌ |
|---|---|---|---|
| Catalog | → | PricingRef 보관, Plan 연결 | Item 자체 |
| Booking | ← | Plan 참조 | 예약 lifecycle |
| Payment | ← | Plan 참조, Amount 검증 | 결제 lifecycle |
| Order | ← | Plan 참조 | Order lifecycle |
| Tax | ← | Tax Component 보관 | 세율 계산 |
| Currency | → | Currency 코드만 보관 | 환율 변환 |

### 5.2 Pricing Engine은 계산 ❌

**명시적으로 하지 않는 것**:
- `calculateFinalPrice(planId, context)` ❌ (Host가 함)
- `convertCurrency(amount, from, to)` ❌
- `applyDiscount(plan, quantity)` ❌
- `computeTax(amount, region)` ❌

**Pricing Engine은 모델만 관리** (Plan / Component / Tier / Schedule).

### 5.3 Host Interface (3-Layer DI)

```typescript
interface ICustomDataPolicyProvider {
  // Pricing 검증을 위한 Custom Policy
  validatePricingPlan(
    tenantId: string,
    planType: string,
    plan: Record<string, unknown>,
    components: PricingComponent[],
  ): Promise<Result<PricingPlan, ValidationError>>;
  
  validatePricingComponent(
    tenantId: string,
    componentType: 'base' | 'surcharge' | 'discount' | 'fee' | 'tax' | 'addon',
    attributes: Record<string, unknown>,
  ): Promise<Result<void, ValidationError>>;
  
  validateTier(
    tenantId: string,
    tierUnit: string,
    fromValue: number,
    toValue: number | null,
  ): Promise<Result<void, ValidationError>>;
  
  validateTimeSchedule(
    tenantId: string,
    schedule: TimeSchedule,
  ): Promise<Result<void, ValidationError>>;
  
  getAllowedCurrencies(tenantId: string): Promise<readonly string[]>;
  getMaxComponentsPerPlan(tenantId: string): Promise<number>;
  getMaxTiersPerPricing(tenantId: string): Promise<number>;
  getMaxSchedulesPerPricing(tenantId: string): Promise<number>;
}
```

---

## 6. Events

### 6.1 발행 Event (14개)

```
pricing.currency.registered
pricing.currency.updated
pricing.currency.archived
pricing.plan.created
pricing.plan.updated
pricing.plan.component.added
pricing.plan.component.removed
pricing.plan.tier.updated
pricing.plan.time.updated
pricing.plan.policy.attached
pricing.plan.policy.detached
pricing.plan.status.changed
pricing.plan.archived
pricing.plan.deleted
pricing.audit.recorded
```

---

## 7. Strict Boundaries

### 7.1 owns

```
["PricingPlan", "PricingComponent", "TierPricing", "PricingTier",
 "TimePricing", "TimeSchedule", "Money", "Currency",
 "PricingCustomPolicyRef", "PricingAudit"]
```

### 7.2 forbidden

```
["Authentication", "Password", "Session", "OAuth", "MFA",
 "Permission", "Role", "Policy",
 "Booking", "Payment", "Order", "Invoice",
 "Inventory", "StockQuantity",
 "Shipping", "CatalogItem", "CatalogCollection", "CatalogBundle",
 "AddressRawField", "EmailRawField", "PhoneRawField",
 "Product", "Service", "Menu", "Room", "Tour",
 "CurrencyConversion", "TaxCalculation", "DiscountCalculation",
 "IndustrySpecificField"]
```

---

## 8. 결정 대기 항목 (사장님 확립)

| # | 결정 | 사장님 옵션 |
|---|---|---|
| 1 | **Phase 위치** | (a) **Phase 4** (Business Foundation) / (b) Phase 5 (Business) |
| 2 | **PricingPlan이 직접 화폐 코드를 저장?** | (a) **Currency Reference** / (b) raw currency string |
| 3 | **TierPricing 계산 정책** | (a) Host 100% 책임 / (b) Engine compute preview (제안만) |
| 4 | **TimePricing 시간대 매칭** | (a) Engine 외부 / (b) Engine reference helper |
| 5 | **CustomDataPolicy 적용 시점** | (a) **Use Case 진입 시 동기 호출** / (b) 비동기 / (c) Hybrid |
| 6 | **Money.amount 타입** | (a) **number** / (b) string (decimal) / (c) BigInt |
| 7 | **PricingPlan↔Catalog Item 관계** | (a) **PricingRef 직접 연결** / (b) 별도 Catalog+Pricing 매핑 테이블 |
| 8 | **Currency 정책** | (a) **Tenant가 허용한 화폐만** / (b) Global |

---

## 9. CustomDataPolicy Validation Function (사장님 확립)

Pricing은 Industry-specific 데이터 검증 의무. Industry 사장님이 작성:

```typescript
// Host가 제공 — Hospitality Industry의 Pricing 예시
const hospitalityPricingPolicy: ICustomDataPolicyProvider = {
  async validatePricingPlan(tenantId, planType, plan, components) {
    if (planType === 'time_based') {
      const validFrom = plan.validFrom;
      if (typeof validFrom !== 'string') {
        return Err(new ValidationError('validFrom required for time_based'));
      }
      // ... Industry-specific validation
    }
    return Ok(plan);
  },
  // ...
};
```

Pricing Engine은 policy 결과를 받아 OK/Err 분기.

---

## 10. Acceptance

다음 질문에 모두 YES면 Merge:

> 1. **Industry-Agnostic** 검증 통과? **YES**
> 2. Organization Ownership? **YES**
> 3. Multi-Tenant 격리? **YES**
> 4. 5-Step Use Case 패턴? **YES**
> 5. **가격 계산 로직 ❌** (Policy만 실행)? **YES**
> 6. **Currency 코드만 저장, 화폐 변환 ❌**? **YES**
> 7. CustomDataPolicy 게이트? **YES**
> 8. EventEnvelope 14+? **YES**
> 9. Audit Trail? **YES**

YES → RC1 Merge.

Stable 조건 충족 후 Stable.

---

## 11. 다음 단계

- **Sprint 1**: 14 Use Cases (MVP) + 14 Events + 35+ tests
- **Sprint 2**: 28 Use Cases 완성 + CustomDataPolicy 세부
- **Sprint 3**: Engine Cert + Stable 선언

이후: **Media Engine** (Phase 4 동료)
이후 Phase 5: Booking / Payment / Order

---

**작성 완료. 사장님 확립 대기.**
