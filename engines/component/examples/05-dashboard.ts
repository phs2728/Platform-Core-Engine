/**
 * Example 05 — Analytics Dashboard Experience
 *
 * Creates a Dashboard experience with learning feedback and marketplace registration.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createComponentUseCase, createVariantUseCase, calculateComponentScoreUseCase,
  learnComponentUseCase, recordComponentOutcomeUseCase, improveComponentUseCase,
  registerMarketplaceComponentUseCase, installMarketplaceComponentUseCase,
  listMarketplaceComponentsUseCase, generateComponentReportUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Create Dashboard Experience');
  const dashId = unwrap(await createComponentUseCase(
    { ...base, name: 'Analytics Dashboard', slug: 'analytics-dashboard', tier: 'Experience', componentType: 'Dashboard' }, deps,
  )).componentId;

  console.log('▶ Create Compact variant');
  unwrap(await createVariantUseCase(
    { ...base, componentId: dashId, name: 'Compact', label: 'Compact Dashboard', propOverrides: { density: 'compact' }, tokenOverrides: {}, isDefault: true }, deps,
  ));

  console.log('▶ Score component');
  const score = unwrap(await calculateComponentScoreUseCase({ ...base, componentId: dashId }, deps));
  console.log(`  Score: ${score.overall} | Threshold: ${score.meetsThreshold}`);

  console.log('▶ Record outcome (success)');
  unwrap(await recordComponentOutcomeUseCase(
    { ...base, componentId: dashId, outcome: 'success', context: { conversionRate: 15 } }, deps,
  ));

  console.log('▶ Learn from outcomes');
  const learned = unwrap(await learnComponentUseCase({ ...base, componentId: dashId }, deps));
  console.log(`  Confidence: ${learned.confidence} | Pattern: ${learned.patternId}`);

  console.log('▶ Get improvement suggestions');
  const improve = unwrap(await improveComponentUseCase({ ...base, componentId: dashId, targetScore: 95 }, deps));
  console.log(`  Suggestions: ${improve.suggestions.length}`);

  console.log('▶ Register in Marketplace (Organization tier)');
  const m = unwrap(await registerMarketplaceComponentUseCase(
    { ...base, componentId: dashId, tier: 'Organization', name: 'Analytics Dashboard', description: 'Org standard dashboard', compatibilityInfo: { minVersion: '1.0.0' } }, deps,
  ));

  console.log('▶ Install from Marketplace');
  unwrap(await installMarketplaceComponentUseCase({ ...base, marketplaceId: m.marketplaceId }, deps));

  console.log('▶ List Marketplace');
  const entries = unwrap(await listMarketplaceComponentsUseCase('t-1', 'all', deps));
  console.log(`  Total entries: ${entries.length}`);

  console.log('▶ Full Report');
  const report = unwrap(await generateComponentReportUseCase({ tenantId: 't-1', componentId: dashId }, deps));
  console.log(`  Score: ${report.score} | Variants: ${report.variantCount} | Verified: ${report.marketplaceVerified}`);

  console.log('✓ Dashboard Analytics Example Complete');
}

main().catch(console.error);
