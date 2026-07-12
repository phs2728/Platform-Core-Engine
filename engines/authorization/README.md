# Authorization Engine

> **Universal Authorization Engine — RBAC + ABAC + Policy + Resource + Permission Simulator**
>
> Permission Engine에서 Authorization Engine으로 승격.
> **Permission은 이 Engine의 내부 Module이다. 독립 Engine이 아니다.**

**Version**: 0.2.0 (RC)
**Phase**: 4
**Status**: **v1.0 RC** (CTO 리뷰 9건 반영 완료)

---

## 목적

Authorization Engine은 플랫폼의 **모든 권한 판단**을 담당한다.

### Permission만으로는 권한 판단이 불가능하다

권한 판단에는 다음 요소가 **모두** 필요하다:

| 요소 | 설명 |
|---|---|
| **Identity** | 누가 요청했는가 (accountId) |
| **Role** | 사용자의 역할 (manager, guide, customer) |
| **Permission** | 역할이 가진 권한 키 (`booking.create`) |
| **Policy** | 허용/거부 규칙 (deny가 allow보다 우선) |
| **Condition** | ABAC 조건 (ownership, time, attributes, expression) |
| **Resource** | 대상 리소스 (type, id, ownerId, attributes) |
| **Tenant** | 멀티테넌시 격리 |
| **Context** | 추가 컨텍스트 (IP, 시간 등) |

---

## Authorization Flow (CTO 리뷰 #1 반영)

```
Authorization Request
       ↓
Decision Engine (orchestrator)  ← 모든 Resolver를 orchestration
       ├→ Role Resolver
       ├→ Permission Resolver
       ├→ Policy Resolver
       ├→ Condition Evaluator (Expression AST)
       ├→ Cache
       ├→ Audit (reason 필수)
       └→ explain()
       ↓
   ALLOW / DENY / CONDITIONAL
```

---

## Public API (CTO 리뷰 #8 반영)

```typescript
// 핵심 API — 간단하고 명확하게
authorize()   // 전체 권한 확인 + Audit
can()         // 권한 있음? (boolean)
cannot()      // 권한 없음? (boolean)
evaluate()    // 상세 평가 (Resolution 포함)
explain()     // 권한 결정의 상세 근거  ← #8 CTO 리뷰
simulate()    // Permission Simulator
whatIf()      // What-If 시나리오 평가   ← #7 CTO 리뷰
```

### explain() 예시

```typescript
const result = await explain(
  { tenantId: 't-1', accountId: 'user-1', permission: 'booking.update',
    resource: { type: 'booking', id: 'b-1', ownerId: 'user-1' } },
  deps,
);

// 결과:
// {
//   decision: 'allow',
//   reason: { code: 'allowed_by_role', detail: '...', source: 'role_permission:booking.update' },
//   roles: ['manager'],
//   matchedPermissions: ['booking.update'],
//   policiesEvaluated: [{ name: 'OwnerOnly', effect: 'allow', conditionMet: true }],
//   conditionsEvaluated: [{ condition: 'own_', met: true }],
// }
```

---

## Domain Structure (CTO 리뷰 #2 반영 — resources/ 추가)

```
src/
├── decision/        # Decision Engine (최상위 Orchestrator) ← #1
├── resolver/        # Role/Permission/Policy Resolution
├── resources/       # Resource Module ← #2 CTO 리뷰
├── roles/           # Role Aggregate
├── permissions/     # Permission Module (내부, 표준 검증) ← #3
├── policies/        # Authorization/Permission/Tenant Policy
├── conditions/      # ABAC + Expression Engine ← #4
├── assignments/     # UserRole/GroupRole/TenantRole
├── audit/           # Audit Trail (reason 필수) ← #6
├── cache/           # Decision Cache (명확한 Key) ← #5
├── events/          # Event Definitions
├── interfaces/      # 모든 인터페이스
├── use-cases/       # UseCase + Simulator + What-If ← #7
└── infrastructure/  # In-Memory Repositories
```

---

## Permission String 표준 (CTO 리뷰 #3 반영)

**Platform 전체에서 dot notation으로 통일:**

```
booking.create    ← O 표준
booking.update    ← O 표준
payment.refund    ← O 표준
booking:create    ← X 사용 금지
```

검증: `validatePermissionKey('booking:create')` → error with fix suggestion

---

## ABAC Expression Engine (CTO 리뷰 #4 반영)

```typescript
// Expression 기반 조건 — AST 평가
expressionCondition("resource.owner == user.id && resource.status == 'DRAFT' && time.hour < 18")

// 기존 구조화된 조건도 계속 지원
ownershipCondition()           // resource.ownerId === accountId
timeRestrictionCondition('09:00', '18:00')
attributeCondition({ status: 'PUBLISHED' })
```

---

## Cache (CTO 리뷰 #5 반영)

Cache Key에 **Tenant + Account + Permission + Resource + Attributes** 포함:

```
{tenantId}:{accountId}:{permission}:{resourceType}:{resourceId}:{resourceOwner}:{attributesHash}
```

| Decision | TTL |
|---|---|
| ALLOW | 60s |
| DENY | 10s |
| CONDITIONAL | 5s |

---

## Audit (CTO 리뷰 #6 반영)

모든 결정에 **Reason을 반드시 남긴다**:

```
DENY  — Missing Permission booking.delete
ALLOW — Role Manager, Permission booking.update
DENY  — Condition not met: own_ (resource.owner != user.id)
```

---

## 빠른 시작

```typescript
import {
  authorize, can, cannot, explain,
  simulatePermissionsUseCase, whatIfUseCase,
  DecisionCache, ResourceRegistry,
  createRoleUseCase, assignPermissionToRoleUseCase, assignRoleUseCase,
  InMemoryRoleRepository, InMemoryPermissionRepository,
  InMemoryRolePermissionRepository, InMemoryRoleAssignmentRepository,
  InMemoryPolicyRepository, InMemoryAuditLogRepository,
} from '@platform/engine-authorization';

// Setup
const cache = new DecisionCache();
const resourceRegistry = new ResourceRegistry();
const deps = { roleRepository, rolePermissionRepository, ...cache };

// Authorize with full pipeline
const decision = await authorize(
  { tenantId: 't-1', accountId: 'user-1', permission: 'booking.create' },
  deps,
);

// Explain why
const explanation = await explain(
  { tenantId: 't-1', accountId: 'user-1', permission: 'booking.create' },
  deps,
);
```

---

## Platform Foundation

이 엔진은 Platform Foundation의 일부이다:

```
1. Core SDK
2. Policy Engine
3. Identity Engine
4. Authorization Engine  ← 여기
5. Universal Event Bus
6. Communication Engine
```

---

## Backward Compatibility

기존 Permission Engine API는 Deprecated 처리, Wrapper로 유지된다.

---

## 의존성

```yaml
depends_on:
  - core-sdk
  - universal-core
```

---

## Tests

```bash
pnpm test
pnpm typecheck
```
