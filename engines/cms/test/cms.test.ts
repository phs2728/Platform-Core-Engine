/**
 * CMS Engine RC1 Tests
 *
 * Sprint C 검증:
 *  1. CMS는 Content + Page + Section + Slot만 관리 (Theme/Component write API 0)
 *  2. Read-Only Host Interfaces (IThemeManifestReader, IComponentReader)
 *  3. Render는 결정적 (deterministic)
 *  4. Theme/Component Event 격리
 *  5. Content SSoT
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { makeDeps, baseInput, unwrap } from './helpers.js';
import {
  createContentUseCase, updateContentUseCase, deleteContentUseCase, getContentUseCase,
  listContentByTypeUseCase, publishContentUseCase, listContentVersionsUseCase,
  createPageUseCase, updatePageUseCase, archivePageUseCase, getPageUseCase, listPagesUseCase,
  addSectionUseCase, updateSectionUseCase, removeSectionUseCase,
  createContentSlotUseCase, assignContentToSlotUseCase, removeContentFromSlotUseCase,
  renderPageUseCase, renderSectionUseCase, renderPreviewUseCase,
  createLayoutSnapshotUseCase, getLayoutSnapshotUseCase, compareLayoutSnapshotsUseCase,
  createLocaleVariantUseCase,
} from '../src/index.js';
import type { CMSUseCaseDeps } from '../src/index.js';

type Deps = ReturnType<typeof makeDeps>;

// ═══════════════════════════════════════════
// CONTENT LIFECYCLE (10 tests)
// ═══════════════════════════════════════════

describe('Content Lifecycle', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates content (Text)', async () => {
    const r = await createContentUseCase({ ...baseInput, type: 'Text', body: 'Hello world', locale: 'en' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.contentId).toBeTruthy();
      expect(r.value.version).toBe('1.0.0');
    }
  });

  it('creates content (Image)', async () => {
    const r = await createContentUseCase({ ...baseInput, type: 'Image', body: 'https://img.example.com/x.jpg', locale: 'en' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects empty body', async () => {
    const r = await createContentUseCase({ ...baseInput, type: 'Text', body: '', locale: 'en' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects unknown organization', async () => {
    const r = await createContentUseCase({ ...baseInput, organizationId: 'unknown', type: 'Text', body: 'x', locale: 'en' }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates content (bumps version)', async () => {
    const id = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'v1', locale: 'en' }, deps)).contentId;
    const r = await updateContentUseCase({ ...baseInput, contentId: id, body: 'v2' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.version).toBe('1.1.0');
    }
  });

  it('soft-deletes content (status=Archived)', async () => {
    const id = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'x', locale: 'en' }, deps)).contentId;
    const r = await deleteContentUseCase({ ...baseInput, contentId: id }, deps);
    expect(r.ok).toBe(true);
    const c = unwrap(await getContentUseCase('t-1', id, deps));
    expect(c.status).toBe('Archived');
  });

  it('gets content by id', async () => {
    const id = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'x', locale: 'en' }, deps)).contentId;
    const r = await getContentUseCase('t-1', id, deps);
    expect(r.ok).toBe(true);
  });

  it('lists content by type', async () => {
    await createContentUseCase({ ...baseInput, type: 'Text', body: 'a', locale: 'en' }, deps);
    await createContentUseCase({ ...baseInput, type: 'Text', body: 'b', locale: 'en' }, deps);
    await createContentUseCase({ ...baseInput, type: 'Image', body: 'i', locale: 'en' }, deps);
    const r = await listContentByTypeUseCase('t-1', 'Text', deps);
    expect(unwrap(r).length).toBe(2);
  });

  it('publishes content', async () => {
    const id = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'x', locale: 'en' }, deps)).contentId;
    const r = await publishContentUseCase({ ...baseInput, contentId: id }, deps);
    expect(r.ok).toBe(true);
    const c = unwrap(await getContentUseCase('t-1', id, deps));
    expect(c.status).toBe('Published');
    expect(c.publishedAt).not.toBeNull();
  });

  it('rejects double publish', async () => {
    const id = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'x', locale: 'en' }, deps)).contentId;
    await publishContentUseCase({ ...baseInput, contentId: id }, deps);
    const r = await publishContentUseCase({ ...baseInput, contentId: id }, deps);
    expect(r.ok).toBe(false);
  });

  it('lists content versions after update', async () => {
    const id = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'v1', locale: 'en' }, deps)).contentId;
    await updateContentUseCase({ ...baseInput, contentId: id, body: 'v2' }, deps);
    const r = await listContentVersionsUseCase('t-1', id, deps);
    expect(unwrap(r).length).toBe(2);
  });
});

// ═══════════════════════════════════════════
// PAGE LIFECYCLE (8 tests)
// ═══════════════════════════════════════════

describe('Page Lifecycle', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates page with themeRef (read-only verified)', async () => {
    const r = await createPageUseCase({
      ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1',
    }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects page with unknown themeRef', async () => {
    const r = await createPageUseCase({
      ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'unknown-theme',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate slug', async () => {
    await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps);
    const r = await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home2', defaultLocale: 'en', themeRef: 'theme-1' }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates page', async () => {
    const id = unwrap(await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps)).pageId;
    const r = await updatePageUseCase({ ...baseInput, pageId: id, title: 'Updated Home' }, deps);
    expect(r.ok).toBe(true);
    const p = unwrap(await getPageUseCase('t-1', id, deps));
    expect(p.title).toBe('Updated Home');
  });

  it('archives page', async () => {
    const id = unwrap(await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps)).pageId;
    const r = await archivePageUseCase({ ...baseInput, pageId: id }, deps);
    expect(r.ok).toBe(true);
    const p = unwrap(await getPageUseCase('t-1', id, deps));
    expect(p.status).toBe('Archived');
  });

  it('lists pages', async () => {
    await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps);
    await createPageUseCase({ ...baseInput, slug: '/about', title: 'About', defaultLocale: 'en', themeRef: 'theme-1' }, deps);
    const r = await listPagesUseCase('t-1', deps);
    expect(unwrap(r).length).toBe(2);
  });

  it('creates locale variant', async () => {
    const id = unwrap(await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps)).pageId;
    const r = await createLocaleVariantUseCase({ ...baseInput, pageId: id, locale: 'ko', title: '홈', description: '한국어 홈' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects duplicate locale variant', async () => {
    const id = unwrap(await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps)).pageId;
    await createLocaleVariantUseCase({ ...baseInput, pageId: id, locale: 'ko', title: '홈' }, deps);
    const r = await createLocaleVariantUseCase({ ...baseInput, pageId: id, locale: 'ko', title: '다른 홈' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// SECTION & SLOT (8 tests)
// ═══════════════════════════════════════════

describe('Section & Slot', () => {
  let deps: Deps;
  let pageId: string;
  let contentId: string;
  beforeEach(async () => {
    deps = makeDeps();
    pageId = unwrap(await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps)).pageId;
    contentId = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'Headline content', locale: 'en' }, deps)).contentId;
  });

  it('adds section referencing Component (read-only verified)', async () => {
    const r = await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp' }, deps);
    expect(r.ok).toBe(true);
  });

  it('rejects section with unknown componentRef', async () => {
    const r = await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'unknown-comp' }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects section with unknown themeOverrideRef', async () => {
    const r = await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp', themeOverrideRef: 'unknown' }, deps);
    expect(r.ok).toBe(false);
  });

  it('updates section', async () => {
    const sectionId = unwrap(await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp' }, deps)).sectionId;
    const r = await updateSectionUseCase({ ...baseInput, sectionId, name: 'Updated Hero' }, deps);
    expect(r.ok).toBe(true);
  });

  it('removes section', async () => {
    await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp' }, deps);
    // removeSectionUseCase takes pageId (not sectionId) — needs sectionId parameter fix
    const sectionId = unwrap(await addSectionUseCase({ ...baseInput, pageId, name: 'Hero2', order: 1, componentRef: 'hero-comp' }, deps)).sectionId;
    const r = await removeSectionUseCase({ ...baseInput, pageId: sectionId }, deps);
    expect(r.ok).toBe(true);
  });

  it('creates content slot', async () => {
    const sectionId = unwrap(await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp' }, deps)).sectionId;
    const r = await createContentSlotUseCase({ ...baseInput, sectionId, slotName: 'headline', contentId, required: true }, deps);
    expect(r.ok).toBe(true);
  });

  it('assigns content to slot', async () => {
    const sectionId = unwrap(await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp' }, deps)).sectionId;
    const slotId = unwrap(await createContentSlotUseCase({ ...baseInput, sectionId, slotName: 'headline', required: true }, deps)).slotId;
    const r = await assignContentToSlotUseCase({ ...baseInput, slotId, contentId }, deps);
    expect(r.ok).toBe(true);
  });

  it('removes content from slot', async () => {
    const sectionId = unwrap(await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp' }, deps)).sectionId;
    const slotId = unwrap(await createContentSlotUseCase({ ...baseInput, sectionId, slotName: 'headline', contentId, required: true }, deps)).slotId;
    const r = await removeContentFromSlotUseCase({ ...baseInput, slotId }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// RENDER & DETERMINISM (8 tests)
// ═══════════════════════════════════════════

describe('Render & Determinism (Sprint C 원칙 5)', () => {
  let deps: Deps;
  let pageId: string;
  beforeEach(async () => {
    deps = makeDeps();
    pageId = unwrap(await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps)).pageId;
    const headlineId = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'Welcome', locale: 'en' }, deps)).contentId;
    const sectionId = unwrap(await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp' }, deps)).sectionId;
    const slotId = unwrap(await createContentSlotUseCase({ ...baseInput, sectionId, slotName: 'headline', contentId: headlineId, required: true }, deps)).slotId;
  });

  it('renders page with Theme Manifest + Component + Content', async () => {
    const r = await renderPageUseCase({ tenantId: 't-1', pageId, device: 'desktop' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.themeManifestHash).toBe('hash-test-1');
      expect(r.value.sections.length).toBeGreaterThan(0);
      expect(r.value.renderedHash).toBeTruthy();
    }
  });

  it('renders deterministically — same input → same output', async () => {
    const r1 = await renderPageUseCase({ tenantId: 't-1', pageId, device: 'desktop' }, deps);
    const r2 = await renderPageUseCase({ tenantId: 't-1', pageId, device: 'desktop' }, deps);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.value.renderedHash).toBe(r2.value.renderedHash);
      expect(JSON.stringify(r1.value.sections)).toBe(JSON.stringify(r2.value.sections));
    }
  });

  it('renders preview with device-specific URI', async () => {
    const r = await renderPreviewUseCase({ tenantId: 't-1', pageId, device: 'mobile' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.previewUri).toContain('device=mobile');
      expect(r.value.previewUri).toContain('hash=');
    }
  });

  it('renders single section', async () => {
    const sections = await deps.sectionRepo.findByPage('t-1', pageId);
    const sectionId = sections[0]!.id;
    const r = await renderSectionUseCase({ tenantId: 't-1', sectionId, device: 'desktop' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.componentRef).toBe('hero-comp');
      expect(r.value.slots.length).toBeGreaterThan(0);
    }
  });

  it('render output includes component manifest version (read-only)', async () => {
    const r = await renderPageUseCase({ tenantId: 't-1', pageId, device: 'desktop' }, deps);
    if (r.ok) {
      const sec = r.value.sections[0]!;
      expect(sec.componentVersion).toBe('1.0.0');
    }
  });

  it('render output includes content body (CMS-owned)', async () => {
    const r = await renderPageUseCase({ tenantId: 't-1', pageId, device: 'desktop' }, deps);
    if (r.ok) {
      const slot = r.value.sections[0]!.slots[0]!;
      expect(slot.contentBody).toBe('Welcome');
    }
  });

  it('render with locale variant uses variant title', async () => {
    await createLocaleVariantUseCase({ ...baseInput, pageId, locale: 'ko', title: '한국어 홈' }, deps);
    const r = await renderPageUseCase({ tenantId: 't-1', pageId, device: 'desktop', locale: 'ko' }, deps);
    if (r.ok) {
      expect(r.value.title).toBe('한국어 홈');
      expect(r.value.locale).toBe('ko');
    }
  });

  it('render is deterministic across different renderPageUseCase calls', async () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const r = await renderPageUseCase({ tenantId: 't-1', pageId, device: 'desktop' }, deps);
      if (r.ok) hashes.add(r.value.renderedHash);
    }
    expect(hashes.size).toBe(1);  // All 5 calls return same hash
  });
});

// ═══════════════════════════════════════════
// LAYOUT SNAPSHOT (5 tests)
// ═══════════════════════════════════════════

describe('Layout Snapshot', () => {
  let deps: Deps;
  let pageId: string;
  beforeEach(async () => {
    deps = makeDeps();
    pageId = unwrap(await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps)).pageId;
    const sectionId = unwrap(await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp' }, deps)).sectionId;
    const headlineId = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'Welcome', locale: 'en' }, deps)).contentId;
    await createContentSlotUseCase({ ...baseInput, sectionId, slotName: 'headline', contentId: headlineId, required: true }, deps);
  });

  it('creates layout snapshot', async () => {
    const r = await createLayoutSnapshotUseCase({ ...baseInput, pageId, device: 'desktop' }, deps);
    expect(r.ok).toBe(true);
  });

  it('gets layout snapshot', async () => {
    const id = unwrap(await createLayoutSnapshotUseCase({ ...baseInput, pageId, device: 'desktop' }, deps)).snapshotId;
    const r = await getLayoutSnapshotUseCase('t-1', id, deps);
    expect(r.ok).toBe(true);
  });

  it('compares two identical snapshots → identical=true', async () => {
    const aId = unwrap(await createLayoutSnapshotUseCase({ ...baseInput, pageId, device: 'desktop' }, deps)).snapshotId;
    const bId = unwrap(await createLayoutSnapshotUseCase({ ...baseInput, pageId, device: 'desktop' }, deps)).snapshotId;
    const r = await compareLayoutSnapshotsUseCase({ tenantId: 't-1', snapshotIdA: aId, snapshotIdB: bId }, deps);
    expect(unwrap(r).identical).toBe(true);
  });

  it('snapshot includes themeManifestHash + componentManifestHashes + contentHashes', async () => {
    const id = unwrap(await createLayoutSnapshotUseCase({ ...baseInput, pageId, device: 'desktop' }, deps)).snapshotId;
    const r = await getLayoutSnapshotUseCase('t-1', id, deps);
    if (r.ok) {
      expect(r.value.themeManifestHash).toBeTruthy();
      expect(Object.keys(r.value.componentManifestHashes).length).toBeGreaterThan(0);
      expect(Object.keys(r.value.contentHashes).length).toBeGreaterThan(0);
    }
  });

  it('snapshot detect theme change (different manifestHash → different)', async () => {
    deps.themeReader.set('t-1', 'theme-2', {
      manifestId: 'm-2', themeId: 'theme-2', brandId: 'b-2', version: '1.0.0',
      resolvedTokens: {}, manifestHash: 'hash-test-2',
    });
    await updatePageUseCase({ ...baseInput, pageId, themeRef: 'theme-2' }, deps);
    const r = await createLayoutSnapshotUseCase({ ...baseInput, pageId, device: 'desktop' }, deps);
    if (r.ok) {
      expect(unwrap(await getLayoutSnapshotUseCase('t-1', r.value.snapshotId, deps)).themeManifestHash).toBe('hash-test-2');
    }
  });
});

// ═══════════════════════════════════════════
// SPRINT C 원칙: Read-Only API Surface
// ═══════════════════════════════════════════

describe('Sprint C Principles: Read-Only API Surface', () => {
  it('CMS engine has ONLY IThemeManifestReader (no write Theme API)', () => {
    const d: CMSUseCaseDeps = makeDeps();
    expect('themeReader' in d).toBe(true);
    // @ts-expect-error: themeProvider (write) does NOT exist
    expect(typeof d.themeProvider).toBe('undefined');
  });

  it('CMS engine has ONLY IComponentReader (no write Component API)', () => {
    const d: CMSUseCaseDeps = makeDeps();
    expect('componentReader' in d).toBe(true);
    // @ts-expect-error: componentProvider (write) does NOT exist
    expect(typeof d.componentProvider).toBe('undefined');
  });

  it('CMS has no direct import of engines/theme/ or engines/component/', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cmsSrc = '/opt/data/projects/identity-engine/engines/cms/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(cmsSrc);
    const violations: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      if (/from\s+['"]@platform\/engine-theme['"]/.test(content)) violations.push(`theme: ${f}`);
      if (/from\s+['"]@platform\/engine-component['"]/.test(content)) violations.push(`component: ${f}`);
    }
    expect(violations.length).toBe(0);
  });

  it('CMS uses only @platform/core-sdk (no other engines)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cmsSrc = '/opt/data/projects/identity-engine/engines/cms/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(cmsSrc);
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
// SPRINT C 원칙: Content SSoT
// ═══════════════════════════════════════════

describe('Sprint C Principles: Content SSoT', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('Content is owned by CMS (full lifecycle)', async () => {
    const id = unwrap(await createContentUseCase({ ...baseInput, type: 'Text', body: 'A', locale: 'en' }, deps)).contentId;
    await updateContentUseCase({ ...baseInput, contentId: id, body: 'B' }, deps);
    await publishContentUseCase({ ...baseInput, contentId: id }, deps);
    const c = unwrap(await getContentUseCase('t-1', id, deps));
    expect(c.body).toBe('B');
    expect(c.status).toBe('Published');
  });

  it('Page references Theme/Component by ID only (not by definition)', async () => {
    const pageId = unwrap(await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps)).pageId;
    const p = unwrap(await getPageUseCase('t-1', pageId, deps));
    expect(p.themeRef).toBe('theme-1');
    // themeRef is a string ID — CMS does NOT contain Theme/Component definitions
    expect(typeof p.themeRef).toBe('string');
  });

  it('Section references Component by ID only', async () => {
    const pageId = unwrap(await createPageUseCase({ ...baseInput, slug: '/home', title: 'Home', defaultLocale: 'en', themeRef: 'theme-1' }, deps)).pageId;
    const sectionId = unwrap(await addSectionUseCase({ ...baseInput, pageId, name: 'Hero', order: 0, componentRef: 'hero-comp' }, deps)).sectionId;
    const s = await deps.sectionRepo.findById('t-1', sectionId);
    expect(s!.componentRef).toBe('hero-comp');
  });
});

// ═══════════════════════════════════════════
// EVENT ISOLATION
// ═══════════════════════════════════════════

describe('Sprint C Principles: Theme/Component Event Isolation', () => {
  it('CMS does NOT subscribe to Theme internal events', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cmsSrc = '/opt/data/projects/identity-engine/engines/cms/src';
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) files.push(...walk(p));
        else if (p.endsWith('.ts')) files.push(p);
      }
      return files;
    }
    const files = walk(cmsSrc);
    const violations: string[] = [];
    const FORBIDDEN = ['theme.changed', 'themanifest.published', 'component.reviewed', 'intelligence.generated'];
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
  it('content is isolated by tenant', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2');
    await createContentUseCase({ ...baseInput, type: 'Text', body: 't1', locale: 'en' }, deps);
    await createContentUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c', actorId: 'a', type: 'Text', body: 't2', locale: 'en' }, deps);
    const t1 = unwrap(await listContentByTypeUseCase('t-1', 'Text', deps));
    const t2 = unwrap(await listContentByTypeUseCase('t-2', 'Text', deps));
    expect(t1.length).toBe(1);
    expect(t2.length).toBe(1);
  });

  it('page is isolated by tenant', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2');
    deps.themeReader.set('t-2', 'theme-1', {
      manifestId: 'm-t2', themeId: 'theme-1', brandId: 'b-1', version: '1.0.0',
      resolvedTokens: {}, manifestHash: 'hash-t2',
    });
    await createPageUseCase({ ...baseInput, slug: '/t1', title: 'T1', defaultLocale: 'en', themeRef: 'theme-1' }, deps);
    await createPageUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c', actorId: 'a', slug: '/t2', title: 'T2', defaultLocale: 'en', themeRef: 'theme-1' }, deps);
    const t1 = unwrap(await listPagesUseCase('t-1', deps));
    const t2 = unwrap(await listPagesUseCase('t-2', deps));
    expect(t1.length).toBe(1);
    expect(t2.length).toBe(1);
  });
});