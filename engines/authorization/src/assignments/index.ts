/**
 * Assignment Module — UserRole / GroupRole / TenantRole
 *
 * UserRole: 개별 사용자에게 Role 할당
 * GroupRole: 그룹(부서 등)에 Role 할당
 * TenantRole: 테넌트 전체에 적용되는 기본 Role
 */

import type { IRoleAssignment, AssignmentScope } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Assignment Types
// ═══════════════════════════════════════════

export type AssignmentKind = 'user' | 'group' | 'tenant';

export interface TypedRoleAssignment extends IRoleAssignment {
  kind: AssignmentKind;
}

// ═══════════════════════════════════════════
// Assignment Helpers
// ═══════════════════════════════════════════

/**
 * User-level Assignment 생성
 */
export function createUserAssignment(params: {
  id: string;
  tenantId: string;
  accountId: string;
  roleId: string;
  assignedBy: string;
  scope?: AssignmentScope | null;
  expiresAt?: string | null;
}): TypedRoleAssignment {
  return {
    id: params.id,
    tenantId: params.tenantId,
    accountId: params.accountId,
    roleId: params.roleId,
    scope: params.scope ?? null,
    assignedAt: new Date().toISOString(),
    assignedBy: params.assignedBy,
    expiresAt: params.expiresAt ?? null,
    kind: 'user',
  };
}

/**
 * Tenant-level Assignment 생성
 * TenantRole은 테넌트의 모든 사용자에게 적용되는 기본 Role
 */
export function createTenantAssignment(params: {
  id: string;
  tenantId: string;
  roleId: string;
  assignedBy: string;
}): TypedRoleAssignment {
  return {
    id: params.id,
    tenantId: params.tenantId,
    accountId: '*', // 모든 사용자
    roleId: params.roleId,
    scope: null,
    assignedAt: new Date().toISOString(),
    assignedBy: params.assignedBy,
    expiresAt: null,
    kind: 'tenant',
  };
}

/**
 * Assignment가 만료되었는지 확인
 */
export function isExpired(assignment: IRoleAssignment, now: Date = new Date()): boolean {
  if (!assignment.expiresAt) return false;
  return new Date(assignment.expiresAt) < now;
}

/**
 * 유효한 Assignment만 필터 (만료되지 않은 것)
 */
export function filterValidAssignments(
  assignments: IRoleAssignment[],
  now: Date = new Date(),
): IRoleAssignment[] {
  return assignments.filter((a) => !isExpired(a, now));
}

/**
 * Assignment Scope가 Resource와 일치하는지 확인
 */
export function matchesScope(
  scope: AssignmentScope | null,
  resource: { type: string; id: string; ownerId?: string; attributes?: Record<string, unknown> } | undefined,
): boolean {
  if (!scope) return true; // scope가 없으면 모든 리소스에 적용
  if (!resource) return false;

  if (scope.resourceType && resource.type !== scope.resourceType) return false;
  if (scope.resourceId && resource.id !== scope.resourceId) return false;

  if (scope.attributes && resource.attributes) {
    for (const [key, value] of Object.entries(scope.attributes)) {
      if (resource.attributes[key] !== value) return false;
    }
  }

  return true;
}
