/**
 * Theme Engine — In-Memory Repositories
 */
import type {
  Theme, Brand, TokenSet, TypographyScale, ColorPalette, SpacingSystem,
  MotionSpec, ElevationSystem, ThemeVariant, ResponsiveTokens, WhiteLabelTheme,
  ThemeAuditRecord, ThemeMode,
  IThemeRepository, IBrandRepository, ITokenSetRepository,
  ITokenSystemRepository, IThemeVariantRepository, IResponsiveTokensRepository,
  IWhiteLabelRepository, IThemeAuditRepository,
} from '../interfaces/index.js';

// ── Theme Repository ──
export class InMemoryThemeRepository implements IThemeRepository {
  protected store = new Map<string, Theme>();
  async insert(t: Theme): Promise<void> { this.store.set(`${t.tenantId}::${t.id}`, { ...t }); }
  async findById(t: string, id: string): Promise<Theme | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findBySlug(t: string, slug: string): Promise<Theme | null> { for (const v of this.store.values()) if (v.tenantId === t && v.slug === slug) return { ...v }; return null; }
  async findByOrganization(t: string, orgId: string): Promise<Theme[]> { return [...this.store.values()].filter((v) => v.tenantId === t && v.organizationId === orgId); }
  async update(t: string, id: string, patch: Partial<Theme>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  async findAll(t: string): Promise<Theme[]> { return [...this.store.values()].filter((v) => v.tenantId === t); }
  async existsBySlug(t: string, slug: string, excludeId?: string): Promise<boolean> { for (const v of this.store.values()) if (v.tenantId === t && v.slug === slug && v.id !== excludeId) return true; return false; }
  async countByOrganization(t: string, orgId: string): Promise<number> { let c = 0; for (const v of this.store.values()) if (v.tenantId === t && v.organizationId === orgId) c++; return c; }
  clear(): void { this.store.clear(); }
}

// ── Brand Repository ──
export class InMemoryBrandRepository implements IBrandRepository {
  protected store = new Map<string, Brand>();
  async insert(b: Brand): Promise<void> { this.store.set(`${b.tenantId}::${b.id}`, { ...b }); }
  async findById(t: string, id: string): Promise<Brand | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByOrganization(t: string, orgId: string): Promise<Brand[]> { return [...this.store.values()].filter((b) => b.tenantId === t && b.organizationId === orgId); }
  async update(t: string, id: string, patch: Partial<Brand>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── TokenSet Repository ──
export class InMemoryTokenSetRepository implements ITokenSetRepository {
  protected store = new Map<string, TokenSet>();
  async insert(ts: TokenSet): Promise<void> { this.store.set(`${ts.tenantId}::${ts.id}`, { ...ts }); }
  async findById(t: string, id: string): Promise<TokenSet | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByTheme(t: string, themeId: string): Promise<TokenSet[]> { return [...this.store.values()].filter((ts) => ts.tenantId === t && ts.themeId === themeId); }
  async findByOrganization(t: string, orgId: string): Promise<TokenSet[]> { return [...this.store.values()].filter((ts) => ts.tenantId === t && ts.organizationId === orgId); }
  async update(t: string, id: string, patch: Partial<TokenSet>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── Generic Token System Repository (Typography/Color/Spacing/Motion/Elevation) ──
export class InMemoryTokenSystemRepository<T extends { tenantId: string; id: string; themeId: string }> implements ITokenSystemRepository<T> {
  protected store = new Map<string, T>();
  async insert(e: T): Promise<void> { this.store.set(`${e.tenantId}::${e.id}`, { ...e }); }
  async findById(t: string, id: string): Promise<T | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByTheme(t: string, themeId: string): Promise<T | null> { for (const v of this.store.values()) if (v.tenantId === t && v.themeId === themeId) return { ...v }; return null; }
  async update(t: string, id: string, patch: Partial<T>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── Theme Variant Repository ──
export class InMemoryThemeVariantRepository implements IThemeVariantRepository {
  protected store = new Map<string, ThemeVariant>();
  async insert(v: ThemeVariant): Promise<void> { this.store.set(`${v.tenantId}::${v.id}`, { ...v }); }
  async findById(t: string, id: string): Promise<ThemeVariant | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByTheme(t: string, themeId: string): Promise<ThemeVariant[]> { return [...this.store.values()].filter((v) => v.tenantId === t && v.themeId === themeId); }
  async findByMode(t: string, themeId: string, mode: ThemeMode): Promise<ThemeVariant | null> { for (const v of this.store.values()) if (v.tenantId === t && v.themeId === themeId && v.mode === mode) return { ...v }; return null; }
  async update(t: string, id: string, patch: Partial<ThemeVariant>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── Responsive Tokens Repository ──
export class InMemoryResponsiveTokensRepository implements IResponsiveTokensRepository {
  protected store = new Map<string, ResponsiveTokens>();
  async insert(rt: ResponsiveTokens): Promise<void> { this.store.set(`${rt.tenantId}::${rt.id}`, { ...rt }); }
  async findById(t: string, id: string): Promise<ResponsiveTokens | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByTheme(t: string, themeId: string): Promise<ResponsiveTokens[]> { return [...this.store.values()].filter((rt) => rt.tenantId === t && rt.themeId === themeId); }
  async update(t: string, id: string, patch: Partial<ResponsiveTokens>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── White Label Repository ──
export class InMemoryWhiteLabelRepository implements IWhiteLabelRepository {
  protected store = new Map<string, WhiteLabelTheme>();
  async insert(wl: WhiteLabelTheme): Promise<void> { this.store.set(`${wl.tenantId}::${wl.id}`, { ...wl }); }
  async findById(t: string, id: string): Promise<WhiteLabelTheme | null> { return this.store.get(`${t}::${id}`) ?? null; }
  async findByBaseTheme(t: string, baseThemeId: string): Promise<WhiteLabelTheme[]> { return [...this.store.values()].filter((wl) => wl.tenantId === t && wl.baseThemeId === baseThemeId); }
  async findByOrganization(t: string, orgId: string): Promise<WhiteLabelTheme[]> { return [...this.store.values()].filter((wl) => wl.tenantId === t && wl.organizationId === orgId); }
  async update(t: string, id: string, patch: Partial<WhiteLabelTheme>): Promise<void> { const k = `${t}::${id}`; const e = this.store.get(k); if (!e) return; this.store.set(k, { ...e, ...patch }); }
  clear(): void { this.store.clear(); }
}

// ── Theme Audit Repository ──
export class InMemoryThemeAuditRepository implements IThemeAuditRepository {
  private store: ThemeAuditRecord[] = [];
  private idCounter = 0;
  async insert(record: Omit<ThemeAuditRecord, 'id' | 'createdAt'>): Promise<ThemeAuditRecord> {
    const full: ThemeAuditRecord = { ...record, id: `taudit-${++this.idCounter}`, createdAt: new Date().toISOString() };
    this.store.push(full); return full;
  }
  async findByTenant(t: string, limit = 100): Promise<ThemeAuditRecord[]> { return this.store.filter((r) => r.tenantId === t).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
  async findByOrganization(t: string, orgId: string, limit = 100): Promise<ThemeAuditRecord[]> { return this.store.filter((r) => r.tenantId === t && r.organizationId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit); }
  clear(): void { this.store = []; this.idCounter = 0; }
}
