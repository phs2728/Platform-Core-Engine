/**
 * Example 04 — Design Critique (Senior Art Director tone)
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  generateCreativeCritiqueUseCase, generateVisualRecommendationsUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Generate Design Critique (Senior Art Director tone)');
  const critique = unwrap(await generateCreativeCritiqueUseCase({
    ...base, pageRef: '/home', tone: 'senior-art-director',
  }, deps));
  console.log(`  Critique Count: ${critique.critiqueCount}`);
  console.log(`  Verdict: ${critique.verdict}`);

  console.log('▶ Step 2: Generate Visual Recommendations');
  const recs = unwrap(await generateVisualRecommendationsUseCase({
    ...base, pageRef: '/home',
  }, deps));
  console.log(`  Recommendation Count: ${recs.count}`);
  console.log(`  Priority: ${recs.priority}`);

  console.log('\n✓ Design Critique Example Complete');
  console.log('  Senior Art Director 비평 + 자동 개선안');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });