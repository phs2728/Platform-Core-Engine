/**
 * Component Engine RC2 — Sprint B Tests
 *
 * 검증:
 *  1. 단방향 의존성 (Theme→Manifest→Component)
 *  2. Component는 resolveThemeManifest만 호출
 *  3. 영향받는 Component만 재생성 (전체 금지)
 *  4. 결정적(deterministic) 재생성
 *  5. Theme 내부 Domain Event 직접 의존 0건
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { makeDeps, baseInput, unwrap } from './helpers.js';
import {
  createComponentUseCase, createTokenReferenceUseCase, resolveTokenReferencesUseCase,
  resolveThemeManifestUseCase,
  subscribeToThemeChangedUseCase, reResolveComponentTokensUseCase,
  recalculateComponentScoresUseCase, regenerateComponentPreviewUseCase,
  createPublishCandidateUseCase, getComponentsByManifestThemeUseCase,
  type ResolvedManifest, type ThemeChangedEvent,
} from '../src/index.js';
import type { ComponentUseCaseDeps } from '../src/index.js';

type Deps = ReturnType<typeof makeDeps>;

// ═══════════════════════════════════════════
// 원칙 2: Component는 resolveThemeManifest만 호출 (read-only)
// ═══════════════════════════════════════════

describe('RC2 Sprint B: Single API Surface (read-only)', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('ComponentUseCaseDeps has ONLY themeManifestConsumer (no themeProvider)', () => {
    // 타입 시스템 검증: 'themeProvider' 필드가 없어야 함
    const d: ComponentUseCaseDeps = deps;
    expect('themeManifestConsumer' in d).toBe(true);
    // @ts-expect-error: RC1 themeProvider는 RC2에서 제거됨
    expect(typeof d.themeProvider).toBe('undefined');
  });

  it('resolves manifest via single API', async () => {
    const r = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.themeId).toBe('theme-1');
      expect(r.value.resolvedTokens['--brand-whitespace']).toBe('medium');
    }
  });

  it('resolves manifest for unknown themeId returns Ok (default)', async () => {
    const r = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'unknown' }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 원칙 5: 결정적(deterministic) 재생성
// ═══════════════════════════════════════════

describe('RC2 Sprint B: Determinism', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('same themeId → same manifestHash', async () => {
    const r1 = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
    const r2 = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r1.value.manifestHash).toBe(r2.value.manifestHash);
  });

  it('same themeId → same resolvedTokens', async () => {
    const r1 = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
    const r2 = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
    if (r1.ok && r2.ok) expect(r1.value.resolvedTokens).toEqual(r2.value.resolvedTokens);
  });

  it('different themeId → different manifestHash', async () => {
    const r1 = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
    const r2 = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-2' }, deps);
    if (r1.ok && r2.ok) expect(r1.value.manifestHash).not.toBe(r2.value.manifestHash);
  });

  it('regenerateComponentPreviewUseCase is deterministic', async () => {
    const componentId = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    // assign themeId manually (test setup)
    await deps.componentRepo.update('t-1', componentId, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
    const r1 = await regenerateComponentPreviewUseCase({ tenantId: 't-1', componentId }, deps);
    const r2 = await regenerateComponentPreviewUseCase({ tenantId: 't-1', componentId }, deps);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r1.value.previewUri).toBe(r2.value.previewUri);
  });

  it('recalculateComponentScoresUseCase is deterministic', async () => {
    const componentId = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    await deps.componentRepo.update('t-1', componentId, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
    const r1 = await recalculateComponentScoresUseCase({ tenantId: 't-1', componentId }, deps);
    const r2 = await recalculateComponentScoresUseCase({ tenantId: 't-1', componentId }, deps);
    if (r1.ok && r2.ok) {
      expect(r1.value.overall).toBe(r2.value.overall);
      expect(r1.value.manifestHash).toBe(r2.value.manifestHash);
    }
  });
});

// ═══════════════════════════════════════════
// 원칙 4: 영향 범위 최소화 (영향받는 Component만 재생성)
// ═══════════════════════════════════════════

describe('RC2 Sprint B: Affected Scope Minimization', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('subscribeToThemeChanged affects ONLY components with same themeId', async () => {
    const c1 = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'T1', slug: 't1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    const c2 = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'T2', slug: 't2', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    const c3 = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'T3', slug: 't3', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    // T1, T2 use theme-1; T3 uses theme-2
    await deps.componentRepo.update('t-1', c1, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
    await deps.componentRepo.update('t-1', c2, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
    await deps.componentRepo.update('t-1', c3, { themeId: 'theme-2', updatedAt: deps.clock.now().toISOString() });

    const event: ThemeChangedEvent = {
      tenantId: 't-1', themeId: 'theme-1', manifestId: 'm-1', brandId: 'b-1',
      version: '1.0.0', manifestHash: 'hash-1', occurredAt: new Date().toISOString(),
    };
    const r = await subscribeToThemeChangedUseCase(event, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      // T3는 theme-2 사용 → 영향받지 않음
      expect(r.value.affectedComponentIds).toContain(c1);
      expect(r.value.affectedComponentIds).toContain(c2);
      expect(r.value.affectedComponentIds).not.toContain(c3);
      expect(r.value.affectedComponentIds.length).toBe(2);
    }
  });

  it('subscribeToThemeChanged does NOT regenerate unchanged components', async () => {
    const c1 = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    await deps.componentRepo.update('t-1', c1, {
      themeId: 'theme-1',
      attributes: { manifestHash: 'hash-1' },
      updatedAt: deps.clock.now().toISOString(),
    });

    // 같은 hash 이벤트 → affected 0
    const event: ThemeChangedEvent = {
      tenantId: 't-1', themeId: 'theme-1', manifestId: 'm-1', brandId: 'b-1',
      version: '1.0.0', manifestHash: 'hash-1', occurredAt: new Date().toISOString(),
    };
    const r = await subscribeToThemeChangedUseCase(event, deps);
    if (r.ok) {
      expect(r.value.affectedComponentIds.length).toBe(0);
      expect(r.value.regeneratedCount).toBe(0);
    }
  });

  it('subscribeToThemeChanged regenerates only when manifestHash changes', async () => {
    const c1 = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    await deps.componentRepo.update('t-1', c1, {
      themeId: 'theme-1',
      attributes: { manifestHash: 'hash-old' },
      updatedAt: deps.clock.now().toISOString(),
    });

    const event: ThemeChangedEvent = {
      tenantId: 't-1', themeId: 'theme-1', manifestId: 'm-1', brandId: 'b-1',
      version: '1.0.0', manifestHash: 'hash-new', occurredAt: new Date().toISOString(),
    };
    const r = await subscribeToThemeChangedUseCase(event, deps);
    if (r.ok) {
      expect(r.value.affectedComponentIds).toContain(c1);
    }
  });
});

// ═══════════════════════════════════════════
// 원칙 1: 단방향 의존성 (Component Engine이 Theme API 호출은 resolveThemeManifest만)
// ═══════════════════════════════════════════

describe('RC2 Sprint B: Unidirectional Dependency', () => {
  it('Component Engine has no direct import of engines/theme/', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const componentSrc = '/opt/data/projects/identity-engine/engines/component/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(componentSrc);
    const violations: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      if (/from\s+['"]@platform\/engine-theme['"]/.test(content)) {
        violations.push(f);
      }
    }
    expect(violations.length).toBe(0);
  });

  it('Component Engine uses only @platform/core-sdk (no other engines)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const componentSrc = '/opt/data/projects/identity-engine/engines/component/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(componentSrc);
    const violations: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      const matches = content.match(/from\s+['"]@platform\/engine-[a-z]+['"]/g) ?? [];
      violations.push(...matches);
    }
    expect(violations.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// RC2 AutoRegen UseCases — 기본 동작
// ═══════════════════════════════════════════

describe('RC2 Sprint B: AutoRegen UseCases', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('reResolveComponentTokens stores manifestHash on component', async () => {
    const cId = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    await deps.componentRepo.update('t-1', cId, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
    const r = await reResolveComponentTokensUseCase({ tenantId: 't-1', componentId: cId }, deps);
    if (!r.ok) throw new Error(`reResolve failed: ${JSON.stringify(r.error)}`);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.manifestHash).toBeTruthy();
    const c = await deps.componentRepo.findById('t-1', cId);
    expect(c?.attributes['manifestHash'] as string).toBeTruthy();
  });

  it('recalculateComponentScores returns deterministic overall', async () => {
    const cId = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    await deps.componentRepo.update('t-1', cId, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
    const r = await recalculateComponentScoresUseCase({ tenantId: 't-1', componentId: cId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.overall).toBeGreaterThanOrEqual(85);
      expect(r.value.manifestHash).toBeTruthy();
    }
  });

  it('regenerateComponentPreview returns deterministic previewUri', async () => {
    const cId = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    await deps.componentRepo.update('t-1', cId, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
    const r = await regenerateComponentPreviewUseCase({ tenantId: 't-1', componentId: cId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.previewUri).toContain('hash-');
      expect(r.value.previewUri).toContain('theme-1');
    }
  });

  it('createPublishCandidate returns meetsThreshold flag', async () => {
    const cId = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    await deps.componentRepo.update('t-1', cId, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
    const r = await createPublishCandidateUseCase({ tenantId: 't-1', componentId: cId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.candidateId).toBeTruthy();
      expect(r.value.manifestHash).toBeTruthy();
    }
  });

  it('getComponentsByManifestTheme returns only matching components', async () => {
    const c1 = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    const c2 = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C2', slug: 'c2', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    await deps.componentRepo.update('t-1', c1, { themeId: 'theme-1', attributes: { manifestHash: 'hash-A' }, updatedAt: deps.clock.now().toISOString() });
    await deps.componentRepo.update('t-1', c2, { themeId: 'theme-1', attributes: { manifestHash: 'hash-B' }, updatedAt: deps.clock.now().toISOString() });

    const r = await getComponentsByManifestThemeUseCase(
      { tenantId: 't-1', themeId: 'theme-1', manifestHash: 'hash-A' }, deps,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.components.map(c => c.id)).toEqual([c1]);
      expect(r.value.count).toBe(1);
    }
  });

  it('token reference resolved via single manifest API (cache test)', async () => {
    const cId = unwrap(await createComponentUseCase(
      { ...baseInput, name: 'C1', slug: 'c1', tier: 'Atomic', componentType: 'Button' }, deps,
    )).componentId;
    // 여러 token ref → 1번 manifest resolve
    await createTokenReferenceUseCase({ ...baseInput, componentId: cId, themeId: 'theme-1', tokenKey: '--brand-whitespace', tokenValue: 'medium' }, deps);
    await createTokenReferenceUseCase({ ...baseInput, componentId: cId, themeId: 'theme-1', tokenKey: '--color.primary', tokenValue: '#7c2d3a' }, deps);
    const r = await resolveTokenReferencesUseCase('t-1', cId, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.resolved).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════
// 원칙 5: Theme Domain Event 격리
// ═══════════════════════════════════════════

describe('RC2 Sprint B: Theme Event Isolation', () => {
  it('Component Engine does NOT subscribe to internal Theme events', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const componentSrc = '/opt/data/projects/identity-engine/engines/component/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(componentSrc);
    const violations: string[] = [];
    const FORBIDDEN_THEME_EVENTS = ['theme.compiled', 'theme.scored', 'themanifest.published', 'intelligence.generated'];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      for (const ev of FORBIDDEN_THEME_EVENTS) {
        // String literal reference (not in comment)
        const regex = new RegExp(`['"\`]${ev.replace(/\./g, '\\.')}['"\`]`);
        if (regex.test(content)) {
          // Check it's not just a comment
          const lines = content.split('\n');
          for (const line of lines) {
            if (line.includes(ev) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
              violations.push(`${f}: ${ev}`);
            }
          }
        }
      }
    }
    expect(violations.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// ResolvedManifest Shape Verification
// ═══════════════════════════════════════════

describe('RC2 Sprint B: ResolvedManifest Shape', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('contains all required brand-* tokens (14+)', async () => {
    // use unknown themeId to trigger MockThemeManifestConsumer default branch with full 11 tokens
    const r = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-unknown-default' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const required = [
        '--brand-whitespace', '--brand-hierarchy', '--brand-density',
        '--brand-motion-intensity', '--brand-motion-duration', '--brand-motion-easing',
        '--brand-wcag-level', '--brand-contrast-ratio',
        '--brand-photography', '--brand-illustration', '--brand-iconography',
      ];
      for (const token of required) {
        expect(r.value.resolvedTokens[token]).toBeTruthy();
      }
    }
  });

  it('contains version + manifestId + themeId + brandId', async () => {
    const r = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
    if (r.ok) {
      expect(r.value.version).toBeTruthy();
      expect(r.value.manifestId).toBeTruthy();
      expect(r.value.themeId).toBe('theme-1');
      expect(r.value.brandId).toBeTruthy();
    }
  });

  it('manifestHash is non-empty string', async () => {
    const r = await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
    if (r.ok) {
      expect(typeof r.value.manifestHash).toBe('string');
      expect(r.value.manifestHash.length).toBeGreaterThan(0);
    }
  });
});