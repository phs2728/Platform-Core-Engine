-- =====================================================================
-- Identity Engine v1.0 — Complete Database Schema
-- 사장님 확립, 2026-07-11
-- Industry Agnostic. Multi-Tenant. Append-Only Audit.
--
-- Engine: PostgreSQL 15+
-- Companion: docs/04-db-schema.md
--
-- 호스트는 이 파일을 그대로 실행하거나, 자기 마이그레이션 도구로 변환.
-- Universal Core의 `tenants` 테이블이 미리 존재해야 함 (FK 의존).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Prerequisites
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_bytes()

-- ---------------------------------------------------------------------
-- 1. Helper Functions
-- ---------------------------------------------------------------------

-- UUID v7 (time-ordered). Postgres 17+는 네이티브 지원 — 이 함수는 15/16 호환.
CREATE OR REPLACE FUNCTION uuid_v7() RETURNS uuid AS $$
DECLARE
  ts_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  rand bytea := gen_random_bytes(10);
  bytes bytea;
BEGIN
  bytes := decode(lpad(to_hex(ts_ms), 12, '0'), 'hex') || rand;
  bytes := set_byte(bytes, 6, (get_byte(bytes, 6) & 15) | 112);  -- version 7
  bytes := set_byte(bytes, 8, (get_byte(bytes, 8) & 63) | 128);  -- variant 10
  RETURN encode(bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION trigger_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- audit_logs append-only 강제 함수
CREATE OR REPLACE FUNCTION audit_log_no_modify() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (UPDATE/DELETE forbidden)';
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 2. users
-- 인증된 신원의 인덱스. Profile 정보는 절대 저장하지 않는다.
-- ---------------------------------------------------------------------

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id         uuid NOT NULL,
  status            text NOT NULL DEFAULT 'pending_verification'
                      CHECK (status IN ('pending_verification', 'active', 'locked', 'disabled')),
  last_login_at     timestamptz,
  locked_until      timestamptz,
  locked_reason     text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at        timestamptz,
  version           bigint NOT NULL DEFAULT 1,

  CONSTRAINT users_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT
);

CREATE INDEX idx_users_tenant_status ON users (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_tenant_created ON users (tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_locked_until ON users (locked_until) WHERE locked_until IS NOT NULL;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 3. user_identities
-- User가 가진 신원. 검색은 identifier_hash, 평문 필요 시 identifier 복호화.
-- ---------------------------------------------------------------------

CREATE TABLE user_identities (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  type                text NOT NULL
                        CHECK (type IN ('email', 'phone', 'username', 'oauth_subject')),
  identifier          bytea NOT NULL,                  -- 결정적 암호화 (AES-SIV)
  identifier_hash     bytea NOT NULL,                  -- HMAC-SHA256 (검색용, 키 분리)
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

CREATE UNIQUE INDEX uniq_user_identities_active
  ON user_identities (tenant_id, type, identifier_hash)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_identities_user ON user_identities (user_id) WHERE deleted_at IS NULL;

CREATE TRIGGER set_updated_at_user_identities BEFORE UPDATE ON user_identities
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_user_identities ON user_identities
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 4. auth_providers
-- Tenant가 활성화한 인증 제공자.
-- ---------------------------------------------------------------------

CREATE TABLE auth_providers (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  type                text NOT NULL,
  enabled             boolean NOT NULL DEFAULT false,
  config              jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_name        text,
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

-- (tenant_id, type)은 unique. enabled 여부와 무관.
CREATE UNIQUE INDEX uniq_auth_providers_tenant_type
  ON auth_providers (tenant_id, type);

CREATE INDEX idx_auth_providers_tenant_enabled ON auth_providers (tenant_id, enabled);

CREATE TRIGGER set_updated_at_auth_providers BEFORE UPDATE ON auth_providers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE auth_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_auth_providers ON auth_providers
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 5. credentials
-- User가 가진 실제 인증 수단. 비밀번호 해시 또는 OAuth 토큰.
-- ---------------------------------------------------------------------

CREATE TABLE credentials (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  type                text NOT NULL
                        CHECK (type IN ('password', 'oauth', 'totp')),
  secret_hash         text,                              -- Argon2id ($argon2id$...)
  oauth_tokens_enc    bytea,                             -- AES-256-GCM encrypted JSON
  oauth_subject       text,                              -- 'google:108012345678901234567'
  oauth_provider      text,                              -- 'oauth_google' 등
  last_used_at        timestamptz,
  expires_at          timestamptz,
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

-- OAuth Credential은 (tenant, provider, subject) unique
CREATE UNIQUE INDEX uniq_credentials_oauth_subject
  ON credentials (tenant_id, oauth_provider, oauth_subject)
  WHERE type = 'oauth' AND deleted_at IS NULL;

-- TOTP Credential은 User당 1개
CREATE UNIQUE INDEX uniq_credentials_totp_per_user
  ON credentials (user_id) WHERE type = 'totp' AND deleted_at IS NULL;

CREATE INDEX idx_credentials_user_type ON credentials (user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_credentials_expires ON credentials (expires_at) WHERE expires_at IS NOT NULL;

CREATE TRIGGER set_updated_at_credentials BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_credentials ON credentials
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 6. password_history
-- 비밀번호 재사용 방지용. 최근 N개 해시 보관.
-- ---------------------------------------------------------------------

CREATE TABLE password_history (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  secret_hash         text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp(),

  CONSTRAINT password_history_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE RESTRICT,
  CONSTRAINT password_history_user_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_history_user_created
  ON password_history (user_id, created_at DESC);

ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_password_history ON password_history
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 7. sessions
-- 활성 세션. token 평문은 클라이언트에만, DB에는 해시만.
-- ---------------------------------------------------------------------

CREATE TABLE sessions (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  token_hash          text NOT NULL UNIQUE,
  device_fingerprint  text,
  ip_address          inet,
  user_agent          text,
  country             text,
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
CREATE POLICY tenant_isolation_sessions ON sessions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 8. verification_tokens
-- 이메일/SMS 인증 코드.
-- ---------------------------------------------------------------------

CREATE TABLE verification_tokens (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid,
  identity_id         uuid,
  type                text NOT NULL
                        CHECK (type IN ('email_verification', 'sms_verification',
                                        'totp_challenge', 'passwordless_login')),
  channel             text NOT NULL CHECK (channel IN ('email', 'sms')),
  target              text NOT NULL,
  code_hash           text NOT NULL,
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

CREATE UNIQUE INDEX uniq_verification_active
  ON verification_tokens (channel, target, type)
  WHERE consumed_at IS NULL;

CREATE INDEX idx_verification_expires ON verification_tokens (expires_at)
  WHERE consumed_at IS NULL;
CREATE INDEX idx_verification_tenant_type ON verification_tokens (tenant_id, type);

ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_verification_tokens ON verification_tokens
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 9. password_resets
-- 비밀번호 재설정 토큰.
-- ---------------------------------------------------------------------

CREATE TABLE password_resets (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid NOT NULL,
  identity_id         uuid NOT NULL,
  token_hash          text NOT NULL UNIQUE,
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
CREATE POLICY tenant_isolation_password_resets ON password_resets
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 10. security_policies
-- Tenant당 1개. 모든 보안 정책의 SSoT.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 사장님 헌법 §C-15 (Zero Business Logic in Database) 적용
-- 보안 정책의 DEFAULT 값은 DB에 두지 않는다.
-- 모든 정책 값은 Policy Engine (engines/policy/) 경유로 application이 명시.
-- 기술 필드 (id, version, updated_at)만 DEFAULT.
-- ---------------------------------------------------------------------

CREATE TABLE security_policies (
  tenant_id                              uuid PRIMARY KEY
                                              REFERENCES tenants(id) ON DELETE CASCADE,

  -- Password (정책 값 — DEFAULT 없음, C-15)
  password_min_length                    integer NOT NULL CHECK (password_min_length >= 8),
  password_require_uppercase             boolean NOT NULL,
  password_require_lowercase             boolean NOT NULL,
  password_require_number                boolean NOT NULL,
  password_require_special               boolean NOT NULL,
  password_expiration_days               integer CHECK (password_expiration_days IS NULL OR password_expiration_days > 0),
  password_history_count                 integer NOT NULL CHECK (password_history_count >= 0),

  -- Lock & Failure (정책 값 — DEFAULT 없음, C-15)
  login_max_failures                     integer NOT NULL CHECK (login_max_failures > 0),
  lock_duration_minutes                  integer NOT NULL CHECK (lock_duration_minutes > 0),
  rate_limit_per_ip_max                  integer NOT NULL,
  rate_limit_per_ip_window_seconds       integer NOT NULL,
  rate_limit_per_identifier_max          integer NOT NULL,
  rate_limit_per_identifier_window_seconds integer NOT NULL,

  -- Session (정책 값 — DEFAULT 없음, C-15)
  session_timeout_minutes                integer NOT NULL
                                              CHECK (session_timeout_minutes BETWEEN 5 AND 10080),
  remember_me_days                       integer NOT NULL CHECK (remember_me_days > 0),
  max_concurrent_sessions                integer CHECK (max_concurrent_sessions IS NULL OR max_concurrent_sessions > 0),

  -- Verification (정책 값 — DEFAULT 없음, C-15)
  require_email_verification             boolean NOT NULL,
  require_phone_verification             boolean NOT NULL,
  verification_expiration_minutes        integer NOT NULL CHECK (verification_expiration_minutes > 0),
  verification_max_attempts              integer NOT NULL CHECK (verification_max_attempts > 0),

  -- 2FA (정책 값 — DEFAULT 없음, C-15)
  two_factor_required                    boolean NOT NULL,
  two_factor_methods                     jsonb NOT NULL
                                              CHECK (jsonb_typeof(two_factor_methods) = 'array'),

  -- CAPTCHA (정책 값 — DEFAULT 없음, C-15)
  captcha_enabled                        boolean NOT NULL,
  captcha_provider                       text CHECK (captcha_provider IS NULL OR captcha_provider IN
                                              ('hcaptcha', 'recaptcha', 'turnstile')),
  captcha_trigger_after_failures         integer NOT NULL CHECK (captcha_trigger_after_failures > 0),

  -- Audit (정책 값 — DEFAULT 없음, C-15)
  audit_retention_days                   integer CHECK (audit_retention_days IS NULL OR audit_retention_days > 0),

  -- Verification Flow (정책 값 — DEFAULT 없음, C-15)
  require_admin_approval                 boolean NOT NULL,

  updated_at                             timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER set_updated_at_security_policies BEFORE UPDATE ON security_policies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE security_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_security_policies ON security_policies
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 11. audit_logs
-- Append-only. 모든 인증 이벤트 기록. 삭제/수정 불가.
-- ---------------------------------------------------------------------

CREATE TABLE audit_logs (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  user_id             uuid,
  session_id          uuid,
  event_type          text NOT NULL,
  ip_address          inet,
  user_agent          text,
  result              text NOT NULL CHECK (result IN ('success', 'failure')),
  reason              text,
  context             jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  hash                text NOT NULL,
  prev_hash           text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();

CREATE INDEX idx_audit_logs_tenant_created ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs (event_type, created_at DESC);
CREATE INDEX idx_audit_logs_session ON audit_logs (session_id) WHERE session_id IS NOT NULL;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_logs_select ON audit_logs
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY audit_logs_system_insert ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 12. tenant_credentials
-- Tenant의 외부 서비스 자격증명 (OAuth Client Secret, SMTP Password 등).
-- AES-256-GCM으로 암호화. 매우 민감.
-- ---------------------------------------------------------------------

CREATE TABLE tenant_credentials (
  id                  uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id           uuid NOT NULL,
  purpose             text NOT NULL,
  name                text NOT NULL,
  encrypted_payload   bytea NOT NULL,
  key_id              text NOT NULL,
  iv                  bytea NOT NULL,
  auth_tag            bytea NOT NULL,
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

CREATE TRIGGER set_updated_at_tenant_credentials BEFORE UPDATE ON tenant_credentials
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 매우 민감: SELECT만 RLS 적용, INSERT/UPDATE/DELETE는 application role 권한
ALTER TABLE tenant_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_credentials_select ON tenant_credentials
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- End of Identity Engine Schema v1.0
-- ---------------------------------------------------------------------
-- 다음 단계: docs/05-erd.md (ERD 시각화)
-- ---------------------------------------------------------------------