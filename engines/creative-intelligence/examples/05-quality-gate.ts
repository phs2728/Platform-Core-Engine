/**
 * Example 05 — Quality Gate (Approve/Reject)
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  reviewPremiumQualityUseCase, reviewLuxuryUseCase,
  approveCreativeUseCase, rejectCreativeUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Luxury style + premium inputs → Quality Gate passes');
  await reviewPremiumQualityUseCase({
    ...base, pageRef: '/home', style: 'Luxury',
    contentSnapshot: { lifestylePhotography: true, whitespaceRatio: 0.5, displayFont: true, ruleOfThirds: true, shallowDOF: true, microInteractions: ['a', 'b', 'c', 'd', 'e'] },
  }, deps);
  await reviewLuxuryUseCase({ ...base, pageRef: '/home', style: 'Luxury' }, deps);
  const approved = unwrap(await approveCreativeUseCase({ ...base, pageRef: '/home', approvalId: 'app-1', action: 'approve' }, deps));
  console.log(`  Status: ${approved.status}`);
  console.log(`  Passed Quality Gate: ${approved.passed ? '✅' : '❌'}`);

  console.log('▶ Step 2: Corporate style → Quality Gate fails (premium too low)');
  await reviewPremiumQualityUseCase({ ...base, pageRef: '/other', style: 'Corporate', contentSnapshot: { typographyScale: 'uniform' } }, deps);
  await reviewLuxuryUseCase({ ...base, pageRef: '/other', style: 'Corporate' }, deps);
  const failed = await approveCreativeUseCase({ ...base, pageRef: '/other', approvalId: 'app-2', action: 'approve' }, deps);
  console.log(`  Status: ${failed.ok ? 'Approved' : 'Rejected'}`);
  if (!failed.ok) console.log(`  Reason: ${JSON.stringify(failed.error)}`);

  console.log('▶ Step 3: Reject explicitly (Senior Art Director reject)');
  const rejected = unwrap(await rejectCreativeUseCase({
    ...base, pageRef: '/another', approvalId: 'app-3', action: 'reject', notes: 'Hero too weak',
  }, deps));
  console.log(`  Status: ${rejected.status}`);
  console.log('  Notes: Hero too weak (from input)');

  console.log('\n✓ Quality Gate Example Complete');
  console.log('  11 gates: First Impression / Premium / Trust / Luxury / Brand / Typography / Whitespace / Hierarchy / Photography / Visual Story / AI Smell');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });