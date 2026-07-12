/**
 * Theme Engine — Example 01: Complete Theme Pipeline
 */
import {
  createThemeUseCase, createBrandUseCase,
  createTokenSetUseCase, createColorPaletteUseCase, createSpacingSystemUseCase,
  createTypographyScaleUseCase, createMotionSpecUseCase, createElevationSystemUseCase,
  createThemeVariantUseCase, validateThemeUseCase, calculateThemeScoreUseCase,
  compileThemeUseCase, exportThemeUseCase, generateThemeReportUseCase,
  activateThemeUseCase,
} from '../src/index.js';
import { makeDemoDeps, unwrap } from './_helpers.js';

async function main() {
  console.log('═══ Theme Engine — 01 Complete Theme Pipeline ═══\n');
  const deps = makeDemoDeps();
  const base = { tenantId: 'demo', organizationId: 'org-demo', correlationId: 'demo-1', actorId: 'admin' };

  console.log('▶ 1) Create Theme');
  const t = unwrap(await createThemeUseCase({ ...base, name: 'Premium Caucasian Theme', slug: 'premium-caucasian' }, deps));
  console.log(`  ✓ themeId=${t.themeId}\n`);

  console.log('▶ 2) Create Brand');
  unwrap(await createBrandUseCase({ ...base, name: 'Acme', personality: ['premium','modern','warm'], voice: 'Bold yet approachable', primaryColor: '#7c2d3a' }, deps));
  console.log('  ✓ Brand created\n');

  console.log('▶ 3) Add Token Sets');
  unwrap(await createTokenSetUseCase({ ...base, themeId: t.themeId, category: 'Color', name: 'Brand Colors', tokens: [{ key: '--color-primary', value: '#7c2d3a', description: 'Qvevri wine red' }, { key: '--color-secondary', value: '#292524', description: 'Forest stone' }] }, deps));
  unwrap(await createTokenSetUseCase({ ...base, correlationId: 'c2', themeId: t.themeId, category: 'Radius', name: 'Border Radius', tokens: [{ key: '--radius-md', value: '0.75rem', description: 'rounded-xl' }] }, deps));
  console.log('  ✓ 2 token sets created\n');

  console.log('▶ 4) Add Typography Scale');
  unwrap(await createTypographyScaleUseCase({ ...base, correlationId: 'c3', themeId: t.themeId, fontFamilies: [{ name: 'sans', stack: ['Pretendard', 'sans-serif'] }], sizes: [{ name: 'h1', size: '3rem', lineHeight: '1.2', weight: '800' }, { name: 'body', size: '1rem', lineHeight: '1.6', weight: '400' }], baseSize: '1rem', scaleRatio: '1.25' }, deps));
  console.log('  ✓ Typography scale with Pretendard\n');

  console.log('▶ 5) Add Color Palette');
  unwrap(await createColorPaletteUseCase({ ...base, correlationId: 'c4', themeId: t.themeId, primary: '#7c2d3a', secondary: '#292524', accent: '#d97706', neutral: '#78716c', background: '#faf8f5', foreground: '#1c1917', shades: { '100': '#f5f0ee', '500': '#7c2d3a', '900': '#4a191f' }, semantic: { success: '#16a34a', warning: '#d97706', error: '#dc2626', info: '#2563eb' } }, deps));
  console.log('  ✓ Color palette (qvevri-wine + forest-stone + caucasus-snow)\n');

  console.log('▶ 6) Add Spacing System');
  unwrap(await createSpacingSystemUseCase({ ...base, correlationId: 'c5', themeId: t.themeId, baseUnit: '0.25rem', scale: [{ name: 'xs', value: '0.25rem' }, { name: 'sm', value: '0.5rem' }, { name: 'md', value: '1rem' }, { name: 'lg', value: '2rem' }, { name: 'xl', value: '4rem' }] }, deps));
  console.log('  ✓ Spacing system (base: 0.25rem)\n');

  console.log('▶ 7) Add Motion + Elevation');
  unwrap(await createMotionSpecUseCase({ ...base, correlationId: 'c6', themeId: t.themeId, durations: [{ name: 'fast', value: '150ms' }, { name: 'normal', value: '300ms' }], easings: [{ name: 'spring', value: 'cubic-bezier(0.34,1.56,0.64,1)' }] }, deps));
  unwrap(await createElevationSystemUseCase({ ...base, correlationId: 'c7', themeId: t.themeId, levels: [{ name: 'card', zIndex: 1, shadow: '0 1px 3px rgba(0,0,0,0.1)' }, { name: 'dropdown', zIndex: 1000, shadow: '0 4px 6px rgba(0,0,0,0.1)' }, { name: 'modal', zIndex: 2000, shadow: '0 20px 25px rgba(0,0,0,0.15)' }] }, deps));
  console.log('  ✓ Motion + elevation systems\n');

  console.log('▶ 8) Create Dark Mode Variant');
  unwrap(await createThemeVariantUseCase({ ...base, correlationId: 'c8', themeId: t.themeId, mode: 'Dark', tokenOverrides: { '--color-background': '#1c1917', '--color-foreground': '#faf8f5' } }, deps));
  unwrap(await createThemeVariantUseCase({ ...base, correlationId: 'c9', themeId: t.themeId, mode: 'Light', tokenOverrides: {}, isDefault: true }, deps));
  console.log('  ✓ Dark + Light variants\n');

  console.log('▶ 9) Validate Theme');
  const validation = unwrap(await validateThemeUseCase({ ...base, correlationId: 'c10', themeId: t.themeId }, deps));
  console.log(`  ✓ Valid: ${validation.valid}  Errors: ${validation.errors.length}  Warnings: ${validation.warnings.length}\n`);

  console.log('▶ 10) Calculate Score');
  const score = unwrap(await calculateThemeScoreUseCase({ ...base, correlationId: 'c11', themeId: t.themeId }, deps));
  console.log(`  ✓ Score: ${score.score}/100`);
  for (const [k, v] of Object.entries(score.breakdown)) console.log(`    ${k}: ${v}`);
  console.log();

  console.log('▶ 11) Compile Theme (CSS Variables)');
  const compiled = unwrap(await compileThemeUseCase({ ...base, correlationId: 'c12', themeId: t.themeId, format: 'css' }, deps));
  console.log(`  ✓ ${compiled.tokenCount} tokens compiled (${compiled.format})`);
  console.log(`  Preview:\n${compiled.compiled.split('\n').slice(0, 5).join('\n')}...\n`);

  console.log('▶ 12) Export Theme');
  const exported = unwrap(await exportThemeUseCase({ ...base, correlationId: 'c13', themeId: t.themeId }, deps));
  console.log(`  ✓ Exported (theme + ${Object.keys(exported.exported).length - 1} systems)\n`);

  console.log('▶ 13) Generate Report');
  const report = unwrap(await generateThemeReportUseCase({ ...base, correlationId: 'c14', themeId: t.themeId }, deps));
  console.log(`  ✓ ${report.summary}\n`);

  console.log('▶ 14) Activate Theme');
  unwrap(await activateThemeUseCase({ ...base, correlationId: 'c15', themeId: t.themeId }, deps));
  console.log('  ✓ Theme activated\n');

  console.log('▶ Events Emitted:');
  const counts = new Map<string, number>();
  for (const r of deps.eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [ev, c] of [...counts.entries()].sort()) console.log(`  ${ev}: ${c}`);

  console.log('\n═══ Theme Complete — Ready for Component Engine ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
