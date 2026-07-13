/**
 * Example 03 — Render (deterministic, read-only Theme + Component)
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createContentUseCase, createPageUseCase, addSectionUseCase,
  createContentSlotUseCase, renderPageUseCase, renderPreviewUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Setup Page + Content + Sections');
  const pageId = unwrap(await createPageUseCase({ ...base, slug: '/', title: 'Home', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).pageId;
  const headlineId = unwrap(await createContentUseCase({ ...base, type: 'Text', body: 'Hello World', locale: 'en' }, deps)).contentId;
  const sectionId = unwrap(await addSectionUseCase({ ...base, pageId, name: 'Hero', order: 0, componentRef: 'hero-section' }, deps)).sectionId;
  unwrap(await createContentSlotUseCase({ ...base, sectionId, slotName: 'headline', contentId: headlineId, required: true }, deps));

  console.log('▶ Step 2: Render Page (deterministic)');
  const rendered = unwrap(await renderPageUseCase({ tenantId: 'demo', pageId, device: 'desktop' }, deps));
  console.log(`  Theme Manifest Hash: ${rendered.themeManifestHash}`);
  console.log(`  Sections: ${rendered.sections.length}`);
  console.log(`  Rendered Hash: ${rendered.renderedHash}`);

  console.log('▶ Step 3: Render twice → same output (deterministic)');
  const r1 = unwrap(await renderPageUseCase({ tenantId: 'demo', pageId, device: 'desktop' }, deps));
  const r2 = unwrap(await renderPageUseCase({ tenantId: 'demo', pageId, device: 'desktop' }, deps));
  console.log(`  Hash 1: ${r1.renderedHash}`);
  console.log(`  Hash 2: ${r2.renderedHash}`);
  console.log(`  Identical: ${r1.renderedHash === r2.renderedHash ? '✅' : '❌'}`);

  console.log('▶ Step 4: Render preview (mobile)');
  const preview = unwrap(await renderPreviewUseCase({ tenantId: 'demo', pageId, device: 'mobile' }, deps));
  console.log(`  Preview URI: ${preview.previewUri}`);

  console.log('\n✓ Render Example Complete');
  console.log('  Render uses: Theme Manifest (read-only) + Component Manifest (read-only) + Content (CMS-owned)');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });