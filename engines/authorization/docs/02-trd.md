# Authorization Engine — TRD (Technical Reference Document)

**Version**: 0.2.0 (RC)
**Date**: 2026-07-11
**Status**: v1.0 RC — CTO 리뷰 9건 반영

---

## 1. 아키텍처 개요 (CTO 리뷰 #1 반영)

```
Authorization Request
       │
       ▼
┌──────────────────────────────────┐
│       Decision Engine             │  ← Orchestrator (최상위)
│  authorize() / can() / cannot()  │
│  evaluate() / explain()           │
└──────────┬───────────────────────┘
           │
    ┌──────┼──────────────────────────────┐
    │      │                              │
    ▼      ▼                              ▼
┌────────┐ ┌───────────┐          ┌──────────────┐
│ Cache  │ │ Resolver  │          │ Condition    │
│ (#5)   │ │ Layer     │          │ Evaluator    │
└────────┘ └─────┬─────┘          │ (#4 Expr AST)│
                 │                └──────┬───────┘
    ┌────────────┼───────────┐           │
    ▼            ▼           ▼           │
┌────────┐ ┌──────────┐ ┌─────────┐     │
│ Role   │ │Permission│ │ Policy  │     │
│Resolver│ │ Resolver │ │Resolver │     │
└───┬────┘ └────┬─────┘ └────┬────┘     │
    │           │            │           │
    ▼           ▼            ▼           ▼
┌──────────────────────────────────────────────┐
│                 Resource (#2)                 │
│    Booking / Payment / Review / Media / CMS   │
└──────────────────────────────────────────────┘
           │
    ┌──────┼──────────┐
    ▼      ▼          ▼
┌──────┐┌────────┐┌─────────┐
│Cache ││ Audit  ││  Event  │
│ (#5) ││ (#6)   ││         │
└──────┘└────────┘└─────────┘
```

---

## 2. Decision Engine (CTO 리뷰 #1)

Decision Engine은 **최상위 Orchestrator**이다. 모든 Resolver를 orchestration한다.

### 2.1 evaluate()

순수 평가 함수. Cache/Audit 없이 권한만 평가.

**평가 순서:**
1. **Resolve** — Role → Permission → Policy (resolver/ 모듈)
2. **Policy deny** — deny Policy condition 만족 시 즉시 DENY
3. **Permission 매칭** — Wildcard + Condition 평가
4. **Policy allow** — allow Policy condition 만족 시 ALLOW
5. **Decision** — ALLOW / CONDITIONAL / DENY

### 2.2 authorize()

`evaluate()` + Cache + Audit.

### 2.3 can() / cannot()

`authorize()`의 Boolean 버전.

### 2.4 explain() — CTO 리뷰 #8

```typescript
async function explain(request, deps): Promise<ExplainResult>
```

권한 결정의 **상세 근거**를 반환한다:

```typescript
{
  decision: 'deny',
  reason: {
    code: 'no_matching_permission',
    detail: "No role or policy grants permission 'booking.delete' to user 'user-1'.",
    source: 'none',
  },
  roles: ['guide'],
  matchedPermissions: [],
  policiesEvaluated: [...],
  conditionsEvaluated: [...],
}
```

---

## 3. Policy Resolution

### 3.1 우선순위

```
Authorization Policy (priority 100) > Permission Policy (50) > Tenant Policy (0)
```

deny가 allow보다 **항상 우선**한다.

---

## 4. Permission Resolution

### 4.1 표준 (CTO 리뷰 #3)

```
{resource}.{action}  ← dot notation (표준)

booking.create    ← O
booking:create    ← X (거부, validatePermissionKey로 검증)
```

### 4.2 Wildcard

```
'*' / '*.*'     → 모든 권한
'booking.*'     → 모든 booking action
```

---

## 5. Role Resolution

### 5.1 Assignment 해결

1. User의 모든 RoleAssignment 조회
2. 만료 필터 (`expiresAt < now`)
3. 상위 Role Permission 수집 (순환 방지)

---

## 6. Condition Evaluator — Expression Engine (CTO 리뷰 #4)

### 6.1 Expression Grammar

```
comparison := operand ('==' | '!=' | '<' | '<=' | '>' | '>=') operand
logical    := comparison (('&&' | '||') comparison)*
operand    := variable | literal | '(' logical ')'
variable   := 'resource.owner' | 'resource.status' | 'user.id' | 'time.hour' | ...
literal    := string | number | boolean
```

### 6.2 AST 평가

```typescript
evaluateExpression("resource.owner == user.id && time.hour < 18", request)
```

1. Tokenize → 2. Parse (recursive descent) → 3. AST → 4. Evaluate

### 6.3 EvaluationContext

```typescript
{
  user: { id: 'user-1', ...context },
  resource: { type: 'booking', id: 'b-1', owner: 'user-1', ...attributes },
  time: { hour: 14, day: 3, timestamp: 1234567890 },
}
```

---

## 7. Resource Module (CTO 리뷰 #2)

### 7.1 ResourceRegistry

```typescript
const registry = new ResourceRegistry();
registry.register({ type: 'booking', description: '...', permissions: [...] });
registry.supportsPermission('booking', 'booking.create'); // true
```

### 7.2 표준 Resources

Booking, Payment, Review, Media, CMS — `STANDARD_RESOURCES` 상수.

---

## 8. Cache (CTO 리뷰 #5)

### 8.1 Cache Key

```
{tenantId}:{accountId}:{permission}:{resourceType}:{resourceId}:{resourceOwner}:{attributesHash}
```

### 8.2 TTL

| Decision | TTL | 이유 |
|---|---|---|
| ALLOW | 60s | 권한 변경 후 최대 60s 지연 |
| DENY | 10s | 보안상 빠른 갱신 |
| CONDITIONAL | 5s | 가장 빠른 만료 |

### 8.3 무효화

- `invalidateTenant(tenantId)` — Role/Policy 변경 시
- `invalidateAccount(tenantId, accountId)` — 사용자 Role 변경 시
- `invalidatePermission(tenantId, permission)` — Permission 변경 시

---

## 9. Audit (CTO 리뷰 #6)

### 9.1 Reason 필수 기록

모든 권한 확인 Audit에는 **Reason**이 반드시 포함된다:

```typescript
{
  eventType: 'authorization_denied',
  metadata: {
    permission: 'booking.delete',
    decision: 'deny',
    reason: {
      code: 'no_matching_permission',
      detail: "No role or policy grants permission 'booking.delete'...",
      source: 'none',
    },
    summary: "DENY — No role or policy grants permission 'booking.delete'...",
  },
}
```

### 9.2 Reason Codes

| Code | 설명 |
|---|---|
| `no_role_assignments` | Role이 없음 |
| `no_matching_permission` | Permission이 없음 |
| `condition_not_met` | ABAC 조건 미충족 |
| `denied_by_policy` | Policy로 거부 |
| `allowed_by_role` | Role Permission으로 허용 |
| `allowed_by_policy` | Policy로 허용 |

---

## 10. Event

### Event Types

| EventType | 트리거 |
|---|---|
| `authorization.role.created` | Role 생성 |
| `authorization.role.assigned` | Role 할당 |
| `authorization.permission.assigned` | Permission 매핑 |
| `authorization.policy.created` | Policy 생성 |
| `authorization.decision.allow` | 권한 허용 |
| `authorization.decision.deny` | 권한 거부 |

---

## 11. Simulator + What-If (CTO 리뷰 #7)

### 11.1 simulatePermissionsUseCase

실제 사용자의 권한을 다수 Permission에 대해 일괄 평가.

### 11.2 whatIfUseCase

가상 시나리오 평가. 실제 데이터베이스 변경 없음:

```typescript
whatIfUseCase({
  tenantId: 't-1',
  roles: ['guide'],
  permissions: ['booking.cancel', 'booking.read'],
  resource: { type: 'booking', id: 'b-1' },
}, deps);
```

Virtual Repository를 생성하여 평가 후 폐기한다.

---

## 12. Domain Module 구조

```
src/
├── decision/        # Decision Engine Orchestrator (#1)
├── resolver/        # Role/Permission/Policy Resolution
├── resources/       # Resource Module (#2)
├── roles/           # Role Aggregate
├── permissions/     # Permission Module + 표준 검증 (#3)
├── policies/        # Policy Module
├── conditions/      # ABAC + Expression Engine (#4)
├── assignments/     # Assignment Module
├── audit/           # Audit Module + Reason (#6)
├── cache/           # Decision Cache (#5)
├── events/          # Event Module
├── interfaces/      # 모든 인터페이스
├── use-cases/       # UseCase + Simulator + What-If (#7)
├── domain/          # Legacy (하위 호환)
└── infrastructure/  # In-Memory Repositories
```
