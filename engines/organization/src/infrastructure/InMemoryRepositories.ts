/**
 * InMemory Repositories — Department / Branch / Team / Membership / Audit
 *
 * 사장님 spec §Repository — 모든 5개 도메인의 InMemory 구현.
 * Multi-tenant 격리는 ${tenantId}::${id} 키 패턴.
 */

import type {
  IDepartmentRepository,
  IBranchRepository,
  ITeamRepository,
  IMembershipRepository,
  IOrganizationAuditRepository,
  Department,
  Branch,
  Team,
  Membership,
  OrganizationAuditRecord,
  HierarchyNodeType,
  MembershipType,
  MemberListCriteria,
} from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════════

function makeKey(tenantId: string, id: string): string {
  return `${tenantId}::${id}`;
}

// ════════════════════════════════════════════════════════════════════════════
// Department
// ════════════════════════════════════════════════════════════════════════════

export class InMemoryDepartmentRepository implements IDepartmentRepository {
  private readonly store = new Map<string, Department>();

  async insert(dept: Department): Promise<void> {
    const key = makeKey(dept.tenantId, dept.id);
    if (this.store.has(key)) throw new Error(`Duplicate department id: ${dept.id}`);
    this.store.set(key, dept);
  }

  async findById(tenantId: string, id: string): Promise<Department | null> {
    return this.store.get(makeKey(tenantId, id)) ?? null;
  }

  async findByParent(
    tenantId: string,
    parentType: HierarchyNodeType,
    parentId: string,
  ): Promise<Department[]> {
    const list: Department[] = [];
    for (const dept of this.store.values()) {
      if (dept.tenantId !== tenantId) continue;
      if (dept.parentType === parentType && dept.parentId === parentId) {
        list.push(dept);
      }
    }
    return list;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<Department[]> {
    const list: Department[] = [];
    for (const dept of this.store.values()) {
      if (dept.tenantId !== tenantId) continue;
      if (dept.organizationId === organizationId) list.push(dept);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Department>): Promise<void> {
    const key = makeKey(tenantId, id);
    const existing = this.store.get(key);
    if (!existing) throw new Error(`Department not found: ${id}`);
    this.store.set(key, { ...existing, ...patch });
  }

  clear(): void {
    this.store.clear();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Branch
// ════════════════════════════════════════════════════════════════════════════

export class InMemoryBranchRepository implements IBranchRepository {
  private readonly store = new Map<string, Branch>();

  async insert(branch: Branch): Promise<void> {
    const key = makeKey(branch.tenantId, branch.id);
    if (this.store.has(key)) throw new Error(`Duplicate branch id: ${branch.id}`);
    this.store.set(key, branch);
  }

  async findById(tenantId: string, id: string): Promise<Branch | null> {
    return this.store.get(makeKey(tenantId, id)) ?? null;
  }

  async findByParent(
    tenantId: string,
    parentType: HierarchyNodeType,
    parentId: string,
  ): Promise<Branch[]> {
    const list: Branch[] = [];
    for (const branch of this.store.values()) {
      if (branch.tenantId !== tenantId) continue;
      if (branch.parentType === parentType && branch.parentId === parentId) {
        list.push(branch);
      }
    }
    return list;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<Branch[]> {
    const list: Branch[] = [];
    for (const branch of this.store.values()) {
      if (branch.tenantId !== tenantId) continue;
      if (branch.organizationId === organizationId) list.push(branch);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Branch>): Promise<void> {
    const key = makeKey(tenantId, id);
    const existing = this.store.get(key);
    if (!existing) throw new Error(`Branch not found: ${id}`);
    this.store.set(key, { ...existing, ...patch });
  }

  clear(): void {
    this.store.clear();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Team
// ════════════════════════════════════════════════════════════════════════════

export class InMemoryTeamRepository implements ITeamRepository {
  private readonly store = new Map<string, Team>();

  async insert(team: Team): Promise<void> {
    const key = makeKey(team.tenantId, team.id);
    if (this.store.has(key)) throw new Error(`Duplicate team id: ${team.id}`);
    this.store.set(key, team);
  }

  async findById(tenantId: string, id: string): Promise<Team | null> {
    return this.store.get(makeKey(tenantId, id)) ?? null;
  }

  async findByParent(
    tenantId: string,
    parentType: HierarchyNodeType,
    parentId: string,
  ): Promise<Team[]> {
    const list: Team[] = [];
    for (const team of this.store.values()) {
      if (team.tenantId !== tenantId) continue;
      if (team.parentType === parentType && team.parentId === parentId) {
        list.push(team);
      }
    }
    return list;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<Team[]> {
    const list: Team[] = [];
    for (const team of this.store.values()) {
      if (team.tenantId !== tenantId) continue;
      if (team.organizationId === organizationId) list.push(team);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<Team>): Promise<void> {
    const key = makeKey(tenantId, id);
    const existing = this.store.get(key);
    if (!existing) throw new Error(`Team not found: ${id}`);
    this.store.set(key, { ...existing, ...patch });
  }

  clear(): void {
    this.store.clear();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Membership
// ════════════════════════════════════════════════════════════════════════════

export class InMemoryMembershipRepository implements IMembershipRepository {
  private readonly store = new Map<string, Membership>();

  async insert(membership: Membership): Promise<void> {
    const key = makeKey(membership.tenantId, membership.id);
    if (this.store.has(key)) throw new Error(`Duplicate membership id: ${membership.id}`);
    this.store.set(key, membership);
  }

  async findById(tenantId: string, id: string): Promise<Membership | null> {
    return this.store.get(makeKey(tenantId, id)) ?? null;
  }

  async findActive(
    tenantId: string,
    organizationId: string,
    userId: string,
  ): Promise<Membership | null> {
    for (const m of this.store.values()) {
      if (m.tenantId !== tenantId) continue;
      if (m.organizationId !== organizationId) continue;
      if (m.userId !== userId) continue;
      if (m.status === 'active') return m;
    }
    return null;
  }

  async findHistory(
    tenantId: string,
    organizationId: string,
    userId: string,
  ): Promise<Membership[]> {
    const list: Membership[] = [];
    for (const m of this.store.values()) {
      if (m.tenantId !== tenantId) continue;
      if (m.organizationId !== organizationId) continue;
      if (m.userId !== userId) continue;
      list.push(m);
    }
    return list;
  }

  async listByOrg(
    tenantId: string,
    organizationId: string,
    criteria?: Omit<MemberListCriteria, 'tenantId' | 'organizationId'>,
  ): Promise<Membership[]> {
    const list: Membership[] = [];
    for (const m of this.store.values()) {
      if (m.tenantId !== tenantId) continue;
      if (m.organizationId !== organizationId) continue;
      if (criteria?.membershipType !== undefined && m.membershipType !== criteria.membershipType) continue;
      if (criteria?.status !== undefined && m.status !== criteria.status) continue;
      list.push(m);
    }
    const offset = criteria?.offset ?? 0;
    const limit = criteria?.limit ?? list.length;
    return list.slice(offset, offset + limit);
  }

  async listByUser(tenantId: string, userId: string): Promise<Membership[]> {
    const list: Membership[] = [];
    for (const m of this.store.values()) {
      if (m.tenantId !== tenantId) continue;
      if (m.userId !== userId) continue;
      list.push(m);
    }
    return list;
  }

  async update(
    tenantId: string,
    id: string,
    patch: Partial<Membership>,
  ): Promise<void> {
    const key = makeKey(tenantId, id);
    const existing = this.store.get(key);
    if (!existing) throw new Error(`Membership not found: ${id}`);
    this.store.set(key, { ...existing, ...patch });
  }

  async countActive(tenantId: string, organizationId: string): Promise<number> {
    let n = 0;
    for (const m of this.store.values()) {
      if (m.tenantId !== tenantId) continue;
      if (m.organizationId !== organizationId) continue;
      if (m.status === 'active') n += 1;
    }
    return n;
  }

  clear(): void {
    this.store.clear();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Audit
// ════════════════════════════════════════════════════════════════════════════

export class InMemoryOrganizationAuditRepository implements IOrganizationAuditRepository {
  private readonly store = new Map<string, OrganizationAuditRecord>();
  private idCounter = 0;

  async insert(
    record: Omit<OrganizationAuditRecord, 'id' | 'createdAt'>,
  ): Promise<OrganizationAuditRecord> {
    this.idCounter += 1;
    const full: OrganizationAuditRecord = {
      ...record,
      id: `audit-${this.idCounter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByOrganization(
    tenantId: string,
    organizationId: string,
    limit?: number,
  ): Promise<OrganizationAuditRecord[]> {
    const list: OrganizationAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.organizationId !== organizationId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByTenant(
    tenantId: string,
    limit?: number,
  ): Promise<OrganizationAuditRecord[]> {
    const list: OrganizationAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void {
    this.store.clear();
    this.idCounter = 0;
  }
}
