# Authorization Engine — PRD

**Version**: 0.2.0 (RC)
**Date**: 2026-07-11
**Status**: v1.0 RC — CTO 리뷰 9건 반영

---

## 1. 배경

### 1.1 Permission Engine → Authorization Engine 승격

Platform Architecture Review 결과, **Permission Engine은 독립 Engine이 아니라
Authorization Domain의 일부**라는 결론이 나왔다.

**Permission만으로는 실제 권한 판단이 불가능하다.**

권한 판단에는 다음 요소가 모두 필요하다:

- Identity (누가)
- Role (역할)
- Permission (권한 키)
- Policy (규칙)
- Condition (ABAC 조건)
- Resource (대상)
- Tenant (테넌시)
- Context (컨텍스트)

따라서 Permission Engine을 **Authorization Engine으로 승격**한다.

### 1.2 Authentication vs Authorization

| 구분 | Authentication (인증) | Authorization (인가) |
|---|---|---|
| **질문** | "누구인가?" | "무엇을 할 수 있는가?" |
| **담당** | Identity Engine | Authorization Engine |
| **입력** | Credential (email/password/OAuth) | accountId + permission + resource |
| **출력** | accountId (인증된 identity) | ALLOW / DENY / CONDITIONAL |
| **시점** | 로그인 시 1회 | 모든 Business Action마다 |
| **예시** | "이 사람은 user-123이다" | "user-123은 booking.create 권한이 있다" |

**핵심 차이**: Authentication은 신원을 확인하고, Authorization은 권한을 판단한다.

---

## 2. 설계 원칙

- **Industry Agnostic** (헌법 §C-1)
- **Decision Engine First** (#1 CTO 리뷰) — Decision Engine이 모든 Resolver를 orchestration
- **Resource-Aware** (#2 CTO 리뷰) — Resource Module로 모든 Business Entity 지원
- **Standard Permission** (#3 CTO 리뷰) — dot notation 통일 (`booking.create`)
- **Expression-Based ABAC** (#4 CTO 리뷰) — AST 평가 가능한 일반화된 조건
- **Explainable** (#8 CTO 리뷰) — `explain()` API로 권한 결정 근거 제공
- **Policy Injection** (헌법 §C-14) — deny가 allow보다 항상 우선
- **Event First** (헌법 §C-16) — 모든 권한 변경 사항 Event 발행

---

## 3. 책임

### 3.1 Decision Engine (#1)
- `authorize()` — 전체 권한 확인
- `can()` / `cannot()` — Boolean 판단
- `evaluate()` — 상세 평가 (Resolution 포함)
- `explain()` — 권한 결정의 상세 근거 (#8)

### 3.2 Role Management
- Role 정의, 상속, System Role

### 3.3 Permission Management (#3)
- Permission 표준 (dot notation)
- `validatePermissionKey()` / `normalizePermissionKey()`
- Wildcard 매칭

### 3.4 Resource Management (#2)
- Resource Registry
- 표준 Business Resource (Booking, Payment, Review, Media, CMS)

### 3.5 Policy Management
- Authorization/Permission/Tenant Policy
- deny > allow 우선순위

### 3.6 Condition Management (#4)
- 구조화된 조건 (Ownership, Time, Attributes, Department)
- Expression 기반 조건 (AST 평가)
- AI Policy 연결 가능

### 3.7 Assignment Management
- UserRole, GroupRole, TenantRole
- 만료 (expiresAt)

### 3.8 Simulator + What-If (#7)
- 실제 사용자 권한 시뮬레이션
- 가상 시나리오 평가 (데이터베이스 변경 없음)

---

## 4. 하지 않는 것

- **Authentication** — Identity Engine의 역할
- **Resource CRUD** — Business Engine의 역할
- **Session Management** — Identity Engine의 역할

---

## 5. 기능

### 5.1 Decision Engine Orchestrator (#1)

```
Authorization Request
       ↓
Decision Engine
   ├→ Role Resolver → Permission Resolver
   ├→ Policy Resolver
   ├→ Condition Evaluator (Expression AST)
   ├→ Cache (check before, store after)
   ├→ Audit (reason 필수)
   └→ explain() (상세 근거)
       ↓
   ALLOW / DENY / CONDITIONAL
```

### 5.2 Expression-Based ABAC (#4)

```
resource.owner == user.id && resource.status == 'DRAFT' && time.hour < 18
```

AST로 파싱되어 평가. AI Policy 연결 가능.

### 5.3 Resource Module (#2)

| Resource | 표준 Permissions |
|---|---|
| booking | booking.create, booking.read, booking.update, booking.delete, booking.cancel |
| payment | payment.create, payment.read, payment.refund |
| review | review.create, review.read, review.update, review.delete |
| media | media.create, media.read, media.update, media.delete |
| cms | cms.create, cms.read, cms.update, cms.delete |

### 5.4 explain() (#8)

```
ALLOW
because
  Role: Manager
  Permission: booking.update
  Policy: OwnerOnly (condition met)
  Condition: own_ (met: resource.owner == user.id)
```

### 5.5 What-If Simulator (#7)

```
"What if User = Kim, Role = Guide, Permission = booking.cancel → Result?"
```

실제 데이터베이스를 변경하지 않고 가상 시나리오 평가.

---

## 6. Authorization Flow 상세

```
1. AuthorizationRequest 수신
   { tenantId, accountId, permission, resource?, context? }

2. Cache Check (#5)
   Cache Key: tenant:account:permission:resourceType:resourceId:owner:attributesHash

3. Decision Engine Orchestration (#1)
   a. Role Resolver → 사용자의 모든 Role (상속 포함, 만료 필터)
   b. Permission Resolver → 매칭되는 Permission (Wildcard)
   c. Policy Resolver → 관련 Policy (deny 우선)
   d. Condition Evaluator → ABAC + Expression 평가 (#4)

4. Decision
   ALLOW / DENY / CONDITIONAL + structured Reason (#6)

5. Audit
   Reason을 반드시 포함하여 기록 (#6)

6. Cache Store (#5)

7. Event
   authorization.decision.allow/deny Event 발행
```

---

## 7. Backward Compatibility

| 기존 API | 새 API | 상태 |
|---|---|---|
| `authorizeUseCase()` | `authorize()` (decision/) | Wrapper 유지 |
| `matchesPermission()` | `matchesPermission()` | 유지 |
| `evaluateCondition()` | `evaluateCondition()` | 확장 (Expression 추가) |
| `simulatePermissionsUseCase()` | `simulatePermissionsUseCase()` + `whatIfUseCase()` | 확장 |
