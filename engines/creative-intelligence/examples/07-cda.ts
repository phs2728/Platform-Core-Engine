/**
 * Example 07 — Customer Decision Architecture (CDA, RC3.1)
 *
 * Platform Vision RC3.1: 12 Industries × 7 PageTypes × 6 Questions
 * CQM: "이 페이지에서 고객이 가장 궁금해할 질문 목록"
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  generateCustomerDecisionArchitectureUseCase,
  generateCDADecisionJourneyUseCase,
  generateDetailStrategyUseCase,
  generateTrustEvidencePlacementUseCase,
  generateObjectionLibraryUseCase,
  generateFAQStrategyUseCase,
  generateAIConciergeStrategyUseCase,
  generateSocialProofStrategyUseCase,
  generateStoryArchitectureUseCase,
  generateIndustryDetailBlueprintUseCase,
  generateCustomerQuestionModelUseCase,
  validateSectionExistenceUseCase,
  getIndustryDetailBlueprintUseCase,
  getObjectionLibraryUseCase,
  INDUSTRY_DETAIL_BLUEPRINTS, OBJECTION_LIBRARIES, JOURNEY_STEPS,
  generateCustomerQuestions, generateQuestionSequence,
} from '../src/index.js';
import { PLATFORM_FIRST_PRINCIPLE, validatePlatformTerminology } from '@platform/core-sdk';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Step 0: Platform First Principle');
  console.log(`  "${PLATFORM_FIRST_PRINCIPLE}"`);
  console.log(`  "Website Builder" forbidden: ${!validatePlatformTerminology('Website Builder')}`);
  console.log(`  "Decision Experience Platform" allowed: ${validatePlatformTerminology('Decision Experience Platform')}`);

  console.log('\n▶ Step 1: CDA 통합 (Hospitality)');
  const cda = unwrap(await generateCustomerDecisionArchitectureUseCase({ ...base, industry: 'Hospitality' }, deps));
  console.log(`  Journey Steps: ${cda.journeySteps}`);
  console.log(`  Blueprint Sections: ${cda.blueprintSections}`);
  console.log(`  Objection Count: ${cda.objectionCount}`);

  console.log('\n▶ Step 2: Customer Journey (10 stages)');
  console.log(`  Stages: ${JOURNEY_STEPS.map(s => s.stage).join(' → ')}`);

  console.log('\n▶ Step 3: Detail Strategy (SaaS Home)');
  const detail = unwrap(await generateDetailStrategyUseCase({
    ...base, industry: 'SaaS', pageType: 'Home',
  }, deps));
  console.log(`  Section Count: ${detail.sectionCount}`);
  console.log(`  Primary CTA: "${detail.primaryCta}"`);

  console.log('\n▶ Step 4: Trust Evidence Placement (Travel Home)');
  const placement = unwrap(await generateTrustEvidencePlacementUseCase({
    ...base, industry: 'Travel', pageRef: 'home',
  }, deps));
  console.log(`  Sequence Count: ${placement.sequenceCount}`);

  console.log('\n▶ Step 5: Objection Library (Medical)');
  const objections = unwrap(await generateObjectionLibraryUseCase({ ...base, industry: 'Medical' }, deps));
  console.log(`  Total: ${objections.total}`);
  console.log(`  Critical: ${objections.criticalCount}, Major: ${objections.majorCount}`);

  console.log('\n▶ Step 6: FAQ Strategy (Decision Accelerator, Marketplace)');
  const faq = unwrap(await generateFAQStrategyUseCase({ ...base, industry: 'Marketplace' }, deps));
  console.log(`  FAQ Count: ${faq.faqCount}`);
  console.log(`  Categories: ${faq.categoryCount}`);

  console.log('\n▶ Step 7: AI Concierge (NGO Home)');
  const concierge = unwrap(await generateAIConciergeStrategyUseCase({
    ...base, industry: 'NGO', pageRef: 'home', context: { detectedInterests: ['transparency'] },
  }, deps));
  console.log(`  Recommendations: ${concierge.recommendationCount}`);

  console.log('\n▶ Step 8: Social Proof (SaaS Home)');
  const social = unwrap(await generateSocialProofStrategyUseCase({ ...base, industry: 'SaaS', pageRef: 'home' }, deps));
  console.log(`  Asset Count: ${social.assetCount}`);

  console.log('\n▶ Step 9: Story Architecture (Travel Tours)');
  const story = unwrap(await generateStoryArchitectureUseCase({ ...base, industry: 'Travel', pageRef: 'tours' }, deps));
  console.log(`  Story Count: ${story.storyCount}`);

  console.log('\n▶ Step 10: Industry Detail Blueprint (Government Contact)');
  const bp = unwrap(await generateIndustryDetailBlueprintUseCase({
    ...base, industry: 'Government', pageType: 'Contact',
  }, deps));
  console.log(`  Section Count: ${bp.sectionCount}`);
  console.log(`  Evidence Count: ${bp.evidenceCount}`);
  console.log(`  Primary CTA: "${bp.primaryCta}"`);

  console.log('\n▶ Step 11: Customer Question Model (SaaS Pricing) — 사장님 추가 권장');
  const cqm = unwrap(await generateCustomerQuestionModelUseCase({
    ...base, industry: 'SaaS', pageType: 'Pricing',
  }, deps));
  console.log(`  Question Count: ${cqm.questionCount}`);
  console.log(`  Critical: ${cqm.criticalCount}`);
  console.log(`  Sequence: ${cqm.sequence.length} IDs`);

  console.log('\n▶ Step 12: Section Existence Validation');
  const validSection = unwrap(await validateSectionExistenceUseCase({
    sectionName: 'Hero', answersQuestion: true, removesFear: false, buildsTrust: false, movesToNextDecision: false,
  }, deps));
  console.log(`  Hero (answersQuestion): justified=${validSection.justifies}, reason="${validSection.reason}"`);

  const invalidSection = unwrap(await validateSectionExistenceUseCase({
    sectionName: 'Decorative Banner', answersQuestion: false, removesFear: false, buildsTrust: false, movesToNextDecision: false,
  }, deps));
  console.log(`  Decorative Banner: justified=${invalidSection.justifies}, reason="${invalidSection.reason}"`);

  console.log('\n▶ Step 13: CQM Hospitality Home (6 questions)');
  const questions = generateCustomerQuestions('Home', 'Hospitality');
  const sequence = generateQuestionSequence(questions);
  questions.forEach((q, idx) => {
    console.log(`  ${idx + 1}. [${q.priority}] ${q.question}`);
  });
  console.log(`  Sorted Sequence: ${sequence.slice(0, 3).map(id => questions.find(q => q.id === id)!.priority).join(', ')}`);

  console.log('\n▶ Step 14: 12 Industries Objection Library Summary');
  const summary = ['Hospitality', 'Restaurant', 'Travel', 'Marketplace', 'Retail', 'Medical', 'Education', 'RealEstate', 'SaaS', 'NGO', 'Church', 'Government'];
  for (const ind of summary) {
    const r = unwrap(await getObjectionLibraryUseCase({ industry: ind as never }, deps));
    console.log(`  ${ind}: ${r.totalObjections} objections (Critical=${r.criticalCount}, Major=${r.majorCount})`);
  }

  console.log('\n✓ CDA Example Complete');
  console.log('  Platform Vision RC3.1: 12 Industries × 7 PageTypes × 6 Questions = 504 CQM');
  console.log('  11대 Framework + CQM (사장님 추가) + Platform First Principle');
  console.log('  Not Website Builder; IS Human Decision Experience Platform');
}

main().catch((err) => { console.error('✗ Example failed:', err); process.exit(1); });