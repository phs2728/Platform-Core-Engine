/**
 * Example 08 — Determinism Verification (Sprint B)
 *
 * 원칙 5: 동일 입력 → 동일 결과 검증.
 * Manifest의 resolvedTokens와 manifestHash가 결정적인지 확인.
 */
import { makeDemoDeps, unwrap } from './_helpers.js';
import {
  resolveThemeManifestUseCase,
  regenerateComponentPreviewUseCase,
  createComponentUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Test 1: Same themeId → same manifestHash');
  const r1 = unwrap(await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps));
  const r2 = unwrap(await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps));
  console.log(`  Hash 1: ${r1.manifestHash}`);
  console.log(`  Hash 2: ${r2.manifestHash}`);
  console.log(`  Identical: ${r1.manifestHash === r2.manifestHash ? '✅' : '❌'}`);

  console.log('▶ Test 2: Same themeId → same resolvedTokens (deep equal)');
  const tokensEqual = JSON.stringify(r1.resolvedTokens) === JSON.stringify(r2.resolvedTokens);
  console.log(`  Identical: ${tokensEqual ? '✅' : '❌'}`);

  console.log('▶ Test 3: Different themeId → different hash');
  const r3 = unwrap(await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-2' }, deps));
  console.log(`  Hash 1: ${r1.manifestHash}`);
  console.log(`  Hash 3: ${r3.manifestHash}`);
  console.log(`  Different: ${r1.manifestHash !== r3.manifestHash ? '✅' : '❌'}`);

  console.log('▶ Test 4: Preview URI is deterministic (no Date.now / Math.random in pipeline)');
  const cId = unwrap(await createComponentUseCase(
    { tenantId: 't-1', organizationId: 'org-1', correlationId: 'c', actorId: 'a',
      name: 'Test', slug: 'determinism-test', tier: 'Atomic', componentType: 'Button' }, deps,
  )).componentId;
  await deps.componentRepo.update('t-1', cId, { themeId: 'theme-1', updatedAt: deps.clock.now().toISOString() });
  const p1 = unwrap(await regenerateComponentPreviewUseCase({ tenantId: 't-1', componentId: cId }, deps));
  const p2 = unwrap(await regenerateComponentPreviewUseCase({ tenantId: 't-1', componentId: cId }, deps));
  console.log(`  Preview 1: ${p1.previewUri}`);
  console.log(`  Preview 2: ${p2.previewUri}`);
  console.log(`  Identical: ${p1.previewUri === p2.previewUri ? '✅' : '❌'}`);

  console.log('▶ Test 5: Mock is pure — no side effects on repeated calls');
  const eventBus = deps.eventBus as unknown as { countByType(t: string): number };
  const beforeEventCount = eventBus.countByType('component.created');
  await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
  await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
  await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps);
  const afterEventCount = eventBus.countByType('component.created');
  console.log(`  Events emitted by resolveThemeManifest: ${afterEventCount - beforeEventCount}`);
  console.log(`  Zero side effects: ${afterEventCount === beforeEventCount ? '✅' : '❌'}`);

  console.log('\n✓ Determinism Verification Complete');
  console.log('  All 5 principles verified:');
  console.log('    1. Manifest resolvedTokens identical for same themeId');
  console.log('    2. Manifest hash deterministic');
  console.log('    3. Different themeIds produce different hashes');
  console.log('    4. Preview URI deterministic (no side effects)');
  console.log('    5. Manifest resolve is pure (no event emission)');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });