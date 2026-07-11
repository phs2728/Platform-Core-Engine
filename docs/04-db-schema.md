# Identity Engine — Database Schema

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [03-domain-model.md](./03-domain-model.md)
**Engine Target**: PostgreSQL 15+

---

## 0. 문서 위치

이 문서는 **엔진이 사용하는 모든 테이블**의 DDL 명세를 제공합니다.

- **DDL 파일**: `db/schema.sql` (이 문서에서 생성)
- **마이그레이션 도구**: 호스트가 결정 (예: `drizzle-kit`, `prisma migrate`, `dbmate`, `sqlx`)
- **테스트 DB**: 각 PR마다 깨끗한 schema로 E2E 검증

---

## 1. 설계 원칙

### 1.1 사장님 확립 원칙

```
1. Industry Agnostic — 절대 금지 단어가 테이블/컬럼명에 등장하지 않음
2. Multi-Tenant First — 모든 테이블은 tenant_id 보유
3. Soft Delete Optional — Audit Log는 hard-only, 나머지는 soft delete (deleted_at)
4. Audit Columns — created_at, updated_at, created_by, updated_by
5. UUID v7 Primary Key — 시간 정렬 + 분산 친화
6. Append-Only Tables — audit_logs는 UPDATE/DELETE 불가
```

### 1.2 추가 결정

| 결정 | 이유 |
|---|---|
| 모든 금액/시간 컬럼 없음 | 인증 도메인에는 측정값이 없음 |
| 모든 좌표/지리 정보 없음 | 인증 도메인은 위치 무관 |
| Industry 관련 컬럼 없음 | Industry Agnostic 보장 |
| i18n 컬럼 없음 | Identity Engine은 메시지 ID만 반환, 텍스트는 호스트 |

### 1.3 명명 규칙 (사장님 헌법 §5 Naming Convention 상속)

- **테이블**: `snake_case`, **복수형** (`users`, `sessions`)
- **컬럼**: `snake_case`
- **FK**: `<referenced_table_singular>_id` (`user_id`, `tenant_id`)
- **PK**: `id` (UUID)
- **시각**: `*_at` 접미사 (`created_at`, `expires_at`)
- **Boolean**: `is_*` 또는 `*` 단독 (`enabled`, `verified`)

---

## 2. 핵심 패턴

### 2.1 Multi-Tenancy 패턴

**Shared Schema + Tenant ID + RLS** (Postgres Row Level Security):

```sql
-- 모든 테이블에 동일 패턴
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

호스트는 **모든 쿼리 전에** `SET app.current_tenant_id = '...'` 를 실행합니다.

엔진은 **모든 쿼리에 `tenant_id`를 명시적으로 포함**합니다 (Defense in depth).

### 2.2 Primary Key (UUID v7)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- 또는 pgcrypto

-- UUID v7은 Postgres 17+ 네이티브. 그 이전은 함수로 생성.
CREATE OR REPLACE FUNCTION uuid_v7() RETURNS uuid AS $$
DECLARE
  ts_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  rand bytea := gen_random_bytes(10);
  bytes bytea;
BEGIN
  bytes := decode(lpad(to_hex(ts_ms), 12, '0'), 'hex') || rand;
  -- Version 7 + Variant bits
  bytes := set_byte(bytes, 6, (get_byte(bytes, 6) & 15) | 112);
  bytes := set_byte(bytes, 8, (get_byte(bytes, 8) & 63) | 128);
  RETURN encode(bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;
```

[UUID v7 네이티브는 Postgres 17+. 이전 버전은 위 함수 사용 — 사장님 확립 시 결정]

### 2.3 Updated At 자동 갱신

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 사용
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

### 2.4 Append-Only (audit_logs)

```sql
-- UPDATE / DELETE 차단
CREATE OR REPLACE FUNCTION audit_log_no_modify() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();
```

---

## 3. 테이블 정의

### 3.1 `users`

```sql
CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id         uuid NOT NULL,                              -- FK to Universal Core tenants
  status            text NOT NULL DEFAULT 'pending_verification'
                      CHECK (status IN ('pending_verification', 'active', 'locked', 'disabled')),
  last_login_at     timestamptz,
  locked_until      timestamptz,
  locked_reason     text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,        -- 자유 확장용 (인증 책임 외 데이터 ❌)
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at        timestamptz,                                -- soft delete
  version           bigint NOT NULL DEFAULT 1,                  -- optimistic locking

  CONSTRAINT users_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE INDEX idx_users_tenant_status ON users (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_tenant_created ON users (tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_locked_until ON users (locked_until) WHERE locked_until IS NOT NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

**컬럼 설명**:

| 컬럼 | 용도 |
|---|---|
| `id` | UUID v7 |
| `tenant_id` | 어느 회사에 속하는가 |
| `status` | `pending_verification` / `active` / `locked` / `disabled` |
| `last_login_at` | 마지막 로그인 (성공) |
| `locked_until` | 자동 잠금 해제 시각 |
| `locked_reason` | 잠금 사유 코드 |
| `metadata` | 인증 책임 외의 작은 데이터 저장 (예: 첫 가입 채널). **PII 금지** |
| `version` | 낙관적 잠금 |

> **절대 추가하지 말 것**: `name`, `email` (이건 user_identities로), `phone`, `address`, `avatar_url`, `birthday`

---

### 3.2 `user_identities`

```sql
CREATE TABLE user_identities (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  type                text NOT NULL
                        CHECK (type IN ('email', 'phone', 'username', 'oauth_subject')),
  identifier          bytea NOT NULL,                          -- 결정적 암호화 (AES-SIV)
  identifier_hash     bytea NOT NULL,                          -- HMAC-SHA256 (검색용, 키 분리)
  verified            boolean NOT NULL DEFAULT false,
  verified_at         timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at          timestamptz,

  CONSTRAINT user_identities_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT user_identities_user_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- (tenant_id, type, identifier_hash)는 활성 identity에 대해 unique
CREATE UNIQUE INDEX uniq_user_identities_active
  ON user_identities (tenant_id, type, identifier_hash)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_identities_user ON user_identities (user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_identities
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON user_identities
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

**컬럼 설명**:

| 컬럼 | 용도 |
|---|---|
| `identifier` | 결정적 암호화된 값 (복호화 가능) |
| `identifier_hash` | HMAC-SHA256 (검색 전용, 키 분리) |
| `verified` | 본인 확인 완료 (이메일 링크 클릭, SMS 코드 확인 등) |

> **검색 흐름**: 로그인 시 `identifier` 입력 → `normalize()` → `hmacSha256()` → `identifier_hash`로 `SELECT`.

---

### 3.3 `auth_providers`

```sql
CREATE TABLE auth_providers (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  type                text NOT NULL,                            -- AuthProviderType enum
  enabled             boolean NOT NULL DEFAULT false,
  config              jsonb NOT NULL DEFAULT '{}'::jsonb,      -- type별 세부 설정
  display_name        text,                                     -- UI 표시용 (선택)
  display_order       integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at          timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT auth_providers_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT auth_providers_type_chk CHECK (type IN (
    'email', 'phone', 'username',
    'oauth_google', 'oauth_apple', 'oauth_facebook',
    'oauth_kakao', 'oauth_naver', 'oauth_line', 'oauth_microsoft',
    'totp'
  ))
);

-- 같은 Tenant는 같은 type을 1개만 가질 수 있음 (enabled 여부 무관)
CREATE UNIQUE INDEX uniq_auth_providers_tenant_type
  ON auth_providers (tenant_id, type);

CREATE INDEX idx_auth_providers_tenant_enabled ON auth_providers (tenant_id, enabled);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON auth_providers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE auth_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON auth_providers
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

**config JSONB 예시**:

```json
// email
{
  "passwordPolicy": {
    "minLength": 12,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumber": true,
    "requireSpecial": true
  },
  "requireVerification": false
}

// oauth_google
{
  "scopes": ["openid", "email", "profile"],
  "clientIdRef": "uuid-of-tenant-credential",
  "clientSecretRef": "uuid-of-tenant-credential",
  "redirectUri": "https://app.example.com/auth/callback/google"
}
```

---

### 3.4 `credentials`

```sql
CREATE TABLE credentials (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  type                text NOT NULL
                        CHECK (type IN ('password', 'oauth', 'totp')),
  secret_hash         text,                                     -- Argon2id 포맷
  oauth_tokens_enc    bytea,                                    -- AES-256-GCM 암호화된 OAuthTokens JSON
  oauth_subject       text,                                     -- 'google:108012345678901234567'
  oauth_provider      text,                                     -- 'oauth_google', 'oauth_apple', ...
  last_used_at        timestamptz,
  expires_at          timestamptz,                              -- password expiration
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at          timestamptz,

  CONSTRAINT credentials_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT credentials_user_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- Password Credential은 User당 1개
CREATE UNIQUE INDEX uniq_credentials_password_per_user
  ON credentials (user_id) WHERE type = 'password' AND deleted_at IS NULL;

-- OAuth Credential은 (provider, subject) 조합 unique
CREATE UNIQUE INDEX uniq_credentials_oauth_subject
  ON credentials (tenant_id, oauth_provider, oauth_subject)
  WHERE type = 'oauth' AND deleted_at IS NULL;

-- TOTP Credential은 User당 1개
CREATE UNIQUE INDEX uniq_credentials_totp_per_user
  ON credentials (user_id) WHERE type = 'totp' AND deleted_at IS NULL;

CREATE INDEX idx_credentials_user_type ON credentials (user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_credentials_expires ON credentials (expires_at) WHERE expires_at IS NOT NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON credentials
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 3.5 `password_history`

```sql
CREATE TABLE password_history (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  secret_hash         text NOT NULL,                            -- Argon2id
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT password_history_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT password_history_user_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_history_user_created
  ON password_history (user_id, created_at DESC);

ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON password_history
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

> 비밀번호 변경 시 최근 N개의 해시를 보관하여 재사용 방지. Tenant 정책(`passwordHistoryCount`)에 따라 보관 기간/개수 결정.

---

### 3.6 `sessions`

```sql
CREATE TABLE sessions (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  token_hash          text NOT NULL UNIQUE,                      -- SHA-256(token)
  device_fingerprint  text,
  ip_address          inet,
  user_agent          text,
  country             text,                                      -- GeoIP 추정 (2글자 ISO)
  is_suspicious       boolean NOT NULL DEFAULT false,
  remember_me         boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_active_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at          timestamptz NOT NULL,
  revoked_at          timestamptz,
  revoked_reason      text
                        CHECK (revoked_reason IS NULL OR revoked_reason IN (
                          'user_logout', 'admin_force_logout',
                          'password_changed', 'suspicious_activity',
                          'expired', 'user_disabled'
                        )),

  CONSTRAINT sessions_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT sessions_user_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_active ON sessions (user_id)
  WHERE revoked_at IS NULL AND expires_at > clock_timestamp();
CREATE INDEX idx_sessions_tenant_active ON sessions (tenant_id)
  WHERE revoked_at IS NULL AND expires_at > clock_timestamp();
CREATE INDEX idx_sessions_expires ON sessions (expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sessions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 3.7 `verification_tokens`

```sql
CREATE TABLE verification_tokens (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid,                                     -- nullable: 가입 전 단계
  identity_id         uuid,
  type                text NOT NULL
                        CHECK (type IN ('email_verification', 'sms_verification',
                                        'totp_challenge', 'passwordless_login')),
  channel             text NOT NULL CHECK (channel IN ('email', 'sms')),
  target              text NOT NULL,                            -- 마스킹 권장 (e.g. "t***@example.com")
  code_hash           text NOT NULL,                            -- SHA-256(code + secretPepper)
  attempts            integer NOT NULL DEFAULT 0,
  max_attempts        integer NOT NULL,
  expires_at          timestamptz NOT NULL,
  consumed_at         timestamptz,
  ip_address          inet,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT verification_tokens_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT
);

-- (channel, target, type)에 대해 active 토큰은 1개
CREATE UNIQUE INDEX uniq_verification_active
  ON verification_tokens (channel, target, type)
  WHERE consumed_at IS NULL;

CREATE INDEX idx_verification_expires ON verification_tokens (expires_at)
  WHERE consumed_at IS NULL;
CREATE INDEX idx_verification_tenant_type ON verification_tokens (tenant_id, type);

ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON verification_tokens
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 3.8 `password_resets`

```sql
CREATE TABLE password_resets (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  identity_id         uuid NOT NULL,
  token_hash          text NOT NULL UNIQUE,                     -- SHA-256(token)
  channel             text NOT NULL CHECK (channel IN ('email', 'sms')),
  target              text NOT NULL,
  expires_at          timestamptz NOT NULL,
  consumed_at         timestamptz,
  ip_address          inet,
  user_agent          text,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT password_resets_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT password_resets_user_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_resets_user_active ON password_resets (user_id)
  WHERE consumed_at IS NULL;
CREATE INDEX idx_password_resets_expires ON password_resets (expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON password_resets
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 3.9 `security_policies`

```sql
CREATE TABLE security_policies (
  tenant_id                          uuid PRIMARY KEY
                                          REFERENCES tenants(id) ON DELETE CASCADE,

  -- Password
  password_min_length                integer NOT NULL DEFAULT 12 CHECK (password_min_length >= 8),
  password_require_uppercase         boolean NOT NULL DEFAULT true,
  password_require_lowercase         boolean NOT NULL DEFAULT true,
  password_require_number            boolean NOT NULL DEFAULT true,
  password_require_special           boolean NOT NULL DEFAULT true,
  password_expiration_days           integer CHECK (password_expiration_days IS NULL OR password_expiration_days > 0),
  password_history_count             integer NOT NULL DEFAULT 5 CHECK (password_history_count >= 0),

  -- Lock & Failure
  login_max_failures                 integer NOT NULL DEFAULT 5 CHECK (login_max_failures > 0),
  lock_duration_minutes              integer NOT NULL DEFAULT 30 CHECK (lock_duration_minutes > 0),
  rate_limit_per_ip_max              integer NOT NULL DEFAULT 5,
  rate_limit_per_ip_window_seconds   integer NOT NULL DEFAULT 900,  -- 15min
  rate_limit_per_identifier_max      integer NOT NULL DEFAULT 10,
  rate_limit_per_identifier_window_seconds integer NOT NULL DEFAULT 900,

  -- Session
  session_timeout_minutes            integer NOT NULL DEFAULT 60
                                          CHECK (session_timeout_minutes BETWEEN 5 AND 10080),
  remember_me_days                   integer NOT NULL DEFAULT 30 CHECK (remember_me_days > 0),
  max_concurrent_sessions            integer CHECK (max_concurrent_sessions IS NULL OR max_concurrent_sessions > 0),

  -- Verification
  require_email_verification         boolean NOT NULL DEFAULT false,
  require_phone_verification         boolean NOT NULL DEFAULT false,
  verification_expiration_minutes    integer NOT NULL DEFAULT 15 CHECK (verification_expiration_minutes > 0),
  verification_max_attempts          integer NOT NULL DEFAULT 5 CHECK (verification_max_attempts > 0),

  -- 2FA
  two_factor_required                boolean NOT NULL DEFAULT false,
  two_factor_methods                 jsonb NOT NULL DEFAULT '["totp"]'::jsonb
                                          CHECK (jsonb_typeof(two_factor_methods) = 'array'),

  -- CAPTCHA
  captcha_enabled                    boolean NOT NULL DEFAULT false,
  captcha_provider                   text CHECK (captcha_provider IS NULL OR captcha_provider IN
                                          ('hcaptcha', 'recaptcha', 'turnstile')),
  captcha_trigger_after_failures     integer NOT NULL DEFAULT 3 CHECK (captcha_trigger_after_failures > 0),

  -- Audit
  audit_retention_days               integer CHECK (audit_retention_days IS NULL OR audit_retention_days > 0),

  -- Verification Flow
  require_admin_approval             boolean NOT NULL DEFAULT false,

  -- Metadata
  updated_at                         timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON security_policies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON security_policies
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

---

### 3.10 `audit_logs`

```sql
CREATE TABLE audit_logs (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid,                                     -- nullable: 비인증 액션
  session_id          uuid,
  event_type          text NOT NULL,                            -- 'auth.login.success' 등
  ip_address          inet,
  user_agent          text,
  result              text NOT NULL CHECK (result IN ('success', 'failure')),
  reason              text,                                     -- 실패 사유 코드
  context             jsonb NOT NULL DEFAULT '{}'::jsonb,       -- PII 금지
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  hash                text NOT NULL,                            -- SHA-256 체인
  prev_hash           text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Append-Only 트리거
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();

CREATE INDEX idx_audit_logs_tenant_created ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs (event_type, created_at DESC);
CREATE INDEX idx_audit_logs_session ON audit_logs (session_id) WHERE session_id IS NOT NULL;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- SELECT only (호스트가 명시적으로 tenant 설정 후)
CREATE POLICY tenant_isolation_select ON audit_logs
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
-- INSERT는 RLS 우회 (system context)
CREATE POLICY audit_logs_system_insert ON audit_logs
  FOR INSERT WITH CHECK (true);
```

**Append-Only 보호**: 트리거가 UPDATE/DELETE를 차단합니다. 호스트는 cleanup 시 `DELETE FROM audit_logs WHERE ...`가 실패함을 인지하고, **TTL 만료 후에도 보존** (또는 admin 역할이 별도 보관 정책에 따라 처리).

---

### 3.11 `tenant_credentials`

```sql
CREATE TABLE tenant_credentials (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  purpose             text NOT NULL,                            -- CredentialPurpose enum
  name                text NOT NULL,                            -- 표시용 이름
  encrypted_payload   bytea NOT NULL,                           -- AES-256-GCM
  key_id              text NOT NULL,                            -- KMS 키 ID
  iv                  bytea NOT NULL,                           -- GCM nonce (12 bytes)
  auth_tag            bytea NOT NULL,                           -- GCM auth tag (16 bytes)
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at          timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT tenant_credentials_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT tenant_credentials_purpose_chk CHECK (purpose IN (
    'oauth_google', 'oauth_apple', 'oauth_facebook',
    'oauth_kakao', 'oauth_naver', 'oauth_line', 'oauth_microsoft',
    'smtp_credentials', 'sms_credentials',
    'openai_api_key', 'anthropic_api_key',
    'custom_webhook'
  ))
);

CREATE UNIQUE INDEX uniq_tenant_credentials ON tenant_credentials (tenant_id, purpose, name);
CREATE INDEX idx_tenant_credentials_expires ON tenant_credentials (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenant_credentials
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ⚠️ 매우 민감한 테이블. SELECT만 허용, INSERT/UPDATE는 application role만
ALTER TABLE tenant_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_credentials_select ON tenant_credentials
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
-- INSERT/UPDATE/DELETE는 application role 권한으로 (RLS bypass)
```

---

## 4. 인덱스 전략

### 4.1 인덱스 원칙

| 인덱스 종류 | 언제 |
|---|---|
| PK | 모든 테이블 |
| Tenant ID + 상태 | 모든 multi-tenant 테이블 (`(tenant_id, status)`, `(tenant_id, created_at DESC)`) |
| 검색용 | `user_identities.identifier_hash`, `credentials.oauth_subject` |
| Unique 제약 | 도메인 invariant 보장 (`(tenant_id, type, identifier_hash)`) |
| 부분 인덱스 | 활성 레코드만 (`WHERE deleted_at IS NULL AND revoked_at IS NULL`) |

### 4.2 인덱스 목록

위 DDL에 모두 포함됨. 추가로 성능 인덱스는 [D-CONFIG Scalability](./15-identity-decisions.md#11-configuration-policy) 참조.

| 인덱스 | 용도 |
|---|---|
| `idx_sessions_token_hash` | session 검증 (이미 UNIQUE) |
| `idx_credentials_tenant_provider_subject` | OAuth 로그인 (이미 UNIQUE) |
| `idx_user_identities_tenant_type_hash` | 식별자 검색 (이미 UNIQUE) |

---

## 5. RLS (Row Level Security) 정책

### 5.1 원칙

```
- 모든 테이블에 tenant_id 컬럼 + RLS 활성화
- 호스트는 쿼리 전 SET LOCAL app.current_tenant_id = '...'
- 엔진도 모든 쿼리에 tenant_id 명시 (Defense in Depth)
- 예외: audit_logs INSERT는 system context (RLS bypass)
```

### 5.2 Tenant Context 설정

```sql
-- 호스트가 매 요청마다 실행
SET LOCAL app.current_tenant_id = '00000000-0000-0000-0000-000000000000';

-- 트랜잭션 내에서만 유효
BEGIN;
SET LOCAL app.current_tenant_id = '<tenant-uuid>';
-- queries...
COMMIT;
```

### 5.3 Audit Logs (Append-Only) 정책

- SELECT: RLS 적용 (tenant_id 기반)
- INSERT: RLS 우회 (system context)
- UPDATE/DELETE: 트리거로 차단

### 5.4 Tenant Credentials (매우 민감) 정책

- SELECT: RLS 적용 (tenant_id 기반)
- INSERT/UPDATE/DELETE: application role만 (RLS bypass)

---

## 6. 마이그레이션 전략

### 6.1 원칙

```
- 모든 마이그레이션은 순방향 + 역방향 가능
- 마이그레이션 파일은 절대 수정하지 않음 (새 파일 추가)
- 호스트는 마이그레이션 도구 선택 (drizzle-kit, prisma migrate, dbmate, sqlx, knex, raw sql)
```

### 6.2 디렉토리 구조 (호스트가 생성)

```
db/
  migrations/
    0001_create_users.sql
    0002_create_user_identities.sql
    0003_create_auth_providers.sql
    0004_create_credentials.sql
    0005_create_password_history.sql
    0006_create_sessions.sql
    0007_create_verification_tokens.sql
    0008_create_password_resets.sql
    0009_create_security_policies.sql
    0010_create_audit_logs.sql
    0011_create_tenant_credentials.sql
    0012_create_uuid_v7_function.sql
    0013_create_updated_at_trigger.sql
    0014_create_audit_no_modify_trigger.sql
```

> **엔진은 마이그레이션 파일을 제공하지 않습니다.** 엔진은 **DDL 명세**(`db/schema.sql`)와 **스키마 명세서**(이 문서)만 제공합니다. 실제 마이그레이션은 호스트가 자기 도구에 맞게 작성/실행합니다.

---

## 7. 엔진이 직접 쿼리하지 않는 테이블

Identity Engine은 **이 11개 테이블만** 직접 다룹니다.

다음은 **Universal Core 또는 다른 엔진이 소유**하며, Identity Engine은 FK 참조만 합니다:

- `tenants` — Universal Core
- (다른 모든 도메인 테이블)

> Identity Engine이 `SELECT FROM tenants`를 직접 실행하지 않습니다. TenantResolver가 tenant 객체를 반환하면 그 안의 `tenantId`만 사용합니다.

---

## 8. ERD 시각화

자세한 ERD는 `05-erd.md`.

---

## 9. Industry Agnostic 검증 체크리스트

PRD §2.1의 절대 금지 단어가 **이 스키마에 한 번도 등장하지 않음을** 확인:

```
□ tour      ❌ (등장 안 함)
□ booking   ❌
□ hotel     ❌
□ restaurant ❌
□ order     ❌
□ product   ❌
□ payment   ❌
□ passport  ❌
□ travel_history ❌
```

✅ **이 스키마는 Industry Agnostic 검증을 통과합니다.**

---

## 10. 미결정 사항

**모든 미결정 사항은 [`15-identity-decisions.md`](./15-identity-decisions.md)에 canonical로 정리되어 있습니다.**

이 문서에서는 더 이상 미결정 항목을 다루지 않습니다.

---