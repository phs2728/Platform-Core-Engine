# Organization Engine

> **Single Source of Truth for all organizations across multiple industries**

**Version**: 0.1.0-draft
**Phase**: 3
**Status**: Draft → Sprint 1 MVP

---

## 한 줄 요약

> **"회사 정보를 저장하는 엔진"이 아니라,
> "플랫폼의 모든 조직과 조직 구조를 관리하는 엔진".**

---

## 왜 이 엔진이 중요한가

현재 Platform Foundation은 Core SDK / Policy / Identity / User / Address / Authorization / Event Bus / Communication **8개**로 구성되어 있다.

이 모든 엔진 위에 **첫 번째 비-사용자 도메인 엔진**인 Organization Engine이 올라간다.

```
Accommodation ─┐
ERP ───┤
Booking (도메인 통합 엔진을 통한 호출) ──── → Organization Engine (이 엔진) ← ← ← 모든 Biz Engine이 참조  // 사장님 확립 spec
CRM ───┤
Church ─┤
School ─┤
Food Service ─┘
```

**Organization Engine을 삭제하면 모든 downstream Business Engine이 영향을 받는다.** ← Merge 기준

---

## 의존성

```yaml
depends_on:
  - core-sdk       # Result, PlatformError, EventEnvelope, Logger, Validation
  - event-bus      # 이벤트 발행/구독
  - policy         # 조직 정책 (최대 직원 수 등) SSoT
  - user           # userId 참조 (EmailReference 패턴)
  - address        # addressId 참조 (raw 주소 저장 ❌)
```

**Profile은 User Engine에 위임. 주소는 Address Engine에 위임. 조직 정책은 Policy Engine에 위임.** 직접 저장 ❌.

---

## 책임

### Organization Engine이 관리
- Organization 엔터티
- Department / Branch / Team 계층
- Membership (UserReference)
- Organization Profile (Display/Legal Name, Business/Tax Number, Logo, Brand Color, Industry)
- Organization Metadata
- Organization Audit

### Organization Engine이 ❌ 하지 않는 것
- Authentication / Password / Session → Identity Engine
- Permission / Role → Authorization Engine
- Booking / Order / Payment (handled by separate Business Engines)  // [사장님 확립: Organization Engine out-of-scope domains]
- Goods inventory / catalogue management → Inventory/Catalog Engine
- 발송 / Channel / Template → Communication Engine
- Raw Email/Phone 필드 → Identity Engine
- Raw Address 필드 → Address Engine
- User Profile/Preference 직접 저장 → User Engine

---

## 공개 API

```typescript
import {
  createOrganizationUseCase,
  updateOrganizationUseCase,
  archiveOrganizationUseCase,
  restoreOrganizationUseCase,
  deleteOrganizationUseCase,
  getOrganizationUseCase,
  searchOrganizationsUseCase,
  listOrganizationsUseCase,
  addMemberUseCase,
  removeMemberUseCase,
  changeMembershipUseCase,
  listMembersUseCase,
  updateOrganizationProfileUseCase,
  changeOrganizationStatusUseCase,
  changeOrganizationTypeUseCase,
  createBranchUseCase,
  createDepartmentUseCase,
  createTeamUseCase,
  moveDepartmentUseCase,
  moveTeamUseCase,
  // types
  type Organization,
  type OrganizationProfile,
  type Membership,
  type MembershipType,
  type OrganizationStatus,
  type OrganizationType,
  OrganizationNotFoundError,
  OrganizationConflictError,
  OrganizationValidationError,
  type OrganizationUseCaseDeps,
} from '@platform/engine-organization';
```

---

## 빠른 시작 (Demo)

```typescript
import { createOrganizationUseCase, addMemberUseCase, createBranchUseCase } from '@platform/engine-organization';

// 1) 회사 생성
const acme = await createOrganizationUseCase(
  {
    tenantId: 't-1',
    correlationId: 'r-1',
    actorId: 'system',
    displayName: 'ACME Travel Co.',
    legalName: 'ACME Travel Co., Ltd.',
    businessNumber: '123-45-67890',
    type: 'Commercial',
    country: 'KR',
    website: 'https://acme.example.com',
  },
  deps,
);

if (acme.ok) console.log('Created:', acme.value.id);

// 2) Branch 생성
const seoulBranch = await createBranchUseCase(
  {
    tenantId: 't-1',
    correlationId: 'r-2',
    actorId: 'system',
    organizationId: acme.value.id,
    displayName: 'Seoul HQ',
  },
  deps,
);

// 3) 멤버 추가
const member = await addMemberUseCase(
  {
    tenantId: 't-1',
    correlationId: 'r-3',
    actorId: 'system',
    organizationId: acme.value.id,
    userId: 'u-owner-1',
    membershipType: 'Owner',
  },
  deps,
);
```

전체 예제: `examples/demo.ts` 실행 (`pnpm example-test`).

---

## 도메인

| Domain | 설명 |
|---|---|
| `Organization` | 최상위 조직 엔터티 (모든 산업 도메인) |
| `Department` | 조직 내 부서 (무한 depth 부모참조) |
| `Branch` | 조직의 지점/지부 |
| `Team` | 부서/지점 내 소그룹 |
| `Membership` | User와 Organization의 관계 (UserReference) |
| `OrganizationProfile` | Display Name, Legal Name, Business Number 등 |
| `OrganizationMetadata` | Tenant-scoped Key/Value |
| `OrganizationAudit` | 모든 변경 기록 |
| `OrganizationHierarchy` | 전체 트리/경로 (cycle detection) |

총 **14개 도메인** (PRD §3).

---

## Use Cases

| UseCase | 입력 → 출력 | Error 가능 |
|---|---|---|
| `createOrganizationUseCase` | create input → Organization | ValidationError, ConflictError, PolicyViolationError |
| `updateOrganizationUseCase` | update input → Organization | NotFoundError, ValidationError |
| `getOrganizationUseCase` | id → Organization \| null | (없으면 Ok(null)) |
| `searchOrganizationsUseCase` | criteria → Organization[] | ValidationError |
| `listOrganizationsUseCase` | filter → Organization[] | ValidationError |
| `archiveOrganizationUseCase` | id → Organization | NotFoundError, ConflictError (이미 Archived) |
| `restoreOrganizationUseCase` | id → Organization | NotFoundError, ConflictError |
| `deleteOrganizationUseCase` | id → void | NotFoundError |
| `addMemberUseCase` | {orgId, userId, type} → Membership | NotFoundError, ConflictError |
| `removeMemberUseCase` | {orgId, userId} → void | NotFoundError |
| `changeMembershipUseCase` | {orgId, userId, newType} → Membership | NotFoundError |
| `listMembersUseCase` | orgId → Membership[] | NotFoundError |
| `updateOrganizationProfileUseCase` | {orgId, profile} → OrganizationProfile | NotFoundError, ValidationError |
| `changeOrganizationStatusUseCase` | {orgId, newStatus} → Organization | NotFoundError, ConflictError |
| `changeOrganizationTypeUseCase` | {orgId, newType} → Organization | NotFoundError, ValidationError |
| `createBranchUseCase` | {orgId, name} → Branch | NotFoundError, ValidationError |
| `createDepartmentUseCase` | {orgId, name, parent?} → Department | NotFoundError, ValidationError |
| `createTeamUseCase` | {parentOrgOrDept, name} → Team | NotFoundError, ValidationError |
| `moveDepartmentUseCase` | {id, newParent} → Department | NotFoundError, CycleDetectedError |
| `moveTeamUseCase` | {id, newParent} → Team | NotFoundError, CycleDetectedError |

**모든 Use Case는 `Promise<Result<T, E>>`를 반환하고 어떤 상황에서도 throw 하지 않는다** (헌법 §C-15).

---

## 이벤트 (Events)

모두 Core SDK `EventEnvelope` (8 필드: `id`, `occurredAt`, `tenantId`, `correlationId`, `actorId`, `engine`, `type`, `payload`).

| EventType | Trigger |
|---|---|
| `organization.created` | createOrganization |
| `organization.updated` | updateOrganization |
| `organization.profile.updated` | updateOrganizationProfile |
| `organization.archived` | archiveOrganization |
| `organization.restored` | restoreOrganization |
| `organization.deleted` | deleteOrganization |
| `organization.status.changed` | changeOrganizationStatus |
| `organization.type.changed` | changeOrganizationType |
| `organization.member.added` | addMember |
| `organization.member.removed` | removeMember |
| `organization.member.changed` | changeMembership |
| `organization.branch.created` | createBranch |
| `organization.department.created` | createDepartment |
| `organization.team.created` | createTeam |
| `organization.department.moved` | moveDepartment |
| `organization.team.moved` | moveTeam |
| `organization.audit.recorded` | Audit 기록 시 (디버깅/관제) |

---

## Multi-Tenancy

모든 Repo row는 `tenantId` 보유. 같은 Tenant 내 `businessNumber`/`taxNumber` 유니크.
다른 Tenant 데이터는 격리 (Repo/UseCase 레벨).

---

## Audit

모든 상태 변경은 Audit 기록. Audit 데이터는 절대 삭제하지 않음 (`organization.audit.recorded` 이벤트).

감사 대상:
- 생성/수정/아카이브/복원/삭제/status/type/profile 변경
- 멤버 추가/삭제/변경
- 부서/팀/지점 생성/이동
- 정책 위반 차단 (PolicyViolationError)

---

## 테스트

```bash
pnpm --filter @platform/engine-organization test          # 35+ tests
pnpm --filter @platform/engine-organization typecheck    # strict mode
pnpm --filter @platform/engine-organization build        # dist/
```

필수 테스트 (PRD §15):
- Organization 생성
- 중복 businessNumber 거부
- Archive/Restore 전이
- Hierarchy cycle detection
- Membership 추가/제거/변경
- Branch / Department / Team 생성
- Search (다중 인덱스)
- Event 발행
- Audit 기록
- Status 변경
- Type 변경
- Policy 위반 차단

---

## Quick Reference

| 항목 | 값 |
|---|---|
| Package | `@platform/engine-organization` |
| Phase | 3 |
| Status | Draft → RC (Sprint 1) → Stable (Sprint 3) |
| EngineName | `'organization'` (Core SDK EngineName union에 등록) |
| Strict Boundaries | engine.json `strict_boundaries` 참조 |

---

## 다음 단계

1. **Sprint 1**: MVP 구현 — Organization CRUD + Membership + Profile + Status
2. **Sprint 2**: Hierarchy depth + cycle detection 완성 + JSON Import
3. **Sprint 3**: ERP Import Interface + Engine Certification 5개 항목 → Stable 선언

자세한 PRD: [`docs/01-prd.md`](./docs/01-prd.md)
