/**
 * Component Engine — Tests
 *
 * Covers: Component CRUD, Lifecycle, Variant, Preset, Clone, Publish,
 * Composition, Slot, Token, State, Behavior, Animation, Responsive,
 * Review, Score, Accessibility, Performance, Pattern, Improve,
 * Version, Marketplace, Learning, Analytics, Cross-Industry
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { makeDeps, baseInput, unwrap } from './helpers.js';
import {
  createComponentUseCase, updateComponentUseCase, getComponentUseCase,
  listComponentsUseCase, archiveComponentUseCase, restoreComponentUseCase,
  deleteComponentUseCase, publishComponentUseCase, cloneComponentUseCase,
  createVariantUseCase, updateVariantUseCase, getVariantUseCase, recommendVariantUseCase,
  createPresetUseCase, applyPresetUseCase,
  createVersionUseCase, getVersionHistoryUseCase, rollbackVersionUseCase,
  composeExperienceUseCase, decomposeExperienceUseCase, validateCompositionUseCase,
  createSlotUseCase, assignSlotUseCase,
  createTokenReferenceUseCase, resolveTokenReferencesUseCase,
  registerStateUseCase, transitionStateUseCase,
  createBehaviorUseCase, assignBehaviorUseCase,
  createAnimationUseCase, createResponsiveRuleUseCase,
  reviewComponentUseCase, calculateComponentScoreUseCase,
  validateAccessibilityUseCase, evaluatePerformanceUseCase,
  createPatternUseCase, getPatternUseCase, listPatternsUseCase,
  improveComponentUseCase,
  learnComponentUseCase, recordComponentOutcomeUseCase,
  recommendComponentUseCase, findBestComponentUseCase, generateComponentReportUseCase,
  registerMarketplaceComponentUseCase, installMarketplaceComponentUseCase,
  listMarketplaceComponentsUseCase,
} from '../src/index.js';
import type { ComponentUseCaseDeps } from '../src/index.js';

type Deps = ReturnType<typeof makeDeps>;

async function createComponent(deps: Deps, slug: string, componentType = 'Hero', tier: 'Experience' | 'Atomic' = 'Experience') {
  const r = await createComponentUseCase({ ...baseInput, name: slug.replace(/-/g, ' '), slug, tier, componentType }, deps);
  return unwrap(r).componentId;
}

// ═══════════════════════════════════════════
// COMPONENT LIFECYCLE (16 tests)
// ═══════════════════════════════════════════

describe('Component Lifecycle', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a component', async () => {
    const r = await createComponentUseCase({ ...baseInput, name: 'Hero Section', slug: 'hero-section', tier: 'Experience', componentType: 'Hero' }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).componentId).toBeTruthy();
  });

  it('rejects duplicate slug', async () => {
    await createComponent(deps, 'hero');
    const r = await createComponentUseCase({ ...baseInput, name: 'Hero', slug: 'hero', tier: 'Experience', componentType: 'Hero' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown organization', async () => {
    const r = await createComponentUseCase({ ...baseInput, organizationId: 'unknown-org', name: 'Test', slug: 'test', tier: 'Atomic', componentType: 'Button' }, deps);
    expect(r.ok).toBe(false);
  });

  it('validates input (empty name)', async () => {
    const r = await createComponentUseCase({ ...baseInput, name: '', slug: 'test', tier: 'Atomic', componentType: 'Button' }, deps);
    expect(r.ok).toBe(false);
  });

  it('gets a component by id', async () => {
    const id = await createComponent(deps, 'hero');
    const r = await getComponentUseCase('t-1', id, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).slug).toBe('hero');
  });

  it('returns NotFound for unknown id', async () => {
    const r = await getComponentUseCase('t-1', 'unknown', deps);
    expect(r.ok).toBe(false);
  });

  it('updates component name', async () => {
    const id = await createComponent(deps, 'hero');
    const r = await updateComponentUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', componentId: id, name: 'Updated Hero' }, deps);
    expect(r.ok).toBe(true);
    const c = unwrap(await getComponentUseCase('t-1', id, deps));
    expect(c.name).toBe('Updated Hero');
  });

  it('lists all components', async () => {
    await createComponent(deps, 'hero-1');
    await createComponent(deps, 'hero-2');
    const r = await listComponentsUseCase('t-1', deps);
    expect(unwrap(r).length).toBe(2);
  });

  it('archives a component', async () => {
    const id = await createComponent(deps, 'hero');
    const r = await archiveComponentUseCase({ ...baseInput, componentId: id }, deps);
    expect(r.ok).toBe(true);
    const c = unwrap(await getComponentUseCase('t-1', id, deps));
    expect(c.status).toBe('Archived');
  });

  it('rejects double archive', async () => {
    const id = await createComponent(deps, 'hero');
    await archiveComponentUseCase({ ...baseInput, componentId: id }, deps);
    const r = await archiveComponentUseCase({ ...baseInput, componentId: id }, deps);
    expect(r.ok).toBe(false);
  });

  it('restores an archived component', async () => {
    const id = await createComponent(deps, 'hero');
    await archiveComponentUseCase({ ...baseInput, componentId: id }, deps);
    const r = await restoreComponentUseCase({ ...baseInput, componentId: id }, deps);
    expect(r.ok).toBe(true);
    const c = unwrap(await getComponentUseCase('t-1', id, deps));
    expect(c.status).toBe('Draft');
  });

  it('deletes (soft) a component', async () => {
    const id = await createComponent(deps, 'hero');
    const r = await deleteComponentUseCase({ ...baseInput, componentId: id }, deps);
    expect(r.ok).toBe(true);
    const c = unwrap(await getComponentUseCase('t-1', id, deps));
    expect(c.status).toBe('Deprecated');
  });

  it('publishes a component', async () => {
    const id = await createComponent(deps, 'hero');
    const r = await publishComponentUseCase({ ...baseInput, componentId: id }, deps);
    expect(r.ok).toBe(true);
    const c = unwrap(await getComponentUseCase('t-1', id, deps));
    expect(c.status).toBe('Published');
  });

  it('rejects double publish', async () => {
    const id = await createComponent(deps, 'hero');
    await publishComponentUseCase({ ...baseInput, componentId: id }, deps);
    const r = await publishComponentUseCase({ ...baseInput, componentId: id }, deps);
    expect(r.ok).toBe(false);
  });

  it('clones a component', async () => {
    const id = await createComponent(deps, 'hero');
    const r = await cloneComponentUseCase({ ...baseInput, componentId: id, newName: 'Hero Clone', newSlug: 'hero-clone' }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).clonedFrom).toBe(id);
  });

  it('emits component.created event', async () => {
    const beforeCount = deps.eventBus.countByType('component.created');
    await createComponent(deps, 'hero-event');
    expect(deps.eventBus.countByType('component.created')).toBe(beforeCount + 1);
  });
});

// ═══════════════════════════════════════════
// VARIANT (5 tests)
// ═══════════════════════════════════════════

describe('Component Variant', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('creates a variant', async () => {
    const r = await createVariantUseCase({ ...baseInput, componentId, name: 'Luxury', label: 'Luxury Hero', propOverrides: {}, tokenOverrides: {} }, deps);
    expect(r.ok).toBe(true);
  });

  it('updates a variant', async () => {
    const vId = unwrap(await createVariantUseCase({ ...baseInput, componentId, name: 'Standard', label: 'Standard', propOverrides: {}, tokenOverrides: {} }, deps)).variantId;
    const r = await updateVariantUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', variantId: vId, name: 'Premium' }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets a variant', async () => {
    const vId = unwrap(await createVariantUseCase({ ...baseInput, componentId, name: 'Default', label: 'Default', propOverrides: {}, tokenOverrides: {}, isDefault: true }, deps)).variantId;
    const r = await getVariantUseCase('t-1', vId, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).name).toBe('Default');
  });

  it('recommends a variant by style', async () => {
    await createVariantUseCase({ ...baseInput, componentId, name: 'Luxury', label: 'Luxury', propOverrides: {}, tokenOverrides: {} }, deps);
    await createVariantUseCase({ ...baseInput, componentId, name: 'Standard', label: 'Standard', propOverrides: {}, tokenOverrides: {}, isDefault: true }, deps);
    const r = await recommendVariantUseCase('t-1', componentId, { industry: 'travel', style: 'luxury' }, deps);
    expect(r.ok).toBe(true);
    const v = unwrap(r);
    expect(v).not.toBeNull();
    expect(v!.name).toBe('Luxury');
  });

  it('falls back to default variant', async () => {
    await createVariantUseCase({ ...baseInput, componentId, name: 'Standard', label: 'Standard', propOverrides: {}, tokenOverrides: {}, isDefault: true }, deps);
    const r = await recommendVariantUseCase('t-1', componentId, { industry: 'travel', style: 'nonexistent' }, deps);
    const v = unwrap(r);
    expect(v).not.toBeNull();
    expect(v!.isDefault).toBe(true);
  });
});

// ═══════════════════════════════════════════
// PRESET (3 tests)
// ═══════════════════════════════════════════

describe('Component Preset', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('creates a preset', async () => {
    const r = await createPresetUseCase({ ...baseInput, componentId, name: 'Travel Preset', frozenProps: { variant: 'luxury' }, frozenTokens: {} }, deps);
    expect(r.ok).toBe(true);
  });

  it('applies a preset to component', async () => {
    const pId = unwrap(await createPresetUseCase({ ...baseInput, componentId, name: 'Preset', frozenProps: { layout: 'centered' }, frozenTokens: {} }, deps)).presetId;
    const r = await applyPresetUseCase({ ...baseInput, componentId, presetId: pId }, deps);
    expect(r.ok).toBe(true);
    const c = unwrap(await getComponentUseCase('t-1', componentId, deps));
    expect(c.defaultProps).toHaveProperty('layout', 'centered');
  });

  it('rejects preset for unknown component', async () => {
    const r = await createPresetUseCase({ ...baseInput, componentId: 'unknown', name: 'P', frozenProps: {}, frozenTokens: {} }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// VERSION (4 tests)
// ═══════════════════════════════════════════

describe('Component Version', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('creates a version snapshot', async () => {
    const r = await createVersionUseCase({ ...baseInput, componentId, version: '1.1.0', changelog: 'Added states' }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets version history', async () => {
    await createVersionUseCase({ ...baseInput, componentId, version: '1.1.0', changelog: 'v1' }, deps);
    await createVersionUseCase({ ...baseInput, componentId, version: '1.2.0', changelog: 'v2' }, deps);
    const r = await getVersionHistoryUseCase('t-1', componentId, deps);
    expect(unwrap(r).length).toBe(2);
  });

  it('rolls back to a previous version', async () => {
    await createVersionUseCase({ ...baseInput, componentId, version: '1.1.0', changelog: 'v1' }, deps);
    await createVersionUseCase({ ...baseInput, componentId, version: '1.2.0', changelog: 'v2' }, deps);
    const r = await rollbackVersionUseCase({ ...baseInput, componentId, targetVersion: '1.1.0' }, deps);
    expect(r.ok).toBe(true);
    // rollback restores the component version from the snapshot (which was '1.0.0' at creation time)
    expect(unwrap(r).rolledBackTo).toBe('1.1.0');
  });

  it('rejects rollback to nonexistent version', async () => {
    const r = await rollbackVersionUseCase({ ...baseInput, componentId, targetVersion: '9.9.9' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// COMPOSITION (5 tests)
// ═══════════════════════════════════════════

describe('Composition', () => {
  let deps: Deps;
  let parentId: string;
  let child1Id: string;
  let child2Id: string;
  beforeEach(async () => {
    deps = makeDeps();
    parentId = await createComponent(deps, 'travel-hero', 'Hero');
    child1Id = await createComponent(deps, 'search-bar', 'SearchBar', 'Atomic');
    child2Id = await createComponent(deps, 'cta-btn', 'Button', 'Atomic');
  });

  it('composes an experience from multiple components', async () => {
    const r = await composeExperienceUseCase({
      ...baseInput, name: 'Travel Home', slug: 'travel-home',
      parentComponentId: parentId, childComponentIds: [child1Id, child2Id],
      slotMapping: { search: child1Id, cta: child2Id }, experienceType: 'Hero',
    }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects composition with unknown parent', async () => {
    const r = await composeExperienceUseCase({
      ...baseInput, name: 'Test', slug: 'test',
      parentComponentId: 'unknown', childComponentIds: [child1Id],
      slotMapping: {}, experienceType: 'Hero',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects composition with unknown child', async () => {
    const r = await composeExperienceUseCase({
      ...baseInput, name: 'Test', slug: 'test',
      parentComponentId: parentId, childComponentIds: ['unknown'],
      slotMapping: {}, experienceType: 'Hero',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('decomposes an experience', async () => {
    const compId = unwrap(await composeExperienceUseCase({
      ...baseInput, name: 'Test', slug: 'test',
      parentComponentId: parentId, childComponentIds: [child1Id],
      slotMapping: { s: child1Id }, experienceType: 'Hero',
    }, deps)).compositionId;
    const r = await decomposeExperienceUseCase({ ...baseInput, compositionId: compId }, deps);
    expect(r.ok).toBe(true);
  });

  it('validates composition integrity', async () => {
    const compId = unwrap(await composeExperienceUseCase({
      ...baseInput, name: 'Test', slug: 'test',
      parentComponentId: parentId, childComponentIds: [child1Id, child2Id],
      slotMapping: { search: child1Id, cta: child2Id }, experienceType: 'Hero',
    }, deps)).compositionId;
    const r = await validateCompositionUseCase({ tenantId: 't-1', compositionId: compId }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).valid).toBe(true);
  });
});

// ═══════════════════════════════════════════
// SLOT (3 tests)
// ═══════════════════════════════════════════

describe('Slot', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('creates a slot', async () => {
    const r = await createSlotUseCase({ ...baseInput, componentId, name: 'header', acceptedTypes: ['Button', 'Nav'], isRequired: true }, deps);
    expect(r.ok).toBe(true);
  });

  it('assigns a component to a slot', async () => {
    const slotId = unwrap(await createSlotUseCase({ ...baseInput, componentId, name: 'header', acceptedTypes: ['Button'], isRequired: true }, deps)).slotId;
    const targetId = await createComponent(deps, 'btn', 'Button', 'Atomic');
    const r = await assignSlotUseCase({ ...baseInput, slotId, componentId: targetId }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects slot for unknown component', async () => {
    const r = await createSlotUseCase({ ...baseInput, componentId: 'unknown', name: 'x', acceptedTypes: [], isRequired: false }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// TOKEN REFERENCE (3 tests)
// ═══════════════════════════════════════════

describe('Token Reference', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('creates a token reference', async () => {
    const r = await createTokenReferenceUseCase({ ...baseInput, componentId, themeId: 'theme-1', tokenKey: 'color.primary', tokenValue: '#7c2d3a' }, deps);
    expect(r.ok).toBe(true);
  });

  it('resolves token references via theme provider', async () => {
    await createTokenReferenceUseCase({ ...baseInput, componentId, themeId: 'theme-1', tokenKey: 'color.primary', tokenValue: '#7c2d3a' }, deps);
    const r = await resolveTokenReferencesUseCase('t-1', componentId, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects token ref for unknown component', async () => {
    const r = await createTokenReferenceUseCase({ ...baseInput, componentId: 'unknown', themeId: 't1', tokenKey: 'k', tokenValue: 'v' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// STATE (3 tests)
// ═══════════════════════════════════════════

describe('State', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('registers a state', async () => {
    const r = await registerStateUseCase({ ...baseInput, componentId, name: 'Hover', styleOverrides: { scale: 1.05 }, tokenOverrides: {} }, deps);
    expect(r.ok).toBe(true);
  });

  it('transitions to a registered state', async () => {
    await registerStateUseCase({ ...baseInput, componentId, name: 'Hover', styleOverrides: {}, tokenOverrides: {} }, deps);
    const r = await transitionStateUseCase({ ...baseInput, componentId, targetState: 'Hover' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects transition to unregistered state', async () => {
    const r = await transitionStateUseCase({ ...baseInput, componentId, targetState: 'Error' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// BEHAVIOR (3 tests)
// ═══════════════════════════════════════════

describe('Behavior', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('creates a behavior rule', async () => {
    const r = await createBehaviorUseCase({ ...baseInput, componentId, name: 'Click Navigate', rule: 'onClick → navigate', condition: { event: 'click' }, action: { type: 'navigate' }, priority: 1 }, deps);
    expect(r.ok).toBe(true);
  });

  it('assigns a behavior to a component', async () => {
    const bId = unwrap(await createBehaviorUseCase({ ...baseInput, componentId, name: 'B', rule: 'R', condition: {}, action: {}, priority: 1 }, deps)).behaviorId;
    const targetId = await createComponent(deps, 'target');
    const r = await assignBehaviorUseCase({ ...baseInput, componentId: targetId, behaviorId: bId }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects behavior for unknown component', async () => {
    const r = await createBehaviorUseCase({ ...baseInput, componentId: 'unknown', name: 'B', rule: 'R', condition: {}, action: {}, priority: 1 }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// ANIMATION & RESPONSIVE (3 tests)
// ═══════════════════════════════════════════

describe('Animation & Responsive', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('creates an animation', async () => {
    const r = await createAnimationUseCase({ ...baseInput, componentId, type: 'Entrance', duration: '300ms', easing: 'ease-out', keyframes: { from: { opacity: 0 }, to: { opacity: 1 } } }, deps);
    expect(r.ok).toBe(true);
  });

  it('creates a responsive rule', async () => {
    const r = await createResponsiveRuleUseCase({ ...baseInput, componentId, device: 'Mobile', rules: { columns: 1 } }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects animation for unknown component', async () => {
    const r = await createAnimationUseCase({ ...baseInput, componentId: 'unknown', type: 'Entrance', duration: '300ms', easing: 'ease-out', keyframes: {} }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// REVIEW & SCORE (5 tests)
// ═══════════════════════════════════════════

describe('Review & Score', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('reviews a component with high scores → Approved', async () => {
    const r = await reviewComponentUseCase({ ...baseInput, componentId, reviewerId: 'rev-1', feedback: 'Great', scores: { professional: 95, premium: 92 } }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).status).toBe('Approved');
  });

  it('reviews a component with low scores → ChangesRequested', async () => {
    const r = await reviewComponentUseCase({ ...baseInput, componentId, reviewerId: 'rev-1', feedback: 'Needs work', scores: { professional: 60 } }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).status).toBe('ChangesRequested');
  });

  it('calculates component score (9 dimensions)', async () => {
    const r = await calculateComponentScoreUseCase({ ...baseInput, componentId }, deps);
    expect(r.ok).toBe(true);
    const s = unwrap(r);
    expect(s.overall).toBeGreaterThanOrEqual(85);
    expect(s.meetsThreshold).toBe(true);
  });

  it('emits score.updated event', async () => {
    const before = deps.eventBus.countByType('component.score.updated');
    await calculateComponentScoreUseCase({ ...baseInput, componentId }, deps);
    expect(deps.eventBus.countByType('component.score.updated')).toBe(before + 1);
  });

  it('improves a component with suggestions', async () => {
    await calculateComponentScoreUseCase({ ...baseInput, componentId }, deps);
    const r = await improveComponentUseCase({ ...baseInput, componentId, targetScore: 95 }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).suggestions.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// ACCESSIBILITY & PERFORMANCE (3 tests)
// ═══════════════════════════════════════════

describe('Accessibility & Performance', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('validates accessibility', async () => {
    const r = await validateAccessibilityUseCase({ ...baseInput, componentId }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).score).toBeGreaterThanOrEqual(90);
  });

  it('emits accessibility.validated event', async () => {
    const before = deps.eventBus.countByType('component.accessibility.validated');
    await validateAccessibilityUseCase({ ...baseInput, componentId }, deps);
    expect(deps.eventBus.countByType('component.accessibility.validated')).toBe(before + 1);
  });

  it('evaluates performance via runtime provider', async () => {
    deps.runtimeProvider.add('t-1', componentId, { componentId, healthy: true, loadTime: 100, errorRate: 0.01 });
    const r = await evaluatePerformanceUseCase({ ...baseInput, componentId }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).healthy).toBe(true);
  });
});

// ═══════════════════════════════════════════
// PATTERN (3 tests)
// ═══════════════════════════════════════════

describe('Pattern', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a reusable pattern', async () => {
    const r = await createPatternUseCase({ ...baseInput, name: 'Hero + CTA', slug: 'hero-cta', componentIds: [], compositionTemplate: { layout: 'hero' }, industryAdapters: ['travel', 'restaurant'] }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets a pattern by id', async () => {
    const pId = unwrap(await createPatternUseCase({ ...baseInput, name: 'P', slug: 'p1', componentIds: [], compositionTemplate: {}, industryAdapters: [] }, deps)).patternId;
    const r = await getPatternUseCase('t-1', pId, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects duplicate pattern slug', async () => {
    await createPatternUseCase({ ...baseInput, name: 'P', slug: 'dup', componentIds: [], compositionTemplate: {}, industryAdapters: [] }, deps);
    const r = await createPatternUseCase({ ...baseInput, name: 'P2', slug: 'dup', componentIds: [], compositionTemplate: {}, industryAdapters: [] }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// MARKETPLACE (4 tests)
// ═══════════════════════════════════════════

describe('Marketplace', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('registers a component in the marketplace', async () => {
    const r = await registerMarketplaceComponentUseCase({ ...baseInput, componentId, tier: 'Official', name: 'Official Hero', description: 'Platform standard hero', compatibilityInfo: { minVersion: '1.0.0' } }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).tier).toBe('Official');
  });

  it('installs a marketplace component', async () => {
    const mId = unwrap(await registerMarketplaceComponentUseCase({ ...baseInput, componentId, tier: 'Marketplace', name: 'M Hero', description: 'd', compatibilityInfo: {} }, deps)).marketplaceId;
    const r = await installMarketplaceComponentUseCase({ ...baseInput, marketplaceId: mId }, deps);
    expect(r.ok).toBe(true);
  });

  it('lists marketplace components by tier', async () => {
    await registerMarketplaceComponentUseCase({ ...baseInput, componentId, tier: 'Official', name: 'O', description: 'd', compatibilityInfo: {} }, deps);
    const r = await listMarketplaceComponentsUseCase('t-1', 'Official', deps);
    expect(unwrap(r).length).toBe(1);
  });

  it('lists all marketplace components', async () => {
    await registerMarketplaceComponentUseCase({ ...baseInput, componentId, tier: 'Official', name: 'O', description: 'd', compatibilityInfo: {} }, deps);
    const c2 = await createComponent(deps, 'hero-2');
    await registerMarketplaceComponentUseCase({ ...baseInput, componentId: c2, tier: 'Marketplace', name: 'M', description: 'd', compatibilityInfo: {} }, deps);
    const r = await listMarketplaceComponentsUseCase('t-1', 'all', deps);
    expect(unwrap(r).length).toBe(2);
  });
});

// ═══════════════════════════════════════════
// LEARNING & ANALYTICS (3 tests)
// ═══════════════════════════════════════════

describe('Learning & Analytics', () => {
  let deps: Deps;
  let componentId: string;
  beforeEach(async () => { deps = makeDeps(); componentId = await createComponent(deps, 'hero'); });

  it('learns from component outcomes', async () => {
    const r = await learnComponentUseCase({ ...baseInput, componentId }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).componentId).toBe(componentId);
  });

  it('records a component outcome', async () => {
    const r = await recordComponentOutcomeUseCase({ ...baseInput, componentId, outcome: 'success', context: { conversionRate: 12 } }, deps);
    expect(r.ok).toBe(true);
  });

  it('generates a comprehensive component report', async () => {
    await createVariantUseCase({ ...baseInput, componentId, name: 'V', label: 'V', propOverrides: {}, tokenOverrides: {} }, deps);
    await calculateComponentScoreUseCase({ ...baseInput, componentId }, deps);
    const r = await generateComponentReportUseCase({ tenantId: 't-1', componentId }, deps);
    expect(r.ok).toBe(true);
    const report = unwrap(r);
    expect(report.variantCount).toBe(1);
    expect(report.score).toBeGreaterThanOrEqual(85);
  });
});

// ═══════════════════════════════════════════
// CROSS-INDUSTRY (4 tests)
// ═══════════════════════════════════════════

describe('Cross-Industry Reuse', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('same Hero component works for Travel', async () => {
    const id = await createComponent(deps, 'hero-travel', 'Hero');
    const c = unwrap(await getComponentUseCase('t-1', id, deps));
    expect(c.componentType).toBe('Hero');
    expect(c.industryAdapters).toEqual([]);
  });

  it('same Button component works for Restaurant', async () => {
    const id = await createComponent(deps, 'btn-restaurant', 'Button', 'Atomic');
    const c = unwrap(await getComponentUseCase('t-1', id, deps));
    expect(c.tier).toBe('Atomic');
    expect(c.componentType).toBe('Button');
  });

  it('same Search component works for Marketplace', async () => {
    const id = await createComponent(deps, 'search-marketplace', 'SearchBar', 'Atomic');
    const c = unwrap(await getComponentUseCase('t-1', id, deps));
    expect(c.componentType).toBe('SearchBar');
  });

  it('composes different industries from same components', async () => {
    const hero = await createComponent(deps, 'hero-x', 'Hero');
    const search = await createComponent(deps, 'search-x', 'SearchBar', 'Atomic');
    const cta = await createComponent(deps, 'cta-x', 'Button', 'Atomic');

    // Travel composition
    const t1 = unwrap(await composeExperienceUseCase({
      ...baseInput, name: 'Travel Home', slug: 'travel-home',
      parentComponentId: hero, childComponentIds: [search, cta],
      slotMapping: { search, cta }, experienceType: 'Hero',
    }, deps));

    // Restaurant composition (same components, different slug)
    const t2 = unwrap(await composeExperienceUseCase({
      ...baseInput, name: 'Restaurant Home', slug: 'restaurant-home',
      parentComponentId: hero, childComponentIds: [search, cta],
      slotMapping: { search, cta }, experienceType: 'Hero',
    }, deps));

    expect(t1.compositionId).not.toBe(t2.compositionId);
    // both use the same underlying components
    const v1 = unwrap(await validateCompositionUseCase({ tenantId: 't-1', compositionId: t1.compositionId }, deps));
    const v2 = unwrap(await validateCompositionUseCase({ tenantId: 't-1', compositionId: t2.compositionId }, deps));
    expect(v1.valid).toBe(true);
    expect(v2.valid).toBe(true);
  });
});

// ═══════════════════════════════════════════
// AI RECOMMENDATION (2 tests)
// ═══════════════════════════════════════════

describe('AI Recommendation', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('recommends a component via AI provider', async () => {
    const id = await createComponent(deps, 'hero-ai', 'Hero');
    deps.aiProvider.add('t-1', { industry: 'travel', experience: 'Hero', style: 'luxury' }, { componentId: id, confidence: 0.95, reason: 'Best match' });
    const r = await recommendComponentUseCase({ tenantId: 't-1', industry: 'travel', experience: 'Hero', style: 'luxury' }, deps);
    expect(r.ok).toBe(true);
    const rec = unwrap(r);
    expect(rec).not.toBeNull();
    expect(rec!.confidence).toBeGreaterThan(0.9);
  });

  it('finds best component by type', async () => {
    const id1 = await createComponent(deps, 'hero-a', 'Hero');
    const id2 = await createComponent(deps, 'hero-b', 'Hero');
    await calculateComponentScoreUseCase({ ...baseInput, componentId: id1 }, deps);
    await calculateComponentScoreUseCase({ ...baseInput, componentId: id2 }, deps);
    const r = await findBestComponentUseCase({ tenantId: 't-1', componentType: 'Hero', limit: 5 }, deps);
    expect(r.ok).toBe(true);
    expect(unwrap(r).length).toBe(2);
  });
});

// ═══════════════════════════════════════════
// TENANT ISOLATION (2 tests)
// ═══════════════════════════════════════════

describe('Tenant Isolation', () => {
  let deps: Deps;
  beforeEach(() => {
    deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2');
  });

  it('components are isolated by tenant', async () => {
    await createComponentUseCase({ tenantId: 't-1', organizationId: 'org-1', correlationId: 'c', actorId: 'a', name: 'T1 Hero', slug: 't1-hero', tier: 'Atomic', componentType: 'Button' }, deps);
    await createComponentUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c', actorId: 'a', name: 'T2 Hero', slug: 't2-hero', tier: 'Atomic', componentType: 'Button' }, deps);
    const t1 = unwrap(await listComponentsUseCase('t-1', deps));
    const t2 = unwrap(await listComponentsUseCase('t-2', deps));
    expect(t1.length).toBe(1);
    expect(t2.length).toBe(1);
    expect(t1[0]!.slug).toBe('t1-hero');
    expect(t2[0]!.slug).toBe('t2-hero');
  });

  it('cannot access cross-tenant component', async () => {
    const r1 = await createComponentUseCase({ tenantId: 't-1', organizationId: 'org-1', correlationId: 'c', actorId: 'a', name: 'T1', slug: 't1-x', tier: 'Atomic', componentType: 'Button' }, deps);
    const t1Id = unwrap(r1).componentId;
    const r = await getComponentUseCase('t-2', t1Id, deps);
    expect(r.ok).toBe(false);
  });
});
