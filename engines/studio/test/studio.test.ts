/**
 * Studio Engine RC1 Tests
 *
 * Sprint D 검증:
 *  1. Read-Only 3 Reader Surface (Theme + Component + CMS)
 *  2. PublishIntent Pattern (Studio가 직접 publish 안 함)
 *  3. Composition Verification (모든 ref 검증)
 *  4. 결정적 Preview
 *  5. Theme/Component/CMS Event 격리
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { makeDeps, baseInput, unwrap } from './helpers.js';
import {
  createWorkspaceUseCase, updateWorkspaceUseCase, archiveWorkspaceUseCase, listWorkspacesUseCase,
  startBuildSessionUseCase, attachThemeUseCase, attachComponentLibraryUseCase, endBuildSessionUseCase,
  createDraftUseCase, updateDraftTitleUseCase, archiveDraftUseCase,
  addComponentBindingUseCase, updateComponentBindingPropsUseCase, removeComponentBindingUseCase,
  addContentBindingUseCase, updateContentBindingUseCase, removeContentBindingUseCase,
  verifyDraftCompositionUseCase, previewDraftUseCase,
  createPublishIntentUseCase, listPublishIntentsUseCase, cancelPublishIntentUseCase,
  searchComponentsUseCase, searchContentUseCase, getCompatibleThemesUseCase,
} from '../src/index.js';
import type { StudioUseCaseDeps } from '../src/index.js';

type Deps = ReturnType<typeof makeDeps>;

// ═══════════════════════════════════════════
// WORKSPACE (4 tests)
// ═══════════════════════════════════════════

describe('Workspace Lifecycle', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates workspace (defaultThemeRef read-only verified)', async () => {
    const r = await createWorkspaceUseCase({ ...baseInput, name: 'Aman Studio', slug: 'aman-studio', defaultThemeRef: 'theme-luxury' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects workspace with unknown defaultThemeRef', async () => {
    const r = await createWorkspaceUseCase({ ...baseInput, name: 'Test', slug: 'test', defaultThemeRef: 'unknown' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate slug', async () => {
    await createWorkspaceUseCase({ ...baseInput, name: 'A', slug: 'studio', defaultThemeRef: null }, deps);
    const r = await createWorkspaceUseCase({ ...baseInput, name: 'B', slug: 'studio', defaultThemeRef: null }, deps);
    expect(r.ok).toBe(false);
  });

  it('archives workspace', async () => {
    const id = unwrap(await createWorkspaceUseCase({ ...baseInput, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
    const r = await archiveWorkspaceUseCase({ ...baseInput, workspaceId: id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// BUILD SESSION (4 tests)
// ═══════════════════════════════════════════

describe('BuildSession', () => {
  let deps: Deps;
  let workspaceId: string;
  beforeEach(async () => {
    deps = makeDeps();
    workspaceId = unwrap(await createWorkspaceUseCase({ ...baseInput, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
  });

  it('starts build session with themeRef (read-only verified)', async () => {
    const r = await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects session with unknown themeRef', async () => {
    const r = await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'unknown', componentRefs: [] }, deps);
    expect(r.ok).toBe(false);
  });

  it('attaches component library (read-only verified)', async () => {
    const sid = unwrap(await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
    const r = await attachComponentLibraryUseCase({ ...baseInput, sessionId: sid, componentRefs: ['hero-component', 'cta-button'] }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects unknown component in library', async () => {
    const sid = unwrap(await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
    const r = await attachComponentLibraryUseCase({ ...baseInput, sessionId: sid, componentRefs: ['unknown-comp'] }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// DRAFT (5 tests)
// ═══════════════════════════════════════════

describe('PageDraft', () => {
  let deps: Deps;
  let workspaceId: string;
  let sessionId: string;
  beforeEach(async () => {
    deps = makeDeps();
    workspaceId = unwrap(await createWorkspaceUseCase({ ...baseInput, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
    sessionId = unwrap(await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
  });

  it('creates draft', async () => {
    const r = await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects draft with unknown themeRef', async () => {
    const r = await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'unknown' }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates draft title', async () => {
    const id = unwrap(await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).draftId;
    const r = await updateDraftTitleUseCase({ ...baseInput, draftId: id, title: 'Updated Home' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects duplicate page slug in same session', async () => {
    await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps);
    const r = await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home2', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps);
    expect(r.ok).toBe(false);
  });

  it('archives draft', async () => {
    const id = unwrap(await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).draftId;
    const r = await archiveDraftUseCase({ ...baseInput, draftId: id }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// COMPONENT BINDING (3 tests)
// ═══════════════════════════════════════════

describe('ComponentBinding', () => {
  let deps: Deps;
  let draftId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const workspaceId = unwrap(await createWorkspaceUseCase({ ...baseInput, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
    const sessionId = unwrap(await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
    draftId = unwrap(await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).draftId;
  });

  it('adds component binding (read-only verified)', async () => {
    const r = await addComponentBindingUseCase({ ...baseInput, draftId, componentRef: 'hero-component', slotName: 'main', order: 0, propOverrides: {}, themeOverrideRef: null }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects binding with unknown componentRef', async () => {
    const r = await addComponentBindingUseCase({ ...baseInput, draftId, componentRef: 'unknown', slotName: 'main', order: 0, propOverrides: {}, themeOverrideRef: null }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates and removes binding', async () => {
    const bId = unwrap(await addComponentBindingUseCase({ ...baseInput, draftId, componentRef: 'hero-component', slotName: 'main', order: 0, propOverrides: {}, themeOverrideRef: null }, deps)).bindingId;
    const r1 = await updateComponentBindingPropsUseCase({ ...baseInput, bindingId: bId, propOverrides: { variant: 'luxury' } }, deps);
    expect(r1.ok).toBe(true);
    const r2 = await removeComponentBindingUseCase({ ...baseInput, bindingId: bId }, deps);
    expect(r2.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// CONTENT BINDING (2 tests)
// ═══════════════════════════════════════════

describe('ContentBinding', () => {
  let deps: Deps;
  let draftId: string;
  let bindingId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const workspaceId = unwrap(await createWorkspaceUseCase({ ...baseInput, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
    const sessionId = unwrap(await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
    draftId = unwrap(await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).draftId;
    bindingId = unwrap(await addComponentBindingUseCase({ ...baseInput, draftId, componentRef: 'hero-component', slotName: 'main', order: 0, propOverrides: {}, themeOverrideRef: null }, deps)).bindingId;
  });

  it('adds content binding', async () => {
    const r = await addContentBindingUseCase({ ...baseInput, draftId, componentBindingId: bindingId, contentRef: 'content-1', slotName: 'headline', fallbackContentRef: null }, deps);
    expect(r.ok).toBe(true);
  });

  it('updates and removes content binding', async () => {
    const id = unwrap(await addContentBindingUseCase({ ...baseInput, draftId, componentBindingId: bindingId, contentRef: 'content-1', slotName: 'headline', fallbackContentRef: null }, deps)).bindingId;
    const r1 = await updateContentBindingUseCase({ ...baseInput, bindingId: id, contentRef: 'content-2' }, deps);
    expect(r1.ok).toBe(true);
    const r2 = await removeContentBindingUseCase({ ...baseInput, bindingId: id }, deps);
    expect(r2.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// VERIFICATION (4 tests) — Sprint D 원칙 5
// ═══════════════════════════════════════════

describe('Composition Verification', () => {
  let deps: Deps;
  let draftId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const workspaceId = unwrap(await createWorkspaceUseCase({ ...baseInput, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
    const sessionId = unwrap(await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
    draftId = unwrap(await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).draftId;
  });

  it('verifies draft with valid theme → valid=true', async () => {
    await addComponentBindingUseCase({ ...baseInput, draftId, componentRef: 'hero-component', slotName: 'main', order: 0, propOverrides: {}, themeOverrideRef: null }, deps);
    const r = await verifyDraftCompositionUseCase({ tenantId: 't-1', draftId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.valid).toBe(true);
      expect(r.value.errors.length).toBe(0);
    }
  });

  it('draft with no components warns but validates', async () => {
    const r = await verifyDraftCompositionUseCase({ tenantId: 't-1', draftId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.valid).toBe(true);
      expect(r.value.warnings.length).toBeGreaterThan(0);
    }
  });

  it('rejects publish intent if draft not Verified', async () => {
    const r = await createPublishIntentUseCase({ ...baseInput, draftId, workspaceId: 'w-1' }, deps);
    expect(r.ok).toBe(false);
  });

  it('verification sets draft.status to Verified', async () => {
    await addComponentBindingUseCase({ ...baseInput, draftId, componentRef: 'hero-component', slotName: 'main', order: 0, propOverrides: {}, themeOverrideRef: null }, deps);
    await verifyDraftCompositionUseCase({ tenantId: 't-1', draftId }, deps);
    const draft = await deps.pageDraftRepo.findById('t-1', draftId);
    expect(draft?.status).toBe('Verified');
  });
});

// ═══════════════════════════════════════════
// PREVIEW (2 tests) — 결정성
// ═══════════════════════════════════════════

describe('Preview (Deterministic)', () => {
  let deps: Deps;
  let draftId: string;
  beforeEach(async () => {
    deps = makeDeps();
    const workspaceId = unwrap(await createWorkspaceUseCase({ ...baseInput, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
    const sessionId = unwrap(await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
    draftId = unwrap(await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).draftId;
    await addComponentBindingUseCase({ ...baseInput, draftId, componentRef: 'hero-component', slotName: 'main', order: 0, propOverrides: {}, themeOverrideRef: null }, deps);
  });

  it('previewDraft is deterministic (same input → same hash)', async () => {
    const r1 = await previewDraftUseCase({ tenantId: 't-1', draftId, device: 'desktop' }, deps);
    const r2 = await previewDraftUseCase({ tenantId: 't-1', draftId, device: 'desktop' }, deps);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r1.value.previewHash).toBe(r2.value.previewHash);
  });

  it('preview includes theme manifest hash', async () => {
    const r = await previewDraftUseCase({ tenantId: 't-1', draftId, device: 'mobile' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.themeManifestHash).toBe('hash-lux-aman');
  });
});

// ═══════════════════════════════════════════
// PUBLISH INTENT (3 tests) — Sprint D 원칙 3
// ═══════════════════════════════════════════

describe('PublishIntent Pattern', () => {
  let deps: Deps;
  let workspaceId: string;
  let draftId: string;
  beforeEach(async () => {
    deps = makeDeps();
    workspaceId = unwrap(await createWorkspaceUseCase({ ...baseInput, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
    const sessionId = unwrap(await startBuildSessionUseCase({ ...baseInput, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
    draftId = unwrap(await createDraftUseCase({ ...baseInput, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).draftId;
    await addComponentBindingUseCase({ ...baseInput, draftId, componentRef: 'hero-component', slotName: 'main', order: 0, propOverrides: {}, themeOverrideRef: null }, deps);
    await verifyDraftCompositionUseCase({ tenantId: 't-1', draftId }, deps);
  });

  it('creates publish intent for Verified draft', async () => {
    const r = await createPublishIntentUseCase({ ...baseInput, draftId, workspaceId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const eventBus = deps.eventBus as unknown as { countByType(t: string): number };
      expect(eventBus.countByType('studio.publish.intent')).toBeGreaterThan(0);
    }
  });

  it('list publish intents in workspace', async () => {
    await createPublishIntentUseCase({ ...baseInput, draftId, workspaceId }, deps);
    const r = await listPublishIntentsUseCase('t-1', workspaceId, deps);
    expect(unwrap(r).length).toBe(1);
  });

  it('cancels pending intent', async () => {
    const intentId = unwrap(await createPublishIntentUseCase({ ...baseInput, draftId, workspaceId }, deps)).intentId;
    const r = await cancelPublishIntentUseCase({ ...baseInput, intentId }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// LIBRARY QUERY (3 tests)
// ═══════════════════════════════════════════

describe('Library Query (Read-Only)', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('searchComponents (read-only)', async () => {
    const r = await searchComponentsUseCase({ tenantId: 't-1', componentType: 'Experience' }, deps);
    expect(unwrap(r).length).toBeGreaterThan(0);
  });

  it('searchContent (read-only CMS)', async () => {
    deps.cmsReader.addContent('t-1', 'content-1', { contentId: 'content-1', type: 'Text', locale: 'en', body: 'Hello', status: 'Published' });
    const r = await searchContentUseCase({ tenantId: 't-1', contentType: 'Text' }, deps);
    expect(unwrap(r).length).toBe(1);
  });

  it('getCompatibleThemes (read-only Theme)', async () => {
    const r = await getCompatibleThemesUseCase('t-1', deps);
    expect(unwrap(r).length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// SPRINT D 원칙 1: Read-Only 3 Reader Surface
// ═══════════════════════════════════════════

describe('Sprint D Principles: Read-Only 3 Reader Surface', () => {
  it('StudioUseCaseDeps has ONLY 3 readers (no write APIs)', () => {
    const d: StudioUseCaseDeps = makeDeps();
    expect('themeReader' in d).toBe(true);
    expect('componentReader' in d).toBe(true);
    expect('cmsReader' in d).toBe(true);
    // @ts-expect-error: write APIs do NOT exist
    expect(typeof d.themeProvider).toBe('undefined');
    // @ts-expect-error
    expect(typeof d.componentProvider).toBe('undefined');
    // @ts-expect-error
    expect(typeof d.cmsProvider).toBe('undefined');
  });

  it('Studio has no direct import of engines/theme/, engines/component/, or engines/cms/', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const studioSrc = '/opt/data/projects/identity-engine/engines/studio/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(studioSrc);
    const violations: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      if (/from\s+['"]@platform\/engine-theme['"]/.test(content)) violations.push(`theme: ${f}`);
      if (/from\s+['"]@platform\/engine-component['"]/.test(content)) violations.push(`component: ${f}`);
      if (/from\s+['"]@platform\/engine-cms['"]/.test(content)) violations.push(`cms: ${f}`);
    }
    expect(violations.length).toBe(0);
  });

  it('Studio uses only @platform/core-sdk', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const studioSrc = '/opt/data/projects/identity-engine/engines/studio/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(studioSrc);
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
// SPRINT D 원칙: Event 격리
// ═══════════════════════════════════════════

describe('Sprint D Principles: Theme/Component/CMS Event Isolation', () => {
  it('Studio does NOT subscribe to Theme/Component/CMS internal events', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const studioSrc = '/opt/data/projects/identity-engine/engines/studio/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(studioSrc);
    const violations: string[] = [];
    const FORBIDDEN = ['theme.changed', 'themanifest.published', 'component.reviewed', 'cms.page.rendered', 'cms.content.published'];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      for (const ev of FORBIDDEN) {
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.includes(ev) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            violations.push(`${f}: ${ev}`);
          }
        }
      }
    }
    expect(violations.length).toBe(0);
  });
});

// ═══════════════════════════════════════════
// TENANT ISOLATION
// ═══════════════════════════════════════════

describe('Tenant Isolation', () => {
  it('workspace is isolated by tenant', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2');
    deps.themeReader.set('t-2', 'theme-luxury', {
      manifestId: 'm-lux-t2', themeId: 'theme-luxury', brandId: 'b-aman', version: '1.0.0',
      resolvedTokens: {}, manifestHash: 'hash-lux-t2',
    });
    await createWorkspaceUseCase({ ...baseInput, name: 'T1', slug: 't1', defaultThemeRef: 'theme-luxury' }, deps);
    await createWorkspaceUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c', actorId: 'a', name: 'T2', slug: 't2', defaultThemeRef: 'theme-luxury' }, deps);
    const t1 = unwrap(await listWorkspacesUseCase('t-1', 'org-1', deps));
    const t2 = unwrap(await listWorkspacesUseCase('t-2', 'org-2', deps));
    expect(t1.length).toBe(1);
    expect(t2.length).toBe(1);
  });
});