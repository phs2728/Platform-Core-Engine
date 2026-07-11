/**
 * Hierarchy UseCases
 *
 * 사장님 spec §Public API:
 *   createBranch / createDepartment / createTeam /
 *   moveDepartment / moveTeam
 *
 * 사장님 확립 (Hierarchy Discipline):
 *   - 무한 depth (adjacency list: parentType + parentId)
 *   - Cycle 금지 (move 시점에 검증)
 *   - Archived/Deleted 조직에는 자식 추가 불가
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  ConflictError,
  NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordOrganizationAudit } from '../domain/audit.js';
import {
  createBranchSchema,
  createDepartmentSchema,
  createTeamSchema,
  moveDepartmentSchema,
  moveTeamSchema,
} from '../domain/validation.js';
import { emitOrganizationEvent } from '../domain/events.js';
import {
  validateParent,
  checkMoveCreatesCycle,
  type CycleCheckDeps,
  type ParentResolutionDeps,
} from '../domain/hierarchy.js';
import { isMutable } from '../domain/statusTransition.js';
import type { OrganizationUseCaseDeps } from './types.js';
import type {
  Branch,
  Department,
  Team,
  HierarchyNodeType,
} from '../interfaces/index.js';

// Hierarchy engine과 Integration을 위해 별도 deps 묶음
function hierarchyDeps(d: OrganizationUseCaseDeps): CycleCheckDeps & ParentResolutionDeps {
  return {
    departmentRepo: d.departmentRepo,
    branchRepo: d.branchRepo,
    teamRepo: d.teamRepo,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE BRANCH
// ════════════════════════════════════════════════════════════════════════════

export interface CreateBranchInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  /** Default parent = organization itself */
  parentType?: HierarchyNodeType;
  parentId?: string;
  name: string;
  description?: string;
  primaryAddressId?: string;
}

export type CreateBranchError = ValidationError | NotFoundError | ConflictError;

export async function createBranchUseCase(
  input: CreateBranchInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Branch, CreateBranchError>> {
  const validation = createBranchSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid createBranch input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const org = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!org) {
    return Err(new NotFoundError('Organization not found'));
  }
  if (!isMutable(org.status)) {
    return Err(new ConflictError(
      `Cannot create branch — organization status is "${org.status}"`,
    ));
  }

  // Parent 검증 (기본 parent: organization 자기 자신)
  const parentType: HierarchyNodeType = data.parentType ?? 'organization';
  const parentId = data.parentId ?? data.organizationId;
  const parentValidation = await validateParent(
    data.tenantId,
    data.organizationId, parentType, parentId, hierarchyDeps(deps),
  );
  if (!parentValidation.ok) {
    return Err(parentValidation.error);
  }

  // Policy check
  const maxBranches = await deps.policyProvider.getMaxBranches(data.tenantId);
  const existingBranches = await deps.branchRepo.findByOrganization(data.tenantId, data.organizationId);
  if (existingBranches.length >= maxBranches) {
    return Err(new ConflictError(
      `Organization reached maximum branches limit (${maxBranches})`,
      { details: { max: maxBranches } },
    ));
  }

  if (data.primaryAddressId !== undefined) {
    const valid = await deps.addressVerifier.verify(data.tenantId, data.primaryAddressId);
    if (!valid) {
      return Err(new ValidationError('primaryAddressId not found in Address Engine'));
    }
  }

  const branchId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const branch: Branch = {
    id: branchId,
    tenantId: data.tenantId,
    organizationId: data.organizationId,
    parentType,
    parentId,
    name: data.name,
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.primaryAddressId !== undefined ? { primaryAddressId: data.primaryAddressId } : {}),
    createdAt: now,
    createdBy: data.actorId,
    updatedAt: now,
    archivedAt: null,
  };
  await deps.branchRepo.insert(branch);

  const envelope: EventEnvelope<{
    organizationId: string;
    branchId: string;
    name: string;
    parentType: HierarchyNodeType;
    parentId: string;
    tenantId: string;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.branch.created',
    'organization.branch.created.v1',
    {
      organizationId: data.organizationId,
      branchId,
      name: data.name,
      parentType,
      parentId,
      tenantId: data.tenantId,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_branch_created',
    metadata: { branchId, name: data.name, parentType, parentId },
  });

  return Ok(branch);
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE DEPARTMENT
// ════════════════════════════════════════════════════════════════════════════

export interface CreateDepartmentInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  parentType?: HierarchyNodeType;
  parentId?: string;
  name: string;
  description?: string;
}

export async function createDepartmentUseCase(
  input: CreateDepartmentInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Department, ValidationError | NotFoundError | ConflictError>> {
  const validation = createDepartmentSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid createDepartment input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const org = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!org) {
    return Err(new NotFoundError('Organization not found'));
  }
  if (!isMutable(org.status)) {
    return Err(new ConflictError(
      `Cannot create department — organization status is "${org.status}"`,
    ));
  }

  const parentType: HierarchyNodeType = data.parentType ?? 'organization';
  const parentId = data.parentId ?? data.organizationId;
  const parentValidation = await validateParent(
    data.tenantId,
    data.organizationId, parentType, parentId, hierarchyDeps(deps),
  );
  if (!parentValidation.ok) {
    return Err(parentValidation.error);
  }

  const maxDepartments = await deps.policyProvider.getMaxDepartments(data.tenantId);
  const existing = await deps.departmentRepo.findByOrganization(data.tenantId, data.organizationId);
  if (existing.length >= maxDepartments) {
    return Err(new ConflictError(
      `Organization reached maximum departments limit (${maxDepartments})`,
      { details: { max: maxDepartments } },
    ));
  }

  const departmentId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const dept: Department = {
    id: departmentId,
    tenantId: data.tenantId,
    organizationId: data.organizationId,
    parentType,
    parentId,
    name: data.name,
    ...(data.description !== undefined ? { description: data.description } : {}),
    createdAt: now,
    createdBy: data.actorId,
    updatedAt: now,
    archivedAt: null,
  };
  await deps.departmentRepo.insert(dept);

  const envelope: EventEnvelope<{
    organizationId: string;
    departmentId: string;
    name: string;
    parentType: HierarchyNodeType;
    parentId: string;
    tenantId: string;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.department.created',
    'organization.department.created.v1',
    {
      organizationId: data.organizationId,
      departmentId,
      name: data.name,
      parentType,
      parentId,
      tenantId: data.tenantId,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_department_created',
    metadata: { departmentId, name: data.name, parentType, parentId },
  });

  return Ok(dept);
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE TEAM
// ════════════════════════════════════════════════════════════════════════════

export interface CreateTeamInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  /** Default parent = organization itself */
  parentType?: HierarchyNodeType;
  parentId?: string;
  name: string;
  description?: string;
}

export async function createTeamUseCase(
  input: CreateTeamInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Team, ValidationError | NotFoundError | ConflictError>> {
  const validation = createTeamSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid createTeam input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const org = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!org) {
    return Err(new NotFoundError('Organization not found'));
  }
  if (!isMutable(org.status)) {
    return Err(new ConflictError(
      `Cannot create team — organization status is "${org.status}"`,
    ));
  }

  const parentType: HierarchyNodeType = data.parentType ?? 'organization';
  const parentId = data.parentId ?? data.organizationId;
  const parentValidation = await validateParent(
    data.tenantId,
    data.organizationId, parentType, parentId, hierarchyDeps(deps),
  );
  if (!parentValidation.ok) {
    return Err(parentValidation.error);
  }

  const teamId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const team: Team = {
    id: teamId,
    tenantId: data.tenantId,
    organizationId: data.organizationId,
    parentType,
    parentId,
    name: data.name,
    ...(data.description !== undefined ? { description: data.description } : {}),
    createdAt: now,
    createdBy: data.actorId,
    updatedAt: now,
    archivedAt: null,
  };
  await deps.teamRepo.insert(team);

  const envelope: EventEnvelope<{
    organizationId: string;
    teamId: string;
    name: string;
    parentType: HierarchyNodeType;
    parentId: string;
    tenantId: string;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.team.created',
    'organization.team.created.v1',
    {
      organizationId: data.organizationId,
      teamId,
      name: data.name,
      parentType,
      parentId,
      tenantId: data.tenantId,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_team_created',
    metadata: { teamId, name: data.name, parentType, parentId },
  });

  return Ok(team);
}

// ════════════════════════════════════════════════════════════════════════════
// MOVE DEPARTMENT
// ════════════════════════════════════════════════════════════════════════════

export interface MoveDepartmentInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  departmentId: string;
  newParentType: HierarchyNodeType;
  newParentId: string;
}

export async function moveDepartmentUseCase(
  input: MoveDepartmentInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Department, ValidationError | NotFoundError | ConflictError>> {
  const validation = moveDepartmentSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid moveDepartment input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const dept = await deps.departmentRepo.findById(data.tenantId, data.departmentId);
  if (!dept || dept.organizationId !== data.organizationId) {
    return Err(new NotFoundError('Department not found in organization'));
  }
  if (dept.archivedAt !== null) {
    return Err(new ConflictError('Cannot move archived department'));
  }

  // Parent 검증
  const parentValidation = await validateParent(
    data.tenantId,
    data.organizationId, data.newParentType, data.newParentId, hierarchyDeps(deps),
  );
  if (!parentValidation.ok) {
    return Err(parentValidation.error);
  }

  // Cycle 검사
  const cycleCheck = await checkMoveCreatesCycle(
    data.tenantId,
    data.organizationId, 'department', data.departmentId,
    { parentType: data.newParentType, parentId: data.newParentId },
    hierarchyDeps(deps),
  );
  if (!cycleCheck.ok) {
    return Err(cycleCheck.error);
  }
  if (cycleCheck.value === true) {
    return Err(new ConflictError('Move would create a cycle in the hierarchy'));
  }

  const now = deps.clock.now().toISOString();
  const updated: Department = {
    ...dept,
    parentType: data.newParentType,
    parentId: data.newParentId,
    updatedAt: now,
  };
  await deps.departmentRepo.update(data.tenantId, data.departmentId, {
    parentType: data.newParentType,
    parentId: data.newParentId,
    updatedAt: now,
  });

  const envelope: EventEnvelope<{
    organizationId: string;
    departmentId: string;
    newParentType: HierarchyNodeType;
    newParentId: string;
    tenantId: string;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.department.moved',
    'organization.department.moved.v1',
    {
      organizationId: data.organizationId,
      departmentId: data.departmentId,
      newParentType: data.newParentType,
      newParentId: data.newParentId,
      tenantId: data.tenantId,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_department_moved',
    metadata: {
      departmentId: data.departmentId,
      newParentType: data.newParentType,
      newParentId: data.newParentId,
    },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// MOVE TEAM
// ════════════════════════════════════════════════════════════════════════════

export interface MoveTeamInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  teamId: string;
  newParentType: HierarchyNodeType;
  newParentId: string;
}

export async function moveTeamUseCase(
  input: MoveTeamInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Team, ValidationError | NotFoundError | ConflictError>> {
  const validation = moveTeamSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid moveTeam input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const team = await deps.teamRepo.findById(data.tenantId, data.teamId);
  if (!team || team.organizationId !== data.organizationId) {
    return Err(new NotFoundError('Team not found in organization'));
  }
  if (team.archivedAt !== null) {
    return Err(new ConflictError('Cannot move archived team'));
  }

  const parentValidation = await validateParent(
    data.tenantId,
    data.organizationId, data.newParentType, data.newParentId, hierarchyDeps(deps),
  );
  if (!parentValidation.ok) {
    return Err(parentValidation.error);
  }

  const cycleCheck = await checkMoveCreatesCycle(
    data.tenantId,
    data.organizationId, 'team', data.teamId,
    { parentType: data.newParentType, parentId: data.newParentId },
    hierarchyDeps(deps),
  );
  if (!cycleCheck.ok) {
    return Err(cycleCheck.error);
  }
  if (cycleCheck.value === true) {
    return Err(new ConflictError('Move would create a cycle in the hierarchy'));
  }

  const now = deps.clock.now().toISOString();
  const updated: Team = {
    ...team,
    parentType: data.newParentType,
    parentId: data.newParentId,
    updatedAt: now,
  };
  await deps.teamRepo.update(data.tenantId, data.teamId, {
    parentType: data.newParentType,
    parentId: data.newParentId,
    updatedAt: now,
  });

  const envelope: EventEnvelope<{
    organizationId: string;
    teamId: string;
    newParentType: HierarchyNodeType;
    newParentId: string;
    tenantId: string;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.team.moved',
    'organization.team.moved.v1',
    {
      organizationId: data.organizationId,
      teamId: data.teamId,
      newParentType: data.newParentType,
      newParentId: data.newParentId,
      tenantId: data.tenantId,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_team_moved',
    metadata: {
      teamId: data.teamId,
      newParentType: data.newParentType,
      newParentId: data.newParentId,
    },
  });

  return Ok(updated);
}
