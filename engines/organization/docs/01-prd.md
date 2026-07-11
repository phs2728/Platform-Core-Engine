# Organization Engine — PRD

**Version**: 0.1.0-draft
**Date**: 2026-07-11
**Phase**: 3
**Status**: Draft (Sprint 1 MVP)

---

## 1. 목적 (Purpose)

**Organization Engine**은 Platform의 **모든 조직(Organization)의 Single Source of Truth**이다.

"회사 정보를 저장하는 엔진"이 아니라,
"플랫폼의 모든 조직과 조직 구조를 관리하는 엔진"이다.

Platform Foundation 7개 엔진(Core SDK / Policy / Identity / User / Address / Authorization / Event Bus / Communication) 위에서 동작하며,
Platform의 향후 Business Engine — [사장님 확립 Organization Engine PRD v1.0] — 이 공통으로 참조하는 조직 데이터의 SSoT이다.

---

## 2. 설계 원칙

| # | 원칙 | 출처 |
|---|---|---|
| 1 | Industry-Agnostic | 헌법 §C-1 |
| 2 | Plugin First | 헌법 §C-9 |
| 3 | Policy Injection | 헌법 §C-14 |
| 4 | Event First | 헌법 §C-16 |
| 5 | No Circular Dependencies | 헌법 §C-18 |
| 6 | SDK Stability | 헌법 §C-20 |
| 7 | Platform Release Rule | 헌법 §C-21 |
| 8 | Merge Gate Evidence-First | 헌법 §C-22 |
| 9 | Conventional Commits | 헌법 §C-23 |
| 10 | Result/Errors/Event/Logger 표준 | 4 Platform Standards |

---

## 3. 책임 (Responsibilities)

Organization Engine은 다음을 책임진다.

* **Organization** 엔터티 (모든 산업을 아우르는 산업중립 조직 모델)
* **Department** / **Branch** / **Team** — 조직 계층 단위
* **Organization Hierarchy** — 무한 depth 계층 + cycle 방지
* **Membership** — UserReference 기반 멤버십
* **Organization Profile** — Display/Legal 이름, Business/Tax Number, Website, Logo, Brand Color, Industry
* **Organization Metadata** — 임의 Key/Value (Tenant-scoped)
* **Organization Audit** — 모든 상태 변경 감사 기록

---

## 4. 절대 하지 않는 것 (Strict Forbidden)

| ❌ Domain | 이유 |
|---|---|
| Authentication / Password / Session / OAuth / MFA | Identity Engine |
| Permission / Role | Authorization Engine |
| Commercial transactional flows / financial documents | Business Engines |
| Transactional commerce / financial / refund flows | Specialized Engines |  // [사장님 확립 strict_boundaries]
| Goods / catalogue / inventory | Inventory/Catalog Engine |
| Channel / Template (발송) | Communication Engine |
| Approval Rule / Workflow | Workflow Engine |
| Raw Email/Phone/Address 필드 | Identity/Address Engine이 SSoT |
| User의 Profile/Preference 직접 저장 | User Engine |

위 항목을 직접 구현/저장/계산/발송하지 않는다.
필요 시 **공개 인터페이스 호출** 또는 **Event 구독**으로만 연동한다.

---

## 5. 지원 조직 유형 (Organization Types)

11개 카테고리:

* Commercial / NonProfit / Government / Religious
* Educational / Healthcare / Marketplace / Hospitality
* Logistics / Technology / Other

각 카테고리는 **어떤 산업**인지만을 식별하지 **행위를 강제하지 않는다.**
예: "Hospitality" category는 multiple accommodation types를 포함하지만, 도메인별 비즈니스 로직은 들어가지 않는다.

---

## 6. 멤버십 유형 (Membership Types)

7개:

* Owner / Administrator / Manager / Employee / Contractor / Member / Guest

**규칙**:
- Membership은 User의 Profile을 저장하지 않는다.
- Membership은 `userId` (User Engine 참조) 만 저장한다. (UserReference 패턴, 헌법 §C-4 Boundary Discipline 따라감)
- Membership 삭제(soft-delete) 후 같은 User를 다시 추가 가능 (status=active).
- Membership 변경은 모두 `organization.member.changed` 이벤트 발행.

---

## 7. 조직 상태 (Status State Machine)

```
Pending → Active → Suspended → Archived → Deleted
                              ↑           ↑
                              └── Archived (from any)
```

전이는 모두 `organization.status.changed` 이벤트 발행.
**Archived/Deleted 조직은 변경 불가** (재활성화는 별도 restore 사용).

---

## 8. 계층 구조 (Hierarchy)

무한 depth 지원 (parentId 기반 adjacency list).

```
Organization
├── Branch (headquarter 외 부서/지점)
│   └── Department
│       ├── Team
│       └── Team
└── Department (직속)
    └── Team
```

**규칙**:
- Cycle 금지 (move 시점에 전체 경로 검사).
- `parentType` + `parentId` 패턴 (Organization / Department / Branch 모두 부모가 될 수 있음).
- 부모가 Archived/Deleted이면 자식 추가/이동 불가.

---

## 9. 다른 엔진과의 연동

| 엔진 | 방향 | 연동 방식 |
|---|---|---|
| **User Engine** | Organization → User | `userId` 참조 (UserReference 패턴, profile은 User에 위임) |
| **Address Engine** | Organization → Address | `addressId` 참조 (raw 주소 저장 ❌) |
| **Identity Engine** | 구독 | `user.created`, `user.archived` 수신 → membership 정합성 |
| **Policy Engine** | Organization → Policy | 조직 정책(최대 직원, 최대 Branch 등) 조회 — 직접 보관 ❌ |
| **Authorization Engine** | 호출 | 권한 확인 필요 시 `authorize()` 호출 (직접 계산 ❌) |
| **Communication Engine** | 발행만 | 조직 이벤트 구독자에게 fanout |
| **Event Bus** | 발행/구독 | 모든 상태 변경은 EventEnvelope |

---

## 10. 이벤트 (Events)

12개 발행 (Sprint 1) + 5개 (Sprint 2 계층):

- organization.created
- organization.updated
- organization.profile.updated
- organization.archived
- organization.restored
- organization.deleted
- organization.status.changed
- organization.type.changed
- organization.member.added
- organization.member.removed
- organization.member.changed
- organization.audit.recorded

Sprint 2:
- organization.branch.created
- organization.department.created
- organization.team.created
- organization.department.moved
- organization.team.moved

모든 이벤트는 Core SDK `EventEnvelope` 형식 (8 필드) 사용.

---

## 11. Multi-Tenancy

모든 데이터는 `tenantId` 컬럼 보유. 동일 Tenant 내 `businessNumber`/`taxNumber` 유니크.
다른 Tenant의 조직은 격리 (Repo/UseCase 레벨에서 강제).

---

## 12. 검색 (Search)

Organization 도메인 검색 지원 인덱스:
- displayName (대소문자 무시 부분 일치)
- businessNumber (정확 일치)
- taxNumber (정확 일치)
- industry (정확 일치)
- type (정확 일치)
- status (정확 일치)
- country (Profile.country, 정규화)

페이징 + 정렬.

---

## 13. Import

Sprint 1: CSV Import (간단한 컬럼 정의)
Sprint 2: JSON Import
Sprint 3 (RFC-040): ERP Import Interface (SAP/Oracle/Dynamics) — 구현은 Host 책임.

---

## 14. Acceptance (Sprint 1 MVP)

다음 질문에 YES면 Merge 가능:

> Q1. Accommodation 관리 엔진이 조직 정보 조회 시 이 엔진만 호출하는가? **YES**
> Q2. F&B 운영 엔진이 staff 추가 시 이 엔진의 `addMember`를 사용하는가? **YES**
> Q3. Church가 부서/팀을 만들 때 이 엔진의 `createDepartment`/`createTeam`을 사용하는가? **YES**
> Q4. Organization Engine을 삭제하면 모든 downstream Business Engine이 영향을 받는가? **YES**

YES → Merge.

---

## 15. Sprint 범위

### Sprint 1 (이번) — B+ 등급 목표
- Organization CRUD + Archive/Restore/Delete
- Profile (Display/Legal Name, Business/Tax Number, Website, Logo URL, Brand Color, Industry, Country)
- Membership (Add/Remove/Change, MembershipType 7종)
- Status State Machine (5상태)
- Type (11종)
- 6가지 Event 발행 (created/updated/profile.updated/archived/restored/deleted/status.changed/type.changed/member.*)
- In-Memory Repository 6개
- 사용 사례 16개 (createOrganization, ..., moveTeam 포함 Sprint 2 일부)
- 35+ 단위 테스트
- CSV Import 최소 구현

### Sprint 2 (다음) — A- 등급
- Department/Branch/Team full hierarchy (cycle detection)
- 5개 계층 이벤트
- JSON Import

### Sprint 3 (후속) — A 등급 (Stable)
- ERP Import Interface
- Engine Certification 5개 항목
- Public API Snapshot Frozen
- Production Readiness Audit (Production-grade readiness audit steps (host delivery audit stages))

---

## 16. 다음 단계

사장님 Platform Owner 확립 대기:
- (1) Sprint 1 시작 승인
- (2) Phase 3 배정 승인
- (3) `pnpm install` 후 Merge Gate PASS 확인
- (4) 또는 추가 결정 (Feature Decomposition, RFC 우선순위)
