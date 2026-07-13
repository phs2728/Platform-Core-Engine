/**
 * Example 01 — CMS Content + Page (basic)
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createContentUseCase, publishContentUseCase, getContentUseCase,
  createPageUseCase, getPageUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Create Content (Headline)');
  const headlineId = unwrap(await createContentUseCase({ ...base, type: 'Text', body: 'Welcome to Aman Tokyo', locale: 'en' }, deps)).contentId;
  console.log(`  Content ID: ${headlineId}`);

  console.log('▶ Step 2: Publish Content');
  unwrap(await publishContentUseCase({ ...base, contentId: headlineId }, deps));
  const c = unwrap(await getContentUseCase('demo', headlineId, deps));
  console.log(`  Status: ${c.status}, Published at: ${c.publishedAt}`);

  console.log('▶ Step 3: Create Page (referencing Theme Manifest read-only)');
  const pageId = unwrap(await createPageUseCase({
    ...base, slug: '/', title: 'Aman Tokyo', defaultLocale: 'en', themeRef: 'theme-luxury',
  }, deps)).pageId;

  const p = unwrap(await getPageUseCase('demo', pageId, deps));
  console.log(`  Page ID: ${pageId}`);
  console.log(`  Theme reference: ${p.themeRef} (read-only ref to Theme Engine)`);
  console.log(`  Default locale: ${p.defaultLocale}`);

  console.log('\n✓ CMS Content + Page Example Complete');
  console.log('  CMS owns: Content, Page');
  console.log('  Read-only: Theme reference (verified via IThemeManifestReader)');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });