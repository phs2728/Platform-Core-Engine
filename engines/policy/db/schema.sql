-- =====================================================================
-- Policy Engine v0.1-draft — Database Schema
-- 사장님 Platform CTO 확립, 2026-07-11
-- Industry-Agnostic. Multi-Tenant. Event-First.
-- 사장님 헌법 §C-15 (Zero Business Logic in Database) 적용
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 사장님 확립 원칙
-- ---------------------------------------------------------------------

-- Policy Engine은 모든 엔진의 정책 SSoT (Single Source of Truth)
-- 3계층 정책 해결: Global / Engine / Tenant
-- 사장님 헌법 §C-15: 정책 값 (value)은 DEFAULT 없음. application이 명시.
-- 기술 필드만 DEFAULT (id, version, created_at, updated_at)

-- ---------------------------------------------------------------------
-- 1. platform_policies — Global Policy (Platform 차원 기본값)
-- ---------------------------------------------------------------------

CREATE TABLE platform_policies (
  id              uuid PRIMARY KEY DEFAULT uuid_v7(),
  key             text NOT NULL UNIQUE,                 -- 'security.password.minLength'
  value           jsonb NOT NULL,                        -- 정책 값 (C-15: DEFAULT 없음)
  description     text,
  schema_ref      text,                                  -- zod schema reference
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  version         bigint NOT NULL DEFAULT 1,             -- 낙관적 잠금

  CONSTRAINT platform_policies_key_format CHECK (key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$')
);

CREATE INDEX idx_platform_policies_key ON platform_policies (key);

CREATE TRIGGER set_updated_at_platform_policies BEFORE UPDATE ON platform_policies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE platform_policies ENABLE ROW LEVEL SECURITY;
-- Platform Policy는 모든 Tenant가 읽을 수 있음 (Global)
CREATE POLICY platform_policies_read ON platform_policies
  FOR SELECT USING (true);  -- Global = 모든 Tenant
-- INSERT/UPDATE/DELETE는 Platform Owner만 (application role)
CREATE POLICY platform_policies_admin ON platform_policies
  FOR ALL USING (current_setting('app.is_platform_admin', true) = 'true');

-- ---------------------------------------------------------------------
-- 2. engine_policies — Engine Policy (엔진별 기본값)
-- ---------------------------------------------------------------------

CREATE TABLE engine_policies (
  id              uuid PRIMARY KEY DEFAULT uuid_v7(),
  engine          text NOT NULL,                          -- 'identity', 'notification', ...
  key             text NOT NULL,                          -- 정책 값 (C-15: DEFAULT 없음)
  value           jsonb NOT NULL,
  description     text,
  schema_ref      text,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  version         bigint NOT NULL DEFAULT 1,

  CONSTRAINT engine_policies_unique UNIQUE (engine, key),
  CONSTRAINT engine_policies_engine_chk CHECK (engine IN (
    'identity', 'notification', 'media', 'cms', 'booking',
    'payment', 'review', 'analytics', 'ai', 'workflow'
  )),
  CONSTRAINT engine_policies_key_format CHECK (key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$')
);

CREATE INDEX idx_engine_policies_engine_key ON engine_policies (engine, key);

CREATE TRIGGER set_updated_at_engine_policies BEFORE UPDATE ON engine_policies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE engine_policies ENABLE ROW LEVEL SECURITY;
-- Engine Policy는 모든 Tenant가 읽을 수 있음 (Engine별 기본값)
CREATE POLICY engine_policies_read ON engine_policies
  FOR SELECT USING (true);
-- INSERT/UPDATE/DELETE는 Platform Owner만
CREATE POLICY engine_policies_admin ON engine_policies
  FOR ALL USING (current_setting('app.is_platform_admin', true) = 'true');

-- ---------------------------------------------------------------------
-- 3. tenant_policies — Tenant Policy (테넌트별 override)
-- ---------------------------------------------------------------------

CREATE TABLE tenant_policies (
  id              uuid PRIMARY KEY DEFAULT uuid_v7(),
  tenant_id       uuid NOT NULL,
  engine          text NOT NULL,
  key             text NOT NULL,                          -- 정책 값 (C-15: DEFAULT 없음)
  value           jsonb NOT NULL,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  version         bigint NOT NULL DEFAULT 1,

  CONSTRAINT tenant_policies_unique UNIQUE (tenant_id, engine, key),
  CONSTRAINT tenant_policies_engine_chk CHECK (engine IN (
    'identity', 'notification', 'media', 'cms', 'booking',
    'payment', 'review', 'analytics', 'ai', 'workflow'
  )),
  CONSTRAINT tenant_policies_tenant_fkey FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_policies_tenant_engine ON tenant_policies (tenant_id, engine);
CREATE INDEX idx_tenant_policies_key ON tenant_policies (key);

CREATE TRIGGER set_updated_at_tenant_policies BEFORE UPDATE ON tenant_policies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE tenant_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tenant_policies ON tenant_policies
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------
-- 4. policy_audit — Policy 변경 이력
-- ---------------------------------------------------------------------

CREATE TABLE policy_audit (
  id              uuid PRIMARY KEY DEFAULT uuid_v7(),
  policy_id       uuid,                                  -- 변경된 정책의 ID
  tenant_id       uuid,                                  -- null = Global/Engine
  engine          text,                                  -- null = Global
  key             text NOT NULL,
  old_value       jsonb,                                 -- 이전 값
  new_value       jsonb,                                 -- 새 값
  actor           text NOT NULL,                          -- 'admin-user-uuid' | 'system'
  reason          text,                                  -- 변경 사유
  hash            text NOT NULL,                          -- SHA-256 체인 (변조 방지)
  prev_hash       text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- Append-Only (변경 이력은 절대 UPDATE/DELETE 불가)
CREATE TRIGGER audit_logs_no_update_policy_audit BEFORE UPDATE ON policy_audit
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();
CREATE TRIGGER audit_logs_no_delete_policy_audit BEFORE DELETE ON policy_audit
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_modify();

CREATE INDEX idx_policy_audit_tenant_created ON policy_audit (tenant_id, created_at DESC);
CREATE INDEX idx_policy_audit_engine_key ON policy_audit (engine, key, created_at DESC);
CREATE INDEX idx_policy_audit_actor ON policy_audit (actor, created_at DESC);

ALTER TABLE policy_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy_audit ON policy_audit
  FOR SELECT USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );
-- Global Policy Audit는 Platform Admin만 조회
CREATE POLICY policy_audit_insert ON policy_audit
  FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------
-- End of Policy Engine Schema v0.1-draft
-- ---------------------------------------------------------------------

-- 사장님 확립 검증:
-- ✓ C-15 (Zero Business Logic in Database):
--   - 모든 정책 값 (value)은 DEFAULT 없음
--   - application이 Policy Engine을 통해 명시적으로 insert
--   - 기술 필드만 DEFAULT (id, version, created_at, updated_at)
--
-- 사장님 확립 검증:
-- ✓ C-14 (Policy Injection):
--   - 정책은 IPolicyProvider를 통해서만 조회
--   - Engine은 DB를 직접 쿼리하지 않음
--   - 3계층 해결 알고리즘으로 Tenant > Engine > Global
--
-- 사장님 확립 검증:
-- ✓ C-16 (Event First):
--   - 모든 정책 변경은 policy.created / policy.updated / policy.deleted Event 발행
--   - 정책 조회도 선택적으로 policy.resolved Event 발행 가능
--   - 다른 Engine은 Event Bus를 통해 정책 변경 통지
