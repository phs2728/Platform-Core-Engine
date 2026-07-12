/**
 * Role & Permission Management UseCases
 */

import { Ok, Err, type Result, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope } from '@platform/core-sdk';
import type {
  IRole, IPermission, IRolePermission, IRoleAssignment, IPolicy,
  IRoleRepository, IPermissionRepository, IRolePermissionRepository,
  IRoleAssignmentRepository, IPolicyRepository,
  IClock, IIdGenerator, IEventBus,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Create Role
// ═══════════════════════════════════════════

export interface CreateRoleInput {
  tenantId: string;
  name: string;
  description: string;
  parentRoleId?: string;
}

export async function createRoleUseCase(
  input: CreateRoleInput,
  deps: {
    roleRepository: IRoleRepository;
    idGenerator: IIdGenerator;
    clock: IClock;
    eventBus: IEventBus;
  },
): Promise<Result<IRole, ValidationError | ConflictError>> {
  if (!input.name || !input.tenantId) {
    return Err(new ValidationError('name and tenantId required'));
  }

  const existing = await deps.roleRepository.findByName(input.tenantId, input.name);
  if (existing) {
    return Err(new ConflictError('Role already exists', { details: { name: input.name } }));
  }

  const now = deps.clock.now().toISOString();
  const role: IRole = {
    id: deps.idGenerator.generate(),
    tenantId: input.tenantId,
    name: input.name,
    description: input.description,
    parentRoleId: input.parentRoleId ?? null,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };

  await deps.roleRepository.insert(role);

  const envelope: EventEnvelope<{ roleId: string; name: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: role.id,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: '',
    causationId: '',
    engine: 'authorization',
    eventType: 'role.created',
    schemaRef: 'role.created.v1',
    payload: { roleId: role.id, name: role.name },
  });
  await deps.eventBus.emit(envelope);

  return Ok(role);
}

// ═══════════════════════════════════════════
// Assign Permission to Role
// ═══════════════════════════════════════════

export interface AssignPermissionInput {
  tenantId: string;
  roleId: string;
  permissionKey: string;
  condition?: string | null;
}

export async function assignPermissionToRoleUseCase(
  input: AssignPermissionInput,
  deps: {
    roleRepository: IRoleRepository;
    rolePermissionRepository: IRolePermissionRepository;
    idGenerator: IIdGenerator;
    clock: IClock;
    eventBus: IEventBus;
  },
): Promise<Result<IRolePermission, NotFoundError>> {
  const role = await deps.roleRepository.findById(input.tenantId, input.roleId);
  if (!role) {
    return Err(new NotFoundError('Role not found', { details: { roleId: input.roleId } }));
  }

  const rp: IRolePermission = {
    id: deps.idGenerator.generate(),
    tenantId: input.tenantId,
    roleId: input.roleId,
    permissionKey: input.permissionKey,
    condition: input.condition ?? null,
    createdAt: deps.clock.now().toISOString(),
  };

  await deps.rolePermissionRepository.insert(rp);

  const envelope: EventEnvelope<{ roleId: string; permission: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.roleId,
    occurredAt: deps.clock.now().toISOString(),
    tenantId: input.tenantId,
    correlationId: '',
    causationId: '',
    engine: 'authorization',
    eventType: 'permission.assigned',
    schemaRef: 'permission.assigned.v1',
    payload: { roleId: input.roleId, permission: input.permissionKey },
  });
  await deps.eventBus.emit(envelope);

  return Ok(rp);
}

// ═══════════════════════════════════════════
// Assign Role to User
// ═══════════════════════════════════════════

export interface AssignRoleInput {
  tenantId: string;
  accountId: string;
  roleId: string;
  assignedBy: string;
  scope?: import('../interfaces/index.js').AssignmentScope | null;
  expiresAt?: string | null;
}

export async function assignRoleUseCase(
  input: AssignRoleInput,
  deps: {
    roleRepository: IRoleRepository;
    roleAssignmentRepository: IRoleAssignmentRepository;
    idGenerator: IIdGenerator;
    clock: IClock;
    eventBus: IEventBus;
  },
): Promise<Result<IRoleAssignment, NotFoundError>> {
  const role = await deps.roleRepository.findById(input.tenantId, input.roleId);
  if (!role) {
    return Err(new NotFoundError('Role not found', { details: { roleId: input.roleId } }));
  }

  const assignment: IRoleAssignment = {
    id: deps.idGenerator.generate(),
    tenantId: input.tenantId,
    accountId: input.accountId,
    roleId: input.roleId,
    scope: input.scope ?? null,
    assignedAt: deps.clock.now().toISOString(),
    assignedBy: input.assignedBy,
    expiresAt: input.expiresAt ?? null,
  };

  await deps.roleAssignmentRepository.insert(assignment);

  const envelope: EventEnvelope<{ accountId: string; roleId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.accountId,
    occurredAt: deps.clock.now().toISOString(),
    tenantId: input.tenantId,
    correlationId: '',
    causationId: '',
    engine: 'authorization',
    eventType: 'role.assigned',
    schemaRef: 'role.assigned.v1',
    payload: { accountId: input.accountId, roleId: input.roleId },
  });
  await deps.eventBus.emit(envelope);

  return Ok(assignment);
}

// ═══════════════════════════════════════════
// Create Policy (ABAC)
// ═══════════════════════════════════════════

export interface CreatePolicyInput {
  tenantId: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  permissionPattern: string;
  condition?: import('../interfaces/index.js').PolicyCondition | null;
  priority?: number;
}

export async function createPolicyUseCase(
  input: CreatePolicyInput,
  deps: {
    policyRepository: IPolicyRepository;
    idGenerator: IIdGenerator;
    clock: IClock;
    eventBus: IEventBus;
  },
): Promise<Result<IPolicy, ValidationError>> {
  if (!input.name || !input.permissionPattern) {
    return Err(new ValidationError('name and permissionPattern required'));
  }

  const now = deps.clock.now().toISOString();
  const policy: IPolicy = {
    id: deps.idGenerator.generate(),
    tenantId: input.tenantId,
    name: input.name,
    description: input.description,
    effect: input.effect,
    permissionPattern: input.permissionPattern,
    condition: input.condition ?? null,
    priority: input.priority ?? 0,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  await deps.policyRepository.insert(policy);

  const envelope: EventEnvelope<{ policyId: string; effect: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: policy.id,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: '',
    causationId: '',
    engine: 'authorization',
    eventType: 'policy.created',
    schemaRef: 'policy.created.v1',
    payload: { policyId: policy.id, effect: policy.effect },
  });
  await deps.eventBus.emit(envelope);

  return Ok(policy);
}
