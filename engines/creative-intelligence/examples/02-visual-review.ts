/**
 * Example 02 — Visual Review (Premium / Luxury / First Impression)
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  reviewPremiumQualityUseCase, reviewLuxuryUseCase, reviewFirstImpressionUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Review Premium Quality (10 dimensions)');
  const premium = unwrap(await reviewPremiumQualityUseCase({
    ...base, pageRef: '/home', style: 'Luxury',
    contentSnapshot: { lifestylePhotography: true, whitespaceRatio: 0.5, displayFont: true, ruleOfThirds: true, shallowDOF: true, microInteractions: ['hover', 'click', 'scroll', 'focus', 'submit'] },
  }, deps));
  console.log(`  Premium Score: ${premium.premiumScore}/100`);
  console.log(`  Passed Quality Gate: ${premium.passed ? '✅' : '❌'}`);

  console.log('▶ Step 2: Review Luxury (7 dimensions)');
  const luxury = unwrap(await reviewLuxuryUseCase({ ...base, pageRef: '/home', style: 'Luxury' }, deps));
  console.log(`  Luxury Score: ${luxury.luxuryScore}/100`);
  console.log(`  Passed (≥90): ${luxury.passed ? '✅' : '❌'}`);

  console.log('▶ Step 3: Review First Impression (3-Second)');
  const first = unwrap(await reviewFirstImpressionUseCase({
    ...base, pageRef: '/home',
    contentSnapshot: { hero: true, photography: true, navigation: true },
  }, deps));
  console.log(`  First Impression: ${first.firstImpressionScore}/100`);
  console.log(`  Trust: ${first.firstImpressionScore >= 95 ? '✅' : '❌'}`);

  console.log('\n✓ Visual Review Example Complete');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });