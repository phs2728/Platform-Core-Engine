# Identity Engine — Entity Relationship Diagram (ERD)

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [03-domain-model.md](./03-domain-model.md), [04-db-schema.md](./04-db-schema.md)

---

## 0. 문서 위치

이 문서는 **모든 엔티티의 관계**를 시각화합니다.

- **다이어그램 형식**: Mermaid (GitHub, Obsidian, Notion 호환)
- **Cardinality 표기**: `||` (exactly one), `o|` (zero or one), `}o` (zero or many), `}|` (one or many)

---

## 1. 전체 ERD (Master View)

```mermaid
erDiagram
    tenants ||--o{ users : "owns"
    users ||--o{ user_identities : "has"
    users ||--o{ credentials : "has"
    users ||--o{ sessions : "has"
    users ||--o{ password_history : "history"
    users ||--o{ audit_logs : "subject"
    tenants ||--|| security_policies : "configures"
    tenants ||--o{ auth_providers : "enables"
    tenants ||--o{ tenant_credentials : "stores"
    tenants ||--o{ verification_tokens : "issues"
    tenants ||--o{ password_resets : "issues"
    tenants ||--o{ audit_logs : "scopes"

    users {
        uuid id PK
        uuid tenant_id FK
        text status
        timestamptz last_login_at
        timestamptz locked_until
        text locked_reason
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
        bigint version
    }

    user_identities {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        text type
        bytea identifier
        bytea identifier_hash
        boolean verified
        timestamptz verified_at
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    credentials {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        text type
        text secret_hash
        bytea oauth_tokens_enc
        text oauth_subject
        text oauth_provider
        timestamptz last_used_at
        timestamptz expires_at
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    password_history {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        text secret_hash
        timestamptz created_at
    }

    sessions {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        text token_hash UK
        text device_fingerprint
        inet ip_address
        text user_agent
        text country
        boolean is_suspicious
        boolean remember_me
        timestamptz created_at
        timestamptz last_active_at
        timestamptz expires_at
        timestamptz revoked_at
        text revoked_reason
    }

    auth_providers {
        uuid id PK
        uuid tenant_id FK
        text type
        boolean enabled
        jsonb config
        text display_name
        integer display_order
        timestamptz created_at
        timestamptz updated_at
    }

    security_policies {
        uuid tenant_id PK,FK
        integer password_min_length
        boolean password_require_uppercase
        boolean password_require_lowercase
        boolean password_require_number
        boolean password_require_special
        integer password_expiration_days
        integer password_history_count
        integer login_max_failures
        integer lock_duration_minutes
        integer rate_limit_per_ip_max
        integer rate_limit_per_ip_window_seconds
        integer rate_limit_per_identifier_max
        integer rate_limit_per_identifier_window_seconds
        integer session_timeout_minutes
        integer remember_me_days
        integer max_concurrent_sessions
        boolean require_email_verification
        boolean require_phone_verification
        integer verification_expiration_minutes
        integer verification_max_attempts
        boolean two_factor_required
        jsonb two_factor_methods
        boolean captcha_enabled
        text captcha_provider
        integer captcha_trigger_after_failures
        integer audit_retention_days
        boolean require_admin_approval
        timestamptz updated_at
    }

    verification_tokens {
        uuid id PK
        uuid tenant_id FK
        uuid user_id
        uuid identity_id
        text type
        text channel
        text target
        text code_hash
        integer attempts
        integer max_attempts
        timestamptz expires_at
        timestamptz consumed_at
        inet ip_address
        jsonb metadata
        timestamptz created_at
    }

    password_resets {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid identity_id FK
        text token_hash UK
        text channel
        text target
        timestamptz expires_at
        timestamptz consumed_at
        inet ip_address
        text user_agent
        timestamptz created_at
    }

    audit_logs {
        uuid id PK
        uuid tenant_id FK
        uuid user_id
        uuid session_id
        text event_type
        inet ip_address
        text user_agent
        text result
        text reason
        jsonb context
        jsonb metadata
        text hash
        text prev_hash
        timestamptz created_at
    }

    tenant_credentials {
        uuid id PK
        uuid tenant_id FK
        text purpose
        text name
        bytea encrypted_payload
        text key_id
        bytea iv
        bytea auth_tag
        timestamptz expires_at
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 2. Aggregate 중심 ERD (도메인 이해용)

```mermaid
erDiagram
    users ||--|{ user_identities : "1 User has N Identities"
    users ||--|{ credentials : "1 User has N Credentials"
    users ||--|{ sessions : "1 User has N Sessions"
    users ||--|{ password_history : "1 User has N past passwords"
    users ||--o{ audit_logs : "1 User has N audit logs"

    tenants ||--|| security_policies : "1 Tenant has 1 Policy"
    tenants ||--|{ auth_providers : "1 Tenant has N Providers"
    tenants ||--|{ tenant_credentials : "1 Tenant has N Credentials"
```

---

## 3. 인증 흐름 시퀀스 다이어그램

### 3.1 Email/Password 로그인

```mermaid
sequenceDiagram
    participant Client
    participant Host as Host (Hono/Next)
    participant Engine as Identity Engine
    participant DB as Database
    participant Cache as Redis
    participant Audit as Audit Engine

    Client->>Host: POST /auth/login {email, password}
    Host->>Host: tenantId resolve (from subdomain/header)
    Host->>Engine: engine.login({tenantId, identifier, password, ...})
    Engine->>Cache: rate limit check (IP, identifier)
    Cache-->>Engine: ok / blocked
    Engine->>DB: find user_identity by (tenant, type, identifier_hash)
    DB-->>Engine: identity + user
    Engine->>DB: get security_policy
    DB-->>Engine: policy
    Engine->>Engine: verify password (Argon2id)
    alt password invalid
        Engine->>Audit: emit auth.login.failure
        Engine-->>Host: AuthenticationFailedError
    else password valid
        Engine->>Engine: check status, locked, verification
        alt requires verification
            Engine->>Audit: emit auth.login.partial
            Engine-->>Host: VerificationRequiredError
        else success
            Engine->>Engine: generate session token
            Engine->>DB: insert session
            Engine->>Audit: emit auth.login.success
            Engine-->>Host: { sessionToken, userId, ... }
        end
    end
    Host-->>Client: 200 OK {sessionToken}
```

### 3.2 OAuth 로그인 (Google 예시)

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant Host as Host
    participant Engine as Identity Engine
    participant Provider as Google OAuth
    participant DB as Database

    User->>Client: "Google로 로그인" 클릭
    Client->>Host: GET /auth/oauth/google/initiate
    Host->>Engine: engine.oauth.initiate('google')
    Engine->>Engine: generate state (CSRF 방지)
    Engine->>DB: store state (10분 TTL)
    Engine-->>Host: { authorizeUrl }
    Host-->>Client: 302 redirect → Google
    User->>Provider: Google 로그인 + 동의
    Provider->>Client: 302 → /auth/callback/google?code=...&state=...
    Client->>Host: GET /auth/callback/google
    Host->>Engine: engine.oauth.callback('google', {code, state})
    Engine->>DB: validate state (consumed)
    Engine->>Provider: POST /token (code → access_token)
    Provider-->>Engine: {access_token, id_token, refresh_token}
    Engine->>Provider: GET /userinfo (with access_token)
    Provider-->>Engine: {sub, email, email_verified, ...}
    Engine->>Engine: normalize + hash identifier
    Engine->>DB: find user_identity by (tenant, type, identifier_hash)
    alt existing user
        Engine->>DB: update credential (refresh token)
        Engine-->>Host: existing user → session
    else new user
        Engine->>DB: create user + identity + credential
        Engine-->>Host: new user → session
    end
    Host-->>Client: 302 redirect (with session token)
```

### 3.3 비밀번호 재설정

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant Host
    participant Engine
    participant Email as Email Service

    User->>Client: "비밀번호 잊음" 클릭
    Client->>Host: POST /auth/password/reset {email}
    Host->>Engine: engine.password.reset.request({email})
    Engine->>Engine: rate limit check
    Engine->>DB: find user by (tenant, email)
    alt user exists
        Engine->>Engine: generate reset token
        Engine->>DB: insert password_reset
        Engine->>Email: send reset email (link with token)
    else user not exists
        Note over Engine: 응답 시간 동일하게 (계정 enumeration 방지)
        Engine->>Engine: fake work (HMAC dummy)
    end
    Engine-->>Host: success (no user enumeration)
    Host-->>Client: 200 OK

    User->>Client: 이메일 링크 클릭
    Client->>Host: POST /auth/password/reset/confirm {token, newPassword}
    Host->>Engine: engine.password.reset.confirm({token, newPassword})
    Engine->>DB: find reset by token_hash
    alt valid
        Engine->>Engine: validate new password against policy + history
        Engine->>DB: update password credential
        Engine->>DB: insert password_history
        Engine->>DB: revoke all sessions (reason: password_changed)
        Engine->>Engine: send notification email
        Engine-->>Host: success
    else invalid
        Engine-->>Host: error
    end
```

---

## 4. Multi-Tenant 격리 시각화

```mermaid
flowchart LR
    subgraph T1["Tenant A (회사 A)"]
        T1U[users]:::t1
        T1I[user_identities]:::t1
        T1P[security_policies]:::t1
        T1C[credentials]:::t1
        T1S[sessions]:::t1
    end

    subgraph T2["Tenant B (회사 B)"]
        T2U[users]:::t2
        T2I[user_identities]:::t2
        T2P[security_policies]:::t2
        T2C[credentials]:::t2
        T2S[sessions]:::t2
    end

    DB[(Postgres + RLS)]:::db
    T1U --> DB
    T2U --> DB
    DB -.->|RLS: tenant_id = current_setting| T1U
    DB -.->|RLS: tenant_id = current_setting| T2U

    classDef t1 fill:#fef3c7,stroke:#d97706
    classDef t2 fill:#dbeafe,stroke:#2563eb
    classDef db fill:#e5e7eb,stroke:#374151
```

**격리 메커니즘**:
1. 모든 테이블에 `tenant_id` 컬럼
2. RLS로 `tenant_id = current_setting('app.current_tenant_id')` 강제
3. 호스트가 매 요청마다 `SET LOCAL app.current_tenant_id = '...'`
4. 엔진 코드도 모든 쿼리에 `tenant_id` 명시 (Defense in Depth)

---

## 5. 데이터 흐름 (Identity Engine ↔ Universal Core ↔ 호스트)

```mermaid
flowchart TB
    subgraph Core["Universal Core"]
        Tenants[tenants]
        EventBus[EventBus]
        EntityStore[IEntityStore]
        TenantResolver[ITenantResolver]
    end

    subgraph Engine["Identity Engine"]
        EngineAPI[Engine API]
        UseCases[Use Cases]
        Repos[Repositories]
        Providers[OAuth Providers]
        Crypto[Crypto Module]
        Audit[Audit Writer]
    end

    subgraph Host["호스트 (Hono/Next)"]
        H_Routes[HTTP Routes]
        H_Adapter[Adapter]
    end

    subgraph Infra["Infrastructure (호스트 제공)"]
        DB[(Postgres)]
        Cache[(Redis)]
        KMS[(KMS)]
        SMTP[SMTP]
        SMS[SMS]
    end

    Tenants --> TenantResolver
    TenantResolver --> H_Routes
    H_Routes --> H_Adapter
    H_Adapter --> EngineAPI
    EngineAPI --> UseCases
    UseCases --> Repos
    Repos --> EntityStore
    EntityStore --> DB
    UseCases --> Audit
    Audit --> EventBus
    UseCases --> Crypto
    Crypto --> KMS
    UseCases --> Providers
    Providers --> SMTP
    Providers --> SMS
    UseCases --> Cache
```

---

## 6. OAuth Provider Plugin 구조

```mermaid
classDiagram
    class AuthProvider {
        <<interface>>
        +id: string
        +type: AuthProviderType
        +initiate(state) RedirectResult
        +callback(req) ProviderIdentity
        +refresh?(token) ProviderTokens
        +revoke?(token) void
        +verifyIdToken?(token) ProviderIdentity
    }

    class GoogleProvider {
        +id: 'google'
        +type: 'oauth_google'
        +initiate(state)
        +callback(req)
        +refresh(token)
        +revoke(token)
        +verifyIdToken(token)
    }

    class AppleProvider {
        +id: 'apple'
        +type: 'oauth_apple'
        +initiate(state)
        +callback(req)
        +verifyIdToken(token)
    }

    class KakaoProvider {
        +id: 'kakao'
        +type: 'oauth_kakao'
        +initiate(state)
        +callback(req)
    }

    class ProviderRegistry {
        -providers: Map~string, AuthProvider~
        +register(provider)
        +get(id) AuthProvider
        +list() AuthProvider[]
    }

    AuthProvider <|.. GoogleProvider
    AuthProvider <|.. AppleProvider
    AuthProvider <|.. KakaoProvider
    ProviderRegistry --> AuthProvider
```

**새 Provider 추가 시**:
1. `providers/<name>/index.ts` 작성
2. `providers/<name>/manifest.ts` 작성
3. `ProviderRegistry.register()` 호출 (1줄)
4. 기존 코드 0줄 수정

---

## 7. 정책 평가 흐름

```mermaid
flowchart LR
    A[Login Request] --> B{Auth Provider<br/>enabled?}
    B -->|No| Z1[Reject]
    B -->|Yes| C{Rate Limit OK?}
    C -->|No| Z2[RateLimitedError]
    C -->|Yes| D{CAPTCHA required?}
    D -->|Yes| E[CAPTCHA verify]
    E -->|Fail| Z3[CaptchaFailedError]
    E -->|Pass| F
    D -->|No| F[Verify Password/Credential]
    F -->|Fail| Z4[AuthFailedError +<br/>Audit emit]
    F -->|Pass| G{Account locked?}
    G -->|Yes| Z5[AccountLockedError]
    G -->|No| H{Verification required?}
    H -->|Yes| Z6[VerificationRequired]
    H -->|No| I{2FA required?}
    I -->|Yes| Z7[2FA Challenge]
    I -->|No| J[Success]
    J --> K[Create Session]
    K --> L[Audit emit]
```

---

## 8. [TBD: 사장님 확립 필요]

| 항목 | 기본 제안 |
|---|---|
| ERD 도구 | Mermaid (GitHub/문서 호환) |
| PlantUML 등 추가 도구 | 불필요 (Mermaid로 충분) |
| 시각화 깊이 (상세/축약) | 본 문서는 Master + 상세 시퀀스 + 정책 흐름 모두 포함 |

---

**End of ERD v1.0**