# Address Engine — PRD

**Version**: 1.0.0
**Date**: 2026-07-11
**Status**: Production

---

## 1. 목적

Address Engine은 플랫폼 전체의 **주소 Single Source of Truth**이다.

### Owner-Agnostic 설계

Address는 User를 포함하지 않는다. 대신 `ownerType` + `ownerId`를 사용한다:

```
ownerType = 'User'         ownerId = 'xxx'
ownerType = 'Organization' ownerId = 'xxx'
ownerType = 'Booking'      ownerId = 'xxx'
ownerType = 'Tenant'       ownerId = 'xxx'
ownerType = 'Vendor'       ownerId = 'xxx'
ownerType = 'Merchant'     ownerId = 'xxx'
```

이렇게 어떤 Business Engine에서도 주소를 참조할 수 있다.

---

## 2. 설계 원칙

- **Single Source of Truth** — 모든 주소 데이터의 중앙 저장소
- **Owner-Agnostic** — 어떤 엔진의 리소스든 주소를 가질 수 있음
- **Industry Agnostic** (헌법 §C-1)
- **International** — 7개 언어 + 20개국 지원
- **Event First** (헌법 §C-16)
- **Multi-Tenant** — tenantId 기반 격리
- **Soft Delete** — Archive / Restore / Hard Delete

---

## 3. 핵심 도메인

| Aggregate | 설명 |
|---|---|
| **Address** | 주소 엔티티 (line1, city, country, geo, type, status) |
| **Country** | ISO 3166-1 국가 메타데이터 (20개국 내장) |
| **GeoPoint** | GPS 좌표 + Geohash |
| **Validation** | 국가별 우편번호, 좌표, 필수 항목 검증 |
| **Formatter** | 국가별 출력 포맷 |

### Address Types

home, billing, shipping, office, warehouse, hotel, pickup, dropoff, temporary, legal

### Status Lifecycle

```
active → archived → deleted (hard delete)
            ↓
         restored → active
```

---

## 4. Public API

| Method | 설명 |
|---|---|
| createAddress() | 주소 생성 |
| updateAddress() | 주소 수정 (version 증가) |
| getAddress() | 단일 조회 |
| searchAddresses() | 검색 (query, country, type, owner, status) |
| listAddresses() | Owner별 목록 |
| archiveAddress() | 아카이브 (Soft Delete) |
| restoreAddress() | 복원 |
| deleteAddress() | 영구 삭제 |
| setDefaultAddress() | 기본 주소 설정 |
| changeAddressType() | 타입 변경 |
| validateAddress() | 검증 (필수항목, 우편번호, 좌표) |
| normalizeAddress() | 표준화 (country, trim, case) |
| forwardGeocode() | 주소 → 좌표 |
| reverseGeocode() | 좌표 → 주소 |
| formatAddress() | 국가별 포맷 출력 |

---

## 5. Events

| EventType | 트리거 |
|---|---|
| address.created | 주소 생성 |
| address.updated | 주소 수정 |
| address.deleted | 영구 삭제 |
| address.archived | 아카이브 |
| address.restored | 복원 |
| address.default.changed | 기본 주소 변경 |
| address.validated | 검증 완료 |
| address.normalized | 표준화 완료 |

---

## 6. Country Data (ISO 3166-1)

20개국 내장: KR, US, GB, GE, DE, TR, RU, CN, JP, FR, ES, IT, CA, AU, AE, TH, VN, UZ, KZ, NL

각 국가별: code, code3, name, localName, dialCode, currency, timezone, postalCodePattern, addressFormat

### Standardization

'대한민국' → 'KR', 'South Korea' → 'KR', 'USA' → 'US', '日本' → 'JP'

---

## 7. Address Formatting

| Format | 국가 | 순서 |
|---|---|---|
| Western | US, UK, DE, GE, TR | Line → City, Region Postal → Country |
| Eastern | KR, CN | Country → Region → City → District → Line → Postal |
| Japanese | JP | 〒Postal → Prefecture → City → Line → Country |

---

## 8. Dependencies

```yaml
depends_on:
  - core-sdk
  - policy
```

---

## 9. Forbidden

Payment, Booking, Shipping, Tax, Delivery, Authentication, Order
