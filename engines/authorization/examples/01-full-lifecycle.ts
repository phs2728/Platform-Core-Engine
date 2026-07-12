/**
 * Authorization Engine — Demo
 */
import {
  createRoleUseCase,
  assignPermissionToRoleUseCase,
  assignRoleUseCase,
  createPolicyUseCase,
  authorizeUseCase,
  can,
  explain,
  InMemoryRoleRepository,
  InMemoryRolePermissionRepository,
  InMemoryRoleAssignmentRepository,
  InMemoryPolicyRepository,
  InMemoryAuditLogRepository,
} from '../src/index.js';

async function main() {
  console.log('═══ Authorization Engine — Demo ═══\n');
  let idc = 0;
  const deps = {
    roleRepository: new InMemoryRoleRepository(),
    rolePermissionRepository: new InMemoryRolePermissionRepository(),
    roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
    policyRepository: new InMemoryPolicyRepository(),
    auditLogRepository: new InMemoryAuditLogRepository(),
    idGenerator: { generate: () => `demo-${++idc}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
    eventBus: { emitted: [] as unknown[], async emit(e: unknown) { this.emitted.push(e); } },
  };

  console.log('▶ 1) Create Role');
  const role = (await createRoleUseCase({ tenantId: 'demo', name: 'admin', description: 'Admin role' }, deps)).value!;
  console.log(`  ✓ role: ${role.name}\n`);

  console.log('▶ 2) Assign Permissions');
  await assignPermissionToRoleUseCase({ tenantId: 'demo', roleId: role.id, permissionKey: 'resource.create' }, deps);
  await assignPermissionToRoleUseCase({ tenantId: 'demo', roleId: role.id, permissionKey: 'resource.read' }, deps);
  console.log('  ✓ 2 permissions assigned\n');

  console.log('▶ 3) Assign Role to User');
  await assignRoleUseCase({ tenantId: 'demo', accountId: 'user-1', roleId: role.id, assignedBy: 'system' }, deps);
  console.log('  ✓ user-1 → admin\n');

  console.log('▶ 4) Authorize');
  const allow = await authorizeUseCase({ tenantId: 'demo', accountId: 'user-1', permission: 'resource.create' }, deps);
  console.log(`  ✓ resource.create → ${allow.decision}\n`);

  console.log('▶ 5) can() Check');
  const canRead = await can({ tenantId: 'demo', accountId: 'user-1', permission: 'resource.read' }, deps);
  console.log(`  ✓ can resource.read: ${canRead}\n`);

  console.log('▶ 6) Explain');
  const exp = await explain({ tenantId: 'demo', accountId: 'user-1', permission: 'resource.create' }, deps);
  console.log(`  ✓ decision=${exp.decision}, roles=[${exp.roles.join(', ')}]\n`);

  console.log(`═══ Events: ${deps.eventBus.emitted.length} ═══`);
}
main().catch(console.error);
