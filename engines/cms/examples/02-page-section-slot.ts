/**
 * Example 02 — Page + Section + ContentSlot (read-only Component ref)
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createPageUseCase, addSectionUseCase, createContentSlotUseCase,
  assignContentToSlotUseCase, createContentUseCase,
  getPageUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Create Page + Sections');
  const pageId = unwrap(await createPageUseCase({
    ...base, slug: '/', title: 'Travel Home', defaultLocale: 'en', themeRef: 'theme-luxury',
  }, deps)).pageId;
  const headlineId = unwrap(await createContentUseCase({ ...base, type: 'Text', body: 'Discover Serenity', locale: 'en' }, deps)).contentId;
  const ctaId = unwrap(await createContentUseCase({ ...base, type: 'Text', body: 'Book Now', locale: 'en' }, deps)).contentId;

  console.log('▶ Step 2: Add Section (referencing Component read-only)');
  const sectionId = unwrap(await addSectionUseCase({
    ...base, pageId, name: 'Hero', order: 0, componentRef: 'hero-section',
  }, deps)).sectionId;
  console.log(`  Section ID: ${sectionId} (componentRef: hero-section)`);

  console.log('▶ Step 3: Create ContentSlots + assign Content');
  const headlineSlot = unwrap(await createContentSlotUseCase({
    ...base, sectionId, slotName: 'headline', contentId: headlineId, required: true,
  }, deps)).slotId;
  const ctaSlot = unwrap(await createContentSlotUseCase({
    ...base, sectionId, slotName: 'cta', contentId: ctaId, required: true,
  }, deps)).slotId;

  // Re-assign (test alternate flow)
  unwrap(await assignContentToSlotUseCase({ ...base, slotId: headlineSlot, contentId: headlineId }, deps));
  unwrap(await assignContentToSlotUseCase({ ...base, slotId: ctaSlot, contentId: ctaId }, deps));

  const p = unwrap(await getPageUseCase('demo', pageId, deps));
  console.log(`  Page sections: ${p.sectionIds.length}`);
  console.log('  Slots: headline → "Discover Serenity", cta → "Book Now"');

  console.log('\n✓ Page + Section + ContentSlot Example Complete');
  console.log('  CMS owns: Page, Section, Slot (ContentSlot)');
  console.log('  Read-only: componentRef, themeRef');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });