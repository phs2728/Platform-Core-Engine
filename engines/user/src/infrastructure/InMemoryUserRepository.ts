import type {
  IUserRepository,
  User,
  UserSearchCriteria,
  UserSearchResult,
  UserStatus,
} from '../interfaces/index.js';

export class InMemoryUserRepository implements IUserRepository {
  private readonly records = new Map<string, User>();

  async insert(user: User): Promise<void> {
    this.records.set(user.id, { ...user });
  }

  async findById(tenantId: string, id: string): Promise<User | null> {
    const r = this.records.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    if (r.status === 'archived' && r.deletedAt !== null) return null; // archived = not visible
    return { ...r };
  }

  async findByIdentityId(tenantId: string, identityId: string): Promise<User | null> {
    for (const r of this.records.values()) {
      if (r.tenantId === tenantId && r.identityId === identityId && r.status !== 'archived') {
        return { ...r };
      }
    }
    return null;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const lower = email.toLowerCase();
    for (const r of this.records.values()) {
      if (
        r.tenantId === tenantId &&
        r.emailReference?.email.toLowerCase() === lower &&
        r.status !== 'archived'
      ) {
        return { ...r };
      }
    }
    return null;
  }

  async update(id: string, patch: Partial<User>): Promise<void> {
    const r = this.records.get(id);
    if (r) {
      Object.assign(r, patch, { updatedAt: new Date().toISOString() });
    }
  }

  async search(criteria: UserSearchCriteria): Promise<UserSearchResult> {
    let results = Array.from(this.records.values());

    // Tenant filter
    results = results.filter((r) => r.tenantId === criteria.tenantId);

    // Archived filter — 기본적으로 archived 제외
    results = results.filter((r) => r.status !== 'archived' || criteria.status === 'archived');

    // Query (displayName, nickname)
    if (criteria.query) {
      const q = criteria.query.toLowerCase();
      results = results.filter(
        (r) =>
          r.displayName.toLowerCase().includes(q) ||
          (r.nickname !== null && r.nickname.toLowerCase().includes(q)),
      );
    }

    // Language filter
    if (criteria.language) {
      results = results.filter((r) => r.language === criteria.language);
    }

    // Status filter
    if (criteria.status) {
      results = results.filter((r) => r.status === criteria.status);
    }

    // Tags filter (OR matching)
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter((r) =>
        criteria.tags!.some((tag) => r.tags.includes(tag)),
      );
    }

    const total = results.length;
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? 50;
    const paginated = results.slice(offset, offset + limit);

    return {
      users: paginated.map((r) => ({ ...r })),
      total,
      limit,
      offset,
    };
  }

  async findByTenant(tenantId: string, limit = 1000, offset = 0): Promise<User[]> {
    return Array.from(this.records.values())
      .filter((r) => r.tenantId === tenantId && r.status !== 'archived')
      .slice(offset, offset + limit)
      .map((r) => ({ ...r }));
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const r = this.records.get(id);
    if (r) {
      r.status = 'archived';
      r.deletedAt = deletedAt;
      r.updatedAt = deletedAt;
    }
  }

  async restore(id: string): Promise<void> {
    const r = this.records.get(id);
    if (r) {
      r.status = 'active';
      r.deletedAt = null;
      r.updatedAt = new Date().toISOString();
    }
  }

  async countByStatus(tenantId: string, status: UserStatus): Promise<number> {
    return Array.from(this.records.values()).filter(
      (r) => r.tenantId === tenantId && r.status === status,
    ).length;
  }
}
