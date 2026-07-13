/**
 * Example 07 — Auto Regeneration Pipeline (Sprint B)
 *
 * Theme 변경 이벤트 → 영향받는 Component만 재생성 (전체 금지).
 * 원칙 4: 영향 범위 최소화.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createComponentUseCase,
  subscribeToThemeChangedUseCase,
  reResolveComponentTokensUseCase,
  recalculateComponentScoresUseCase,
  regenerateComponentPreviewUseCase,
  createPublishCandidateUseCase,
  getComponentsByManifestThemeUseCase,
  type ThemeChangedEvent,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Create 4 components (3 use theme-1, 1 uses theme-2)');
  const c1 = unwrap(await createComponentUseCase({ ...base, name: 'Hero-1', slug: 'hero-1', tier: 'Experience', componentType: 'Hero' }, deps)).componentId;
  const c2 = unwrap(await createComponentUseCase({ ...base, name: 'Hero-2', slug: 'hero-2', tier: 'Experience', componentType: 'Hero' }, deps)).componentId;
  const c3 = unwrap(await createComponentUseCase({ ...base, name: 'Search-1', slug: 'search-1', tier: 'Atomic', componentType: 'SearchBar' }, deps)).componentId;
  const c4 = unwrap(await createComponentUseCase({ ...base, name: 'Other-Theme', slug: 'other', tier: 'Atomic', componentType: 'Button' }, deps)).componentId;
  await deps.componentRepo.update('t-1', c1, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
  await deps.componentRepo.update('t-1', c2, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
  await deps.componentRepo.update('t-1', c3, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
  await deps.componentRepo.update('t-1', c4, { themeId: 'theme-2', updatedAt: deps.clock.now().toISOString() });

  console.log('▶ Step 2: Fire theme.changed event for theme-1 (manifestHash=hash-v2)');
  const event: ThemeChangedEvent = {
    tenantId: 't-1', themeId: 'theme-1', manifestId: 'm-1', brandId: 'b-1',
    version: '1.1.0', manifestHash: 'hash-v2', occurredAt: new Date().toISOString(),
  };
  const subscribeResult = unwrap(await subscribeToThemeChangedUseCase(event, deps));
  console.log(`  Affected: ${subscribeResult.affectedComponentIds.length} components`);
  console.log(`  Regenerated: ${subscribeResult.regeneratedCount} components`);
  console.log(`  c4 (theme-2) excluded: ${!subscribeResult.affectedComponentIds.includes(c4) ? '✅' : '❌'}`);

  console.log('▶ Step 3: ReResolve tokens for affected component (c1)');
  const resolveResult = unwrap(await reResolveComponentTokensUseCase({ tenantId: 't-1', componentId: c1 }, deps));
  console.log(`  Resolved: ${resolveResult.resolved} | Unresolved: ${resolveResult.unresolved}`);
  console.log(`  Manifest Hash stored: ${resolveResult.manifestHash}`);

  console.log('▶ Step 4: Recalculate score (Manifest 정책 해석)');
  const scoreResult = unwrap(await recalculateComponentScoresUseCase({ tenantId: 't-1', componentId: c1 }, deps));
  console.log(`  Overall: ${scoreResult.overall} | Meets Threshold: ${scoreResult.meetsThreshold}`);
  console.log(`  Manifest Hash: ${scoreResult.manifestHash}`);

  console.log('▶ Step 5: Regenerate Preview (deterministic)');
  const previewResult = unwrap(await regenerateComponentPreviewUseCase({ tenantId: 't-1', componentId: c1 }, deps));
  console.log(`  Preview URI: ${previewResult.previewUri}`);

  console.log('▶ Step 6: Create Publish Candidate');
  const candidateResult = unwrap(await createPublishCandidateUseCase({ tenantId: 't-1', componentId: c1 }, deps));
  console.log(`  Candidate ID: ${candidateResult.candidateId}`);
  console.log(`  Meets Threshold: ${candidateResult.meetsThreshold}`);

  console.log('▶ Step 7: Get Components by Manifest Theme (with hash filter)');
  const componentsResult = unwrap(await getComponentsByManifestThemeUseCase(
    { tenantId: 't-1', themeId: 'theme-1', manifestHash: 'hash-v2' }, deps,
  ));
  console.log(`  Components with hash-v2: ${componentsResult.count}`);

  console.log('\n✓ Auto Regeneration Example Complete');
  console.log(`  Source: theme-1 changed → ${subscribeResult.affectedComponentIds.length} affected → deterministic pipeline`);
  console.log(`  Excluded: c4 (different themeId) → no cross-theme regeneration`);
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });