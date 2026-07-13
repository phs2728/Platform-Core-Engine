/**
 * Example 02 — Draft + ComponentBinding + ContentBinding
 *
 * Sprint D: PageDraft with read-only Component + Content refs.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createWorkspaceUseCase, startBuildSessionUseCase, createDraftUseCase,
  addComponentBindingUseCase, addContentBindingUseCase, updateDraftTitleUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();
  const workspaceId = unwrap(await createWorkspaceUseCase({ ...base, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
  const sessionId = unwrap(await startBuildSessionUseCase({ ...base, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;

  console.log('▶ Step 1: Create PageDraft');
  const draftId = unwrap(await createDraftUseCase({
    ...base, buildSessionId: sessionId, workspaceId,
    pageSlug: '/home', title: 'Aman Tokyo Home', defaultLocale: 'en', themeRef: 'theme-luxury',
  }, deps)).draftId;

  console.log('▶ Step 2: Update title');
  await updateDraftTitleUseCase({ ...base, draftId, title: 'Aman Tokyo — Serenity' }, deps);

  console.log('▶ Step 3: Add ComponentBinding (Hero Experience)');
  const heroBinding = unwrap(await addComponentBindingUseCase({
    ...base, draftId, componentRef: 'hero-exp', slotName: 'main', order: 0,
    propOverrides: { variant: 'luxury' }, themeOverrideRef: null,
  }, deps)).bindingId;

  console.log('▶ Step 4: Add ComponentBinding (CTA Button)');
  const ctaBinding = unwrap(await addComponentBindingUseCase({
    ...base, draftId, componentRef: 'cta-btn', slotName: 'footer', order: 1,
    propOverrides: {}, themeOverrideRef: null,
  }, deps)).bindingId;

  console.log('▶ Step 5: Add ContentBinding (Hero headline)');
  await addContentBindingUseCase({
    ...base, draftId, componentBindingId: heroBinding, contentRef: 'content-hello',
    slotName: 'headline', fallbackContentRef: null,
  }, deps);

  console.log('▶ Step 6: Add ContentBinding (CTA label)');
  await addContentBindingUseCase({
    ...base, draftId, componentBindingId: ctaBinding, contentRef: 'content-hello',
    slotName: 'label', fallbackContentRef: null,
  }, deps);

  console.log('\n✓ Draft + Bindings Example Complete');
  console.log(`  Draft ID: ${draftId}`);
  console.log(`  Component Bindings: ${[heroBinding, ctaBinding].length}`);
  console.log('  Content Bindings: 2 (read from CMS)');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });