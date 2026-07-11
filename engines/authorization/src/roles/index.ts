/**
 * Role Module — Role Aggregate
 *
 * Role
 * RolePermission (Role ↔ Permission 매핑)
 * RoleAssignment (User ↔ Role 매핑) — assignments/ 모듈에서 처리
 *
 * Role은 Permission의 컨테이너이며, 상속을 지원한다.
 */

import type { IRole, IRolePermission } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Role Aggregate Helpers
// ═══════════════════════════════════════════

/**
 * Role의 전체 Permission Key 목록 추출
 */
export function extractPermissionKeys(permissions: IRolePermission[]): string[] {
  return permissions.map((rp) => rp.permissionKey);
}

/**
 * Role이 System Role인지 확인
 */
export function isSystemRole(role: IRole): boolean {
  return role.isSystem;
}

/**
 * Role의 상속 체인 깊이 계산 (순환 감지용)
 */
export function getInheritanceDepth(
  roleId: string,
  roles: Map<string, IRole>,
  maxDepth: number = 10,
): number {
  let depth = 0;
  let currentId = roleId;
  const visited = new Set<string>();

  while (depth < maxDepth) {
    if (visited.has(currentId)) return depth; // 순환 감지
    visited.add(currentId);

    const role = roles.get(currentId);
    if (!role || !role.parentRoleId) break;

    currentId = role.parentRoleId;
    depth++;
  }

  return depth;
}

/**
 * Role이 다른 Role의 하위(후손)인지 확인
 */
export function isDescendantOf(
  roleId: string,
  ancestorId: string,
  roles: Map<string, IRole>,
): boolean {
  let currentId = roleId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const role = roles.get(currentId);
    if (!role) return false;
    if (role.parentRoleId === ancestorId) return true;
    currentId = role.parentRoleId ?? '';
  }

  return false;
}

// ═══════════════════════════════════════════
// RolePermission Helpers
// ═══════════════════════════════════════════

/**
 * Role-Permission에서 Condition 추출
 */
export function extractConditions(permissions: IRolePermission[]): string[] {
  return permissions
    .filter((rp) => rp.condition !== null)
    .map((rp) => rp.condition as string);
}
