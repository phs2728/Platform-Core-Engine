/**
 * Resolver Module — Role / Permission / Policy Resolution
 *
 * Authorization Flow:
 * Identity → Authorization → Role → Permission → Policy → Condition → Decision → ALLOW/DENY
 *
 * Resolver는 이 흐름에서 중간 단계의 데이터를 수집하고 해결한다.
 */

import type {
  IRole,
  IRolePermission,
  IRoleAssignment,
  IPolicy,
  IRoleRepository,
  IRolePermissionRepository,
  IRoleAssignmentRepository,
  IPolicyRepository,
  AuthorizationRequest,
} from '../interfaces/index.js';
import { matchesPermission } from '../permissions/PermissionMatcher.js';
import { filterValidAssignments } from '../assignments/index.js';
import { filterActivePolicies, sortPoliciesByPriority } from '../policies/index.js';

// ═══════════════════════════════════════════
// Role Resolution
// ═══════════════════════════════════════════

/**
 * 사용자의 모든 Role Assignment 해결 (만료 필터 포함)
 */
export async function resolveRoleAssignments(
  repo: IRoleAssignmentRepository,
  request: AuthorizationRequest,
): Promise<IRoleAssignment[]> {
  const assignments = await repo.findByAccount(request.tenantId, request.accountId);
  return filterValidAssignments(assignments);
}

/**
 * Role의 Permission 수집 (상속 포함, 순환 방지)
 */
export async function resolveRolePermissions(
  roleRepo: IRoleRepository,
  rolePermissionRepo: IRolePermissionRepository,
  roleId: string,
  tenantId: string,
  visited: Set<string> = new Set(),
): Promise<IRolePermission[]> {
  if (visited.has(roleId)) return []; // 순환 방지
  visited.add(roleId);

  const role = await roleRepo.findById(tenantId, roleId);
  if (!role) return [];

  const permissions = await rolePermissionRepo.findByRole(roleId);

  // 부모 Role의 Permission도 수집 (상속)
  if (role.parentRoleId) {
    const parentPerms = await resolveRolePermissions(
      roleRepo, rolePermissionRepo, role.parentRoleId, tenantId, visited,
    );
    permissions.push(...parentPerms);
  }

  return permissions;
}

// ═══════════════════════════════════════════
// Permission Resolution
// ═══════════════════════════════════════════

/**
 * 요청된 Permission과 매칭되는 Role-Permission 목록
 */
export function resolveMatchingPermissions(
  allPermissions: IRolePermission[],
  requestedPermission: string,
): IRolePermission[] {
  return allPermissions.filter((rp) => matchesPermission(rp.permissionKey, requestedPermission));
}

// ═══════════════════════════════════════════
// Policy Resolution
// ═══════════════════════════════════════════

/**
 * 요청과 관련된 Policy 해결 (우선순위 순)
 */
export async function resolvePolicies(
  repo: IPolicyRepository,
  request: AuthorizationRequest,
): Promise<IPolicy[]> {
  const allPolicies = await repo.findByTenant(request.tenantId);
  const active = filterActivePolicies(allPolicies);
  const matching = active.filter((p) => matchesPermission(p.permissionPattern, request.permission));
  return sortPoliciesByPriority(matching);
}

/**
 * 전체 Resolution 결과
 */
export interface ResolutionResult {
  assignments: IRoleAssignment[];
  roles: IRole[];
  permissions: IRolePermission[];
  matchingPermissions: IRolePermission[];
  policies: IPolicy[];
}

/**
 * 한 번에 모든 Resolution 수행
 */
export async function resolveAll(
  roleRepo: IRoleRepository,
  rolePermissionRepo: IRolePermissionRepository,
  roleAssignmentRepo: IRoleAssignmentRepository,
  policyRepo: IPolicyRepository,
  request: AuthorizationRequest,
): Promise<ResolutionResult> {
  // 1. Assignments
  const assignments = await resolveRoleAssignments(roleAssignmentRepo, request);

  // 2. Roles + Permissions (상속 포함)
  const roles: IRole[] = [];
  const allPermissions: IRolePermission[] = [];
  for (const assignment of assignments) {
    const role = await roleRepo.findById(request.tenantId, assignment.roleId);
    if (role) {
      roles.push(role);
      const perms = await resolveRolePermissions(
        roleRepo, rolePermissionRepo, assignment.roleId, request.tenantId,
      );
      allPermissions.push(...perms);
    }
  }

  // 3. Matching Permissions
  const matchingPermissions = resolveMatchingPermissions(allPermissions, request.permission);

  // 4. Policies
  const policies = await resolvePolicies(policyRepo, request);

  return {
    assignments,
    roles,
    permissions: allPermissions,
    matchingPermissions,
    policies,
  };
}
