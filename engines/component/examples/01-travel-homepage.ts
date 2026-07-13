/**
 * Example 01 — Travel Homepage
 *
 * Composes a Travel homepage from: Hero + SearchBar + CTA Button
 * Same components reusable for Restaurant, Hotel, Marketplace.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createComponentUseCase, createVariantUseCase, composeExperienceUseCase,
  calculateComponentScoreUseCase, validateAccessibilityUseCase,
  generateComponentReportUseCase, registerMarketplaceComponentUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Create Travel Hero component');
  const heroId = unwrap(await createComponentUseCase(
    { ...base, name: 'Travel Hero', slug: 'travel-hero', tier: 'Experience', componentType: 'Hero' }, deps,
  )).componentId;

  console.log('▶ Create Luxury variant');
  unwrap(await createVariantUseCase(
    { ...base, componentId: heroId, name: 'Luxury', label: 'Luxury Hero', propOverrides: { variant: 'luxury' }, tokenOverrides: { 'color.primary': '#7c2d3a' } }, deps,
  ));

  console.log('▶ Create SearchBar (Atomic)');
  const searchId = unwrap(await createComponentUseCase(
    { ...base, name: 'Search Bar', slug: 'search-bar', tier: 'Atomic', componentType: 'SearchBar' }, deps,
  )).componentId;

  console.log('▶ Create CTA Button (Atomic)');
  const ctaId = unwrap(await createComponentUseCase(
    { ...base, name: 'CTA Button', slug: 'cta-button', tier: 'Atomic', componentType: 'Button' }, deps,
  )).componentId;

  console.log('▶ Compose Travel Homepage Experience');
  const compId = unwrap(await composeExperienceUseCase(
    { ...base, name: 'Travel Homepage', slug: 'travel-homepage', parentComponentId: heroId,
      childComponentIds: [searchId, ctaId], slotMapping: { search: searchId, cta: ctaId },
      experienceType: 'Hero' }, deps,
  )).compositionId;

  console.log('▶ Calculate Quality Score (9 dimensions)');
  const score = unwrap(await calculateComponentScoreUseCase({ ...base, componentId: heroId }, deps));
  console.log(`  Overall: ${score.overall} | Meets Threshold: ${score.meetsThreshold}`);

  console.log('▶ Validate Accessibility');
  const a11y = unwrap(await validateAccessibilityUseCase({ ...base, componentId: heroId }, deps));
  console.log(`  A11y Score: ${a11y.score} | Violations: ${a11y.violationCount}`);

  console.log('▶ Register in Marketplace');
  const m = unwrap(await registerMarketplaceComponentUseCase(
    { ...base, componentId: heroId, tier: 'Official', name: 'Travel Hero', description: 'Platform standard', compatibilityInfo: { minVersion: '1.0.0' } }, deps,
  ));
  console.log(`  Marketplace: ${m.marketplaceId} (${m.tier})`);

  console.log('▶ Generate Report');
  const report = unwrap(await generateComponentReportUseCase({ tenantId: 't-1', componentId: heroId }, deps));
  console.log(`  Variants: ${report.variantCount} | Score: ${report.score} | Marketplace: ${report.marketplaceTier}`);

  console.log('✓ Travel Homepage Example Complete');
}

main().catch(console.error);
