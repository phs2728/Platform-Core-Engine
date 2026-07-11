/**
 * In-Memory Repositories — Asset/Variant/Collection/Reference/UploadSession/
 * Transformation/Version/Audit
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 */

import type {
  IAssetRepository,
  IAssetVariantRepository,
  IAssetCollectionRepository,
  IAssetReferenceRepository,
  IUploadSessionRepository,
  IAssetTransformationRepository,
  IAssetVersionRepository,
  IMediaAuditRepository,
  Asset,
  AssetVariant,
  AssetCollection,
  AssetReference,
  UploadSession,
  AssetTransformation,
  AssetVersion,
  MediaAuditRecord,
  AssetSearchCriteria,
  AssetSearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Asset
// ═══════════════════════════════════════════

export class InMemoryAssetRepository implements IAssetRepository {
  private store = new Map<string, Asset>();

  async insert(a: Asset): Promise<void> {
    const k = key(a.tenantId, a.id);
    if (this.store.has(k)) throw new Error(`Duplicate asset id: ${a.id}`);
    this.store.set(k, a);
  }

  async findById(tenantId: string, id: string): Promise<Asset | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findBySlug(tenantId: string, slug: string): Promise<Asset | null> {
    for (const a of this.store.values()) {
      if (a.tenantId === tenantId && a.slug === slug) return a;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<Asset>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Asset not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: AssetSearchCriteria): Promise<AssetSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'name';
    const sortOrder = criteria.sortOrder ?? 'asc';

    let candidates: Asset[] = [];
    for (const a of this.store.values()) {
      if (a.tenantId !== criteria.tenantId) continue;
      if (a.status === 'Deleted') continue;
      if (criteria.organizationId !== undefined && a.organizationId !== criteria.organizationId) continue;
      if (criteria.type !== undefined && a.type !== criteria.type) continue;
      if (criteria.status !== undefined && a.status !== criteria.status) continue;
      if (criteria.mimeType !== undefined && a.mimeType !== criteria.mimeType) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => a.tags.includes(t))) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const name = a.name.toLowerCase();
        if (!name.includes(q)) continue;
      }
      candidates.push(a);
    }

    candidates.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortBy === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
      else if (sortBy === 'sizeBytes') cmp = a.sizeBytes - b.sizeBytes;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = candidates.length;
    return {
      assets: candidates.slice(offset, offset + limit),
      total, limit, offset,
    };
  }

  async existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const a of this.store.values()) {
      if (a.tenantId !== tenantId) continue;
      if (a.id === excludeId) continue;
      if (a.slug === slug) return true;
    }
    return false;
  }

  async countByOrganization(tenantId: string, organizationId: string): Promise<number> {
    let count = 0;
    for (const a of this.store.values()) {
      if (a.tenantId === tenantId && a.organizationId === organizationId) count += 1;
    }
    return count;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// AssetVariant
// ═══════════════════════════════════════════

export class InMemoryAssetVariantRepository implements IAssetVariantRepository {
  private store = new Map<string, AssetVariant>();

  async insert(v: AssetVariant): Promise<void> {
    const k = key(v.tenantId, v.id);
    if (this.store.has(k)) throw new Error(`Duplicate variant id: ${v.id}`);
    this.store.set(k, v);
  }

  async findById(tenantId: string, id: string): Promise<AssetVariant | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByAsset(tenantId: string, assetId: string): Promise<AssetVariant[]> {
    const list: AssetVariant[] = [];
    for (const v of this.store.values()) {
      if (v.tenantId === tenantId && v.assetId === assetId) list.push(v);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<AssetVariant>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Variant not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Variant not found: ${id}`);
    this.store.delete(k);
  }

  async countByAsset(tenantId: string, assetId: string): Promise<number> {
    let count = 0;
    for (const v of this.store.values()) {
      if (v.tenantId === tenantId && v.assetId === assetId) count += 1;
    }
    return count;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// AssetCollection
// ═══════════════════════════════════════════

export class InMemoryAssetCollectionRepository implements IAssetCollectionRepository {
  private store = new Map<string, AssetCollection>();

  async insert(c: AssetCollection): Promise<void> {
    const k = key(c.tenantId, c.id);
    if (this.store.has(k)) throw new Error(`Duplicate collection id: ${c.id}`);
    this.store.set(k, c);
  }

  async findById(tenantId: string, id: string): Promise<AssetCollection | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByOrganization(tenantId: string, organizationId: string): Promise<AssetCollection[]> {
    const list: AssetCollection[] = [];
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.organizationId === organizationId) list.push(c);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<AssetCollection>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Collection not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// AssetReference
// ═══════════════════════════════════════════

export class InMemoryAssetReferenceRepository implements IAssetReferenceRepository {
  private store = new Map<string, AssetReference>();

  async insert(r: AssetReference): Promise<void> {
    const k = key(r.tenantId, r.id);
    if (this.store.has(k)) throw new Error(`Duplicate reference id: ${r.id}`);
    this.store.set(k, r);
  }

  async findById(tenantId: string, id: string): Promise<AssetReference | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByAsset(tenantId: string, assetId: string): Promise<AssetReference[]> {
    const list: AssetReference[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.assetId === assetId) list.push(r);
    }
    return list;
  }

  async findByOwner(tenantId: string, ownerType: string, ownerId: string): Promise<AssetReference[]> {
    const list: AssetReference[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.ownerType !== ownerType) continue;
      if (r.ownerId !== ownerId) continue;
      list.push(r);
    }
    return list;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Reference not found: ${id}`);
    this.store.delete(k);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// UploadSession
// ═══════════════════════════════════════════

export class InMemoryUploadSessionRepository implements IUploadSessionRepository {
  private store = new Map<string, UploadSession>();

  async insert(s: UploadSession): Promise<void> {
    const k = key(s.tenantId, s.id);
    if (this.store.has(k)) throw new Error(`Duplicate upload session id: ${s.id}`);
    this.store.set(k, s);
  }

  async findById(tenantId: string, id: string): Promise<UploadSession | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async update(tenantId: string, id: string, patch: Partial<UploadSession>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Upload session not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// AssetTransformation
// ═══════════════════════════════════════════

export class InMemoryAssetTransformationRepository implements IAssetTransformationRepository {
  private store = new Map<string, AssetTransformation>();

  async insert(t: AssetTransformation): Promise<void> {
    const k = key(t.tenantId, t.id);
    if (this.store.has(k)) throw new Error(`Duplicate transformation id: ${t.id}`);
    this.store.set(k, t);
  }

  async findById(tenantId: string, id: string): Promise<AssetTransformation | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByAsset(tenantId: string, assetId: string): Promise<AssetTransformation[]> {
    const list: AssetTransformation[] = [];
    for (const t of this.store.values()) {
      if (t.tenantId === tenantId && t.assetId === assetId) list.push(t);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<AssetTransformation>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Transformation not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// AssetVersion
// ═══════════════════════════════════════════

export class InMemoryAssetVersionRepository implements IAssetVersionRepository {
  private store = new Map<string, AssetVersion>();

  async insert(v: AssetVersion): Promise<void> {
    const k = key(v.tenantId, v.id);
    if (this.store.has(k)) throw new Error(`Duplicate version id: ${v.id}`);
    this.store.set(k, v);
  }

  async findAll(tenantId: string, assetId: string): Promise<AssetVersion[]> {
    const list: AssetVersion[] = [];
    for (const v of this.store.values()) {
      if (v.tenantId === tenantId && v.assetId === assetId) list.push(v);
    }
    return list;
  }

  async findByNumber(tenantId: string, assetId: string, versionNumber: number): Promise<AssetVersion | null> {
    for (const v of this.store.values()) {
      if (v.tenantId !== tenantId) continue;
      if (v.assetId !== assetId) continue;
      if (v.versionNumber === versionNumber) return v;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<AssetVersion>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Version not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export class InMemoryMediaAuditRepository implements IMediaAuditRepository {
  private store = new Map<string, MediaAuditRecord>();
  private counter = 0;

  async insert(record: Omit<MediaAuditRecord, 'id' | 'createdAt'>): Promise<MediaAuditRecord> {
    this.counter += 1;
    const full: MediaAuditRecord = {
      ...record,
      id: `media-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<MediaAuditRecord[]> {
    const list: MediaAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByAsset(tenantId: string, assetId: string, limit?: number): Promise<MediaAuditRecord[]> {
    const list: MediaAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.assetId !== assetId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
