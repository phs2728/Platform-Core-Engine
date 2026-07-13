/**
 * Example 03 — AI Artifact Detection (9 categories)
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import { reviewAISmellUseCase } from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Clean content → Accept');
  const clean = unwrap(await reviewAISmellUseCase({ ...base, pageRef: '/home' }, deps));
  console.log(`  AI Smell Score: ${clean.aiSmellScore}/100`);
  console.log(`  Severity: ${clean.severity}`);
  console.log(`  Action: ${clean.action}`);

  console.log('▶ Step 2: AI smell (gradient + CTA) → Regenerate');
  const moderate = unwrap(await reviewAISmellUseCase({
    ...base, pageRef: '/home',
    contentSnapshot: { gradient: 'purple-blue', cta: 'Get Started' },
  }, deps));
  console.log(`  Score: ${moderate.aiSmellScore}, Severity: ${moderate.severity}, Action: ${moderate.action}`);

  console.log('▶ Step 3: Full AI smell (7 categories) → Reject');
  const severe = unwrap(await reviewAISmellUseCase({
    ...base, pageRef: '/home',
    contentSnapshot: {
      heroTitle: 'Unlock your potential', heroImage: '3d-character',
      gradient: 'purple-blue', cta: 'Get Started', sections: 'Features-3x',
      icons: 'lucide-default', template: 'wordpress-default',
    },
  }, deps));
  console.log(`  Score: ${severe.aiSmellScore}, Severity: ${severe.severity}, Action: ${severe.action}`);
  console.log(`  Detected Patterns: ${severe.aiSmellScore}/100`);
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });