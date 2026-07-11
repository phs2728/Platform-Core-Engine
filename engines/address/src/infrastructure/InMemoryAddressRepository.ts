import type {
  IAddressRepository,
  Address,
  AddressSearchCriteria,
  AddressSearchResult,
  OwnerType,
  AddressType,
} from '../interfaces/index.js';

export class InMemoryAddressRepository implements IAddressRepository {
  private readonly records = new Map<string, Address>();

  async insert(addr: Address): Promise<void> {
    this.records.set(addr.id, { ...addr });
  }

  async findById(tenantId: string, id: string): Promise<Address | null> {
    const r = this.records.get(id);
    if (!r || r.tenantId !== tenantId) return null;
    if (r.status === 'deleted') return null;
    if (r.status === 'archived') return null; // archived = not visible via normal lookup
    return { ...r };
  }

  async findByOwner(
    tenantId: string,
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<Address[]> {
    return Array.from(this.records.values())
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.ownerType === ownerType &&
          r.ownerId === ownerId &&
          r.status !== 'deleted',
      )
      .map((r) => ({ ...r }));
  }

  async findDefault(
    tenantId: string,
    ownerType: OwnerType,
    ownerId: string,
    type: AddressType,
  ): Promise<Address | null> {
    for (const r of this.records.values()) {
      if (
        r.tenantId === tenantId &&
        r.ownerType === ownerType &&
        r.ownerId === ownerId &&
        r.type === type &&
        r.isDefault &&
        r.status !== 'deleted'
      ) {
        return { ...r };
      }
    }
    return null;
  }

  async search(criteria: AddressSearchCriteria): Promise<AddressSearchResult> {
    let results = Array.from(this.records.values());

    results = results.filter((r) => r.tenantId === criteria.tenantId);

    // Exclude deleted (archived visible if explicitly requested)
    if (criteria.status) {
      results = results.filter((r) => r.status === criteria.status);
    } else {
      results = results.filter((r) => r.status !== 'deleted');
    }

    if (criteria.ownerType) results = results.filter((r) => r.ownerType === criteria.ownerType);
    if (criteria.ownerId) results = results.filter((r) => r.ownerId === criteria.ownerId);
    if (criteria.type) results = results.filter((r) => r.type === criteria.type);
    if (criteria.country) results = results.filter((r) => r.country === criteria.country);

    if (criteria.query) {
      const q = criteria.query.toLowerCase();
      results = results.filter(
        (r) =>
          r.line1.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          (r.postalCode ?? '').toLowerCase().includes(q) ||
          (r.label ?? '').toLowerCase().includes(q),
      );
    }

    const total = results.length;
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? 50;
    const paginated = results.slice(offset, offset + limit);

    return {
      addresses: paginated.map((r) => ({ ...r })),
      total,
      limit,
      offset,
    };
  }

  async update(id: string, patch: Partial<Address>): Promise<void> {
    const r = this.records.get(id);
    if (r) {
      Object.assign(r, patch, { updatedAt: new Date().toISOString() });
    }
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const r = this.records.get(id);
    if (r) {
      r.status = 'deleted';
      r.deletedAt = deletedAt;
      r.updatedAt = deletedAt;
    }
  }

  async archive(id: string, archivedAt: string): Promise<void> {
    const r = this.records.get(id);
    if (r) {
      r.status = 'archived';
      r.archivedAt = archivedAt;
      r.updatedAt = archivedAt;
    }
  }

  async restore(id: string): Promise<void> {
    const r = this.records.get(id);
    if (r) {
      r.status = 'active';
      r.archivedAt = null;
      r.updatedAt = new Date().toISOString();
    }
  }

  async hardDelete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async countByOwner(
    tenantId: string,
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<number> {
    return Array.from(this.records.values()).filter(
      (r) =>
        r.tenantId === tenantId &&
        r.ownerType === ownerType &&
        r.ownerId === ownerId &&
        r.status !== 'deleted',
    ).length;
  }

  async unsetDefaultForOwner(
    tenantId: string,
    ownerType: OwnerType,
    ownerId: string,
    type: AddressType,
  ): Promise<void> {
    for (const r of this.records.values()) {
      if (
        r.tenantId === tenantId &&
        r.ownerType === ownerType &&
        r.ownerId === ownerId &&
        r.type === type &&
        r.isDefault
      ) {
        r.isDefault = false;
        r.updatedAt = new Date().toISOString();
      }
    }
  }
}
