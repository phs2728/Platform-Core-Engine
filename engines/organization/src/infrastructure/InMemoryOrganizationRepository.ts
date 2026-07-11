/**
 * InMemoryOrganizationRepository
 *
 * 사장님 spec §Repository:
 *   IOrganizationRepository / IDepartmentRepository / IBranchRepository /
 *   ITeamRepository / IMembershipRepository / IAuditRepository
 *
 * Multi-tenant 키: ${tenantId}::${id} 형태로 키잉하여 다른 tenant 데이터 격리.
 *
 * 사장님 결정 (Sprint 1) — InMemory Repository:
 *   - 구현 단순화
 *   - 0 → 1 단계 검증 (Host가 진짜 DB Adapter 구현 전까지 사용)
 *   - 단위 테스트 35+ 전부 InMemory로 가능
 */

import type {
  IOrganizationRepository,
  Organization,
  OrganizationSearchCriteria,
  OrganizationSearchResult,
} from '../interfaces/index.js';

interface StoredOrganization {
  org: Organization;
}

export class InMemoryOrganizationRepository implements IOrganizationRepository {
  private readonly store = new Map<string, StoredOrganization>();

  private key(tenantId: string, id: string): string {
    return `${tenantId}::${id}`;
  }

  async insert(org: Organization): Promise<void> {
    const key = this.key(org.tenantId, org.id);
    if (this.store.has(key)) {
      throw new Error(`Duplicate organization id: ${org.id}`);
    }
    this.store.set(key, { org });
  }

  async findById(tenantId: string, id: string): Promise<Organization | null> {
    const entry = this.store.get(this.key(tenantId, id));
    return entry?.org ?? null;
  }

  async update(
    tenantId: string,
    id: string,
    patch: Partial<Organization>,
  ): Promise<void> {
    const key = this.key(tenantId, id);
    const entry = this.store.get(key);
    if (!entry) throw new Error(`Organization not found: ${id}`);
    entry.org = { ...entry.org, ...patch };
  }

  async search(criteria: OrganizationSearchCriteria): Promise<OrganizationSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'displayName';
    const sortOrder = criteria.sortOrder ?? 'asc';

    const candidates: Organization[] = [];
    for (const { org } of this.store.values()) {
      if (org.tenantId !== criteria.tenantId) continue;
      if (org.status === 'Deleted') continue; // 삭제 조직 기본 비노출
      if (criteria.status !== undefined && org.status !== criteria.status) continue;
      if (criteria.type !== undefined && org.type !== criteria.type) continue;
      if (criteria.industry !== undefined && org.profile.industry !== criteria.industry) continue;
      if (criteria.country !== undefined && org.profile.country !== criteria.country) continue;
      if (criteria.businessNumber !== undefined && org.profile.businessNumber !== criteria.businessNumber) continue;
      if (criteria.taxNumber !== undefined && org.profile.taxNumber !== criteria.taxNumber) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const name = org.profile.displayName.toLowerCase();
        if (!name.includes(q)) continue;
      }
      candidates.push(org);
    }

    candidates.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'displayName') {
        cmp = a.profile.displayName.localeCompare(b.profile.displayName);
      } else if (sortBy === 'createdAt') {
        cmp = a.createdAt.localeCompare(b.createdAt);
      } else if (sortBy === 'updatedAt') {
        cmp = a.updatedAt.localeCompare(b.updatedAt);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = candidates.length;
    const slice = candidates.slice(offset, offset + limit);

    return {
      organizations: slice,
      total,
      limit,
      offset,
    };
  }

  async existsByBusinessNumber(
    tenantId: string,
    businessNumber: string,
    excludeId?: string,
  ): Promise<boolean> {
    for (const { org } of this.store.values()) {
      if (org.tenantId !== tenantId) continue;
      if (org.id === excludeId) continue;
      if (org.profile.businessNumber === businessNumber) return true;
    }
    return false;
  }

  async existsByTaxNumber(
    tenantId: string,
    taxNumber: string,
    excludeId?: string,
  ): Promise<boolean> {
    for (const { org } of this.store.values()) {
      if (org.tenantId !== tenantId) continue;
      if (org.id === excludeId) continue;
      if (org.profile.taxNumber === taxNumber) return true;
    }
    return false;
  }

  // 테스트용 헬퍼 (public API 아님)
  clear(): void {
    this.store.clear();
  }
}
