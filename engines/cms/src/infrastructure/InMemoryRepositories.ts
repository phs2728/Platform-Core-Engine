/**
 * CMS Engine — In-Memory Repositories
 */
import type {
  Content, ContentVersion, Page, PageSection, ContentSlot, LocaleVariant, LayoutSnapshot,
  CMSAuditRecord,
  IContentRepository, IContentVersionRepository, IPageRepository,
  ISectionRepository, ISlotRepository, ILocaleVariantRepository,
  ILayoutSnapshotRepository, ICMSAuditRepository,
  ContentType, Locale, DeviceType,
} from '../interfaces/index.js';

// ── Content Repository ──
export class InMemoryContentRepository implements IContentRepository {
  private store = new Map<string, Content>();
  async insert(c: Content): Promise<void> { this.store.set(`${c.tenantId}::${c.id}`, { ...c }); }
  async findById(tenantId: string, id: string): Promise<Content | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByType(tenantId: string, type: ContentType): Promise<Content[]> {
    const results: Content[] = [];
    this.store.forEach(c => { if (c.tenantId === tenantId && c.type === type) results.push({ ...c }); });
    return results;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<Content[]> {
    const results: Content[] = [];
    this.store.forEach(c => { if (c.tenantId === tenantId && c.organizationId === orgId) results.push({ ...c }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<Content>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<Content[]> {
    const results: Content[] = [];
    this.store.forEach(c => { if (c.tenantId === tenantId) results.push({ ...c }); });
    return results;
  }
  clear(): void { this.store.clear(); }
}

// ── ContentVersion Repository ──
export class InMemoryContentVersionRepository implements IContentVersionRepository {
  private store = new Map<string, ContentVersion>();
  async insert(v: ContentVersion): Promise<void> { this.store.set(`${v.tenantId}::${v.id}`, { ...v }); }
  async findById(tenantId: string, id: string): Promise<ContentVersion | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByContent(tenantId: string, contentId: string): Promise<ContentVersion[]> {
    const results: ContentVersion[] = [];
    this.store.forEach(v => { if (v.tenantId === tenantId && v.contentId === contentId) results.push({ ...v }); });
    return results;
  }
  clear(): void { this.store.clear(); }
}

// ── Page Repository ──
export class InMemoryPageRepository implements IPageRepository {
  private store = new Map<string, Page>();
  async insert(p: Page): Promise<void> { this.store.set(`${p.tenantId}::${p.id}`, { ...p }); }
  async findById(tenantId: string, id: string): Promise<Page | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findBySlug(tenantId: string, slug: string): Promise<Page | null> {
    for (const p of this.store.values()) {
      if (p.tenantId === tenantId && p.slug === slug) return { ...p };
    }
    return null;
  }
  async findByOrganization(tenantId: string, orgId: string): Promise<Page[]> {
    const results: Page[] = [];
    this.store.forEach(p => { if (p.tenantId === tenantId && p.organizationId === orgId) results.push({ ...p }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<Page>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  async findAll(tenantId: string): Promise<Page[]> {
    const results: Page[] = [];
    this.store.forEach(p => { if (p.tenantId === tenantId) results.push({ ...p }); });
    return results;
  }
  async existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const p of this.store.values()) {
      if (p.tenantId === tenantId && p.slug === slug && p.id !== excludeId) return true;
    }
    return false;
  }
  async countByOrganization(tenantId: string, orgId: string): Promise<number> {
    let c = 0;
    this.store.forEach(p => { if (p.tenantId === tenantId && p.organizationId === orgId) c++; });
    return c;
  }
  clear(): void { this.store.clear(); }
}

// ── Section Repository ──
export class InMemorySectionRepository implements ISectionRepository {
  private store = new Map<string, PageSection>();
  async insert(s: PageSection): Promise<void> { this.store.set(`${s.tenantId}::${s.id}`, { ...s }); }
  async findById(tenantId: string, id: string): Promise<PageSection | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByPage(tenantId: string, pageId: string): Promise<PageSection[]> {
    const results: PageSection[] = [];
    this.store.forEach(s => { if (s.tenantId === tenantId && s.pageId === pageId) results.push({ ...s }); });
    return results.sort((a, b) => a.order - b.order);
  }
  async update(tenantId: string, id: string, patch: Partial<PageSection>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  async delete(tenantId: string, id: string): Promise<void> { this.store.delete(`${tenantId}::${id}`); }
  clear(): void { this.store.clear(); }
}

// ── Slot Repository ──
export class InMemorySlotRepository implements ISlotRepository {
  private store = new Map<string, ContentSlot>();
  async insert(s: ContentSlot): Promise<void> { this.store.set(`${s.tenantId}::${s.id}`, { ...s }); }
  async findById(tenantId: string, id: string): Promise<ContentSlot | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findBySection(tenantId: string, sectionId: string): Promise<ContentSlot[]> {
    const results: ContentSlot[] = [];
    this.store.forEach(s => { if (s.tenantId === tenantId && s.sectionId === sectionId) results.push({ ...s }); });
    return results;
  }
  async update(tenantId: string, id: string, patch: Partial<ContentSlot>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  async delete(tenantId: string, id: string): Promise<void> { this.store.delete(`${tenantId}::${id}`); }
  clear(): void { this.store.clear(); }
}

// ── LocaleVariant Repository ──
export class InMemoryLocaleVariantRepository implements ILocaleVariantRepository {
  private store = new Map<string, LocaleVariant>();
  async insert(l: LocaleVariant): Promise<void> { this.store.set(`${l.tenantId}::${l.id}`, { ...l }); }
  async findById(tenantId: string, id: string): Promise<LocaleVariant | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByPage(tenantId: string, pageId: string): Promise<LocaleVariant[]> {
    const results: LocaleVariant[] = [];
    this.store.forEach(l => { if (l.tenantId === tenantId && l.pageId === pageId) results.push({ ...l }); });
    return results;
  }
  async findByPageAndLocale(tenantId: string, pageId: string, locale: Locale): Promise<LocaleVariant | null> {
    for (const l of this.store.values()) {
      if (l.tenantId === tenantId && l.pageId === pageId && l.locale === locale) return { ...l };
    }
    return null;
  }
  async update(tenantId: string, id: string, patch: Partial<LocaleVariant>): Promise<void> {
    const k = `${tenantId}::${id}`;
    const e = this.store.get(k);
    if (!e) return;
    this.store.set(k, { ...e, ...patch });
  }
  clear(): void { this.store.clear(); }
}

// ── LayoutSnapshot Repository ──
export class InMemoryLayoutSnapshotRepository implements ILayoutSnapshotRepository {
  private store = new Map<string, LayoutSnapshot>();
  async insert(s: LayoutSnapshot): Promise<void> { this.store.set(`${s.tenantId}::${s.id}`, { ...s }); }
  async findById(tenantId: string, id: string): Promise<LayoutSnapshot | null> {
    const r = this.store.get(`${tenantId}::${id}`);
    return r ? { ...r } : null;
  }
  async findByPage(tenantId: string, pageId: string): Promise<LayoutSnapshot[]> {
    const results: LayoutSnapshot[] = [];
    this.store.forEach(s => { if (s.tenantId === tenantId && s.pageId === pageId) results.push({ ...s }); });
    return results;
  }
  async findByPageAndDevice(tenantId: string, pageId: string, device: DeviceType): Promise<LayoutSnapshot | null> {
    for (const s of this.store.values()) {
      if (s.tenantId === tenantId && s.pageId === pageId && s.device === device) return { ...s };
    }
    return null;
  }
  clear(): void { this.store.clear(); }
}

// ── Audit Repository ──
export class InMemoryCMSAuditRepository implements ICMSAuditRepository {
  private store: CMSAuditRecord[] = [];
  private idCounter = 0;
  async insert(record: Omit<CMSAuditRecord, 'id' | 'createdAt'>): Promise<CMSAuditRecord> {
    const full: CMSAuditRecord = { ...record, id: `cms-audit-${++this.idCounter}`, createdAt: new Date().toISOString() };
    this.store.push(full);
    return full;
  }
  async findByTenant(tenantId: string, limit = 100): Promise<CMSAuditRecord[]> {
    return this.store.filter(r => r.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(r => ({ ...r }));
  }
  async findByOrganization(tenantId: string, orgId: string, limit = 100): Promise<CMSAuditRecord[]> {
    return this.store.filter(r => r.tenantId === tenantId && r.organizationId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(r => ({ ...r }));
  }
  clear(): void { this.store = []; this.idCounter = 0; }
}