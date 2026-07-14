/**
 * Example 05 — Multi-locale Page (read-only Theme, locale variants owned by CMS)
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createContentUseCase, createPageUseCase, createLocaleVariantUseCase,
  addSectionUseCase, createContentSlotUseCase, renderPageUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Setup Page with default locale (en)');
  const pageId = unwrap(await createPageUseCase({ ...base, slug: '/', title: 'Aman Tokyo', defaultLocale: 'en', themeRef: 'theme-luxury' }, deps)).pageId;
  const headlineEn = unwrap(await createContentUseCase({ ...base, type: 'Text', body: 'Welcome to Aman Tokyo', locale: 'en' }, deps)).contentId;
  const sectionId = unwrap(await addSectionUseCase({ ...base, pageId, name: 'Hero', order: 0, componentRef: 'hero-section' }, deps)).sectionId;
  unwrap(await createContentSlotUseCase({ ...base, sectionId, slotName: 'headline', contentId: headlineEn, required: true }, deps));

  console.log('▶ Step 2: Create Locale Variant (ko)');
  const headlineKo = unwrap(await createContentUseCase({ ...base, type: 'Text', body: '어맨 도쿄에 오신 것을 환영합니다', locale: 'ko' }, deps)).contentId;
  unwrap(await createLocaleVariantUseCase({ ...base, pageId, locale: 'ko', title: '어맨 도쿄', description: '한국어 홈페이지' }, deps));
  // Re-assign slot to Korean content
  const slots = await deps.slotRepo.findBySection('demo', sectionId);
  await deps.slotRepo.update('demo', slots[0]!.id, { contentId: headlineKo });

  console.log('▶ Step 3: Render in EN');
  const rEn = unwrap(await renderPageUseCase({ tenantId: 'demo', pageId, device: 'desktop', locale: 'en' }, deps));
  console.log(`  Title: ${rEn.title}`);
  console.log(`  Locale: ${rEn.locale}`);
  console.log(`  Slot body: ${rEn.sections[0]!.slots[0]!.contentBody}`);

  console.log('▶ Step 4: Render in KO');
  const rKo = unwrap(await renderPageUseCase({ tenantId: 'demo', pageId, device: 'desktop', locale: 'ko' }, deps));
  console.log(`  Title: ${rKo.title}`);
  console.log(`  Locale: ${rKo.locale}`);
  console.log(`  Slot body: ${rKo.sections[0]!.slots[0]!.contentBody}`);

  console.log('\n✓ Multi-locale Example Complete');
  console.log('  Locale Variants owned by CMS, Theme Manifest remains read-only');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });