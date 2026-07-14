/**
 * Creative Knowledge Engine — Example 01: Full Research Pipeline
 *
 * Research First: Interview → Business Profile → All Audits →
 * Competitor Analysis → Pattern Extraction → Benchmark →
 * Gap Analysis → Evidence-Based Recommendations → Creative Brief
 */
import {
  createResearchProjectUseCase, conductInterviewUseCase, updateBusinessProfileUseCase,
  auditWebsiteUseCase, auditUXUseCase, auditSEOUseCase, auditAccessibilityUseCase,
  auditPerformanceUseCase, auditContentUseCase,
  analyzeCompetitorUseCase, compareCompetitorsUseCase,
  extractVisualPatternsUseCase, generateBenchmarkUseCase,
  generateGapAnalysisUseCase, generateRecommendationsUseCase,
  generateCreativeBriefUseCase, calculateConfidenceUseCase,
  getResearchMemoryUseCase,
} from '../src/index.js';
import { makeDemoDeps, unwrap } from './_helpers.js';

async function main() {
  console.log('═══ Creative Knowledge Engine — 01 Full Research Pipeline ═══\n');
  console.log('    Research First — Evidence-Based\n');
  const deps = makeDemoDeps();
  const base = { tenantId: 'demo', organizationId: 'org-demo', correlationId: 'demo-1', actorId: 'admin' };
  const url = 'https://acme-restaurant.com';

  console.log('▶ 1) Create Research Project');
  const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'Acme Restaurant Research', slug: 'acme-research', industry: 'restaurant' }, deps));
  console.log(`  ✓ projectId=${p.projectId}\n`);

  console.log('▶ 2) Conduct Client Interview');
  unwrap(await conductInterviewUseCase({ ...base, projectId: p.projectId,
    businessGoal: 'Increase online orders by 50%', targetAudience: 'Urban food enthusiasts 25-45',
    targetRegion: 'New York metropolitan area', competitors: ['DoorDash', 'Uber Eats', 'Grubhub'],
    brandPersonality: 'Premium yet approachable — farm-to-table',
    preferredStyle: 'Modern with warm accents', dislikedStyle: 'Generic food delivery templates',
    businessModel: 'Direct-to-consumer with pickup/delivery', revenueModel: 'Per-order + subscription',
    budget: '$30K', timeline: '6 weeks',
    successMetrics: ['50% increase in online orders', '4.5+ star UX rating', '< 2s page load'],
  }, deps));
  console.log('  ✓ Interview completed\n');

  console.log('▶ 3) Update Business Profile');
  unwrap(await updateBusinessProfileUseCase({ ...base, projectId: p.projectId,
    companyName: 'Acme Restaurant', industry: 'restaurant',
    description: 'Farm-to-table dining with seasonal menus', targetMarket: 'Urban professionals',
    competitiveAdvantage: 'Unique seasonal menu + local sourcing', revenueModel: 'Direct sales', maturity: 'Established',
  }, deps));
  console.log('  ✓ Profile updated\n');

  console.log('▶ 4) Run All 6 Audits');
  const ws = unwrap(await auditWebsiteUseCase({ ...base, projectId: p.projectId, url }, deps));
  const ux = unwrap(await auditUXUseCase({ ...base, correlationId: 'c2', projectId: p.projectId, url }, deps));
  const seo = unwrap(await auditSEOUseCase({ ...base, correlationId: 'c3', projectId: p.projectId, url }, deps));
  const a11y = unwrap(await auditAccessibilityUseCase({ ...base, correlationId: 'c4', projectId: p.projectId, url }, deps));
  const perf = unwrap(await auditPerformanceUseCase({ ...base, correlationId: 'c5', projectId: p.projectId, url }, deps));
  const content = unwrap(await auditContentUseCase({ ...base, correlationId: 'c6', projectId: p.projectId, url }, deps));
  console.log(`  ✓ Website: ${ws.score}  UX: ${ux.score}  SEO: ${seo.score}  A11y: ${a11y.score}  Perf: ${perf.score}  Content: ${content.score}\n`);

  console.log('▶ 5) Analyze Competitors');
  unwrap(await analyzeCompetitorUseCase({ ...base, correlationId: 'c7', projectId: p.projectId, name: 'DoorDash', url: 'https://doordash.com' }, deps));
  unwrap(await analyzeCompetitorUseCase({ ...base, correlationId: 'c8', projectId: p.projectId, name: 'Uber Eats', url: 'https://ubereats.com' }, deps));
  const comp = unwrap(await compareCompetitorsUseCase({ ...base, projectId: p.projectId }, deps));
  console.log(`  ✓ Analyzed ${comp.comparison.length} competitors. Best: ${comp.bestPerformer}\n`);

  console.log('▶ 6) Extract Patterns');
  const patterns = unwrap(await extractVisualPatternsUseCase({ ...base, correlationId: 'c9', projectId: p.projectId }, deps));
  console.log(`  ✓ Extracted ${patterns.extracted} visual patterns\n`);

  console.log('▶ 7) Generate Benchmark');
  unwrap(await generateBenchmarkUseCase({ ...base, correlationId: 'c10', projectId: p.projectId, referenceApp: 'Airbnb' }, deps));
  console.log('  ✓ Airbnb benchmark created\n');

  console.log('▶ 8) Gap Analysis');
  const gap = unwrap(await generateGapAnalysisUseCase({ ...base, correlationId: 'c11', projectId: p.projectId }, deps));
  console.log(`  ✓ Current: ${gap.gap < 0 ? 'N/A' : 'Below benchmark'}  Gap: ${gap.gap} points to close\n`);

  console.log('▶ 9) Evidence-Based Recommendations');
  const recs = unwrap(await generateRecommendationsUseCase({ ...base, correlationId: 'c12', projectId: p.projectId }, deps));
  for (const r of recs.recommendations.slice(0, 5)) {
    console.log(`  • [${r.priority.toUpperCase()}] ${r.title}`);
    console.log(`    Evidence-backed: ${r.evidenceIds.length > 0 ? 'YES' : 'NO'}  Confidence: ${(r.confidence * 100).toFixed(0)}%`);
  }
  console.log(`  ✓ All evidence-backed: ${recs.evidenceBacked ? 'YES' : 'NO'}\n`);

  console.log('▶ 10) Generate Creative Brief');
  const brief = unwrap(await generateCreativeBriefUseCase({ ...base, correlationId: 'c13', projectId: p.projectId }, deps));
  console.log(`  ✓ Confidence: ${(brief.confidence * 100).toFixed(0)}%\n`);

  console.log('▶ 11) Verify Evidence Coverage');
  const conf = unwrap(await calculateConfidenceUseCase({ tenantId: 'demo', projectId: p.projectId }, deps));
  console.log(`  ✓ Evidence count: ${conf.evidenceCount}  Overall confidence: ${(conf.overallConfidence * 100).toFixed(0)}%\n`);

  console.log('▶ 12) Research Memory');
  const mem = unwrap(await getResearchMemoryUseCase('demo', p.projectId, deps));
  console.log(`  ✓ History entries: ${mem.history.length}`);
  for (const h of mem.history.slice(0, 5)) console.log(`    • ${h.action}: ${h.summary}`);
  console.log();

  console.log('▶ Events Emitted:');
  const counts = new Map<string, number>();
  for (const r of deps.eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [t, c] of [...counts.entries()].sort()) console.log(`  ${t}: ${c}`);

  console.log('\n═══ Research Complete — Ready for Creative Intelligence Engine ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
