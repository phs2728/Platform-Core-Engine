# Address Engine

> **Single Source of Truth for all location/address data.**
>
> Address Engine은 주소를 "저장하는" 엔진이 아니라,
> 플랫폼의 **모든 위치(Location)와 주소(Address)를 관리하는** 엔진이다.

**Version**: 1.0.0
**Phase**: 6
**Status**: Production

---

## 목적

Address Engine은 플랫폼 전체의 주소 Single Source of Truth이다.

### Owner-Agnostic

Address는 User를 포함하지 않는다. 대신 `ownerType` + `ownerId`를 사용한다:

```
ownerType = 'User'     ownerId = 'xxx'    // 사용자 주소
ownerType = 'Organization' ownerId = 'xxx' // 조직 주소
ownerType = 'Booking'  ownerId = 'xxx'    // 예약 주소
```

이렇게 어떤 엔진에서도 사용할 수 있다.

### 절대 포함하지 않는 것

❌ Payment, Booking Logic, Shipping, Tax 계산, Delivery, Authentication

---

## 핵심 기능

| 기능 | 설명 |
|---|---|
| **Multi-Type** | home, billing, shipping, office, warehouse, hotel, pickup, dropoff, temporary, legal |
| **Multi-Address** | 한 Owner가 여러 주소 보유 (기본 50개) |
| **International** | 20개국 ISO 3166-1 데이터 내장 |
| **Validation** | 필수 항목, 우편번호 패턴, 좌표 범위, 국가 코드 검증 |
| **Standardization** | '대한민국' → 'KR', 'South Korea' → 'KR' 자동 변환 |
| **Geo** | GPS 좌표, Geohash, Forward/Reverse Geocoding |
| **Formatting** | 국가별 출력 포맷 (Western, Eastern, Japanese) |
| **Versioning** | 주소 변경 시 version 증가 |
| **Soft Delete** | Archive → Restore → Hard Delete |

---

## Public API (15 Use Cases)

```typescript
// CRUD
createAddress()
updateAddress()
getAddress()
searchAddresses()
listAddresses()

// Lifecycle
archiveAddress()
restoreAddress()
deleteAddress()
setDefaultAddress()
changeAddressType()

// Services
validateAddress()
normalizeAddress()
forwardGeocode()     // address → coordinates
reverseGeocode()     // coordinates → address
formatAddress()      // national format output
```

---

## Domain Structure

```
src/
├── domain/
│   ├── audit.ts           # Audit helper
│   ├── country-data.ts    # ISO 3166-1 (20개국) + standardization
│   ├── geohash.ts         # Geohash encoder/decoder + distance
│   ├── validator.ts       # Address validation + normalization
│   └── formatter.ts       # Country-specific formatting (Western/Eastern/Japanese)
├── interfaces/index.ts    # All interfaces, types, defaults
├── infrastructure/
│   ├── InMemoryAddressRepository.ts
│   ├── InMemoryCountryRepository.ts
│   ├── InMemoryGeoRepository.ts
│   └── InMemoryAuditLogRepository.ts
├── use-cases/
│   ├── AddressCrudUseCases.ts       # Create, Update, Get, Search, List
│   ├── AddressLifecycleUseCases.ts  # Archive, Restore, Delete, SetDefault, ChangeType
│   └── AddressServiceUseCases.ts    # Validate, Normalize, Geocode, Format
└── index.ts               # Public API
```

---

## Country Standardization

```typescript
standardizeCountryCode('대한민국')         // → 'KR'
standardizeCountryCode('South Korea')      // → 'KR'
standardizeCountryCode('Republic of Korea') // → 'KR'
standardizeCountryCode('USA')              // → 'US'
standardizeCountryCode('日本')              // → 'JP'
standardizeCountryCode('საქართველო')        // → 'GE'
```

---

## Address Formatting

| Country | Format | Example |
|---|---|---|
| Korea | Eastern | Country → Region → City → District → Line → Postal |
| USA | Western | Line → City, Region Postal → Country |
| Japan | Japanese | 〒Postal → Region → City → Line → Country |
| Germany | Western | Line → Postal City → Country |
| Georgia | Western | Line → City → Country |

---

## Platform Foundation

```
Core SDK → Policy → Identity → User → Address ← THIS ENGINE → Authorization → Event Bus → Communication
```

---

## 빠른 시작

```typescript
import {
  createAddressUseCase, validateAddressUseCase, formatAddressUseCase,
  InMemoryAddressRepository, InMemoryCountryRepository, InMemoryAuditLogRepository,
} from '@platform/engine-address';

const deps = {
  addressRepository: new InMemoryAddressRepository(),
  countryRepository: new InMemoryCountryRepository(),
  auditLogRepository: new InMemoryAuditLogRepository(),
  idGenerator, clock, eventBus,
};

// Create
const addr = await createAddressUseCase({
  tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home',
  line1: '123 Main St', city: 'Seoul', country: 'KR',
  postalCode: '04524', correlationId: 'r-1',
}, deps);

// Validate
const validation = await validateAddressUseCase({
  tenantId: 't-1', addressId: addr.value.id, correlationId: 'r-2',
}, deps);

// Format
const formatted = await formatAddressUseCase({
  tenantId: 't-1', addressId: addr.value.id, locale: 'ko', correlationId: 'r-3',
}, deps);
```

---

## Tests

```bash
pnpm test       # 31 tests
pnpm typecheck  # 0 errors
```
