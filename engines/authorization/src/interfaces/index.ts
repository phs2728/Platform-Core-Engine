/**
 * Authorization Engine — Complete Interfaces
 *
 * 사장님 CTO 확립 (2026-07-11):
 * "RBAC만으로 부족. RBAC + ABAC + Policy + Resource/Tenant Restriction 모두 지원."
 * "Permission Simulator가 반드시 있어야 한다."
 * "Decision Engine이 모든 Resolver를 orchestration 해야 한다."
 * "explain() API가 있어야 한다."
 *
 * 모든 Business Engine (Booking, Payment, CMS, Media 등)이 이 Engine을 통해 권한 확인.
 */

import type { EventEnvelope, Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Permission
// ═══════════════════════════════════════════

/**
 * Permission String 표준 (Platform 전체 통일)
 *
 * Format: {resource}.{action}
 *   - 'booking.create'    ← 표준 (dot notation)
 *   - 'booking.update'
 *   - 'booking.delete'
 *   - 'payment.refund'
 *
 * Wildcard:
 *   - 'booking.*'  = 모든 booking action
 *   - '*.*'        = 모든 권한 (superadmin)
 *   - '*'          = 모든 권한
 *
 * ※ colon notation ('booking:create')는 지원하지 않는다.
 *   Platform 전체에서 dot notation으로 통일.
 */
export interface IPermission {
  id: string;
  tenantId: string;
  key: string; // 'booking.create' (dot notation — 표준)
  description: string;
  resource: string; // 'booking'
  action: string; // 'create' | 'read' | 'update' | 'delete' | '*'
  createdAt: string;
}

// ═══════════════════════════════════════════
// Role
// ═══════════════════════════════════════════

export interface IRole {
  id: string;
  tenantId: string;
  name: string; // 'manager', 'guide', 'customer'
  description: string;
  /** 부모 Role (상속) */
  parentRoleId: string | null;
  isSystem: boolean; // system role (삭제 불가)
  createdAt: string;
  updatedAt: string;
}

/**
 * Role-Permission 매핑
 */
export interface IRolePermission {
  id: string;
  tenantId: string;
  roleId: string;
  permissionKey: string;
  /** 조건 (ABAC) — e.g., "ONLY assigned_resource", "ONLY own_organization" */
  condition: string | null;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Assignment (User ↔ Role)
// ═══════════════════════════════════════════

export interface IRoleAssignment {
  id: string;
  tenantId: string;
  accountId: string;
  roleId: string;
  /** 추가 조건 (ABAC) */
  scope: AssignmentScope | null;
  assignedAt: string;
  assignedBy: string;
  expiresAt: string | null; // Time Restriction
}

export interface AssignmentScope {
  /** 리소스 제한 (e.g., 'resource:item-123') */
  resourceType?: string;
  resourceId?: string;
  /** 커스텀 속성 */
  attributes?: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// Policy (ABAC + Rule-based)
// ═══════════════════════════════════════════

export type PolicyEffect = 'allow' | 'deny';

export interface IPolicy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  effect: PolicyEffect;
  /** 권한 패턴 (e.g., 'booking.*', 'payment.refund') */
  permissionPattern: string;
  /** 조건 (ABAC) — Expression string 또는 구조화된 PolicyCondition */
  condition: PolicyCondition | null;
  priority: number; // 높을수록 우선
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * PolicyCondition — 구조화된 조건 + Expression 지원
 *
 * 기존: resourceType, requireOwnership, attributes, timeRestriction
 * 추가: expression (AST 평가 가능한 일반화된 조건)
 */
export interface PolicyCondition {
  /** 리소스 타입 제한 */
  resourceType?: string;
  /** 리소스 소유자 확인 (accountId === resource.ownerId) */
  requireOwnership?: boolean;
  /** 속성 매칭 */
  attributes?: Record<string, unknown>;
  /** 시간 제한 (e.g., '09:00-18:00') */
  timeRestriction?: { start: string; end: string };
  /**
   * Expression 기반 조건 (일반화된 ABAC)
   *
   * 예: "resource.owner == user.id && resource.status == 'DRAFT' && time.hour < 18"
   *
   * AST로 파싱되어 평가된다. AI Policy 연결 가능.
   */
  expression?: string;
  /** 커스텀 평가 함수 이름 */
  evaluator?: string;
}

// ═══════════════════════════════════════════
// Resource (#2 CTO 리뷰 반영)
// ═══════════════════════════════════════════

/**
 * Resource — 권한 판단의 대상
 *
 * Booking, Order, Payment, Review, Media, CMS 등
 * 모든 Business Entity가 Resource가 될 수 있다.
 */
export interface IResource {
  type: string;      // 'booking', 'payment', 'review', 'media', 'cms'
  id: string;        // 리소스 ID
  ownerId?: string;  // 리소스 소유자 accountId
  tenantId?: string; // 리소스가 속한 테넌트
  attributes?: Record<string, unknown>; // 추가 속성 (status, amount 등)
}

/**
 * 리소스 정의 레지스트리 (선택적 — 리소스 타입 검증용)
 */
export interface IResourceDefinition {
  type: string;
  description: string;
  /** 이 리소스 타입에서 사용하는 권한 목록 */
  permissions: string[];
}

// ═══════════════════════════════════════════
// Decision (권한 확인 결과)
// ═══════════════════════════════════════════

export type Decision = 'allow' | 'deny' | 'conditional';

/**
 * Decision Reason — 왜 이 결정이 내려졌는가 (#6, #8 CTO 리뷰 반영)
 *
 * 고객 문의 대응을 위해 Reason을 반드시 남긴다.
 */
export interface DecisionReason {
  /** 결정 코드 */
  code: ReasonCode;
  /** 사람이 읽을 수 있는 설명 */
  detail: string;
  /** 어떤 Role / Permission / Policy가 영향을 미쳤는지 */
  source: string;
}

export type ReasonCode =
  | 'no_role_assignments'      // Role이 없음
  | 'no_matching_permission'   // Permission이 없음
  | 'condition_not_met'        // ABAC 조건 미충족
  | 'denied_by_policy'         // Policy로 거부
  | 'allowed_by_role'          // Role Permission으로 허용
  | 'allowed_by_policy'        // Policy로 허용
  | 'allowed_unconditional';   // 무조건 허용

export interface AuthorizationDecision {
  decision: Decision;
  /** 왜 이 결정이 내려졌는지 */
  reason: string;
  /** 구조화된 결정 사유 (#6 Audit용, #8 explain()용) */
  reasonDetail: DecisionReason;
  /** 일치한 규칙 */
  matchedRules: string[];
  /** 조건 (conditional일 때) */
  conditions: string[];
  /** 평가 시간 (ms) */
  evaluationTimeMs: number;
}

/**
 * 권한 확인 요청
 */
export interface AuthorizationRequest {
  tenantId: string;
  accountId: string;
  permission: string; // 'booking.create' (dot notation 표준)
  /** 리소스 컨텍스트 (ABAC) */
  resource?: IResource;
  /** 추가 컨텍스트 */
  context?: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// explain() 결과 (#8 CTO 리뷰 반영)
// ═══════════════════════════════════════════

/**
 * ExplainResult — 권한 결정의 상세 근거
 *
 * 운영자가 "이 사용자가 왜 이 권한이 없는가?"를
 * 한눈에 파악할 수 있도록 한다.
 */
export interface ExplainResult {
  decision: Decision;
  reason: DecisionReason;
  /** 어떤 역할들이 평가에 참여했는지 */
  roles: string[];
  /** 어떤 권한이 매칭되었는지 */
  matchedPermissions: string[];
  /** 어떤 정책이 평가되었는지 */
  policiesEvaluated: Array<{
    name: string;
    effect: PolicyEffect;
    conditionMet: boolean | null;
  }>;
  /** 어떤 조건이 평가되었는지 */
  conditionsEvaluated: Array<{
    condition: string;
    met: boolean;
  }>;
  /** 평가 시간 */
  evaluationTimeMs: number;
}

// ═══════════════════════════════════════════
// Permission Simulator (사장님 핵심 요구 + #7 What-If)
// ═══════════════════════════════════════════

export interface SimulationRequest {
  tenantId: string;
  accountId: string;
  /** 확인할 권한들 */
  permissions: string[];
  /** 시뮬레이션할 리소스 컨텍스트 */
  resource?: IResource;
}

/**
 * What-If 시뮬레이션 (#7 CTO 리뷰 반영)
 *
 * "User = Kim, Role = Guide, Permission = booking.cancel → Result?"
 * 실제 데이터베이스를 변경하지 않고 가상 시나리오 평가.
 */
export interface WhatIfRequest {
  tenantId: string;
  /** 가상으로 부여할 역할 (실제 Role Assignment 무시) */
  roles: string[];
  /** 확인할 권한들 */
  permissions: string[];
  /** 가상 리소스 */
  resource?: IResource;
}

export interface SimulationResult {
  accountId: string;
  results: Array<{
    permission: string;
    decision: Decision;
    reason: string;
  }>;
  /** 역할 요약 */
  roles: string[];
}

export interface WhatIfResult {
  /** 시뮬레이션된 역할 */
  roles: string[];
  results: Array<{
    permission: string;
    decision: Decision;
    reason: string;
  }>;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type AuditEventType =
  | 'role_created' | 'role_updated' | 'role_deleted'
  | 'permission_created' | 'permission_deleted'
  | 'permission_assigned' | 'permission_revoked'
  | 'policy_created' | 'policy_updated' | 'policy_deleted'
  | 'authorization_checked' | 'authorization_denied' | 'authorization_allowed'
  | 'simulation_executed' | 'whatif_executed'
  | 'cache_invalidated';

export interface AuditLogRecord {
  id: string;
  tenantId: string;
  accountId: string | null;
  eventType: AuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IRoleRepository {
  insert(role: IRole): Promise<void>;
  findById(tenantId: string, id: string): Promise<IRole | null>;
  findByName(tenantId: string, name: string): Promise<IRole | null>;
  findByTenant(tenantId: string): Promise<IRole[]>;
  update(id: string, patch: Partial<IRole>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IPermissionRepository {
  insert(permission: IPermission): Promise<void>;
  findByKey(tenantId: string, key: string): Promise<IPermission | null>;
  findByTenant(tenantId: string): Promise<IPermission[]>;
  findByResource(tenantId: string, resource: string): Promise<IPermission[]>;
  delete(id: string): Promise<void>;
}

export interface IRolePermissionRepository {
  insert(rp: IRolePermission): Promise<void>;
  findByRole(roleId: string): Promise<IRolePermission[]>;
  findByRoleAndPermission(roleId: string, permissionKey: string): Promise<IRolePermission | null>;
  delete(id: string): Promise<void>;
  deleteByRole(roleId: string): Promise<void>;
}

export interface IRoleAssignmentRepository {
  insert(assignment: IRoleAssignment): Promise<void>;
  findByAccount(tenantId: string, accountId: string): Promise<IRoleAssignment[]>;
  findByRole(tenantId: string, roleId: string): Promise<IRoleAssignment[]>;
  delete(id: string): Promise<void>;
  deleteByAccount(tenantId: string, accountId: string): Promise<number>;
}

export interface IPolicyRepository {
  insert(policy: IPolicy): Promise<void>;
  findById(tenantId: string, id: string): Promise<IPolicy | null>;
  findByTenant(tenantId: string): Promise<IPolicy[]>;
  findByPermissionPattern(tenantId: string, pattern: string): Promise<IPolicy[]>;
  update(id: string, patch: Partial<IPolicy>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IAuditLogRepository {
  insert(record: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<AuditLogRecord[]>;
  findByAccount(accountId: string): Promise<AuditLogRecord[]>;
}

export { type Result, type EventEnvelope };
