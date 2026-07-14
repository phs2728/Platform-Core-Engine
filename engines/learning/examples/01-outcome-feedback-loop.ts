/**
 * Learning Engine — Example 01: Outcome Feedback Loop
 *
 * Demonstrates the core value proposition:
 * AI Recommendation → Deploy → User Behavior → CTR/Conversion/Bounce →
 * Learning Engine updates confidence → Next recommendation improves
 */
import {
  createLearningProjectUseCase,
  learnSuccessPatternUseCase, learnFailurePatternUseCase,
  detectTrendUseCase, updateLearningModelUseCase,
  recordRecommendationResultUseCase,
  learnRecommendationUseCase, recommendImprovementUseCase,
  learnDesignUseCase,
  updateKnowledgeUseCase, generateLearningReportUseCase,
  calculateConfidenceUseCase, calculateLearningScoreUseCase, calculateImprovementRateUseCase,
  getLearningMemoryUseCase, getDesignMemoryUseCase,
} from '../src/index.js';
import { makeDemoDeps, unwrap } from './_helpers.js';

async function main() {
  console.log('═══ Learning Engine — 01 Outcome Feedback Loop ═══\n');
  console.log('    Platform Intelligence Memory — Self-Improving\n');
  const deps = makeDemoDeps();
  const base = { tenantId: 'demo', organizationId: 'org-demo', correlationId: 'demo-1', actorId: 'admin' };

  console.log('▶ 1) Create Learning Project');
  const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'Q3 Design Learning', slug: 'q3-learning', sourceRef: 'project-q3' }, deps));
  console.log(`  ✓ projectId=${p.projectId}\n`);

  console.log('▶ 2) Learn Success Patterns');
  unwrap(await learnSuccessPatternUseCase({ ...base, projectId: p.projectId, category: 'Design', name: 'Bold Hero Typography', description: 'ExtraBold headings drive engagement', observation: 'CTR increased 40%', impact: 88, frequency: 6, contexts: ['hero', 'landing'] }, deps));
  unwrap(await learnSuccessPatternUseCase({ ...base, correlationId: 'c2', projectId: p.projectId, category: 'UX', name: '3-Step Checkout', description: 'Simplified checkout flow', observation: 'Conversion up 25%', impact: 82, frequency: 4, contexts: ['checkout'] }, deps));
  console.log('  ✓ 2 success patterns learned\n');

  console.log('▶ 3) Learn Failure Patterns');
  unwrap(await learnFailurePatternUseCase({ ...base, correlationId: 'c3', projectId: p.projectId, category: 'Copy', name: 'Generic CTA Text', description: '"Learn More" underperforms', observation: 'Click-through below 1%', impact: 55, frequency: 3, contexts: ['cta'] }, deps));
  console.log('  ✓ 1 failure pattern learned\n');

  console.log('▶ 4) Detect Trends');
  const trends = unwrap(await detectTrendUseCase({ ...base, correlationId: 'c4', projectId: p.projectId, category: 'Design', region: 'US' }, deps));
  console.log(`  ✓ Detected ${trends.count} trends\n`);

  console.log('▶ 5) Record Outcomes (Feedback Loop)');
  unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c5', projectId: p.projectId, recommendationId: 'rec-bold-hero', category: 'Design', outcome: 'accepted', impactScore: 90, contextRef: 'hero-v2', notes: '40% CTR increase confirmed' }, deps));
  unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c6', projectId: p.projectId, recommendationId: 'rec-3step', category: 'UX', outcome: 'accepted', impactScore: 78, contextRef: 'checkout-v2', notes: '25% conversion increase' }, deps));
  unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c7', projectId: p.projectId, recommendationId: 'rec-animation', category: 'Design', outcome: 'rejected', impactScore: 15, contextRef: 'hero-anim', notes: 'Users found it distracting' }, deps));
  console.log('  ✓ 3 outcomes recorded (2 accepted, 1 rejected)\n');

  console.log('▶ 6) Learn from Recommendations');
  const recStats = unwrap(await learnRecommendationUseCase({ ...base, correlationId: 'c8', projectId: p.projectId }, deps));
  console.log(`  ✓ Recommendation accuracy: ${recStats.accuracy}% (${recStats.accepted}/${recStats.total} accepted)\n`);

  console.log('▶ 7) Learn Design Insights');
  unwrap(await learnDesignUseCase({ ...base, correlationId: 'c9', projectId: p.projectId, designType: 'Hero', insight: 'Pretendard ExtraBold with text-shadow for visibility', score: 92, sourceRef: 'hero-v3' }, deps));
  console.log('  ✓ Design insight stored in Design Memory\n');

  console.log('▶ 8) Update Learning Model');
  const model = unwrap(await updateLearningModelUseCase({ ...base, correlationId: 'c10', projectId: p.projectId, category: 'Design' }, deps));
  console.log(`  ✓ Design model: v1, accuracy=${model.accuracy}%, coverage=${model.coverage}%\n`);

  console.log('▶ 9) Calculate Confidence');
  const conf = unwrap(await calculateConfidenceUseCase({ tenantId: 'demo', projectId: p.projectId }, deps));
  console.log(`  ✓ Overall confidence: ${conf.score}/100 (evidence: ${conf.evidenceCount})\n`);

  console.log('▶ 10) Evolve Knowledge');
  unwrap(await updateKnowledgeUseCase({ ...base, correlationId: 'c11', projectId: p.projectId, knowledgeId: 'k-hero-design', change: 'Bold hero patterns confirmed by outcome data', reason: 'A/B test showed 40% CTR increase' }, deps));
  console.log('  ✓ Knowledge evolved\n');

  console.log('▶ 11) Generate Improvement Recommendations');
  const improvements = unwrap(await recommendImprovementUseCase({ ...base, correlationId: 'c12', projectId: p.projectId, category: 'Design' }, deps));
  for (const r of improvements.recommendations.slice(0, 3)) {
    console.log(`  • [${r.confidence > 0.8 ? 'HIGH' : 'MED'}] ${r.title}`);
    console.log(`    ${r.reason}`);
    console.log(`    Expected impact: ${r.expectedImpact}/100\n`);
  }

  console.log('▶ 12) Calculate Improvement Rate');
  const improvement = unwrap(await calculateImprovementRateUseCase({ tenantId: 'demo', projectId: p.projectId }, deps));
  console.log(`  ✓ Rate: ${improvement.rate}% — Trend: ${improvement.trend}\n`);

  console.log('▶ 13) Generate Learning Report');
  const report = unwrap(await generateLearningReportUseCase({ ...base, correlationId: 'c13', projectId: p.projectId }, deps));
  console.log(`  ✓ ${report.summary}`);
  for (const [key, value] of Object.entries(report.metrics)) console.log(`    ${key}: ${value}`);
  console.log();

  console.log('▶ 14) Learning Score');
  const score = unwrap(await calculateLearningScoreUseCase({ tenantId: 'demo', projectId: p.projectId }, deps));
  console.log(`  ✓ Learning Score: ${score.score}/100`);
  for (const [key, value] of Object.entries(score.breakdown)) console.log(`    ${key}: ${value}`);
  console.log();

  console.log('▶ 15) Design Memory');
  const designMem = unwrap(await getDesignMemoryUseCase('demo', p.projectId, deps));
  console.log(`  ✓ ${designMem.entries.length} design memories stored`);
  for (const e of designMem.entries.slice(0, 3)) console.log(`    • ${e.designType}: ${e.description} (${e.qualityScore}/100)`);
  console.log();

  console.log('▶ Events Emitted:');
  const counts = new Map<string, number>();
  for (const r of deps.eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [t, c] of [...counts.entries()].sort()) console.log(`  ${t}: ${c}`);

  console.log('\n═══ Learning Complete — Platform is Now Smarter ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
