/**
 * Example 06 — Trust Architecture (RC3)
 *
 * Platform Vision v2: 5 Industries × Trust Evidence 배치.
 * "이 회사를 믿게 만드는 핵심 요소" 생성.
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  generateTrustArchitectureReportUseCase,
  generateCustomerPsychologyReportUseCase,
  generateEvidencePlacementStrategyUseCase,
  generateObjectionMapUseCase,
  generateConfidenceJourneyUseCase,
  generateDecisionJourneyUseCase,
  generateTrustChecklistUseCase,
  getIndustryTrustProfileUseCase,
  INDUSTRY_TRUST_PROFILES,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 1: Restaurant 산업 Trust Profile 조회');
  const r1 = unwrap(await getIndustryTrustProfileUseCase({ industry: 'Restaurant' }, deps));
  console.log(`  Industry: ${r1.industry}`);
  console.log(`  Description: ${r1.description}`);
  console.log(`  Evidence Count: ${r1.evidenceCount}`);
  console.log(`  Top Signals: ${r1.topSignals.join(', ')}`);

  console.log('▶ Step 2: Trust Architecture Report (Restaurant)');
  const r2 = unwrap(await generateTrustArchitectureReportUseCase({
    ...base, industry: 'Restaurant', existingPageRefs: ['hero', 'menu', 'about'],
  }, deps));
  console.log(`  Coverage: ${r2.coverage}%`);
  console.log(`  Gaps: ${r2.gaps.length}개`);

  console.log('▶ Step 3: Customer Psychology Report (5 stages)');
  const r3 = unwrap(await generateCustomerPsychologyReportUseCase({ ...base, industry: 'Hotel' }, deps));
  console.log(`  Stages: ${r3.stageCount} (Anxiety→Discovery→Evaluation→Confidence→Action)`);

  console.log('▶ Step 4: Evidence Placement Strategy (hero page)');
  const r4 = unwrap(await generateEvidencePlacementStrategyUseCase({
    ...base, industry: 'Restaurant', pageRef: 'hero',
  }, deps));
  console.log(`  Hero에 배치할 evidence: ${r4.placementCount}개`);

  console.log('▶ Step 5: Objection Map (Hospital)');
  const r5 = unwrap(await generateObjectionMapUseCase({ ...base, industry: 'Hospital' }, deps));
  console.log(`  Objections: ${r5.objectionCount}개 (각 evidence마다 1개씩)`);

  console.log('▶ Step 6: Confidence Journey (SaaS footer)');
  const r6 = unwrap(await generateConfidenceJourneyUseCase({
    ...base, industry: 'SaaS', pageRef: 'footer',
  }, deps));
  console.log(`  Steps: ${r6.steps}, Total Confidence Gain: ${r6.totalGain}`);

  console.log('▶ Step 7: Decision Journey (5 steps)');
  const r7 = unwrap(await generateDecisionJourneyUseCase({
    ...base, industry: 'Travel', pageRef: 'tours',
  }, deps));
  console.log(`  Decision Steps: ${r7.steps} (신뢰→사회적 증거→실용성→질문 해소→행동)`);

  console.log('▶ Step 8: Trust Checklist (evidence 부분 배치)');
  const profile = INDUSTRY_TRUST_PROFILES.Restaurant;
  const placed = profile.requiredEvidence.filter(e => e.priority === 1).map(e => e.id);
  const r8 = unwrap(await generateTrustChecklistUseCase({
    ...base, industry: 'Restaurant', pageRef: 'home', placedEvidence: placed,
  }, deps));
  console.log(`  Passed: ${r8.passed}, Failed: ${r8.failed}, Warning: ${r8.warning}`);

  console.log('\n✓ Trust Architecture Example Complete');
  console.log('  Platform Vision v2: 점수가 아닌 Evidence 배치');
  console.log('  5 Industries × 7대 산출물 × 0 점수 UI');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });