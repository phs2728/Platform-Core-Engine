/**
 * Example 03 — Verification + Preview (Deterministic)
 *
 * Sprint D: Composition Verification + Deterministic Preview
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createWorkspaceUseCase, startBuildSessionUseCase, createDraftUseCase,
  addComponentBindingUseCase, verifyDraftCompositionUseCase, previewDraftUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();
  const workspaceId = unwrap(await createWorkspaceUseCase({ ...base, name: 'W', slug: 'w', defaultThemeRef: null }, deps)).workspaceId;
  const sessionId = unwrap(await startBuildSessionUseCase({ ...base, workspaceId, themeRef: 'theme-luxury', componentRefs: [] }, deps)).sessionId;
  const draftId = unwrap(await createDraftUseCase({
    ...base, buildSessionId: sessionId, workspaceId, pageSlug: '/home', title: 'Home',
    defaultLocale: 'en', themeRef: 'theme-luxury',
  }, deps)).draftId;
  await addComponentBindingUseCase({
    ...base, draftId, componentRef: 'hero-exp', slotName: 'main', order: 0,
    propOverrides: {}, themeOverrideRef: null,
  }, deps);

  console.log('▶ Step 1: Verify Draft Composition (Theme + Component)');
  const verify = unwrap(await verifyDraftCompositionUseCase({ tenantId: 'demo', draftId }, deps));
  console.log(`  Valid: ${verify.valid}`);
  console.log(`  Errors: ${verify.errors.length}`);
  console.log(`  Warnings: ${verify.warnings.length}`);
  console.log(`  Draft status → Verified`);

  console.log('▶ Step 2: Preview Draft (deterministic)');
  const preview = unwrap(await previewDraftUseCase({ tenantId: 'demo', draftId, device: 'desktop' }, deps));
  console.log(`  Theme Hash: ${preview.themeManifestHash}`);
  console.log(`  Component Bindings: ${preview.componentBindings.length}`);
  console.log(`  Preview Hash: ${preview.previewHash}`);

  console.log('▶ Step 3: Preview again → same hash (deterministic)');
  const preview2 = unwrap(await previewDraftUseCase({ tenantId: 'demo', draftId, device: 'desktop' }, deps));
  console.log(`  Identical: ${preview.previewHash === preview2.previewHash ? '✅' : '❌'}`);

  console.log('\n✓ Verification + Preview Example Complete');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });