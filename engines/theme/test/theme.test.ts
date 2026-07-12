/**
 * Theme Engine — Test Suite (80+ tests)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createThemeUseCase, updateThemeUseCase, getThemeUseCase, listThemesUseCase,
  activateThemeUseCase, archiveThemeUseCase,
  createBrandUseCase, updateBrandUseCase, getBrandUseCase, listBrandsUseCase,
  createTokenSetUseCase, updateTokenSetUseCase, getTokenSetUseCase, listTokenSetsUseCase,
  createTypographyScaleUseCase, getTypographyScaleUseCase,
  createColorPaletteUseCase, getColorPaletteUseCase,
  createSpacingSystemUseCase, getSpacingSystemUseCase,
  createMotionSpecUseCase, getMotionSpecUseCase,
  createElevationSystemUseCase, getElevationSystemUseCase,
  createThemeVariantUseCase, updateThemeVariantUseCase, getThemeVariantUseCase,
  listVariantsUseCase, getDarkModeVariantUseCase, getLightModeVariantUseCase,
  compileThemeUseCase, previewThemeUseCase, exportThemeUseCase, importThemeUseCase,
  createWhiteLabelThemeUseCase, applyWhiteLabelUseCase,
  createResponsiveTokensUseCase, updateResponsiveTokensUseCase, getResponsiveTokensUseCase,
  validateThemeUseCase, calculateThemeScoreUseCase, generateThemeReportUseCase,
  THEME_EVENTS,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

const base = { tenantId: 't-1', organizationId: 'org-1', correlationId: 'c-1', actorId: 'admin' };
function unwrap<T>(r: { ok: boolean; value?: T; error?: unknown }): T { if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err')); return r.value as T; }

// ═════════ THEME CRUD ═════════
describe('Theme CRUD', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should create theme', async () => { const r = await createThemeUseCase({ ...base, name: 'Acme Theme', slug: 'acme' }, deps); expect(r.ok).toBe(true); });
  it('should reject invalid slug', async () => { const r = await createThemeUseCase({ ...base, name: 'X', slug: 'UPPER' }, deps); expect(r.ok).toBe(false); });
  it('should reject dup slug', async () => { await createThemeUseCase({ ...base, name: 'A', slug: 'dup' }, deps); const r = await createThemeUseCase({ ...base, correlationId: 'c2', name: 'B', slug: 'dup' }, deps); expect(r.ok).toBe(false); });
  it('should reject unverified org', async () => { const r = await createThemeUseCase({ ...base, organizationId: 'x', name: 'P', slug: 'p' }, deps); expect(r.ok).toBe(false); });
  it('should get theme', async () => { const t = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'get' }, deps)); const r = await getThemeUseCase('t-1', t.themeId, deps); expect(r.ok).toBe(true); });
  it('should list themes', async () => { await createThemeUseCase({ ...base, name: 'A', slug: 'la' }, deps); await createThemeUseCase({ ...base, correlationId: 'c2', name: 'B', slug: 'lb' }, deps); const r = await listThemesUseCase('t-1', deps); if (r.ok) expect(r.value.length).toBe(2); });
  it('should update theme', async () => { const t = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'upd' }, deps)); const r = await updateThemeUseCase({ ...base, themeId: t.themeId, name: 'Updated' }, deps); expect(r.ok).toBe(true); });
  it('should activate theme', async () => { const t = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'act' }, deps)); const r = await activateThemeUseCase({ ...base, themeId: t.themeId }, deps); expect(r.ok).toBe(true); const th = unwrap(await getThemeUseCase('t-1', t.themeId, deps)); expect(th.status).toBe('Active'); });
  it('should archive theme', async () => { const t = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'arch' }, deps)); const r = await archiveThemeUseCase({ ...base, themeId: t.themeId }, deps); expect(r.ok).toBe(true); });
  it('should emit theme.created event', async () => { await createThemeUseCase({ ...base, name: 'T', slug: 'ev' }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.THEME_CREATED)).toBe(1); });
  it('should emit theme.activated event', async () => { const t = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'ev2' }, deps)); await activateThemeUseCase({ ...base, themeId: t.themeId }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.THEME_ACTIVATED)).toBe(1); });
  it('should reject get non-existent', async () => { const r = await getThemeUseCase('t-1', 'none', deps); expect(r.ok).toBe(false); });
  it('should reject update non-existent', async () => { const r = await updateThemeUseCase({ ...base, themeId: 'none', name: 'X' }, deps); expect(r.ok).toBe(false); });
  it('should set default mode to Light', async () => { const t = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'mode' }, deps)); const th = unwrap(await getThemeUseCase('t-1', t.themeId, deps)); expect(th.defaultMode).toBe('Light'); });
  it('should accept Dark default mode', async () => { const t = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'dark', defaultMode: 'Dark' }, deps)); const th = unwrap(await getThemeUseCase('t-1', t.themeId, deps)); expect(th.defaultMode).toBe('Dark'); });
});

// ═════════ BRAND ═════════
describe('Brand', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should create brand', async () => { const r = await createBrandUseCase({ ...base, name: 'Acme', personality: ['premium','modern'], voice: 'Bold', primaryColor: '#7c2d3a' }, deps); expect(r.ok).toBe(true); });
  it('should get brand', async () => { const b = unwrap(await createBrandUseCase({ ...base, name: 'B', personality: [], voice: 'v', primaryColor: '#000' }, deps)); const r = await getBrandUseCase('t-1', b.brandId, deps); expect(r.ok).toBe(true); });
  it('should update brand', async () => { const b = unwrap(await createBrandUseCase({ ...base, name: 'B', personality: [], voice: 'v', primaryColor: '#000' }, deps)); const r = await updateBrandUseCase({ ...base, brandId: b.brandId, name: 'Updated' }, deps); expect(r.ok).toBe(true); });
  it('should list brands', async () => { await createBrandUseCase({ ...base, name: 'A', personality: [], voice: 'v', primaryColor: '#000' }, deps); const r = await listBrandsUseCase('t-1', 'org-1', deps); if (r.ok) expect(r.value.length).toBe(1); });
  it('should emit brand.created event', async () => { await createBrandUseCase({ ...base, name: 'B', personality: [], voice: 'v', primaryColor: '#000' }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.BRAND_CREATED)).toBe(1); });
  it('should reject create for unverified org', async () => { const r = await createBrandUseCase({ ...base, organizationId: 'x', name: 'B', personality: [], voice: 'v', primaryColor: '#000' }, deps); expect(r.ok).toBe(false); });
});

// ═════════ TOKEN SET ═════════
describe('Token Set', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'ts' }, deps)).themeId; });

  it('should create token set', async () => { const r = await createTokenSetUseCase({ ...base, themeId, category: 'Color', name: 'Brand Colors', tokens: [{ key: '--color-primary', value: '#7c2d3a', description: 'Primary brand color' }] }, deps); expect(r.ok).toBe(true); });
  it('should get token set', async () => { const ts = unwrap(await createTokenSetUseCase({ ...base, themeId, category: 'Spacing', name: 'Base Spacing', tokens: [{ key: '--spacing-base', value: '0.25rem', description: 'Base unit' }] }, deps)); const r = await getTokenSetUseCase('t-1', ts.tokenSetId, deps); expect(r.ok).toBe(true); });
  it('should list token sets by theme', async () => { await createTokenSetUseCase({ ...base, themeId, category: 'Color', name: 'A', tokens: [] }, deps); await createTokenSetUseCase({ ...base, correlationId: 'c2', themeId, category: 'Spacing', name: 'B', tokens: [] }, deps); const r = await listTokenSetsUseCase('t-1', themeId, deps); if (r.ok) expect(r.value.length).toBe(2); });
  it('should update token set', async () => { const ts = unwrap(await createTokenSetUseCase({ ...base, themeId, category: 'Color', name: 'A', tokens: [] }, deps)); const r = await updateTokenSetUseCase({ ...base, tokenSetId: ts.tokenSetId, name: 'Updated' }, deps); expect(r.ok).toBe(true); });
  it('should update token set tokens', async () => { const ts = unwrap(await createTokenSetUseCase({ ...base, themeId, category: 'Color', name: 'A', tokens: [] }, deps)); const r = await updateTokenSetUseCase({ ...base, tokenSetId: ts.tokenSetId, tokens: [{ key: '--x', value: '1', description: 'd' }] }, deps); expect(r.ok).toBe(true); });
  it('should add tokenSetId to theme', async () => { unwrap(await createTokenSetUseCase({ ...base, themeId, category: 'Color', name: 'A', tokens: [] }, deps)); const t = unwrap(await getThemeUseCase('t-1', themeId, deps)); expect(t.tokenSetIds.length).toBe(1); });
  it('should emit tokenset.created event', async () => { await createTokenSetUseCase({ ...base, themeId, category: 'Color', name: 'A', tokens: [] }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.TOKENSET_CREATED)).toBe(1); });
  it('should reject for non-existent theme', async () => { const r = await createTokenSetUseCase({ ...base, themeId: 'none', category: 'Color', name: 'A', tokens: [] }, deps); expect(r.ok).toBe(false); });
});

// ═════════ TYPOGRAPHY ═════════
describe('Typography Scale', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'typo' }, deps)).themeId; });
  const typoData = { fontFamilies: [{ name: 'sans', stack: ['Pretendard', 'sans-serif'] }], sizes: [{ name: 'h1', size: '3rem', lineHeight: '1.2', weight: '800' }], baseSize: '1rem', scaleRatio: '1.25' };

  it('should create typography scale', async () => { const r = await createTypographyScaleUseCase({ ...base, themeId, ...typoData }, deps); expect(r.ok).toBe(true); });
  it('should get typography scale', async () => { unwrap(await createTypographyScaleUseCase({ ...base, themeId, ...typoData }, deps)); const r = await getTypographyScaleUseCase('t-1', themeId, deps); expect(r.ok).toBe(true); });
  it('should reject for non-existent theme', async () => { const r = await createTypographyScaleUseCase({ ...base, themeId: 'none', ...typoData }, deps); expect(r.ok).toBe(false); });
});

// ═════════ COLOR ═════════
describe('Color Palette', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'col' }, deps)).themeId; });
  const colData = { primary: '#7c2d3a', secondary: '#292524', accent: '#d97706', neutral: '#78716c', background: '#faf8f5', foreground: '#1c1917', shades: { '500': '#7c2d3a' }, semantic: { success: '#16a34a', warning: '#d97706', error: '#dc2626', info: '#2563eb' } };

  it('should create color palette', async () => { const r = await createColorPaletteUseCase({ ...base, themeId, ...colData }, deps); expect(r.ok).toBe(true); });
  it('should get color palette', async () => { unwrap(await createColorPaletteUseCase({ ...base, themeId, ...colData }, deps)); const r = await getColorPaletteUseCase('t-1', themeId, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.primary).toBe('#7c2d3a'); });
  it('should include semantic colors', async () => { unwrap(await createColorPaletteUseCase({ ...base, themeId, ...colData }, deps)); const c = unwrap(await getColorPaletteUseCase('t-1', themeId, deps)); expect(c.semantic.success).toBe('#16a34a'); });
});

// ═════════ SPACING ═════════
describe('Spacing System', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'sp' }, deps)).themeId; });
  const spData = { baseUnit: '0.25rem', scale: [{ name: 'sm', value: '0.5rem' }, { name: 'md', value: '1rem' }, { name: 'lg', value: '2rem' }] };

  it('should create spacing system', async () => { const r = await createSpacingSystemUseCase({ ...base, themeId, ...spData }, deps); expect(r.ok).toBe(true); });
  it('should get spacing system', async () => { unwrap(await createSpacingSystemUseCase({ ...base, themeId, ...spData }, deps)); const r = await getSpacingSystemUseCase('t-1', themeId, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.baseUnit).toBe('0.25rem'); });
});

// ═════════ MOTION ═════════
describe('Motion Spec', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'mo' }, deps)).themeId; });
  const moData = { durations: [{ name: 'fast', value: '150ms' }, { name: 'normal', value: '300ms' }], easings: [{ name: 'spring', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }] };

  it('should create motion spec', async () => { const r = await createMotionSpecUseCase({ ...base, themeId, ...moData }, deps); expect(r.ok).toBe(true); });
  it('should get motion spec', async () => { unwrap(await createMotionSpecUseCase({ ...base, themeId, ...moData }, deps)); const r = await getMotionSpecUseCase('t-1', themeId, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.durations.length).toBe(2); });
});

// ═════════ ELEVATION ═════════
describe('Elevation System', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'el' }, deps)).themeId; });
  const elData = { levels: [{ name: 'dropdown', zIndex: 1000, shadow: '0 4px 6px rgba(0,0,0,0.1)' }, { name: 'modal', zIndex: 2000, shadow: '0 20px 25px rgba(0,0,0,0.15)' }] };

  it('should create elevation system', async () => { const r = await createElevationSystemUseCase({ ...base, themeId, ...elData }, deps); expect(r.ok).toBe(true); });
  it('should get elevation system', async () => { unwrap(await createElevationSystemUseCase({ ...base, themeId, ...elData }, deps)); const r = await getElevationSystemUseCase('t-1', themeId, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.levels.length).toBe(2); });
});

// ═════════ VARIANT ═════════
describe('Theme Variant', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'var' }, deps)).themeId; });

  it('should create dark mode variant', async () => { const r = await createThemeVariantUseCase({ ...base, themeId, mode: 'Dark', tokenOverrides: { '--color-background': '#1c1917' } }, deps); expect(r.ok).toBe(true); });
  it('should create light mode variant', async () => { const r = await createThemeVariantUseCase({ ...base, themeId, mode: 'Light', tokenOverrides: { '--color-background': '#faf8f5' } }, deps); expect(r.ok).toBe(true); });
  it('should get variant', async () => { const v = unwrap(await createThemeVariantUseCase({ ...base, themeId, mode: 'Dark', tokenOverrides: {} }, deps)); const r = await getThemeVariantUseCase('t-1', v.variantId, deps); expect(r.ok).toBe(true); });
  it('should list variants', async () => { await createThemeVariantUseCase({ ...base, themeId, mode: 'Dark', tokenOverrides: {} }, deps); await createThemeVariantUseCase({ ...base, correlationId: 'c2', themeId, mode: 'Light', tokenOverrides: {} }, deps); const r = await listVariantsUseCase('t-1', themeId, deps); if (r.ok) expect(r.value.length).toBe(2); });
  it('should get dark mode variant by mode', async () => { unwrap(await createThemeVariantUseCase({ ...base, themeId, mode: 'Dark', tokenOverrides: {} }, deps)); const r = await getDarkModeVariantUseCase('t-1', themeId, deps); expect(r.ok).toBe(true); });
  it('should get light mode variant by mode', async () => { unwrap(await createThemeVariantUseCase({ ...base, themeId, mode: 'Light', tokenOverrides: {} }, deps)); const r = await getLightModeVariantUseCase('t-1', themeId, deps); expect(r.ok).toBe(true); });
  it('should update variant overrides', async () => { const v = unwrap(await createThemeVariantUseCase({ ...base, themeId, mode: 'Dark', tokenOverrides: {} }, deps)); const r = await updateThemeVariantUseCase({ ...base, variantId: v.variantId, tokenOverrides: { '--x': '1' } }, deps); expect(r.ok).toBe(true); });
  it('should reject get dark variant when not exists', async () => { const r = await getDarkModeVariantUseCase('t-1', themeId, deps); expect(r.ok).toBe(false); });
  it('should add variantId to theme', async () => { unwrap(await createThemeVariantUseCase({ ...base, themeId, mode: 'Dark', tokenOverrides: {} }, deps)); const t = unwrap(await getThemeUseCase('t-1', themeId, deps)); expect(t.variantIds.length).toBe(1); });
  it('should emit variant.created event', async () => { await createThemeVariantUseCase({ ...base, themeId, mode: 'Dark', tokenOverrides: {} }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.VARIANT_CREATED)).toBe(1); });
});

// ═════════ COMPILE ═════════
describe('Compile', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'comp' }, deps)).themeId; });

  it('should compile theme with no tokens', async () => { const r = await compileThemeUseCase({ ...base, themeId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.tokenCount).toBe(0); });
  it('should compile theme with token sets', async () => {
    unwrap(await createTokenSetUseCase({ ...base, themeId, category: 'Color', name: 'A', tokens: [{ key: '--color-primary', value: '#7c2d3a', description: 'd' }] }, deps));
    const r = await compileThemeUseCase({ ...base, themeId }, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.tokenCount).toBeGreaterThan(0);
  });
  it('should compile with color palette tokens', async () => {
    unwrap(await createColorPaletteUseCase({ ...base, themeId, primary: '#7c2d3a', secondary: '#292524', accent: '#d97706', neutral: '#78716c', background: '#faf8f5', foreground: '#1c1917', shades: {}, semantic: { success: '#0f0', warning: '#ff0', error: '#f00', info: '#00f' } }, deps));
    const r = await compileThemeUseCase({ ...base, themeId }, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.compiled).toContain('--color-primary');
  });
  it('should preview theme', async () => { const r = await previewThemeUseCase({ ...base, themeId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.preview).toContain(':root'); });
  it('should emit theme.compiled event', async () => { await compileThemeUseCase({ ...base, themeId }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.THEME_COMPILED)).toBe(1); });
  it('should support different formats', async () => { const r = await compileThemeUseCase({ ...base, themeId, format: 'json' }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.format).toBe('json'); });
});

// ═════════ EXPORT / IMPORT ═════════
describe('Export / Import', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'exp' }, deps)).themeId; });

  it('should export theme', async () => { unwrap(await createTokenSetUseCase({ ...base, themeId, category: 'Color', name: 'A', tokens: [] }, deps)); const r = await exportThemeUseCase({ ...base, themeId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.exported.theme).toBeDefined(); });
  it('should export include all token systems', async () => {
    unwrap(await createColorPaletteUseCase({ ...base, themeId, primary: '#0', secondary: '#0', accent: '#0', neutral: '#0', background: '#0', foreground: '#f', shades: {}, semantic: { success: '#0', warning: '#0', error: '#0', info: '#0' } }, deps));
    unwrap(await createSpacingSystemUseCase({ ...base, themeId, baseUnit: '0.25rem', scale: [] }, deps));
    const r = unwrap(await exportThemeUseCase({ ...base, themeId }, deps));
    expect(r.exported.colors).toBeDefined(); expect(r.exported.spacing).toBeDefined();
  });
  it('should emit theme.exported event', async () => { await exportThemeUseCase({ ...base, themeId }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.THEME_EXPORTED)).toBe(1); });
  it('should import theme', async () => { const r = await importThemeUseCase({ ...base, data: {}, slug: 'imported', name: 'Imported' }, deps); expect(r.ok).toBe(true); });
  it('should emit theme.imported event on import', async () => { await importThemeUseCase({ ...base, data: {}, slug: 'imported2', name: 'I' }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.THEME_IMPORTED)).toBe(1); });
});

// ═════════ WHITE LABEL ═════════
describe('White Label', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'wl' }, deps)).themeId; });

  it('should create white label theme', async () => { const r = await createWhiteLabelThemeUseCase({ ...base, baseThemeId: themeId, overrides: { '--color-primary': '#ff0000' } }, deps); expect(r.ok).toBe(true); });
  it('should reject for non-existent base theme', async () => { const r = await createWhiteLabelThemeUseCase({ ...base, baseThemeId: 'none', overrides: {} }, deps); expect(r.ok).toBe(false); });
  it('should apply white label', async () => { const wl = unwrap(await createWhiteLabelThemeUseCase({ ...base, baseThemeId: themeId, overrides: {} }, deps)); const r = await applyWhiteLabelUseCase({ ...base, whiteLabelId: wl.whiteLabelId }, deps); expect(r.ok).toBe(true); });
  it('should reject apply for non-existent', async () => { const r = await applyWhiteLabelUseCase({ ...base, whiteLabelId: 'none' }, deps); expect(r.ok).toBe(false); });
});

// ═════════ RESPONSIVE TOKENS ═════════
describe('Responsive Tokens', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'resp' }, deps)).themeId; });

  it('should create responsive tokens', async () => { const r = await createResponsiveTokensUseCase({ ...base, themeId, breakpoint: 'md', tokenOverrides: { '--font-size-base': '1.125rem' } }, deps); expect(r.ok).toBe(true); });
  it('should get responsive tokens', async () => { unwrap(await createResponsiveTokensUseCase({ ...base, themeId, breakpoint: 'lg', tokenOverrides: {} }, deps)); const r = await getResponsiveTokensUseCase('t-1', themeId, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.length).toBe(1); });
  it('should update responsive tokens', async () => { const rt = unwrap(await createResponsiveTokensUseCase({ ...base, themeId, breakpoint: 'sm', tokenOverrides: {} }, deps)); const r = await updateResponsiveTokensUseCase({ ...base, responsiveId: rt.responsiveId, tokenOverrides: { '--x': '1' } }, deps); expect(r.ok).toBe(true); });
  it('should reject create for non-existent theme', async () => { const r = await createResponsiveTokensUseCase({ ...base, themeId: 'none', breakpoint: 'sm', tokenOverrides: {} }, deps); expect(r.ok).toBe(false); });
});

// ═════════ VALIDATE / SCORE / REPORT ═════════
describe('Validate / Score / Report', () => {
  let deps: ReturnType<typeof makeDeps>; let themeId: string;
  beforeEach(async () => { deps = makeDeps(); themeId = unwrap(await createThemeUseCase({ ...base, name: 'T', slug: 'val' }, deps)).themeId; });

  it('should validate empty theme with warnings', async () => { const r = await validateThemeUseCase({ ...base, themeId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.warnings.length).toBeGreaterThan(0); });
  it('should fail validation without color palette', async () => { const r = await validateThemeUseCase({ ...base, themeId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.errors).toContain('No color palette defined'); });
  it('should pass validation with color palette', async () => {
    unwrap(await createColorPaletteUseCase({ ...base, themeId, primary: '#7c2d3a', secondary: '#292524', accent: '#d97706', neutral: '#78716c', background: '#faf8f5', foreground: '#1c1917', shades: {}, semantic: { success: '#0', warning: '#0', error: '#0', info: '#0' } }, deps));
    const r = await validateThemeUseCase({ ...base, themeId }, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.valid).toBe(true);
  });
  it('should fail when bg === fg', async () => {
    unwrap(await createColorPaletteUseCase({ ...base, themeId, primary: '#0', secondary: '#0', accent: '#0', neutral: '#0', background: '#same', foreground: '#same', shades: {}, semantic: { success: '#0', warning: '#0', error: '#0', info: '#0' } }, deps));
    const r = await validateThemeUseCase({ ...base, themeId }, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.valid).toBe(false);
  });
  it('should calculate theme score', async () => { const r = await calculateThemeScoreUseCase({ ...base, themeId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.score).toBeGreaterThanOrEqual(0); });
  it('should increase score with more tokens', async () => {
    const before = unwrap(await calculateThemeScoreUseCase({ ...base, themeId }, deps));
    unwrap(await createColorPaletteUseCase({ ...base, themeId, primary: '#0', secondary: '#0', accent: '#0', neutral: '#0', background: '#0', foreground: '#f', shades: {}, semantic: { success: '#0', warning: '#0', error: '#0', info: '#0' } }, deps));
    unwrap(await createSpacingSystemUseCase({ ...base, themeId, baseUnit: '0.25rem', scale: [] }, deps));
    unwrap(await createTypographyScaleUseCase({ ...base, themeId, fontFamilies: [], sizes: [], baseSize: '1rem', scaleRatio: '1.25' }, deps));
    const after = unwrap(await calculateThemeScoreUseCase({ ...base, themeId }, deps));
    expect(after.score).toBeGreaterThan(before.score);
  });
  it('should generate theme report', async () => { const r = await generateThemeReportUseCase({ ...base, themeId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.summary).toContain('Theme'); });
  it('should emit theme.validated event', async () => { await validateThemeUseCase({ ...base, themeId }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.THEME_VALIDATED)).toBe(1); });
  it('should emit theme.scored event', async () => { await calculateThemeScoreUseCase({ ...base, themeId }, deps); expect(deps.eventBus.countByType(THEME_EVENTS.THEME_SCORED)).toBe(1); });
});

// ═════════ MULTI-TENANT ═════════
describe('Multi-Tenant Isolation', () => {
  it('should isolate themes across tenants', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2'); deps.policyProvider.set('t-2', { maxThemes: 50 });
    await createThemeUseCase({ tenantId: 't-1', organizationId: 'org-1', correlationId: 'c1', actorId: 'a', name: 'T1', slug: 't1' }, deps);
    await createThemeUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c2', actorId: 'a', name: 'T2', slug: 't2' }, deps);
    const t1 = await listThemesUseCase('t-1', deps);
    const t2 = await listThemesUseCase('t-2', deps);
    if (t1.ok && t2.ok) { expect(t1.value.length).toBe(1); expect(t2.value.length).toBe(1); }
  });

  it('should allow same slug across tenants', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2'); deps.policyProvider.set('t-2', { maxThemes: 50 });
    const r1 = await createThemeUseCase({ tenantId: 't-1', organizationId: 'org-1', correlationId: 'c1', actorId: 'a', name: 'A', slug: 'shared' }, deps);
    const r2 = await createThemeUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c2', actorId: 'a', name: 'B', slug: 'shared' }, deps);
    expect(r1.ok).toBe(true); expect(r2.ok).toBe(true);
  });
});

// ═════════ CONSTRAINTS ═════════
describe('Constraint Validation', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should reject empty name', async () => { const r = await createThemeUseCase({ ...base, name: '', slug: 'x' }, deps); expect(r.ok).toBe(false); });
  it('should reject name over 200 chars', async () => { const r = await createThemeUseCase({ ...base, name: 'A'.repeat(201), slug: 'x' }, deps); expect(r.ok).toBe(false); });
  it('should respect max themes policy', async () => {
    deps.policyProvider.set('t-1', { maxThemes: 1 });
    unwrap(await createThemeUseCase({ ...base, name: 'A', slug: 'max1' }, deps));
    const r = await createThemeUseCase({ ...base, correlationId: 'c2', name: 'B', slug: 'max2' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═════════ FULL PIPELINE ═════════
describe('Full Theme Pipeline', () => {
  it('should create complete theme with all systems', async () => {
    const deps = makeDeps();

    // 1. Create Theme
    const t = unwrap(await createThemeUseCase({ ...base, name: 'Premium Theme', slug: 'premium' }, deps));

    // 2. Create Brand
    unwrap(await createBrandUseCase({ ...base, name: 'Acme', personality: ['premium'], voice: 'Bold', primaryColor: '#7c2d3a' }, deps));

    // 3. Add Token Sets
    unwrap(await createTokenSetUseCase({ ...base, themeId: t.themeId, category: 'Color', name: 'Brand Colors', tokens: [{ key: '--color-primary', value: '#7c2d3a', description: 'Wine red' }] }, deps));
    unwrap(await createTokenSetUseCase({ ...base, correlationId: 'c2', themeId: t.themeId, category: 'Radius', name: 'Border Radius', tokens: [{ key: '--radius-md', value: '0.75rem', description: 'rounded-xl' }] }, deps));

    // 4. Add Typography
    unwrap(await createTypographyScaleUseCase({ ...base, correlationId: 'c3', themeId: t.themeId, fontFamilies: [{ name: 'sans', stack: ['Pretendard', 'sans-serif'] }], sizes: [{ name: 'h1', size: '3rem', lineHeight: '1.2', weight: '800' }], baseSize: '1rem', scaleRatio: '1.25' }, deps));

    // 5. Add Color Palette
    unwrap(await createColorPaletteUseCase({ ...base, correlationId: 'c4', themeId: t.themeId, primary: '#7c2d3a', secondary: '#292524', accent: '#d97706', neutral: '#78716c', background: '#faf8f5', foreground: '#1c1917', shades: { '500': '#7c2d3a' }, semantic: { success: '#16a34a', warning: '#d97706', error: '#dc2626', info: '#2563eb' } }, deps));

    // 6. Add Spacing
    unwrap(await createSpacingSystemUseCase({ ...base, correlationId: 'c5', themeId: t.themeId, baseUnit: '0.25rem', scale: [{ name: 'sm', value: '0.5rem' }, { name: 'md', value: '1rem' }] }, deps));

    // 7. Add Motion
    unwrap(await createMotionSpecUseCase({ ...base, correlationId: 'c6', themeId: t.themeId, durations: [{ name: 'fast', value: '150ms' }], easings: [{ name: 'spring', value: 'cubic-bezier(0.34,1.56,0.64,1)' }] }, deps));

    // 8. Add Elevation
    unwrap(await createElevationSystemUseCase({ ...base, correlationId: 'c7', themeId: t.themeId, levels: [{ name: 'card', zIndex: 1, shadow: '0 1px 3px rgba(0,0,0,0.1)' }] }, deps));

    // 9. Create Dark Variant
    unwrap(await createThemeVariantUseCase({ ...base, correlationId: 'c8', themeId: t.themeId, mode: 'Dark', tokenOverrides: { '--color-background': '#1c1917', '--color-foreground': '#faf8f5' } }, deps));

    // 10. Create Light Variant
    unwrap(await createThemeVariantUseCase({ ...base, correlationId: 'c9', themeId: t.themeId, mode: 'Light', tokenOverrides: {}, isDefault: true }, deps));

    // 11. Add Responsive Tokens
    unwrap(await createResponsiveTokensUseCase({ ...base, correlationId: 'c10', themeId: t.themeId, breakpoint: 'md', tokenOverrides: { '--font-size-base': '1.125rem' } }, deps));

    // 12. Validate
    const validation = unwrap(await validateThemeUseCase({ ...base, correlationId: 'c11', themeId: t.themeId }, deps));
    expect(validation.valid).toBe(true);

    // 13. Calculate Score
    const score = unwrap(await calculateThemeScoreUseCase({ ...base, correlationId: 'c12', themeId: t.themeId }, deps));
    expect(score.score).toBeGreaterThan(50);

    // 14. Compile
    const compiled = unwrap(await compileThemeUseCase({ ...base, correlationId: 'c13', themeId: t.themeId }, deps));
    expect(compiled.tokenCount).toBeGreaterThan(0);
    expect(compiled.compiled).toContain(':root');

    // 15. Export
    const exported = unwrap(await exportThemeUseCase({ ...base, correlationId: 'c14', themeId: t.themeId }, deps));
    expect(exported.exported.colors).toBeDefined();

    // 16. Generate Report
    const report = unwrap(await generateThemeReportUseCase({ ...base, correlationId: 'c15', themeId: t.themeId }, deps));
    expect(report.metrics.themeScore).toBeGreaterThan(50);

    // 17. Activate
    unwrap(await activateThemeUseCase({ ...base, correlationId: 'c16', themeId: t.themeId }, deps));
    const th = unwrap(await getThemeUseCase('t-1', t.themeId, deps));
    expect(th.status).toBe('Active');
  });
});
