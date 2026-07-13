/**
 * Theme Engine RC2 — Brand & Design Language Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { makeDeps } from './helpers.js';
import {
  createThemeUseCase, createBrandUseCase,
  createBrandPersonalityUseCase, getBrandPersonalityUseCase,
  createBrandVoiceUseCase, getBrandVoiceUseCase,
  createDesignLanguageUseCase, getDesignLanguageUseCase,
  createThemeManifestUseCase, publishThemeManifestUseCase,
  getThemeManifestUseCase, resolveThemeManifestUseCase,
  generateThemeIntelligenceUseCase, getThemeIntelligenceUseCase,
} from '../src/index.js';

const base = { tenantId: 't-1', organizationId: 'org-1', correlationId: 'corr-1', actorId: 'user-1' };

type Deps = ReturnType<typeof makeDeps>;

async function setupThemeAndBrand(deps: Deps) {
  const themeR = await createThemeUseCase({ ...base, name: 'Test Theme', slug: 'test-theme' }, deps);
  const themeId = themeR.ok ? themeR.value.themeId : 'theme-1';
  const brandR = await createBrandUseCase({ ...base, name: 'Test Brand', personality: ['Luxury'], voice: 'Warm', primaryColor: '#7c2d3a' }, deps);
  const brandId = brandR.ok ? brandR.value.brandId : 'brand-1';
  return { themeId, brandId };
}

// ═══════════════════════════════════════════
// BRAND PERSONALITY (3 tests)
// ═══════════════════════════════════════════

describe('RC2: Brand Personality', () => {
  let deps: Deps;
  let brandId: string;
  beforeEach(async () => { deps = makeDeps(); brandId = (await setupThemeAndBrand(deps)).brandId; });

  it('creates brand personality', async () => {
    const r = await createBrandPersonalityUseCase({ ...base, brandId, traits: ['Luxury', 'Elegant'], archetypes: ['Sage'] }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets brand personality by brandId', async () => {
    await createBrandPersonalityUseCase({ ...base, brandId, traits: ['Modern'], archetypes: ['Explorer'] }, deps);
    const r = await getBrandPersonalityUseCase('t-1', brandId, deps);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.traits).toContain('Modern');
  });

  it('rejects personality for unknown brand', async () => {
    const r = await createBrandPersonalityUseCase({ ...base, brandId: 'unknown', traits: ['X'], archetypes: [] }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// BRAND VOICE (3 tests)
// ═══════════════════════════════════════════

describe('RC2: Brand Voice', () => {
  let deps: Deps;
  let brandId: string;
  beforeEach(async () => { deps = makeDeps(); brandId = (await setupThemeAndBrand(deps)).brandId; });

  it('creates brand voice', async () => {
    const r = await createBrandVoiceUseCase({ ...base, brandId, tone: ['Warm', 'Confident'], vocabulary: ['craft'], forbiddenWords: ['cheap'], sentenceStyle: 'editorial' }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets brand voice', async () => {
    await createBrandVoiceUseCase({ ...base, brandId, tone: ['Direct'], vocabulary: [], forbiddenWords: [], sentenceStyle: 'concise' }, deps);
    const r = await getBrandVoiceUseCase('t-1', brandId, deps);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.sentenceStyle).toBe('concise');
  });

  it('rejects voice for unknown brand', async () => {
    const r = await createBrandVoiceUseCase({ ...base, brandId: 'unknown', tone: ['X'], vocabulary: [], forbiddenWords: [], sentenceStyle: 'x' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// DESIGN LANGUAGE (3 tests)
// ═══════════════════════════════════════════

describe('RC2: Design Language', () => {
  let deps: Deps;
  let brandId: string;
  beforeEach(async () => { deps = makeDeps(); brandId = (await setupThemeAndBrand(deps)).brandId; });

  it('creates design language', async () => {
    const r = await createDesignLanguageUseCase({ ...base, brandId, style: ['Premium', 'Editorial'], whitespace: 'generous', visualHierarchy: 'strong', informationDensity: 'low' }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets design language', async () => {
    await createDesignLanguageUseCase({ ...base, brandId, style: ['Minimal'], whitespace: 'high', visualHierarchy: 'moderate', informationDensity: 'medium' }, deps);
    const r = await getDesignLanguageUseCase('t-1', brandId, deps);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.whitespace).toBe('high');
  });

  it('rejects design language for unknown brand', async () => {
    const r = await createDesignLanguageUseCase({ ...base, brandId: 'unknown', style: ['X'], whitespace: 'medium', visualHierarchy: 'strong', informationDensity: 'medium' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// THEME MANIFEST (5 tests)
// ═══════════════════════════════════════════

describe('RC2: Theme Manifest', () => {
  let deps: Deps;
  let themeId: string;
  let brandId: string;
  beforeEach(async () => { deps = makeDeps(); ({ themeId, brandId } = await setupThemeAndBrand(deps)); });

  it('creates a theme manifest', async () => {
    const r = await createThemeManifestUseCase({
      ...base, themeId, brandId, version: '1.0.0',
      personality: ['Luxury'], voice: ['Warm'], emotion: ['Trust'], designLanguage: ['Premium'],
      whitespace: 'generous', hierarchy: 'strong', density: 'low',
      motionIntensity: 'subtle', motionDuration: '400ms', motionEasing: 'ease-out',
      wcagLevel: 'AAA', contrastRatio: 7,
      photography: 'editorial', illustration: 'minimal', iconography: 'outline',
      constraints: ['No pure black'],
    }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets manifest by themeId', async () => {
    await createThemeManifestUseCase({
      ...base, themeId, brandId, version: '1.0.0',
      personality: ['Luxury'], voice: ['Warm'], emotion: ['Trust'], designLanguage: ['Premium'],
      whitespace: 'generous', hierarchy: 'strong', density: 'low',
      motionIntensity: 'subtle', motionDuration: '400ms', motionEasing: 'ease-out',
      wcagLevel: 'AAA', contrastRatio: 7,
      photography: 'editorial', illustration: 'minimal', iconography: 'outline',
      constraints: [],
    }, deps);
    const r = await getThemeManifestUseCase('t-1', themeId, deps);
    expect(r.ok).toBe(true);
    expect(r.ok && r.value.version).toBe('1.0.0');
  });

  it('publishes a manifest and notifies component engine', async () => {
    const mR = await createThemeManifestUseCase({
      ...base, themeId, brandId, version: '1.0.0',
      personality: [], voice: [], emotion: [], designLanguage: [],
      whitespace: 'medium', hierarchy: 'moderate', density: 'medium',
      motionIntensity: 'subtle', motionDuration: '300ms', motionEasing: 'ease',
      wcagLevel: 'AA', contrastRatio: 4.5,
      photography: 'editorial', illustration: 'minimal', iconography: 'outline',
      constraints: [],
    }, deps);
    const manifestId = mR.ok ? mR.value.manifestId : '';
    const r = await publishThemeManifestUseCase({ ...base, manifestId }, deps);
    expect(r.ok).toBe(true);
    expect(deps.componentThemeProvider.notifications.length).toBe(1);
  });

  it('resolves manifest to design tokens', async () => {
    await createThemeManifestUseCase({
      ...base, themeId, brandId, version: '1.0.0',
      personality: ['Luxury', 'Elegant'], voice: ['Warm'], emotion: ['Trust'], designLanguage: ['Premium'],
      whitespace: 'generous', hierarchy: 'strong', density: 'low',
      motionIntensity: 'subtle', motionDuration: '400ms', motionEasing: 'ease-out',
      wcagLevel: 'AAA', contrastRatio: 7,
      photography: 'editorial', illustration: 'minimal', iconography: 'outline',
      constraints: [],
    }, deps);
    const r = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.value.resolvedTokens).length).toBeGreaterThan(10);
      expect(r.value.resolvedTokens['--brand-whitespace']).toBe('generous');
    }
  });

  it('rejects manifest for unknown theme', async () => {
    const r = await createThemeManifestUseCase({
      ...base, themeId: 'unknown', brandId, version: '1.0.0',
      personality: [], voice: [], emotion: [], designLanguage: [],
      whitespace: 'medium', hierarchy: 'moderate', density: 'medium',
      motionIntensity: 'subtle', motionDuration: '300ms', motionEasing: 'ease',
      wcagLevel: 'AA', contrastRatio: 4.5,
      photography: 'editorial', illustration: 'minimal', iconography: 'outline',
      constraints: [],
    }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// THEME INTELLIGENCE (3 tests)
// ═══════════════════════════════════════════

describe('RC2: Theme Intelligence', () => {
  let deps: Deps;
  let brandId: string;
  beforeEach(async () => { deps = makeDeps(); brandId = (await setupThemeAndBrand(deps)).brandId; });

  it('generates brand direction from industry + positioning (Luxury)', async () => {
    const r = await generateThemeIntelligenceUseCase({
      ...base, brandId, industry: 'travel', targetAudience: 'High Income',
      positioning: 'Luxury travel experiences', competitors: ['Aman', 'Four Seasons'],
    }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const intel = await getThemeIntelligenceUseCase('t-1', brandId, deps);
      expect(intel.ok).toBe(true);
      if (intel.ok) {
        expect(intel.value.generatedPersonality).toContain('Luxury');
        expect(intel.value.generatedDesignLanguage).toContain('Premium');
      }
    }
  });

  it('generates brand direction for non-luxury positioning', async () => {
    const r = await generateThemeIntelligenceUseCase({
      ...base, brandId, industry: 'saas', targetAudience: 'Small Business',
      positioning: 'Affordable simple tools', competitors: ['Competitor A'],
    }, deps);
    expect(r.ok).toBe(true);
    const intel = await getThemeIntelligenceUseCase('t-1', brandId, deps);
    if (intel.ok) {
      expect(intel.value.generatedPersonality).toContain('Approachable');
      expect(intel.value.generatedDesignLanguage).toContain('Functional');
    }
  });

  it('rejects intelligence for unknown brand', async () => {
    const r = await generateThemeIntelligenceUseCase({
      ...base, brandId: 'unknown', industry: 'travel', targetAudience: 'All',
      positioning: 'Standard', competitors: [],
    }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// EVENT EMISSION (2 tests)
// ═══════════════════════════════════════════

describe('RC2: Event Emission', () => {
  let deps: Deps;
  let themeId: string;
  let brandId: string;
  beforeEach(async () => { deps = makeDeps(); ({ themeId, brandId } = await setupThemeAndBrand(deps)); });

  it('emits personality.created event', async () => {
    const before = deps.eventBus.countByType('brand.personality.created');
    await createBrandPersonalityUseCase({ ...base, brandId, traits: ['X'], archetypes: [] }, deps);
    expect(deps.eventBus.countByType('brand.personality.created')).toBe(before + 1);
  });

  it('emits intelligence.generated event', async () => {
    const before = deps.eventBus.countByType('intelligence.generated');
    await generateThemeIntelligenceUseCase({
      ...base, brandId, industry: 'travel', targetAudience: 'Luxury',
      positioning: 'Premium', competitors: [],
    }, deps);
    expect(deps.eventBus.countByType('intelligence.generated')).toBe(before + 1);
  });
});
