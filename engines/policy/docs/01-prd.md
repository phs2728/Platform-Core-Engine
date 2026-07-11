# Policy Engine — Product Requirements Document

**Version**: v0.1-draft (사장님 확립 대기)
**Status**: 🟡 Draft
**Effective Date**: 2026-07-11 (Sprint 1 동결)
**Owner**: 사장님 (박흥식 / Tim Park)
**Companion**: [README.md](./README.md)

---

## 0. 문서 위치

이 문서는 **Policy Engine PRD**입니다. Platform Core의 두 번째 엔진으로, **모든 엔진에 정책 서비스를 제공**합니다.

사장님 헌법 §12.7, §12.8 (C-14, C-15) 의 직접적 구현입니다.

---

## 1. Mission (사장님 확립)

> **Policy Engine은 Platform Core의 모든 엔진이 사용하는 정책 서비스의 단일 진실 공급원(SSoT)이다.**

- Identity Engine, Notification Engine, Media Engine, 그 외 모든 엔진이 Policy Engine을 통해 정책을 가져옴
- 엔진은 DB에서 직접 정책 조회 **절대 금지** (헌법 §C-14)
- 정책은 3계층으로 해결: **Tenant → Engine → Global**

---

## 2. 책임 범위

### 2.1 In Scope

- Configuration Provider (3계층 정책 해결)
- Policy Resolution (Tenant / Engine / Global)
- Policy Injection (DI를 통해 Engine에 주입)
- Hot Reload (정책 변경 시 Engine 재시작 불필요)
- Policy Audit (모든 조회/변경 기록)
- Policy Versioning (정책 변경 이력)
- Policy Cache (성능)
- Type-Safe Policy Schema (TypeScript + zod)

### 2.2 Out of Scope

- ❌ Policy **편집 UI** (별도 Admin Console)
- ❌ Policy **배포 자동화** (별도 CI/CD)
- ❌ Policy **승인 워크플로우** (별도 Workflow Engine)
- ❌ Policy **버전 비교** (Phase 2+)
- ❌ 정책 **실험/카나리** (Phase 2+)

---

## 3. 핵심 기능

### 3.1 Policy 3계층 해결

사장님 확립 3계층 구조:

```
[1] Global Policy
    Platform 차원 기본값
    모든 엔진 공통
    예: password_min_length = 12 (Platform 기본)

[2] Engine Policy
    특정 엔진의 정책
    예: Identity Engine의 session_timeout = 60분

[3] Tenant Policy
    특정 회사의 override
    예: Restaurant Tenant가 password_min_length = 8로 override
```

**해결 알고리즘**:
```
getPolicy(tenantId, engine, key):
  1. Tenant Policy 조회 (tenantId + engine + key)
     → 있으면 return
  2. Engine Policy 조회 (engine + key)
     → 있으면 return
  3. Global Policy 조회 (key)
     → 있으면 return
  4. 없으면 throw PolicyNotFoundError
```

### 3.2 Policy Resolution API

```typescript
interface IPolicyProvider {
  get<T>(key: PolicyKey): Promise<T>;
  get<T>(context: PolicyContext, key: PolicyKey): Promise<T>;
  has(key: PolicyKey): Promise<boolean>;
  has(context: PolicyContext, key: PolicyKey): Promise<boolean>;
}

interface IConfigurationProvider {
  get<T>(key: ConfigKey): Promise<T>;
  get<T>(context: ConfigContext, key: ConfigKey): Promise<T>;
  watch(key: ConfigKey, callback: (newValue: T) => void): Unsubscribe;
}

interface ITenantPolicyResolver {
  resolve(tenantId: TenantId, key: PolicyKey): Promise<PolicyValue>;
  // 3계층 해결 알고리즘
}
```

### 3.3 Policy Types (예시)

| Type | Example Key | Default Value |
|---|---|---|
| `password_min_length` | `security.password.minLength` | 12 |
| `login_max_failures` | `security.login.maxFailures` | 5 |
| `lock_duration_minutes` | `security.lock.durationMinutes` | 30 |
| `session_timeout_minutes` | `session.timeoutMinutes` | 60 |
| `require_email_verification` | `verification.email.required` | false |
| `require_phone_verification` | `verification.phone.required` | false |
| `two_factor_required` | `mfa.required` | false |

### 3.4 Engine-Specific Policy

Identity Engine만:
- `identity.session.rememberMeDays` (default 30)
- `identity.oauth.provider.{name}.enabled` (per-tenant)
- `identity.password.expirationDays` (default null = 무기한)

Notification Engine (예정):
- `notification.email.provider` (default 'smtp')
- `notification.sms.provider` (default 'twilio')
- `notification.retry.maxAttempts` (default 3)

---

## 4. Architecture

### 4.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Engine (e.g. Identity)                  │
│                                                              │
│  UseCase ─→ IPolicyProvider ─┐                              │
│  UseCase ─→ IConfigurationProvider ─┐                       │
│  UseCase ─→ ITenantPolicyResolver ─┤                       │
└─────────────────────────────────────────────────────────────┘
                                       │
                                       ↓
┌─────────────────────────────────────────────────────────────┐
│                      Policy Engine                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ IPolicyProvider (3계층 해결)                          │  │
│  │   ├─ Tenant Policy Store                            │  │
│  │   ├─ Engine Policy Store                            │  │
│  │   └─ Global Policy Store                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ IConfigurationProvider (Hot Reload)                  │  │
│  │   └─ Watch API (구독)                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ITenantPolicyResolver                                │  │
│  │   └─ Cache (Redis)                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                       │
                                       ↓
            ┌────────────────────────────────────────┐
            │       Storage (DB / Cache / KMS)       │
            │  - platform_policies (Global)           │
            │  - engine_policies (Engine별)            │
            │  - tenant_policies (Tenant별 Override)   │
            │  - policy_audit (변경 이력)              │
            └────────────────────────────────────────┘
```

### 4.2 Data Flow

```
1. Engine Use Case 시작
   ↓
2. ctx.policy.get('security.password.minLength', { tenantId })
   ↓
3. Policy Engine: 3계층 해결
   - tenant_policies WHERE tenant_id=X AND key=Y → 값
   - 없으면 engine_policies WHERE engine='identity' AND key=Y → 값
   - 없으면 platform_policies WHERE key=Y → 값
   ↓
4. Cache 확인 (Redis)
   - hit: 즉시 반환
   - miss: DB 조회 + cache.set
   ↓
5. Audit Log 기록 (선택)
   ↓
6. 값 반환
```

---

## 5. API

### 5.1 Engine Interface (호출측)

```typescript
interface PolicyContext {
  tenantId: TenantId;
  engine: EngineName;       // 'identity' | 'notification' | ...
  userId?: UserId;          // (선택) 사용자별 override
}

interface IPolicyProvider {
  /**
   * 정책 값 조회 (3계층 해결)
   */
  get<T>(key: PolicyKey, context?: PolicyContext): Promise<T>;

  /**
   * 정책 존재 여부
   */
  has(key: PolicyKey, context?: PolicyContext): Promise<boolean>;

  /**
   * 정책 메타데이터 (source: tenant | engine | global)
   */
  getMeta(key: PolicyKey, context?: PolicyContext): Promise<PolicyMeta>;
}

interface IConfigurationProvider {
  /**
   * 글로벌 설정 조회
   */
  get<T>(key: ConfigKey): Promise<T>;

  /**
   * 설정 변경 감시 (Hot Reload)
   */
  watch<T>(key: ConfigKey, callback: (newValue: T) => void): Unsubscribe;
}

interface ITenantPolicyResolver {
  /**
   * 특정 Tenant의 모든 정책 해결 (캐시 사용)
   */
  resolveAll(tenantId: TenantId, engine: EngineName): Promise<ResolvedPolicySet>;

  /**
   * 캐시 무효화
   */
  invalidate(tenantId: TenantId): Promise<void>;
}
```

### 5.2 Admin API (설정 변경)

```
GET    /admin/policies?engine=identity&tenantId=...
POST   /admin/policies                    # 새 정책 생성
PATCH  /admin/policies/{id}               # 정책 값 변경
DELETE /admin/policies/{id}               # 정책 삭제 (Override 해제)
GET    /admin/policies/audit              # 변경 이력
```

---

## 6. 이벤트

Policy Engine은 다음 Event 발행 (헌법 §C-16 Event First):

| Event | 시점 | Payload |
|---|---|---|
| `policy.created` | 새 정책 생성 | policyId, key, value, scope, actor |
| `policy.updated` | 정책 값 변경 | policyId, key, oldValue, newValue, scope, actor |
| `policy.deleted` | 정책 삭제 | policyId, key, scope, actor |
| `policy.cache.invalidated` | 캐시 무효화 | tenantId, engine |
| `policy.resolved` | (선택) 3계층 해결 | tenantId, engine, key, source |

---

## 7. 데이터 도메인

```sql
-- Global Policy (Platform 기본값)
CREATE TABLE platform_policies (
  id              uuid PRIMARY KEY,
  key             text NOT NULL UNIQUE,         -- 'security.password.minLength'
  value           jsonb NOT NULL,
  description     text,
  schema_ref      text,                          -- zod schema reference
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  version         bigint NOT NULL DEFAULT 1
);

-- Engine Policy (엔진별 기본값)
CREATE TABLE engine_policies (
  id              uuid PRIMARY KEY,
  engine          text NOT NULL,                 -- 'identity', 'notification', ...
  key             text NOT NULL,
  value           jsonb NOT NULL,
  description     text,
  schema_ref      text,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  version         bigint NOT NULL DEFAULT 1,
  UNIQUE (engine, key)
);

-- Tenant Policy (테넌트별 override)
CREATE TABLE tenant_policies (
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  engine          text NOT NULL,
  key             text NOT NULL,
  value           jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  version         bigint NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, engine, key)
);

-- Policy Audit (변경 이력)
CREATE TABLE policy_audit (
  id              uuid PRIMARY KEY,
  policy_id       uuid,
  tenant_id       uuid,                          -- null이면 Global/Engine
  engine          text,
  key             text NOT NULL,
  old_value       jsonb,
  new_value       jsonb,
  actor           text NOT NULL,                 -- 'admin-user-uuid' | 'system'
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp()
);
```

> **C-15 준수**: 기술 필드 (created_at, version)만 DEFAULT. 정책 값 (value)은 DEFAULT 없음 (application이 명시).

---

## 8. 사장님 확립 결정 사항

| # | 결정 | 사장님 확립 |
|---|---|---|
| 1 | Policy Engine이 Platform의 두 번째 엔진 | ✅ (2026-07-11) |
| 2 | 3계층: Global / Engine / Tenant | ✅ (2026-07-11) |
| 3 | Engine은 Policy Engine을 통해 정책 주입받음 | ✅ (헌법 §C-14) |
| 4 | DB DEFAULT는 기술 필드만 | ✅ (헌법 §C-15) |
| 5 | Event First Architecture | ✅ (헌법 §C-16) |
| 6 | Restaurant = 8, Tour = 12, Bank = 16 예시 | ✅ (2026-07-11) |

---

## 9. 미결정 사항 (사장님 확립 대기)

| # | 결정 | 사장님 확립 |
|---|---|---|
| 1 | Platform Global Default 값 (Password=12, Session=60, etc.) | ❓ |
| 2 | Cache TTL (Policy / Configuration) | ❓ |
| 3 | Hot Reload 방식 (Pub/Sub vs Polling) | ❓ |
| 4 | Engine Override 우선 vs Tenant Override 우선 (사장님 명시: Tenant 우선) | ✅ (Tenant 우선) |
| 5 | Policy Versioning 보관 기간 | ❓ |
| 6 | Type-Safe Policy Schema (zod) 자동 생성 여부 | ❓ |

---

**End of Policy Engine PRD v0.1-draft**