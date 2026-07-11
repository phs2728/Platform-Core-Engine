/**
 * Organization Engine — Demo: Full Lifecycle
 *
 * 사장님 spec §Demo:
 *   Create Organization
 *     → Create Branch
 *     → Create Department
 *     → Create Team
 *     → Add Member
 *     → Get Organization
 *     → Archive Organization
 *     → Restore Organization
 *
 * 이 예제 = 실행 가능한 코드.
 * `pnpm example-test` 또는 `tsx engines/organization/examples/01-full-lifecycle.ts`
 *
 * 실제 deployed system에서 Host는 다음을 진짜 구현으로 교체:
 *   - organizationRepo / departmentRepo / branchRepo / teamRepo / membershipRepo /
 *     auditRepo → 진짜 DB Adapter
 *   - eventBus → Event Bus Engine
 *   - userVerifier → User Engine 호출
 *   - addressVerifier → Address Engine 호출
 *   - policyProvider → Policy Engine 호출
 *
 * 예제에서는 InMemory 구현 사용.
 */

import {
  createOrganizationUseCase,
  createBranchUseCase,
  createDepartmentUseCase,
  createTeamUseCase,
  addMemberUseCase,
  getOrganizationUseCase,
  archiveOrganizationUseCase,
  restoreOrganizationUseCase,
  InMemoryOrganizationRepository,
  InMemoryDepartmentRepository,
  InMemoryBranchRepository,
  InMemoryTeamRepository,
  InMemoryMembershipRepository,
  InMemoryOrganizationAuditRepository,
  InMemoryUserVerifier,
  InMemoryAddressVerifier,
  StaticOrganizationPolicyProvider,
  InMemoryEventBus,
  type Organization,
} from '../src/index.js';

function unwrap<T>(label: string, r: { ok: boolean; value?: T; error?: unknown }) {
  if (!r.ok) {
    const err = r.error as { code?: string; message?: string };
    throw new Error(`[${label}] ${err.code ?? 'ERR'}: ${err.message ?? 'unknown'}`);
  }
  return r.value as T;
}

async function main() {
  console.log('═══ Organization Engine — Demo ═══');
  console.log('');

  // ═══════════════════════════════════════════
  // Setup (in-memory host adapters)
  // ═══════════════════════════════════════════
  const organizationRepo = new InMemoryOrganizationRepository();
  const departmentRepo = new InMemoryDepartmentRepository();
  const branchRepo = new InMemoryBranchRepository();
  const teamRepo = new InMemoryTeamRepository();
  const membershipRepo = new InMemoryMembershipRepository();
  const auditRepo = new InMemoryOrganizationAuditRepository();
  const eventBus = new InMemoryEventBus();
  const userVerifier = new InMemoryUserVerifier();
  const addressVerifier = new InMemoryAddressVerifier();
  const policyProvider = new StaticOrganizationPolicyProvider();
  policyProvider.set('demo-tenant', {
    maxMembers: 50,
    maxBranches: 10,
    maxDepartments: 20,
    allowedCountries: ['KR', 'US', 'JP', 'GE'],
  });
  userVerifier.add('demo-tenant', 'user-owner');

  let idSeq = 0;
  const deps = {
    organizationRepo,
    departmentRepo,
    branchRepo,
    teamRepo,
    membershipRepo,
    auditRepo,
    eventBus,
    userVerifier,
    addressVerifier,
    policyProvider,
    idGenerator: { generate: () => `demo-id-${++idSeq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };

  // ═══════════════════════════════════════════
  // 1) Create Organization
  // ═══════════════════════════════════════════
  console.log('▶ 1) Create Organization');
  const orgResult = unwrap('create', await createOrganizationUseCase(
    {
      tenantId: 'demo-tenant',
      correlationId: 'demo-r-1',
      actorId: 'demo-admin',
      displayName: 'AI Bridge Travel',
      legalName: 'AI Bridge Travel Co., Ltd.',
      businessNumber: 'DEMO-001',
      website: 'https://aibridge.example.com',
      brandColor: '#0066CC',
      industry: 'Travel',
      country: 'KR',
      type: 'Hospitality',
      description: 'Demo organization showcasing the full lifecycle.',
    },
    deps,
  ));
  console.log(`  ✓ organizationId = ${orgResult.organizationId}`);

  // ═══════════════════════════════════════════
  // 2) Create Branch
  // ═══════════════════════════════════════════
  console.log('');
  console.log('▶ 2) Create Branch (under organization root)');
  const branchResult = unwrap('branch', await createBranchUseCase(
    {
      tenantId: 'demo-tenant',
      correlationId: 'demo-r-2',
      actorId: 'demo-admin',
      organizationId: orgResult.organizationId,
      name: 'Seoul HQ',
      description: 'Main headquarters branch',
    },
    deps,
  ));
  console.log(`  ✓ branchId = ${branchResult.id} (parent=${branchResult.parentType}/${branchResult.parentId})`);

  // ═══════════════════════════════════════════
  // 3) Create Department
  // ═══════════════════════════════════════════
  console.log('');
  console.log('▶ 3) Create Department (under branch)');
  const deptResult = unwrap('dept', await createDepartmentUseCase(
    {
      tenantId: 'demo-tenant',
      correlationId: 'demo-r-3',
      actorId: 'demo-admin',
      organizationId: orgResult.organizationId,
      parentType: 'branch',
      parentId: branchResult.id,
      name: 'Operations',
      description: 'Day-to-day operations',
    },
    deps,
  ));
  console.log(`  ✓ departmentId = ${deptResult.id}`);

  // ═══════════════════════════════════════════
  // 4) Create Team
  // ═══════════════════════════════════════════
  console.log('');
  console.log('▶ 4) Create Team (under department)');
  const teamResult = unwrap('team', await createTeamUseCase(
    {
      tenantId: 'demo-tenant',
      correlationId: 'demo-r-4',
      actorId: 'demo-admin',
      organizationId: orgResult.organizationId,
      parentType: 'department',
      parentId: deptResult.id,
      name: 'Front Desk',
      description: 'Customer-facing team',
    },
    deps,
  ));
  console.log(`  ✓ teamId = ${teamResult.id}`);

  // ═══════════════════════════════════════════
  // 5) Add Member
  // ═══════════════════════════════════════════
  console.log('');
  console.log('▶ 5) Add Member (Owner)');
  const memberResult = unwrap('addMember', await addMemberUseCase(
    {
      tenantId: 'demo-tenant',
      correlationId: 'demo-r-5',
      actorId: 'demo-admin',
      organizationId: orgResult.organizationId,
      userId: 'user-owner',
      membershipType: 'Owner',
      title: 'Founder',
    },
    deps,
  ));
  console.log(`  ✓ membershipId = ${memberResult.id} (status=${memberResult.status})`);

  // ═══════════════════════════════════════════
  // 6) Get Organization
  // ═══════════════════════════════════════════
  console.log('');
  console.log('▶ 6) Get Organization');
  const orgAfter = unwrap('get', await getOrganizationUseCase(
    { tenantId: 'demo-tenant', organizationId: orgResult.organizationId },
    deps,
  ));
  if (!orgAfter) throw new Error('Organization not found');
  const org: Organization = orgAfter;
  console.log(`  ✓ displayName = ${org.profile.displayName}`);
  console.log(`  ✓ type = ${org.type}, status = ${org.status}`);
  console.log(`  ✓ active members = ${await membershipRepo.countActive('demo-tenant', org.id)}`);

  // ═══════════════════════════════════════════
  // 7) Archive Organization
  // ═══════════════════════════════════════════
  console.log('');
  console.log('▶ 7) Archive Organization');
  const archived = unwrap('archive', await archiveOrganizationUseCase(
    {
      tenantId: 'demo-tenant',
      correlationId: 'demo-r-7',
      actorId: 'demo-admin',
      organizationId: orgResult.organizationId,
      reason: 'Demo archive',
    },
    deps,
  ));
  console.log(`  ✓ status = ${archived.status}, archivedAt = ${archived.archivedAt}`);

  // ═══════════════════════════════════════════
  // 8) Restore Organization
  // ═══════════════════════════════════════════
  console.log('');
  console.log('▶ 8) Restore Organization');
  const restored = unwrap('restore', await restoreOrganizationUseCase(
    {
      tenantId: 'demo-tenant',
      correlationId: 'demo-r-8',
      actorId: 'demo-admin',
      organizationId: orgResult.organizationId,
    },
    deps,
  ));
  console.log(`  ✓ status = ${restored.status}, archivedAt = ${restored.archivedAt}`);

  // ═══════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════
  console.log('');
  console.log('═══ Events Emitted (count by type) ═══');
  const eventCounts = new Map<string, number>();
  for (const rec of eventBus.emitted) {
    const t = rec.envelope.eventType;
    eventCounts.set(t, (eventCounts.get(t) ?? 0) + 1);
  }
  for (const [type, count] of [...eventCounts.entries()].sort()) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('');
  console.log('═══ Audit Records (count by type) ═══');
  const audits = await auditRepo.findByTenant('demo-tenant');
  const auditCounts = new Map<string, number>();
  for (const a of audits) {
    auditCounts.set(a.eventType, (auditCounts.get(a.eventType) ?? 0) + 1);
  }
  for (const [type, count] of [...auditCounts.entries()].sort()) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('');
  console.log('═══ Demo Complete ═══');
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
