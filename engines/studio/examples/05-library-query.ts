/**
 * Example 05 — Library Query (Read-Only Theme + Component + CMS)
 */
import { makeDemoDeps, unwrap } from './_helpers.js';
import {
  searchComponentsUseCase, searchContentUseCase, getCompatibleThemesUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Search Components (read-only IComponentReader)');
  const heroes = unwrap(await searchComponentsUseCase({ tenantId: 'demo', componentType: 'Experience' }, deps));
  console.log(`  Experience components: ${heroes.length}`);

  const buttons = unwrap(await searchComponentsUseCase({ tenantId: 'demo', componentType: 'Button' }, deps));
  console.log(`  Button components: ${buttons.length}`);

  console.log('▶ Step 2: Search Content (read-only ICMSReaderForStudio)');
  const texts = unwrap(await searchContentUseCase({ tenantId: 'demo', contentType: 'Text' }, deps));
  console.log(`  Text content: ${texts.length}`);
  for (const t of texts) console.log(`    - ${t.contentId} (${t.status})`);

  console.log('▶ Step 3: Get Compatible Themes (read-only IThemeReaderForStudio)');
  const themes = unwrap(await getCompatibleThemesUseCase('demo', deps));
  console.log(`  Available themes: ${themes.length}`);
  for (const t of themes) console.log(`    - ${t.themeId} v${t.version}`);

  console.log('\n✓ Library Query Example Complete');
  console.log('  All 3 queries use read-only Host Interfaces');
  console.log('  No write access to Theme/Component/CMS');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });