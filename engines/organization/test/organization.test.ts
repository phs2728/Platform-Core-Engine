/**
 * Organization Engine — Sprint 1 MVP Tests
 *
 * 사장님 spec §Tests "최소 35개 이상" 요구.
 * 14개 필수 영역 모두 커버.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOrganizationUseCase,
  updateOrganizationUseCase,
  archiveOrganizationUseCase,
  restoreOrganizationUseCase,
  deleteOrganizationUseCase,
  getOrganizationUseCase,
  searchOrganizationsUseCase,
  listOrganizationsUseCase,
  updateOrganizationProfileUseCase,
  changeOrganizationStatusUseCase,
  changeOrganizationTypeUseCase,
  addMemberUseCase,
  removeMemberUseCase,
  changeMembershipUseCase,
  listMembersUseCase,
  createBranchUseCase,
  createDepartmentUseCase,
  createTeamUseCase,
  moveDepartmentUseCase,
  moveTeamUseCase,
  checkMoveCreatesCycle,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

// ═══════════════════════════════════════════
// 1) 조직 생성 (Organization Creation)
// ═══════════════════════════════════════════

describe('createOrganizationUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a basic organization with required fields', async () => {
    const r = await createOrganizationUseCase(
      {
        tenantId: 't-1',
        correlationId: 'r-1',
        actorId: 'system',
        displayName: 'ACME Travel Co.',
        type: 'Commercial',
      },
      deps,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.organizationId).toMatch(/^id-/);
      expect(typeof r.value.createdAt).toBe('string');
    }
    expect(deps.eventBus.countByType('organization.created')).toBe(1);
  });

  it('creates organization with full profile (businessNumber, taxNumber, etc.)', async () => {
    const r = await createOrganizationUseCase(
      {
        tenantId: 't-1',
        correlationId: 'r-1',
        actorId: 'system',
        displayName: 'Property Alpha',
        legalName: 'Hilton Worldwide Holdings Inc.',
        businessNumber: '123-45-67890',
        taxNumber: 'TAX-KR-9876',
        website: 'https://hilton.example.com',
        logo: 'https://cdn.example.com/hilton.png',
        brandColor: '#003580',
        industry: 'Hospitality',
        description: 'Luxury hospitality chain',
        country: 'KR',
        primaryEmail: 'contact@hilton.example.com',
        primaryPhone: '+82-2-1234-5678',
        type: 'Hospitality',
      },
      deps,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects invalid country code', async () => {
    const r = await createOrganizationUseCase(
      {
        tenantId: 't-1',
        correlationId: 'r-1',
        actorId: 'system',
        displayName: 'Bad Country',
        type: 'Commercial',
        country: 'KO',
      },
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('PLATFORM_VALIDATION_FAILED');
    }
  });

  it('rejects invalid HEX color', async () => {
    const r = await createOrganizationUseCase(
      {
        tenantId: 't-1',
        correlationId: 'r-1',
        actorId: 'system',
        displayName: 'Bad Color',
        type: 'Commercial',
        brandColor: 'not-a-hex',
      },
      deps,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate businessNumber in same tenant', async () => {
    const first = await createOrganizationUseCase(
      {
        tenantId: 't-1',
        correlationId: 'r-1',
        actorId: 'system',
        displayName: 'ACME',
        businessNumber: '111-22-33333',
        type: 'Commercial',
      },
      deps,
    );
    expect(first.ok).toBe(true);

    const r = await createOrganizationUseCase(
      {
        tenantId: 't-1',
        correlationId: 'r-2',
        actorId: 'system',
        displayName: 'Other ACME',
        businessNumber: '111-22-33333',
        type: 'Commercial',
      },
      deps,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('PLATFORM_CONFLICT');
    }
  });

  it('allows same businessNumber across different tenants', async () => {
    deps.policyProvider.set('t-2', { allowedCountries: ['KR'] });
    const a = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'A', businessNumber: '111', type: 'Commercial' }, deps);
    const b = await createOrganizationUseCase(
      { tenantId: 't-2', correlationId: 'r-2', actorId: 'system',
        displayName: 'B', businessNumber: '111', type: 'Commercial' }, deps);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it('rejects when policy disallows the organization type', async () => {
    deps.policyProvider.set('t-1', { allowedTypes: ['Religious'] });
    const r = await createOrganizationUseCase(
      {
        tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Property', type: 'Hospitality',
      }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects when policy disallows the country', async () => {
    deps.policyProvider.set('t-1', { allowedCountries: ['KR'] });
    const r = await createOrganizationUseCase(
      {
        tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'US Property', type: 'Hospitality', country: 'US',
      }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown primaryAddressId', async () => {
    const r = await createOrganizationUseCase(
      {
        tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Org', type: 'Commercial', primaryAddressId: 'addr-1',
      }, deps);
    expect(r.ok).toBe(false);
  });

  it('accepts known primaryAddressId', async () => {
    deps.addressVerifier.add('t-1', 'addr-1');
    const r = await createOrganizationUseCase(
      {
        tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Org', type: 'Commercial', primaryAddressId: 'addr-1',
      }, deps);
    expect(r.ok).toBe(true);
  });

  it('records audit with created displayName and type', async () => {
    await createOrganizationUseCase(
      {
        tenantId: 't-1', correlationId: 'r-1', actorId: 'admin-1',
        displayName: 'Audited Org', type: 'NonProfit',
      }, deps);
    const records = await deps.auditRepo.findByTenant('t-1');
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[0].eventType).toBe('organization_created');
    expect(records[0].metadata.displayName).toBe('Audited Org');
  });
});

// ═══════════════════════════════════════════
// 2) Update Organization
// ═══════════════════════════════════════════

describe('updateOrganizationUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  let orgId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Original', businessNumber: '000-00-00000',
        type: 'Commercial' }, deps);
    if (!r.ok) throw new Error('setup failed');
    orgId = r.value.organizationId;
  });

  it('updates displayName and other profile fields', async () => {
    const r = await updateOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, displayName: 'Renamed',
        description: 'New description', industry: 'Tech' },
      deps,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.profile.displayName).toBe('Renamed');
      expect(r.value.profile.description).toBe('New description');
      expect(r.value.profile.industry).toBe('Tech');
      // 보존된 필드
      expect(r.value.profile.businessNumber).toBe('000-00-00000');
    }
  });

  it('returns NotFound for non-existent organization', async () => {
    const r = await updateOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: 'non-existent-id', displayName: 'X' },
      deps);
    expect(r.ok).toBe(false);
  });

  it('rejects update if organization is Archived', async () => {
    await archiveOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId }, deps);
    const r = await updateOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, displayName: 'Cannot' },
      deps);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('PLATFORM_CONFLICT');
  });

  it('rejects update with duplicate businessNumber', async () => {
    const second = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'system',
        displayName: 'Other', businessNumber: '999-99-99999',
        type: 'Commercial' }, deps);
    if (!second.ok) throw new Error('setup');

    const r = await updateOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, businessNumber: '999-99-99999' },
      deps);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('PLATFORM_CONFLICT');
  });
});

// ═══════════════════════════════════════════
// 3) Archive / Restore / Delete
// ═══════════════════════════════════════════

describe('Archive / Restore / Delete lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  let orgId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Org', type: 'Commercial' }, deps);
    if (!r.ok) throw new Error('setup');
    orgId = r.value.organizationId;
  });

  it('archives organization and sets status to Archived', async () => {
    const r = await archiveOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe('Archived');
      expect(r.value.archivedAt).not.toBeNull();
    }
    expect(deps.eventBus.countByType('organization.archived')).toBe(1);
  });

  it('rejects double archive', async () => {
    await archiveOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId }, deps);
    const r = await archiveOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId }, deps);
    expect(r.ok).toBe(false);
  });

  it('restores archived organization to Active', async () => {
    await archiveOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId }, deps);
    const r = await restoreOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe('Active');
      expect(r.value.archivedAt).toBeNull();
    }
  });

  it('rejects restore of an Active organization', async () => {
    const r = await restoreOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId }, deps);
    expect(r.ok).toBe(false);
  });

  it('soft-deletes organization (sets status=Deleted, deletedAt=now)', async () => {
    const r = await deleteOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.deletedAt).not.toBe('');
    }
    expect(deps.eventBus.countByType('organization.deleted')).toBe(1);
  });

  it('rejects double delete', async () => {
    await deleteOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId }, deps);
    const r = await deleteOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 4) Status Change
// ═══════════════════════════════════════════

describe('changeOrganizationStatusUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  async function makeOrg(initialStatus: 'Pending' | 'Active' = 'Active') {
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Org', type: 'Commercial',
        ...(initialStatus === 'Pending' ? { initialStatus: 'Pending' } : {}) },
      deps);
    if (!r.ok) throw new Error('setup');
    return r.value.organizationId;
  }

  it('changes Active → Suspended', async () => {
    const orgId = await makeOrg();
    const r = await changeOrganizationStatusUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, newStatus: 'Suspended' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe('Suspended');
  });

  it('changes Suspended → Active', async () => {
    const orgId = await makeOrg();
    await changeOrganizationStatusUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, newStatus: 'Suspended' }, deps);
    const r = await changeOrganizationStatusUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, newStatus: 'Active' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects Pending → Suspended (not allowed)', async () => {
    const orgId = await makeOrg('Pending');
    const r = await changeOrganizationStatusUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, newStatus: 'Suspended' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects same-status transition (Active → Active)', async () => {
    const orgId = await makeOrg();
    const r = await changeOrganizationStatusUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, newStatus: 'Active' }, deps);
    expect(r.ok).toBe(false);
  });

  it('emits organization.status.changed event', async () => {
    const orgId = await makeOrg();
    deps.eventBus.clear();
    await changeOrganizationStatusUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, newStatus: 'Suspended' }, deps);
    expect(deps.eventBus.countByType('organization.status.changed')).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 5) Type Change
// ═══════════════════════════════════════════

describe('changeOrganizationTypeUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('changes Commercial → Hospitality', async () => {
    const created = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Biz', type: 'Commercial' }, deps);
    if (!created.ok) throw new Error('setup');
    const r = await changeOrganizationTypeUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: created.value.organizationId, newType: 'Hospitality' },
      deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.type).toBe('Hospitality');
  });

  it('rejects same-type transition', async () => {
    const created = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'X', type: 'Commercial' }, deps);
    if (!created.ok) throw new Error('setup');
    const r = await changeOrganizationTypeUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: created.value.organizationId, newType: 'Commercial' },
      deps);
    expect(r.ok).toBe(false);
  });

  it('rejects type not allowed by policy', async () => {
    deps.policyProvider.set('t-1', { allowedTypes: ['Religious'] });
    const created = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'X', type: 'Religious' }, deps);
    if (!created.ok) throw new Error('setup');

    // policy를 추가로 좁혀 Commercial로의 변경 거부
    deps.policyProvider.set('t-1', { allowedTypes: ['Religious'] });
    const r = await changeOrganizationTypeUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: created.value.organizationId, newType: 'Commercial' },
      deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 6) Membership
// ═══════════════════════════════════════════

describe('Membership UseCases', () => {
  let deps: ReturnType<typeof makeDeps>;
  let orgId: string;
  beforeEach(async () => {
    deps = makeDeps();
    deps.userVerifier.add('t-1', 'user-1');
    deps.userVerifier.add('t-1', 'user-2');
    deps.userVerifier.add('t-1', 'user-owner');
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Co', type: 'Commercial' }, deps);
    if (!r.ok) throw new Error('setup');
    orgId = r.value.organizationId;
  });

  it('addMember adds first member as active', async () => {
    const r = await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-owner', membershipType: 'Owner' },
      deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe('active');
      expect(r.value.membershipType).toBe('Owner');
    }
    expect(deps.eventBus.countByType('organization.member.added')).toBe(1);
  });

  it('addMember rejects unknown user', async () => {
    const r = await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'unknown-user', membershipType: 'Member' },
      deps);
    expect(r.ok).toBe(false);
  });

  it('addMember rejects duplicate active membership', async () => {
    await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-owner', membershipType: 'Owner' },
      deps);
    const r = await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-owner', membershipType: 'Administrator' },
      deps);
    expect(r.ok).toBe(false);
  });

  it('addMember supports re-join after leave', async () => {
    await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-owner', membershipType: 'Owner' },
      deps);
    await removeMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-owner' }, deps);
    const r = await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-owner', membershipType: 'Manager' },
      deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.membershipType).toBe('Manager');
  });

  it('addMember rejects when policy maxMembers reached', async () => {
    deps.policyProvider.set('t-1', { maxMembers: 1 });
    await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-1', membershipType: 'Employee' },
      deps);
    const r = await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-2', membershipType: 'Employee' },
      deps);
    expect(r.ok).toBe(false);
  });

  it('removeMember sets status to left and supports future re-join', async () => {
    const add = await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-1', membershipType: 'Employee' },
      deps);
    expect(add.ok).toBe(true);

    const r = await removeMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-1' }, deps);
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('organization.member.removed')).toBe(1);

    // Active 검색 불가
    const list = await deps.membershipRepo.listByOrg('t-1', orgId, { status: 'active' });
    expect(list.some((m) => m.userId === 'user-1')).toBe(false);
  });

  it('removeMember on non-existent membership returns NotFound', async () => {
    const r = await removeMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'never-added' }, deps);
    expect(r.ok).toBe(false);
  });

  it('changeMembership updates type', async () => {
    await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-1', membershipType: 'Employee' },
      deps);
    const r = await changeMembershipUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-1', newMembershipType: 'Manager' },
      deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.membershipType).toBe('Manager');
  });

  it('changeMembership rejects same type', async () => {
    await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-1', membershipType: 'Employee' },
      deps);
    const r = await changeMembershipUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-1', newMembershipType: 'Employee' },
      deps);
    expect(r.ok).toBe(false);
  });

  it('listMembers filters by type and status', async () => {
    await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-owner', membershipType: 'Owner' }, deps);
    await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-1', membershipType: 'Employee' }, deps);
    await removeMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-4', actorId: 'admin-1',
        organizationId: orgId, userId: 'user-1' }, deps);

    const owners = await listMembersUseCase(
      { tenantId: 't-1', organizationId: orgId, membershipType: 'Owner' }, deps);
    expect(owners.ok).toBe(true);
    if (owners.ok) {
      expect(owners.value.every((m) => m.membershipType === 'Owner')).toBe(true);
    }

    const left = await listMembersUseCase(
      { tenantId: 't-1', organizationId: orgId, status: 'left' }, deps);
    expect(left.ok).toBe(true);
    if (left.ok) {
      expect(left.value.some((m) => m.userId === 'user-1' && m.status === 'left')).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════
// 7) Branch / Department / Team Creation
// ═══════════════════════════════════════════

describe('Branch / Department / Team Creation', () => {
  let deps: ReturnType<typeof makeDeps>;
  let orgId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'ACME HQ', type: 'Hospitality' }, deps);
    if (!r.ok) throw new Error('setup');
    orgId = r.value.organizationId;
  });

  it('creates a Branch under organization', async () => {
    const r = await createBranchUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, name: 'Seoul HQ' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.parentType).toBe('organization');
      expect(r.value.parentId).toBe(orgId);
    }
    expect(deps.eventBus.countByType('organization.branch.created')).toBe(1);
  });

  it('creates a Department under organization', async () => {
    const r = await createDepartmentUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, name: 'Operations' }, deps);
    expect(r.ok).toBe(true);
  });

  it('creates a Team under organization', async () => {
    const r = await createTeamUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, name: 'Front Desk' }, deps);
    expect(r.ok).toBe(true);
  });

  it('creates nested departments (department → department)', async () => {
    const ops = await createDepartmentUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin-1',
        organizationId: orgId, name: 'Operations' }, deps);
    expect(ops.ok).toBe(true);
    if (!ops.ok) return;

    const opsMain = await createDepartmentUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, parentType: 'department', parentId: ops.value.id,
        name: 'Ops Main' }, deps);
    expect(opsMain.ok).toBe(true);
    if (opsMain.ok) {
      expect(opsMain.value.parentId).toBe(ops.value.id);
    }
  });

  it('rejects child creation when organization is Archived', async () => {
    await archiveOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin-1',
        organizationId: orgId }, deps);
    const r = await createBranchUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, name: 'Archived Branch' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects when policy maxBranches reached', async () => {
    deps.policyProvider.set('t-1', { maxBranches: 1 });
    await createBranchUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin-1',
        organizationId: orgId, name: 'B1' }, deps);
    const r = await createBranchUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, name: 'B2' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects when parentType does not match parentId', async () => {
    const r = await createBranchUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin-1',
        organizationId: orgId, parentType: 'organization', parentId: 'wrong-id',
        name: 'Bad' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 8) Cycle Detection
// ═══════════════════════════════════════════

describe('Cycle Detection on Move', () => {
  let deps: ReturnType<typeof makeDeps>;
  let orgId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Org', type: 'Commercial' }, deps);
    if (!r.ok) throw new Error('setup');
    orgId = r.value.organizationId;
  });

  it('moveDepartment detects cycle (Department cannot be moved under its own child)', async () => {
    const a = await createDepartmentUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin-1',
        organizationId: orgId, name: 'A' }, deps);
    if (!a.ok) throw new Error('setup');
    const b = await createDepartmentUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, parentType: 'department', parentId: a.value.id,
        name: 'B' }, deps);
    if (!b.ok) throw new Error('setup');

    // Try to move A under B (would create cycle)
    const r = await moveDepartmentUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, departmentId: a.value.id,
        newParentType: 'department', newParentId: b.value.id }, deps);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('PLATFORM_CONFLICT');
  });

  it('moveTeam detects cycle', async () => {
    const t1 = await createTeamUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin-1',
        organizationId: orgId, name: 'T1' }, deps);
    if (!t1.ok) throw new Error('setup');
    const t2 = await createTeamUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, parentType: 'team', parentId: t1.value.id,
        name: 'T2' }, deps);
    if (!t2.ok) throw new Error('setup');

    // Try to move T1 under T2
    const r = await moveTeamUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId, teamId: t1.value.id,
        newParentType: 'team', newParentId: t2.value.id }, deps);
    expect(r.ok).toBe(false);
  });

  it('checkMoveCreatesCycle returns false when move is safe', async () => {
    const a = await createDepartmentUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin-1',
        organizationId: orgId, name: 'A' }, deps);
    const b = await createDepartmentUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId, parentType: 'department', parentId: a.value.id,
        name: 'B' }, deps);
    if (!a.ok || !b.ok) throw new Error('setup');

    // Move B to top-level — no cycle
    const r = await checkMoveCreatesCycle(
      't-1', orgId, 'department', b.value.id,
      { parentType: 'organization', parentId: orgId },
      { departmentRepo: deps.departmentRepo, branchRepo: deps.branchRepo, teamRepo: deps.teamRepo },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(false); // no cycle
  });
});

// ═══════════════════════════════════════════
// 9) Search
// ═══════════════════════════════════════════

describe('searchOrganizationsUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(async () => {
    deps = makeDeps();
    await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Property Alpha', businessNumber: '111', type: 'Hospitality',
        country: 'KR', industry: 'Hospitality' }, deps);
    await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'system',
        displayName: 'Property Beta', businessNumber: '222', type: 'Hospitality',
        country: 'KR', industry: 'Hospitality' }, deps);
    await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'system',
        displayName: 'Property Gamma', businessNumber: '333', type: 'Hospitality',
        country: 'JP', industry: 'Hospitality' }, deps);
  });

  it('searches by query (displayName partial match)', async () => {
    const r = await searchOrganizationsUseCase(
      { tenantId: 't-1', query: 'Property' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.total).toBe(3);
  });

  it('searches by country', async () => {
    const r = await searchOrganizationsUseCase(
      { tenantId: 't-1', country: 'KR' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.total).toBe(2);
      expect(r.value.organizations.every((o) => o.profile.country === 'KR')).toBe(true);
    }
  });

  it('searches by businessNumber (exact match)', async () => {
    const r = await searchOrganizationsUseCase(
      { tenantId: 't-1', businessNumber: '333' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.total).toBe(1);
      expect(r.value.organizations[0].profile.displayName).toBe('Property Gamma');
    }
  });

  it('searches by memberUserId', async () => {
    deps.userVerifier.add('t-1', 'user-x');
    const orgs = await searchOrganizationsUseCase(
      { tenantId: 't-1', query: 'Property Alpha' }, deps);
    if (!orgs.ok) throw new Error('setup');
    const targetOrg = orgs.value.organizations[0];

    await addMemberUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'admin-1',
        organizationId: targetOrg.id, userId: 'user-x', membershipType: 'Manager' },
      deps);

    const r = await searchOrganizationsUseCase(
      { tenantId: 't-1', memberUserId: 'user-x' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.total).toBe(1);
      expect(r.value.organizations[0].id).toBe(targetOrg.id);
    }
  });

  it('listOrganizations returns paginated result', async () => {
    const r = await listOrganizationsUseCase(
      { tenantId: 't-1', limit: 2, offset: 0 }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.total).toBe(3);
      expect(r.value.organizations.length).toBe(2);
    }
  });
});

// ═══════════════════════════════════════════
// 10) EventEnvelope 발행
// ═══════════════════════════════════════════

describe('Event Envelope Emission', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('emits 11 fields per envelope (Core SDK standard)', async () => {
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Event Test', type: 'Commercial' }, deps);
    expect(r.ok).toBe(true);
    const emitted = deps.eventBus.byType('organization.created');
    expect(emitted.length).toBe(1);
    const env = emitted[0].envelope;
    // 11 필드 강제
    expect(env.eventId).toBeDefined();
    expect(env.aggregateId).toBeDefined();
    expect(env.occurredAt).toBeDefined();
    expect(env.version).toBe('1.0.0');
    expect(env.tenantId).toBe('t-1');
    expect(env.correlationId).toBe('r-1');
    expect(typeof env.causationId).toBe('string');
    expect(env.engine).toBe('organization');
    expect(env.eventType).toBe('organization.created');
    expect(env.schemaRef).toBe('organization.created.v1');
    expect(env.payload).toBeDefined();
  });

  it('engine field is always "organization"', async () => {
    await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'A', type: 'Commercial' }, deps);
    deps.eventBus.clear();
    await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'system',
        displayName: 'B', type: 'Commercial' }, deps);
    for (const r of deps.eventBus.emitted) {
      expect(r.envelope.engine).toBe('organization');
    }
  });
});

// ═══════════════════════════════════════════
// 11) Audit
// ═══════════════════════════════════════════

describe('Audit Trail', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit for create', async () => {
    await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'A', type: 'Commercial' }, deps);
    const records = await deps.auditRepo.findByTenant('t-1');
    expect(records.some((r) => r.eventType === 'organization_created')).toBe(true);
  });

  it('records audit for archive + restore', async () => {
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'A', type: 'Commercial' }, deps);
    if (!r.ok) throw new Error('setup');
    const orgId = r.value.organizationId;
    await archiveOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: orgId }, deps);
    await restoreOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-3', actorId: 'admin-1',
        organizationId: orgId }, deps);
    const records = await deps.auditRepo.findByOrganization('t-1', orgId);
    const types = records.map((r) => r.eventType);
    expect(types).toContain('organization_archived');
    expect(types).toContain('organization_restored');
  });

  it('audit records include actorId', async () => {
    await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'specific-admin',
        displayName: 'A', type: 'Commercial' }, deps);
    const records = await deps.auditRepo.findByTenant('t-1');
    expect(records[0].actorId).toBe('specific-admin');
  });
});

// ═══════════════════════════════════════════
// 12) Repository Multi-Tenancy
// ═══════════════════════════════════════════

describe('Repository Tenant Isolation', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('isolates organizations across tenants (same businessNumber allowed)', async () => {
    deps.policyProvider.set('t-2', { allowedCountries: ['KR'] });
    const a = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'A', businessNumber: '111', type: 'Commercial' }, deps);
    const b = await createOrganizationUseCase(
      { tenantId: 't-2', correlationId: 'r-2', actorId: 'system',
        displayName: 'B', businessNumber: '111', type: 'Commercial' }, deps);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it('getOrganization returns null for wrong tenant', async () => {
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'A', type: 'Commercial' }, deps);
    if (!r.ok) throw new Error();
    const got = await getOrganizationUseCase(
      { tenantId: 't-2', organizationId: r.value.organizationId }, deps);
    if (got.ok) expect(got.value).toBeNull();
  });
});

// ═══════════════════════════════════════════
// 13) Result<T, E> / UseCase invariant: never throws
// ═══════════════════════════════════════════

describe('UseCase Throw-Never Invariant', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('returns Result.not_ok instead of throwing on error', async () => {
    try {
      const r = await createOrganizationUseCase(
        // missing displayName
        { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
          displayName: '', type: 'Commercial' } as unknown as Parameters<typeof createOrganizationUseCase>[0],
        deps);
      expect(r.ok).toBe(false);
    } catch (e) {
      throw new Error(`UseCase must not throw: ${e}`);
    }
  });
});

// ═══════════════════════════════════════════
// 14) updateOrganizationProfile
// ═══════════════════════════════════════════

describe('updateOrganizationProfileUseCase', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('updates entire profile', async () => {
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Old', type: 'Commercial' }, deps);
    if (!r.ok) throw new Error('setup');

    const up = await updateOrganizationProfileUseCase(
      {
        tenantId: 't-1',
        correlationId: 'r-2',
        actorId: 'admin-1',
        organizationId: r.value.organizationId,
        profile: {
          displayName: 'Brand New',
          legalName: 'Brand New Co., Ltd.',
          website: 'https://brandnew.example.com',
          industry: 'Tech',
          description: 'SaaS platform',
        },
      },
      deps,
    );
    expect(up.ok).toBe(true);
    if (up.ok) {
      expect(up.value.profile.displayName).toBe('Brand New');
      expect(up.value.profile.industry).toBe('Tech');
    }
  });

  it('emits organization.profile.updated event', async () => {
    const r = await createOrganizationUseCase(
      { tenantId: 't-1', correlationId: 'r-1', actorId: 'system',
        displayName: 'Old', type: 'Commercial' }, deps);
    if (!r.ok) throw new Error('setup');
    deps.eventBus.clear();

    await updateOrganizationProfileUseCase(
      {
        tenantId: 't-1', correlationId: 'r-2', actorId: 'admin-1',
        organizationId: r.value.organizationId,
        profile: { displayName: 'Updated' },
      }, deps);
    expect(deps.eventBus.countByType('organization.profile.updated')).toBe(1);
  });
});
