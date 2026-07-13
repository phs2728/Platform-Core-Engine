/**
 * Example 06 — Manifest Consumer (Sprint B)
 *
 * Component Engine이 Theme Manifest를 소비(read-only)하는 패턴 데모.
 * 원칙 2: Component는 resolveThemeManifest()만 호출.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createComponentUseCase, resolveThemeManifestUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Create Component (uses theme-1)');
  const cId = unwrap(await createComponentUseCase(
    { ...base, name: 'Hero Section', slug: 'hero-section', tier: 'Experience', componentType: 'Hero' },
    deps,
  )).componentId;

  console.log('▶ Step 2: Resolve Theme Manifest via single API');
  const manifest = unwrap(await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps));
  console.log(`  Manifest version: ${manifest.version}`);
  console.log(`  Manifest hash: ${manifest.manifestHash}`);
  console.log(`  Brand ID: ${manifest.brandId}`);
  console.log(`  Token count: ${Object.keys(manifest.resolvedTokens).length}`);
  console.log(`  --brand-whitespace: ${manifest.resolvedTokens['--brand-whitespace']}`);
  console.log(`  --brand-wcag-level: ${manifest.resolvedTokens['--brand-wcag-level']}`);

  console.log('▶ Step 3: Determinism — resolve same themeId returns identical data');
  const manifest2 = unwrap(await resolveThemeManifestUseCase({ tenantId: 't-1', themeId: 'theme-1' }, deps));
  console.log(`  Hash identical: ${manifest.manifestHash === manifest2.manifestHash ? '✅' : '❌'}`);
  console.log(`  Tokens identical: ${JSON.stringify(manifest.resolvedTokens) === JSON.stringify(manifest2.resolvedTokens) ? '✅' : '❌'}`);

  console.log(`\n✓ Manifest Consumer Example Complete`);
  console.log(`  Component: ${cId}`);
  console.log(`  Consumed Manifest Version: ${manifest.version}`);
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });