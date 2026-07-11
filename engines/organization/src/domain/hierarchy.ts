/**
 * Organization Engine — Hierarchy Cycle Detection
 *
 * 사장님 spec §Organization Hierarchy:
 *  - 무한 Depth 지원
 *  - Cycle 금지
 *
 * Implementation note:
 *  Adjacency List 패턴 (parentType/parentId) — 무한 깊이 + 단순 조회가 장점.
 *  move 시점에만 전체 경로 검사.
 */

import {
  ConflictError,
  NotFoundError,
  ValidationError,
  type Result,
  Err,
  Ok,
} from '@platform/core-sdk';
import type {
  IDepartmentRepository,
  IBranchRepository,
  ITeamRepository,
  HierarchyNodeType,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Parent resolution
// ═══════════════════════════════════════════

export interface ResolvedParent {
  parentType: HierarchyNodeType;
  parentId: string;
}

export type ParentKind =
  | { kind: 'organization'; organizationId: string }
  | { kind: 'department'; organizationId: string; parent: ResolvedParent }
  | { kind: 'branch'; organizationId: string; parent: ResolvedParent }
  | { kind: 'team'; organizationId: string; parent: ResolvedParent };

export interface ParentResolutionDeps {
  departmentRepo: IDepartmentRepository;
  branchRepo: IBranchRepository;
  teamRepo: ITeamRepository;
}

/**
 * Validate that the parent exists and belongs to the given organization.
 *
 * tenantId is required because repositories are tenant-scoped.
 */
export async function validateParent(
  tenantId: string,
  organizationId: string,
  parentType: HierarchyNodeType,
  parentId: string,
  deps: ParentResolutionDeps,
): Promise<Result<true, NotFoundError | ValidationError>> {
  if (parentType === 'organization') {
    if (parentId !== organizationId) {
      return Err(new ValidationError(
        'When parentType is "organization", parentId must match organizationId',
        { details: { parentType, parentId, organizationId } },
      ));
    }
    return Ok(true);
  }

  if (parentType === 'department') {
    const dept = await deps.departmentRepo.findById(tenantId, parentId);
    if (!dept) {
      return Err(new NotFoundError('Department not found', { details: { parentId } }));
    }
    if (dept.organizationId !== organizationId) {
      return Err(new ValidationError('Parent department belongs to different organization'));
    }
    return Ok(true);
  }

  if (parentType === 'branch') {
    const branch = await deps.branchRepo.findById(tenantId, parentId);
    if (!branch) {
      return Err(new NotFoundError('Branch not found', { details: { parentId } }));
    }
    if (branch.organizationId !== organizationId) {
      return Err(new ValidationError('Parent branch belongs to different organization'));
    }
    return Ok(true);
  }

  // team
  const team = await deps.teamRepo.findById(tenantId, parentId);
  if (!team) {
    return Err(new NotFoundError('Team not found', { details: { parentId } }));
  }
  if (team.organizationId !== organizationId) {
    return Err(new ValidationError('Parent team belongs to different organization'));
  }
  return Ok(true);
}

// ═══════════════════════════════════════════
// Cycle detection
// ═══════════════════════════════════════════

export interface CycleCheckDeps {
  departmentRepo: IDepartmentRepository;
  branchRepo: IBranchRepository;
  teamRepo: ITeamRepository;
}

/**
 * Check whether moving `nodeId` (of type `nodeType`) under `newParent`
 * would create a cycle. Returns:
 *
 *   Ok(true)  — would create cycle (do not move)
 *   Ok(false) — safe to move (no cycle)
 *
 * Strategy: walk up the chain from `newParent`; if we encounter `nodeId`
 * at any depth, the move would create a cycle.
 */
export async function checkMoveCreatesCycle(
  tenantId: string,
  organizationId: string,
  nodeType: 'department' | 'team' | 'branch',
  nodeId: string,
  newParent: { parentType: HierarchyNodeType; parentId: string },
  deps: CycleCheckDeps,
): Promise<Result<boolean, ValidationError>> {
  const visited = new Set<string>();

  let cursor: { parentType: HierarchyNodeType; parentId: string } = newParent;

  // Department root는 organization 자체
  const rootMarker = JSON.stringify({ parentType: 'organization', parentId: organizationId });

  for (let i = 0; i < 1000; i += 1) {
    const key = `${cursor.parentType}:${cursor.parentId}`;
    if (visited.has(key)) {
      // 그래프 자체에 cycle (data corruption) — move 실패
      return Err(new ValidationError(
        'Hierarchy graph already contains a cycle — repair required',
        { details: { visitedKey: key } },
      ));
    }
    visited.add(key);

    if (cursor.parentType === 'organization') {
      if (cursor.parentId !== organizationId) {
        return Err(new ValidationError(
          'Hierarchy root does not match organizationId',
          { details: { parentId: cursor.parentId, organizationId } },
        ));
      }
      // Reached root → no cycle in the newParent chain. Move is safe.
      return Ok(false);
    }

    // 본인이 자신의 조상 체인 안에 있는가? → cycle
    if (cursor.parentType === nodeType && cursor.parentId === nodeId) {
      return Ok(true);
    }

    if (cursor.parentType === 'department') {
      const dept = await deps.departmentRepo.findById(tenantId, cursor.parentId);
      if (!dept) {
        return Err(new ValidationError(
          'Broken hierarchy chain — department not found during cycle check',
          { details: { parentId: cursor.parentId } },
        ));
      }
      cursor = { parentType: dept.parentType, parentId: dept.parentId };
      continue;
    }

    if (cursor.parentType === 'branch') {
      const branch = await deps.branchRepo.findById(tenantId, cursor.parentId);
      if (!branch) {
        return Err(new ValidationError(
          'Broken hierarchy chain — branch not found during cycle check',
          { details: { parentId: cursor.parentId } },
        ));
      }
      cursor = { parentType: branch.parentType, parentId: branch.parentId };
      continue;
    }

    if (cursor.parentType === 'team') {
      const team = await deps.teamRepo.findById(tenantId, cursor.parentId);
      if (!team) {
        return Err(new ValidationError(
          'Broken hierarchy chain — team not found during cycle check',
          { details: { parentId: cursor.parentId } },
        ));
      }
      cursor = { parentType: team.parentType, parentId: team.parentId };
      continue;
    }

    // Should never reach here (all HierarchyNodeType exhausted)
    return Err(new ValidationError(
      'Unknown parentType during cycle check',
      { details: { parentType: cursor.parentType } },
    ));
  }

  return Err(new ValidationError(
    'Hierarchy depth exceeded 1000 — possible loop or extremely deep nesting',
    { details: { visitedCount: visited.size } },
  ));
}

// ═══════════════════════════════════════════
// Hierarchy summary helper
// ═══════════════════════════════════════════

export interface HierarchyNode {
  id: string;
  type: 'branch' | 'department' | 'team';
  name: string;
  parentType: HierarchyNodeType;
  parentId: string;
  archivedAt: string | null;
}

export interface HierarchySummary {
  organizationId: string;
  branches: HierarchyNode[];
  departments: HierarchyNode[];
  teams: HierarchyNode[];
}

/**
 * Walk through all hierarchy nodes of an organization.
 * Returns flat lists — caller derives tree if needed.
 */
export async function summarizeHierarchy(
  tenantId: string,
  organizationId: string,
  deps: CycleCheckDeps,
): Promise<HierarchySummary> {
  const branches = await deps.branchRepo.findByOrganization(tenantId, organizationId);
  const departments = await deps.departmentRepo.findByOrganization(tenantId, organizationId);
  const teams = await deps.teamRepo.findByOrganization(tenantId, organizationId);

  return {
    organizationId,
    branches: branches.map((b) => ({
      id: b.id,
      type: 'branch' as const,
      name: b.name,
      parentType: b.parentType,
      parentId: b.parentId,
      archivedAt: b.archivedAt,
    })),
    departments: departments.map((d) => ({
      id: d.id,
      type: 'department' as const,
      name: d.name,
      parentType: d.parentType,
      parentId: d.parentId,
      archivedAt: d.archivedAt,
    })),
    teams: teams.map((t) => ({
      id: t.id,
      type: 'team' as const,
      name: t.name,
      parentType: t.parentType,
      parentId: t.parentId,
      archivedAt: t.archivedAt,
    })),
  };
}

// ═══════════════════════════════════════════
// Re-export for callers
// ═══════════════════════════════════════════

export { ConflictError, NotFoundError };
