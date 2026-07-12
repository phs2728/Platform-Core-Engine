/**
 * Authorization Engine — Tests
 *
 * Covers: Role CRUD, Permission assignment, Role assignment, Policy CRUD,
 * authorize (RBAC + ABAC), whatIf simulator, Decision Engine explain().
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRoleUseCase,
  assignPermissionToRoleUseCase,
  assignRoleUseCase,
  createPolicyUseCase,
  authorizeUseCase,
  simulatePermissionsUseCase,
  whatIfUseCase,
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryRoleAssignmentRepository,
  InMemoryPolicyRepository,
  InMemoryAuditLogRepository,
  matchesPermission,
  buildPermissionKey,
  parsePermissionKey,
  crudPermissions,
  evaluate,
  can,
  cannot,
  explain,
} from '../src/index.js';

type Deps = ReturnType<typeof makeDeps>;

function makeClock() {
  let t = 0;
  return { now: () => new Date(2026_07_11_000 + t++ * 1000) };
}

function makeDeps() {
  let idc = 0;
  const idGenerator = { generate: () => `id-${++idc}-${Math.random().toString(36).slice(2, 8)}` };
  const clock = makeClock();
  const eventBus = { emitted: [] as unknown[], async emit(e: unknown) { this.emitted.push(e); } };
  return {
    roleRepository: new InMemoryRoleRepository(),
    rolePermissionRepository: new InMemoryRolePermissionRepository(),
    roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
    policyRepository: new InMemoryPolicyRepository(),
    auditLogRepository: new InMemoryAuditLogRepository(),
    permissionRepository: new InMemoryPermissionRepository(),
    idGenerator,
    clock,
    eventBus,
  };
}

async function setupBasicRoleAndPermissions(deps: Deps) {
  // Create admin role
  const adminRole = await createRoleUseCase(
    { tenantId: 't1', name: 'admin', description: 'Administrator' },
    deps,
  );
  expect(adminRole.ok).toBe(true);

  // Assign permissions
  const p1 = await assignPermissionToRoleUseCase(
    { tenantId: 't1', roleId: adminRole.value.id, permissionKey: 'resource.create' },
    deps,
  );
  expect(p1.ok).toBe(true);

  const p2 = await assignPermissionToRoleUseCase(
    { tenantId: 't1', roleId: adminRole.value.id, permissionKey: 'resource.read' },
    deps,
  );
  expect(p2.ok).toBe(true);

  // Assign role to user
  const assign = await assignRoleUseCase(
    { tenantId: 't1', accountId: 'user-1', roleId: adminRole.value.id, assignedBy: 'system' },
    deps,
  );
  expect(assign.ok).toBe(true);

  return { adminRole: adminRole.value };
}

// ═══════════════════════════════════════════
// 1. Role Management (7 tests)
// ═══════════════════════════════════════════
describe('Role Management', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a role', async () => {
    const r = await createRoleUseCase({ tenantId: 't1', name: 'manager', description: 'Manager role' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value.name).toBe('manager');
    expect(r.value.isSystem).toBe(false);
  });

  it('prevents duplicate role names', async () => {
    await createRoleUseCase({ tenantId: 't1', name: 'manager', description: 'd' }, deps);
    const r = await createRoleUseCase({ tenantId: 't1', name: 'manager', description: 'd' }, deps);
    expect(r.ok).toBe(false);
  });

  it('creates role with parent', async () => {
    const parent = await createRoleUseCase({ tenantId: 't1', name: 'base', description: 'd' }, deps);
    const child = await createRoleUseCase({ tenantId: 't1', name: 'child', description: 'd', parentRoleId: parent.value.id }, deps);
    expect(child.ok).toBe(true);
    expect(child.value.parentRoleId).toBe(parent.value.id);
  });

  it('emits role.created event', async () => {
    await createRoleUseCase({ tenantId: 't1', name: 'guide', description: 'd' }, deps);
    expect(deps.eventBus.emitted.length).toBeGreaterThan(0);
  });

  it('finds role by tenant', async () => {
    await createRoleUseCase({ tenantId: 't1', name: 'a', description: 'd' }, deps);
    await createRoleUseCase({ tenantId: 't1', name: 'b', description: 'd' }, deps);
    const roles = await deps.roleRepository.findByTenant('t1');
    expect(roles.length).toBe(2);
  });

  it('fails on missing name', async () => {
    const r = await createRoleUseCase({ tenantId: 't1', name: '', description: 'd' }, deps);
    expect(r.ok).toBe(false);
  });

  it('role parent can be null', async () => {
    const r = await createRoleUseCase({ tenantId: 't1', name: 'root', description: 'd' }, deps);
    expect(r.value.parentRoleId).toBeNull();
  });
});

// ═══════════════════════════════════════════
// 2. Permission Assignment (5 tests)
// ═══════════════════════════════════════════
describe('Permission Assignment', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('assigns permission to role', async () => {
    const role = await createRoleUseCase({ tenantId: 't1', name: 'editor', description: 'd' }, deps);
    const r = await assignPermissionToRoleUseCase({ tenantId: 't1', roleId: role.value.id, permissionKey: 'content.edit' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value.permissionKey).toBe('content.edit');
  });

  it('fails on non-existent role', async () => {
    const r = await assignPermissionToRoleUseCase({ tenantId: 't1', roleId: 'nonexistent', permissionKey: 'x.y' }, deps);
    expect(r.ok).toBe(false);
  });

  it('emits permission.assigned event', async () => {
    const role = await createRoleUseCase({ tenantId: 't1', name: 'editor', description: 'd' }, deps);
    deps.eventBus.emitted.length = 0;
    await assignPermissionToRoleUseCase({ tenantId: 't1', roleId: role.value.id, permissionKey: 'content.edit' }, deps);
    expect(deps.eventBus.emitted.length).toBe(1);
  });

  it('assigns role to user', async () => {
    const role = await createRoleUseCase({ tenantId: 't1', name: 'viewer', description: 'd' }, deps);
    const r = await assignRoleUseCase({ tenantId: 't1', accountId: 'user-1', roleId: role.value.id, assignedBy: 'admin' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value.accountId).toBe('user-1');
  });

  it('emits role.assigned event', async () => {
    const role = await createRoleUseCase({ tenantId: 't1', name: 'viewer', description: 'd' }, deps);
    deps.eventBus.emitted.length = 0;
    await assignRoleUseCase({ tenantId: 't1', accountId: 'u1', roleId: role.value.id, assignedBy: 'admin' }, deps);
    expect(deps.eventBus.emitted.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 3. Policy Management (5 tests)
// ═══════════════════════════════════════════
describe('Policy Management', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a deny policy', async () => {
    const r = await createPolicyUseCase({ tenantId: 't1', name: 'deny-after-hours', description: 'd', effect: 'deny', permissionPattern: 'resource.*' }, deps);
    expect(r.ok).toBe(true);
    expect(r.value.effect).toBe('deny');
  });

  it('creates an allow policy with priority', async () => {
    const r = await createPolicyUseCase({ tenantId: 't1', name: 'allow-vip', description: 'd', effect: 'allow', permissionPattern: 'resource.*', priority: 100 }, deps);
    expect(r.ok).toBe(true);
    expect(r.value.priority).toBe(100);
  });

  it('fails on missing name', async () => {
    const r = await createPolicyUseCase({ tenantId: 't1', name: '', description: 'd', effect: 'allow', permissionPattern: 'x.y' }, deps);
    expect(r.ok).toBe(false);
  });

  it('emits policy.created event', async () => {
    deps.eventBus.emitted.length = 0;
    await createPolicyUseCase({ tenantId: 't1', name: 'p1', description: 'd', effect: 'allow', permissionPattern: 'x.y' }, deps);
    expect(deps.eventBus.emitted.length).toBe(1);
  });

  it('policy defaults to enabled', async () => {
    const r = await createPolicyUseCase({ tenantId: 't1', name: 'p2', description: 'd', effect: 'allow', permissionPattern: 'x.y' }, deps);
    expect(r.value.enabled).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 4. Permission String Utilities (6 tests)
// ═══════════════════════════════════════════
describe('Permission String Utilities', () => {
  it('builds permission key', () => {
    expect(buildPermissionKey('resource', 'create')).toBe('resource.create');
  });

  it('parses permission key', () => {
    const p = parsePermissionKey('resource.create');
    expect(p.resource).toBe('resource');
    expect(p.action).toBe('create');
  });

  it('matches exact permission', () => {
    expect(matchesPermission('resource.create', 'resource.create')).toBe(true);
  });

  it('matches wildcard action', () => {
    expect(matchesPermission('resource.*', 'resource.create')).toBe(true);
  });

  it('does not match different resource', () => {
    expect(matchesPermission('resource.*', 'other.create')).toBe(false);
  });

  it('crudPermissions generates CRUD keys', () => {
    const perms = crudPermissions('resource');
    expect(perms.length).toBeGreaterThanOrEqual(4);
    expect(perms).toContain('resource.create');
    expect(perms).toContain('resource.read');
    expect(perms).toContain('resource.update');
    expect(perms).toContain('resource.delete');
  });
});

// ═══════════════════════════════════════════
// 5. authorize (RBAC) (6 tests)
// ═══════════════════════════════════════════
describe('authorize (RBAC)', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('allows when user has matching permission via role', async () => {
    await setupBasicRoleAndPermissions(deps);
    const decision = await authorizeUseCase(
      { tenantId: 't1', accountId: 'user-1', permission: 'resource.create' },
      deps,
    );
    expect(decision.decision).toBe('allow');
  });

  it('denies when user has no role assignment', async () => {
    const decision = await authorizeUseCase(
      { tenantId: 't1', accountId: 'unknown', permission: 'resource.create' },
      deps,
    );
    expect(decision.decision).toBe('deny');
  });

  it('denies when permission not assigned to role', async () => {
    await setupBasicRoleAndPermissions(deps);
    const decision = await authorizeUseCase(
      { tenantId: 't1', accountId: 'user-1', permission: 'resource.delete' },
      deps,
    );
    expect(decision.decision).toBe('deny');
  });

  it('allows wildcard permission', async () => {
    const role = await createRoleUseCase({ tenantId: 't1', name: 'superadmin', description: 'd' }, deps);
    await assignPermissionToRoleUseCase({ tenantId: 't1', roleId: role.value.id, permissionKey: 'resource.*' }, deps);
    await assignRoleUseCase({ tenantId: 't1', accountId: 'user-2', roleId: role.value.id, assignedBy: 'system' }, deps);
    const decision = await authorizeUseCase(
      { tenantId: 't1', accountId: 'user-2', permission: 'resource.delete' },
      deps,
    );
    expect(decision.decision).toBe('allow');
  });

  it('returns evaluationTimeMs', async () => {
    await setupBasicRoleAndPermissions(deps);
    const decision = await authorizeUseCase(
      { tenantId: 't1', accountId: 'user-1', permission: 'resource.create' },
      deps,
    );
    expect(decision.evaluationTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('records reason detail', async () => {
    await setupBasicRoleAndPermissions(deps);
    const decision = await authorizeUseCase(
      { tenantId: 't1', accountId: 'user-1', permission: 'resource.create' },
      deps,
    );
    expect(decision.reasonDetail).toBeDefined();
    expect(decision.reasonDetail.code).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// 6. Decision Engine API (4 tests)
// ═══════════════════════════════════════════
describe('Decision Engine API', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('can() returns true for allowed permission', async () => {
    await setupBasicRoleAndPermissions(deps);
    const result = await can(
      { tenantId: 't1', accountId: 'user-1', permission: 'resource.create' },
      deps,
    );
    expect(result).toBe(true);
  });

  it('cannot() returns true for denied permission', async () => {
    await setupBasicRoleAndPermissions(deps);
    const result = await cannot(
      { tenantId: 't1', accountId: 'user-1', permission: 'resource.delete' },
      deps,
    );
    expect(result).toBe(true);
  });

  it('evaluate() returns full decision', async () => {
    await setupBasicRoleAndPermissions(deps);
    const result = await evaluate(
      { tenantId: 't1', accountId: 'user-1', permission: 'resource.read' },
      deps,
    );
    expect(result.decision.decision).toBeDefined();
    expect(result.decision.matchedRules).toBeDefined();
    expect(result.resolution).toBeDefined();
  });

  it('explain() returns detailed reasoning', async () => {
    await setupBasicRoleAndPermissions(deps);
    const result = await explain(
      { tenantId: 't1', accountId: 'user-1', permission: 'resource.read' },
      deps,
    );
    expect(result.decision).toBe('allow');
    expect(result.roles.length).toBeGreaterThan(0);
    expect(result.matchedPermissions).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// 7. Simulator (4 tests)
// ═══════════════════════════════════════════
describe('Permission Simulator', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('simulates real user permissions', async () => {
    await setupBasicRoleAndPermissions(deps);
    const result = await simulatePermissionsUseCase(
      { tenantId: 't1', accountId: 'user-1', permissions: ['resource.create', 'resource.read', 'resource.delete'] },
      deps,
    );
    expect(result.results.length).toBe(3);
    expect(result.results[0]!.decision).toBe('allow');
    expect(result.results[2]!.decision).toBe('deny');
  });

  it('returns roles in result', async () => {
    await setupBasicRoleAndPermissions(deps);
    const result = await simulatePermissionsUseCase(
      { tenantId: 't1', accountId: 'user-1', permissions: ['resource.read'] },
      deps,
    );
    expect(result.roles).toContain('admin');
  });

  it('whatIf evaluates virtual roles without DB changes', async () => {
    // Create role + permissions but DON'T assign to user
    const role = await createRoleUseCase({ tenantId: 't1', name: 'test-virtual', description: 'd' }, deps);
    await assignPermissionToRoleUseCase({ tenantId: 't1', roleId: role.value.id, permissionKey: 'special.action' }, deps);

    // WhatIf with virtual role
    const result = await whatIfUseCase(
      { tenantId: 't1', roles: [role.value.id], permissions: ['special.action'] },
      deps,
    );
    expect(result.results.length).toBe(1);
    expect(result.results[0]!.decision).toBe('allow');
  });

  it('whatIf returns empty for no roles', async () => {
    const result = await whatIfUseCase(
      { tenantId: 't1', roles: [], permissions: ['x.y'] },
      deps,
    );
    expect(result.results[0]!.decision).toBe('deny');
  });
});

// ═══════════════════════════════════════════
// 8. Multi-Tenant Isolation (3 tests)
// ═══════════════════════════════════════════
describe('Multi-Tenant Isolation', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('roles are isolated per tenant', async () => {
    await createRoleUseCase({ tenantId: 't1', name: 'admin', description: 'd' }, deps);
    await createRoleUseCase({ tenantId: 't2', name: 'admin', description: 'd' }, deps);
    const t1Roles = await deps.roleRepository.findByTenant('t1');
    const t2Roles = await deps.roleRepository.findByTenant('t2');
    expect(t1Roles.length).toBe(1);
    expect(t2Roles.length).toBe(1);
    expect(t1Roles[0]!.id).not.toBe(t2Roles[0]!.id);
  });

  it('same role name allowed in different tenants', async () => {
    const r1 = await createRoleUseCase({ tenantId: 't1', name: 'manager', description: 'd' }, deps);
    const r2 = await createRoleUseCase({ tenantId: 't2', name: 'manager', description: 'd' }, deps);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it('user in tenant A cannot be found in tenant B', async () => {
    const role = await createRoleUseCase({ tenantId: 't1', name: 'admin', description: 'd' }, deps);
    await assignRoleUseCase({ tenantId: 't1', accountId: 'user-1', roleId: role.value.id, assignedBy: 'sys' }, deps);
    const t2Assignments = await deps.roleAssignmentRepository.findByAccount('t2', 'user-1');
    expect(t2Assignments.length).toBe(0);
  });
});
