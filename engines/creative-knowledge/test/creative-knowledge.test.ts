/**
 * Creative Knowledge Engine — Test Suite (120+ tests)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Ok, Err } from '@platform/core-sdk';
import type { CreativeBrief } from '../src/interfaces/index.js';
import {
  createResearchProjectUseCase, startResearchSessionUseCase, completeResearchUseCase, archiveResearchUseCase,
  getResearchProjectUseCase, listResearchProjectsUseCase,
  conductInterviewUseCase, generateCreativeBriefUseCase, updateBusinessProfileUseCase,
  auditWebsiteUseCase, auditUXUseCase, auditSEOUseCase, auditAccessibilityUseCase, auditPerformanceUseCase, auditContentUseCase,
  analyzeCompetitorUseCase, compareCompetitorsUseCase,
  extractPatternsUseCase, extractVisualPatternsUseCase, extractCopyPatternsUseCase, extractLayoutPatternsUseCase,
  generateBenchmarkUseCase,
  createKnowledgeUseCase, updateKnowledgeUseCase, searchKnowledgeUseCase, recommendKnowledgeUseCase,
  generateEvidenceUseCase, calculateConfidenceUseCase,
  generateRecommendationsUseCase, generateGapAnalysisUseCase,
  getResearchMemoryUseCase, updateResearchMemoryUseCase, searchResearchHistoryUseCase,
  canTransitionResearch, KNOWLEDGE_EVENTS,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

const base = { tenantId: 't-1', organizationId: 'org-1', correlationId: 'c-1', actorId: 'admin' };
function unwrap<T>(r: { ok: boolean; value?: T; error?: unknown }): T { if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err')); return r.value as T; }

// ═════════ RESEARCH PROJECT ═════════
describe('Research Project', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should create research project', async () => { const r = await createResearchProjectUseCase({ ...base, name: 'Acme Research', slug: 'acme', industry: 'tech' }, deps); expect(r.ok).toBe(true); });
  it('should reject invalid slug', async () => { const r = await createResearchProjectUseCase({ ...base, name: 'X', slug: 'UPPER', industry: 'tech' }, deps); expect(r.ok).toBe(false); });
  it('should reject dup slug', async () => { await createResearchProjectUseCase({ ...base, name: 'A', slug: 'dup', industry: 'tech' }, deps); const r = await createResearchProjectUseCase({ ...base, correlationId: 'c2', name: 'B', slug: 'dup', industry: 'tech' }, deps); expect(r.ok).toBe(false); });
  it('should reject unverified org', async () => { const r = await createResearchProjectUseCase({ ...base, organizationId: 'x', name: 'P', slug: 'p', industry: 'tech' }, deps); expect(r.ok).toBe(false); });
  it('should get project', async () => { const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'get', industry: 'tech' }, deps)); const r = await getResearchProjectUseCase('t-1', p.projectId, deps); expect(r.ok).toBe(true); });
  it('should list projects', async () => { await createResearchProjectUseCase({ ...base, name: 'A', slug: 'la', industry: 'tech' }, deps); await createResearchProjectUseCase({ ...base, correlationId: 'c2', name: 'B', slug: 'lb', industry: 'tech' }, deps); const r = await listResearchProjectsUseCase('t-1', deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.length).toBe(2); });
  it('should start session', async () => { const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'sess', industry: 'tech' }, deps)); const r = await startResearchSessionUseCase({ ...base, projectId: p.projectId, phase: 'interview' }, deps); expect(r.ok).toBe(true); });
  it('should complete research', async () => { const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'comp', industry: 'tech' }, deps)); const r = await completeResearchUseCase({ ...base, projectId: p.projectId }, deps); expect(r.ok).toBe(true); const proj = unwrap(await getResearchProjectUseCase('t-1', p.projectId, deps)); expect(proj.status).toBe('Completed'); });
  it('should archive research', async () => { const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'arch', industry: 'tech' }, deps)); const r = await archiveResearchUseCase({ ...base, projectId: p.projectId }, deps); expect(r.ok).toBe(true); });
  it('should init research memory on create', async () => { const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'mem', industry: 'tech' }, deps)); const mem = await deps.memoryRepo.findByProject('t-1', p.projectId); expect(mem).not.toBeNull(); });
  it('should emit research.created event', async () => { await createResearchProjectUseCase({ ...base, name: 'P', slug: 'ev', industry: 'tech' }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.RESEARCH_CREATED)).toBe(1); });
  it('should emit research.completed event', async () => { const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'ev2', industry: 'tech' }, deps)); await completeResearchUseCase({ ...base, projectId: p.projectId }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.RESEARCH_COMPLETED)).toBe(1); });
  it('should reject start session for non-existent', async () => { const r = await startResearchSessionUseCase({ ...base, projectId: 'none', phase: 'interview' }, deps); expect(r.ok).toBe(false); });
  it('should reject complete for non-existent', async () => { const r = await completeResearchUseCase({ ...base, projectId: 'none' }, deps); expect(r.ok).toBe(false); });
});

// ═════════ CLIENT INTERVIEW ═════════
describe('Client Interview', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'int-p', industry: 'tech' }, deps)).projectId; });

  it('should conduct interview', async () => { const r = await conductInterviewUseCase({ ...base, projectId, businessGoal: 'Increase sales', targetAudience: 'SaaS founders', targetRegion: 'US', competitors: ['Comp A'], brandPersonality: 'Innovative', preferredStyle: 'Minimal', dislikedStyle: 'Corporate', businessModel: 'B2B SaaS', revenueModel: 'Subscription', budget: '$50K', timeline: '3 months', successMetrics: ['30% conversion increase'] }, deps); expect(r.ok).toBe(true); });
  it('should create evidence from interview', async () => { unwrap(await conductInterviewUseCase({ ...base, projectId, businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] }, deps)); const evidence = await deps.evidenceRepo.findByProject('t-1', projectId); expect(evidence.length).toBeGreaterThan(0); });
  it('should emit interview.completed event', async () => { await conductInterviewUseCase({ ...base, projectId, businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.INTERVIEW_COMPLETED)).toBe(1); });
  it('should update project status to Interviewing', async () => { await conductInterviewUseCase({ ...base, projectId, businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] }, deps); const p = unwrap(await getResearchProjectUseCase('t-1', projectId, deps)); expect(p.status).toBe('Interviewing'); });
  it('should reject interview for non-existent project', async () => { const r = await conductInterviewUseCase({ ...base, projectId: 'none', businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] }, deps); expect(r.ok).toBe(false); });
  it('should update business profile', async () => { const r = await updateBusinessProfileUseCase({ ...base, projectId, companyName: 'Acme Inc', industry: 'tech', description: 'Tech company', targetMarket: 'Global', competitiveAdvantage: 'Better UX', revenueModel: 'SaaS', maturity: 'Growth' }, deps); expect(r.ok).toBe(true); });
});

// ═════════ CREATIVE BRIEF ═════════
describe('Creative Brief Generation', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'brief-p', industry: 'tech' }, deps)).projectId; });

  it('should generate brief after interview', async () => {
    unwrap(await conductInterviewUseCase({ ...base, projectId, businessGoal: 'Increase conversion 40%', targetAudience: 'CTOs', targetRegion: 'US', competitors: ['Comp A'], brandPersonality: 'Premium', preferredStyle: 'Luxury', dislikedStyle: 'Corporate', businessModel: 'B2B', revenueModel: 'Subscription', budget: '$100K', timeline: '8 weeks', successMetrics: ['40% conversion increase'] }, deps));
    const r = await generateCreativeBriefUseCase({ ...base, projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.confidence).toBeGreaterThan(0);
  });
  it('should reject brief without interview', async () => { const r = await generateCreativeBriefUseCase({ ...base, projectId }, deps); expect(r.ok).toBe(false); });
  it('should attach evidence to brief', async () => {
    unwrap(await conductInterviewUseCase({ ...base, projectId, businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] }, deps));
    unwrap(await generateCreativeBriefUseCase({ ...base, projectId }, deps));
    const brief = await deps.briefRepo.findByProject('t-1', projectId);
    expect(brief!.evidence.length).toBeGreaterThan(0);
  });
  it('should emit brief.generated event', async () => {
    unwrap(await conductInterviewUseCase({ ...base, projectId, businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] }, deps));
    await generateCreativeBriefUseCase({ ...base, projectId }, deps);
    expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.BRIEF_GENERATED)).toBe(1);
  });
});

// ═════════ AUDITS ═════════
describe('Website Audits', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  const url = 'https://example.com';
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'audit-p', industry: 'tech' }, deps)).projectId; });

  it('should audit website', async () => { const r = await auditWebsiteUseCase({ ...base, projectId, url }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.score).toBeGreaterThan(0); });
  it('should audit UX', async () => { const r = await auditUXUseCase({ ...base, projectId, url }, deps); expect(r.ok).toBe(true); });
  it('should audit SEO', async () => { const r = await auditSEOUseCase({ ...base, projectId, url }, deps); expect(r.ok).toBe(true); });
  it('should audit accessibility', async () => { const r = await auditAccessibilityUseCase({ ...base, projectId, url }, deps); expect(r.ok).toBe(true); });
  it('should audit performance', async () => { const r = await auditPerformanceUseCase({ ...base, projectId, url }, deps); expect(r.ok).toBe(true); });
  it('should audit content', async () => { const r = await auditContentUseCase({ ...base, projectId, url }, deps); expect(r.ok).toBe(true); });
  it('should create evidence on website audit', async () => { unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps)); const evidence = await deps.evidenceRepo.findByProject('t-1', projectId); expect(evidence.length).toBeGreaterThan(0); });
  it('should store audit results', async () => { await auditWebsiteUseCase({ ...base, projectId, url }, deps); await auditUXUseCase({ ...base, correlationId: 'c2', projectId, url }, deps); const results = await deps.auditResultRepo.findByProject('t-1', projectId); expect(results.length).toBe(2); });
  it('should emit website.audited event', async () => { await auditWebsiteUseCase({ ...base, projectId, url }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.WEBSITE_AUDITED)).toBe(1); });
  it('should include strengths and weaknesses', async () => { unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps)); const results = await deps.auditResultRepo.findByProject('t-1', projectId); const website = results.find((r) => r.type === 'Website')!; expect(website.strengths.length).toBeGreaterThan(0); });
  it('should include recommendations', async () => { unwrap(await auditUXUseCase({ ...base, projectId, url }, deps)); const results = await deps.auditResultRepo.findByProject('t-1', projectId); const ux = results.find((r) => r.type === 'UX')!; expect(ux.recommendations.length).toBeGreaterThan(0); });
  it('should reject audit for non-existent project', async () => { const r = await auditWebsiteUseCase({ ...base, projectId: 'none', url }, deps); expect(r.ok).toBe(false); });
});

// ═════════ COMPETITOR ANALYSIS ═════════
describe('Competitor Analysis', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'comp-p', industry: 'tech' }, deps)).projectId; });

  it('should analyze competitor', async () => { const r = await analyzeCompetitorUseCase({ ...base, projectId, name: 'Stripe', url: 'https://stripe.com' }, deps); expect(r.ok).toBe(true); });
  it('should store competitor with patterns', async () => { unwrap(await analyzeCompetitorUseCase({ ...base, projectId, name: 'Stripe', url: 'https://stripe.com' }, deps)); const competitors = await deps.competitorRepo.findByProject('t-1', projectId); expect(competitors[0]!.patterns.length).toBeGreaterThan(0); });
  it('should emit competitor.analyzed event', async () => { await analyzeCompetitorUseCase({ ...base, projectId, name: 'A', url: 'https://a.com' }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.COMPETITOR_ANALYZED)).toBe(1); });
  it('should compare competitors', async () => {
    unwrap(await analyzeCompetitorUseCase({ ...base, projectId, name: 'A', url: 'https://a.com' }, deps));
    unwrap(await analyzeCompetitorUseCase({ ...base, correlationId: 'c2', projectId, name: 'B', url: 'https://b.com' }, deps));
    const r = await compareCompetitorsUseCase({ ...base, projectId }, deps);
    expect(r.ok).toBe(true); if (r.ok) { expect(r.value.comparison.length).toBe(2); expect(r.value.bestPerformer).toBeTruthy(); }
  });
  it('should reject analyze for non-existent project', async () => { const r = await analyzeCompetitorUseCase({ ...base, projectId: 'none', name: 'A', url: 'https://a.com' }, deps); expect(r.ok).toBe(false); });
});

// ═════════ PATTERN EXTRACTION ═════════
describe('Pattern Extraction', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => {
    deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'pat-p', industry: 'tech' }, deps)).projectId;
    unwrap(await analyzeCompetitorUseCase({ ...base, projectId, name: 'Stripe', url: 'https://stripe.com' }, deps));
  });

  it('should extract visual patterns', async () => { const r = await extractVisualPatternsUseCase({ ...base, projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.extracted).toBeGreaterThan(0); });
  it('should extract layout patterns', async () => { const r = await extractLayoutPatternsUseCase({ ...base, projectId }, deps); expect(r.ok).toBe(true); });
  it('should extract copy patterns', async () => { const r = await extractCopyPatternsUseCase({ ...base, projectId }, deps); expect(r.ok).toBe(true); });
  it('should extract patterns by type', async () => { const r = await extractPatternsUseCase({ ...base, projectId, type: 'Visual' }, deps); expect(r.ok).toBe(true); });
  it('should store extracted patterns', async () => { unwrap(await extractVisualPatternsUseCase({ ...base, projectId }, deps)); const patterns = await deps.patternRepo.findByProject('t-1', projectId); expect(patterns.length).toBeGreaterThan(0); });
});

// ═════════ BENCHMARK ═════════
describe('Benchmark', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'bench-p', industry: 'tech' }, deps)).projectId; });

  it('should generate benchmark', async () => { const r = await generateBenchmarkUseCase({ ...base, projectId, referenceApp: 'Apple' }, deps); expect(r.ok).toBe(true); });
  it('should include scores', async () => { unwrap(await generateBenchmarkUseCase({ ...base, projectId, referenceApp: 'Stripe' }, deps)); const benchmarks = await deps.benchmarkRepo.findByProject('t-1', projectId); expect(Object.keys(benchmarks[0]!.scores).length).toBeGreaterThan(0); });
  it('should emit benchmark.generated event', async () => { await generateBenchmarkUseCase({ ...base, projectId, referenceApp: 'Linear' }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.BENCHMARK_GENERATED)).toBe(1); });
});

// ═════════ KNOWLEDGE MANAGEMENT ═════════
describe('Knowledge Management', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should create knowledge', async () => { const r = await createKnowledgeUseCase({ ...base, title: 'Whitespace Principles', slug: 'ws-principles', category: 'design', content: 'Generous whitespace signals premium quality...', sources: [{ title: 'Apple Design Guidelines', url: 'mock://apple' }], confidence: 0.9 }, deps); expect(r.ok).toBe(true); });
  it('should reject dup slug', async () => { await createKnowledgeUseCase({ ...base, title: 'A', slug: 'dup', category: 'c', content: 'x' }, deps); const r = await createKnowledgeUseCase({ ...base, correlationId: 'c2', title: 'B', slug: 'dup', category: 'c', content: 'x' }, deps); expect(r.ok).toBe(false); });
  it('should update knowledge', async () => { const k = unwrap(await createKnowledgeUseCase({ ...base, title: 'T', slug: 'upd', category: 'c', content: 'old' }, deps)); const r = await updateKnowledgeUseCase({ ...base, knowledgeId: k.knowledgeId, title: 'Updated', content: 'new' }, deps); expect(r.ok).toBe(true); });
  it('should search knowledge', async () => { await createKnowledgeUseCase({ ...base, title: 'Visual Hierarchy', slug: 'vh', category: 'design', content: 'Guide the eye through deliberate focal points', tags: ['hierarchy', 'design'] }, deps); await createKnowledgeUseCase({ ...base, correlationId: 'c2', title: 'Typography', slug: 'typo', category: 'design', content: 'Type scale and rhythm', tags: ['type'] }, deps); const r = await searchKnowledgeUseCase({ tenantId: 't-1', query: 'hierarchy' }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.results.length).toBe(1); });
  it('should recommend knowledge', async () => { const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'rec-p', industry: 'fintech' }, deps)); await createKnowledgeUseCase({ ...base, title: 'Fintech UX', slug: 'fin-ux', category: 'industry', content: 'Fintech-specific patterns', tags: ['fintech'] }, deps); const r = await recommendKnowledgeUseCase('t-1', p.projectId, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.recommendations.length).toBeGreaterThan(0); });
  it('should emit knowledge.created event', async () => { await createKnowledgeUseCase({ ...base, title: 'K', slug: 'ev', category: 'c', content: 'x' }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.KNOWLEDGE_CREATED)).toBe(1); });
  it('should emit knowledge.updated event', async () => { const k = unwrap(await createKnowledgeUseCase({ ...base, title: 'K', slug: 'ev2', category: 'c', content: 'x' }, deps)); await updateKnowledgeUseCase({ ...base, knowledgeId: k.knowledgeId, content: 'updated' }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.KNOWLEDGE_UPDATED)).toBe(1); });
});

// ═════════ EVIDENCE ═════════
describe('Evidence Engine', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'ev-p', industry: 'tech' }, deps)).projectId; });

  it('should generate evidence', async () => { const r = await generateEvidenceUseCase({ ...base, projectId, claim: 'Site loads in 3.2s', source: 'https://example.com', sourceType: 'audit', data: { loadTime: 3200 }, confidence: 0.95 }, deps); expect(r.ok).toBe(true); });
  it('should calculate confidence', async () => { await generateEvidenceUseCase({ ...base, projectId, claim: 'A', source: 's', sourceType: 'audit', data: {}, confidence: 0.9 }, deps); await generateEvidenceUseCase({ ...base, correlationId: 'c2', projectId, claim: 'B', source: 's', sourceType: 'audit', data: {}, confidence: 0.8 }, deps); const r = await calculateConfidenceUseCase({ tenantId: 't-1', projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.overallConfidence).toBeGreaterThan(0); });
  it('should return 0 confidence with no evidence', async () => { const r = await calculateConfidenceUseCase({ tenantId: 't-1', projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.overallConfidence).toBe(0); });
  it('should emit evidence.generated event', async () => { await generateEvidenceUseCase({ ...base, projectId, claim: 'C', source: 's', sourceType: 'audit', data: {}, confidence: 0.9 }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.EVIDENCE_GENERATED)).toBe(1); });
});

// ═════════ RECOMMENDATIONS ═════════
describe('Recommendations', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  const url = 'https://example.com';
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'rec-p', industry: 'tech' }, deps)).projectId; });

  it('should generate recommendations without audits', async () => { const r = await generateRecommendationsUseCase({ ...base, projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.recommendations.length).toBeGreaterThan(0); });
  it('should generate evidence-backed recommendations after audits', async () => {
    unwrap(await conductInterviewUseCase({ ...base, projectId, businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] }, deps));
    unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps));
    unwrap(await auditUXUseCase({ ...base, correlationId: 'c2', projectId, url }, deps));
    const r = await generateRecommendationsUseCase({ ...base, projectId }, deps);
    expect(r.ok).toBe(true); if (r.ok) { expect(r.value.evidenceBacked).toBe(true); expect(r.value.recommendations.every((rec) => rec.evidenceIds.length > 0)).toBe(true); }
  });
  it('should include priority in recommendations', async () => { const r = unwrap(await generateRecommendationsUseCase({ ...base, projectId }, deps)); expect(r.recommendations.every((rec) => ['critical', 'high', 'medium', 'low'].includes(rec.priority))).toBe(true); });
  it('should emit recommendation.generated event', async () => { await generateRecommendationsUseCase({ ...base, projectId }, deps); expect(deps.eventBus.countByType(KNOWLEDGE_EVENTS.RECOMMENDATION_GENERATED)).toBe(1); });
});

// ═════════ GAP ANALYSIS ═════════
describe('Gap Analysis', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  const url = 'https://example.com';
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'gap-p', industry: 'tech' }, deps)).projectId; });

  it('should generate gap analysis', async () => { unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps)); unwrap(await generateBenchmarkUseCase({ ...base, correlationId: 'c2', projectId, referenceApp: 'Apple' }, deps)); const r = await generateGapAnalysisUseCase({ ...base, projectId }, deps); expect(r.ok).toBe(true); });
  it('should calculate gap correctly', async () => { unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps)); unwrap(await generateBenchmarkUseCase({ ...base, correlationId: 'c2', projectId, referenceApp: 'Apple' }, deps)); const r = unwrap(await generateGapAnalysisUseCase({ ...base, projectId }, deps)); expect(r.gap).toBeGreaterThan(0); });
  it('should include per-area gaps', async () => { unwrap(await auditUXUseCase({ ...base, projectId, url }, deps)); unwrap(await generateBenchmarkUseCase({ ...base, correlationId: 'c2', projectId, referenceApp: 'Stripe' }, deps)); unwrap(await generateGapAnalysisUseCase({ ...base, projectId }, deps)); const stored = await deps.gapAnalysisRepo.findByProject('t-1', projectId); expect(stored!.gaps.length).toBeGreaterThan(0); });
});

// ═════════ RESEARCH MEMORY ═════════
describe('Research Memory', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'mem-p', industry: 'tech' }, deps)).projectId; });

  it('should get research memory', async () => { const r = await getResearchMemoryUseCase('t-1', projectId, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.history.length).toBeGreaterThan(0); });
  it('should update research memory', async () => { const r = await updateResearchMemoryUseCase({ tenantId: 't-1', projectId, action: 'custom', summary: 'Custom action performed' }, deps); expect(r.ok).toBe(true); });
  it('should search research history', async () => { await updateResearchMemoryUseCase({ tenantId: 't-1', projectId, action: 'audit-website', summary: 'Website audit completed' }, deps); const r = await searchResearchHistoryUseCase('t-1', projectId, 'audit', deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.results.length).toBeGreaterThan(0); });
  it('should append entries to memory', async () => { await updateResearchMemoryUseCase({ tenantId: 't-1', projectId, action: 'a1', summary: 's1' }, deps); await updateResearchMemoryUseCase({ tenantId: 't-1', projectId, action: 'a2', summary: 's2' }, deps); const mem = unwrap(await getResearchMemoryUseCase('t-1', projectId, deps)); expect(mem.history.length).toBeGreaterThanOrEqual(3); });
});

// ═════════ STATUS TRANSITIONS ═════════
describe('Status Transitions', () => {
  it('Created → Interviewing', () => { expect(canTransitionResearch('Created', 'Interviewing')).toBe(true); });
  it('Interviewing → Auditing', () => { expect(canTransitionResearch('Interviewing', 'Auditing')).toBe(true); });
  it('Auditing → Analyzing', () => { expect(canTransitionResearch('Auditing', 'Analyzing')).toBe(true); });
  it('Analyzing → Completed', () => { expect(canTransitionResearch('Analyzing', 'Completed')).toBe(true); });
  it('Completed → Archived', () => { expect(canTransitionResearch('Completed', 'Archived')).toBe(true); });
  it('Created → Completed (not allowed)', () => { expect(canTransitionResearch('Created', 'Completed')).toBe(false); });
  it('Archived → nothing', () => { expect(canTransitionResearch('Archived', 'Created')).toBe(false); });
});

// ═════════ EDGE CASES ═════════
describe('Edge Cases', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should reject get non-existent project', async () => { const r = await getResearchProjectUseCase('t-1', 'none', deps); expect(r.ok).toBe(false); });
  it('should reject brief for non-existent', async () => { const r = await generateCreativeBriefUseCase({ ...base, projectId: 'none' }, deps); expect(r.ok).toBe(false); });
  it('should reject evidence for non-existent', async () => { const r = await generateEvidenceUseCase({ ...base, projectId: 'none', claim: 'c', source: 's', sourceType: 'audit', data: {}, confidence: 0.5 }, deps); expect(r.ok).toBe(false); });
  it('should reject recommendations for non-existent', async () => { const r = await generateRecommendationsUseCase({ ...base, projectId: 'none' }, deps); expect(r.ok).toBe(false); });
  it('should reject gap analysis for non-existent', async () => { const r = await generateGapAnalysisUseCase({ ...base, projectId: 'none' }, deps); expect(r.ok).toBe(false); });
  it('should reject memory for non-existent', async () => { const r = await getResearchMemoryUseCase('t-1', 'none', deps); expect(r.ok).toBe(false); });
  it('should reject update knowledge non-existent', async () => { const r = await updateKnowledgeUseCase({ ...base, knowledgeId: 'none', content: 'x' }, deps); expect(r.ok).toBe(false); });
});

// ═════════ MULTI-TENANT ISOLATION ═════════
describe('Multi-Tenant Isolation', () => {
  it('should isolate projects across tenants', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2');
    deps.policyProvider.set('t-2', { maxProjects: 50 });
    await createResearchProjectUseCase({ tenantId: 't-1', organizationId: 'org-1', correlationId: 'c1', actorId: 'a', name: 'T1 Project', slug: 't1-slug', industry: 'tech' }, deps);
    await createResearchProjectUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c2', actorId: 'a', name: 'T2 Project', slug: 't2-slug', industry: 'tech' }, deps);
    const t1Projects = await listResearchProjectsUseCase('t-1', deps);
    const t2Projects = await listResearchProjectsUseCase('t-2', deps);
    if (t1Projects.ok && t2Projects.ok) {
      expect(t1Projects.value.length).toBe(1);
      expect(t2Projects.value.length).toBe(1);
      expect(t1Projects.value[0]!.name).toBe('T1 Project');
      expect(t2Projects.value[0]!.name).toBe('T2 Project');
    }
  });

  it('should allow same slug across different tenants', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2');
    deps.policyProvider.set('t-2', { maxProjects: 50 });
    const r1 = await createResearchProjectUseCase({ tenantId: 't-1', organizationId: 'org-1', correlationId: 'c1', actorId: 'a', name: 'A', slug: 'shared-slug', industry: 'tech' }, deps);
    const r2 = await createResearchProjectUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c2', actorId: 'a', name: 'B', slug: 'shared-slug', industry: 'tech' }, deps);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it('should isolate knowledge articles across tenants', async () => {
    const deps = makeDeps();
    await createKnowledgeUseCase({ tenantId: 't-1', correlationId: 'c1', actorId: 'a', title: 'T1 Article', slug: 't1-art', category: 'c', content: 'x' }, deps);
    const results = await searchKnowledgeUseCase({ tenantId: 't-2', query: 'Article' }, deps);
    if (results.ok) expect(results.value.results.length).toBe(0);
  });

  it('should isolate research memory across tenants', async () => {
    const deps = makeDeps();
    const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'iso-mem', industry: 'tech' }, deps));
    await updateResearchMemoryUseCase({ tenantId: 't-1', projectId: p.projectId, action: 'test', summary: 'T1 memory' }, deps);
    const t2Mem = await getResearchMemoryUseCase('t-2', p.projectId, deps);
    expect(t2Mem.ok).toBe(false);
  });
});

// ═════════ PROVIDER FAILURE SCENARIOS ═════════
describe('Provider Failure Handling', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  const url = 'https://example.com';
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'prov-fail', industry: 'tech' }, deps)).projectId; });

  it('should handle website audit provider failure gracefully', async () => {
    deps.websiteAuditProvider = { async audit() { return Err(new Error('Provider down')); } };
    const r = await auditWebsiteUseCase({ ...base, projectId, url }, deps);
    expect(r.ok).toBe(false);
  });

  it('should handle competitor provider failure with fallback data', async () => {
    deps.competitorProvider = { async analyze() { return Err(new Error('Provider down')); } };
    const r = await analyzeCompetitorUseCase({ ...base, projectId, name: 'X', url }, deps);
    expect(r.ok).toBe(true);
  });

  it('should handle SEO provider failure with fallback score', async () => {
    deps.seoProvider = { async audit() { return Err(new Error('SEO provider down')); } };
    const r = await auditSEOUseCase({ ...base, projectId, url }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.score).toBeGreaterThan(0);
  });
});

// ═════════ AUDIT DETAIL VERIFICATION ═════════
describe('Audit Detail Verification', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  const url = 'https://example.com';
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'det-p', industry: 'tech' }, deps)).projectId; });

  it('should include confidence in website audit result', async () => {
    unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps));
    const results = await deps.auditResultRepo.findByProject('t-1', projectId);
    const ws = results.find((r) => r.type === 'Website')!;
    expect(ws.confidence).toBeGreaterThan(0);
    expect(ws.confidence).toBeLessThanOrEqual(1);
  });

  it('should include risks array in UX audit', async () => {
    unwrap(await auditUXUseCase({ ...base, projectId, url }, deps));
    const results = await deps.auditResultRepo.findByProject('t-1', projectId);
    const ux = results.find((r) => r.type === 'UX')!;
    expect(Array.isArray(ux.risks)).toBe(true);
  });

  it('should include details breakdown in SEO audit', async () => {
    unwrap(await auditSEOUseCase({ ...base, projectId, url }, deps));
    const results = await deps.auditResultRepo.findByProject('t-1', projectId);
    const seo = results.find((r) => r.type === 'SEO') as { details: Record<string, number> } | undefined;
    expect(seo).toBeDefined();
    expect(seo!.details.metaTags).toBeDefined();
    expect(seo!.details.headings).toBeDefined();
  });

  it('should include violation count in accessibility audit', async () => {
    unwrap(await auditAccessibilityUseCase({ ...base, projectId, url }, deps));
    const results = await deps.auditResultRepo.findByProject('t-1', projectId);
    const a11y = results.find((r) => r.type === 'Accessibility') as { details: { violations: number; criticalCount: number; level: string } } | undefined;
    expect(a11y).toBeDefined();
    expect(a11y!.details.violations).toBeGreaterThanOrEqual(0);
    expect(a11y!.details.criticalCount).toBeGreaterThanOrEqual(0);
  });

  it('should include performance metrics in details', async () => {
    unwrap(await auditPerformanceUseCase({ ...base, projectId, url }, deps));
    const results = await deps.auditResultRepo.findByProject('t-1', projectId);
    const perf = results.find((r) => r.type === 'Performance') as { details: { loadTime: number; fcp: number; lcp: number; cls: number } } | undefined;
    expect(perf).toBeDefined();
    expect(perf!.details.fcp).toBeDefined();
    expect(perf!.details.lcp).toBeDefined();
    expect(perf!.details.cls).toBeDefined();
  });

  it('should include content quality dimensions', async () => {
    unwrap(await auditContentUseCase({ ...base, projectId, url }, deps));
    const results = await deps.auditResultRepo.findByProject('t-1', projectId);
    const content = results.find((r) => r.type === 'Content') as { details: { clarity: number; tone: number; readability: number; ctaStrength: number } } | undefined;
    expect(content).toBeDefined();
    expect(content!.details.clarity).toBeGreaterThan(0);
    expect(content!.details.ctaStrength).toBeGreaterThan(0);
  });

  it('should attach evidence to website audit only', async () => {
    unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps));
    unwrap(await auditUXUseCase({ ...base, correlationId: 'c2', projectId, url }, deps));
    const results = await deps.auditResultRepo.findByProject('t-1', projectId);
    const ws = results.find((r) => r.type === 'Website')!;
    expect(ws.evidence.length).toBeGreaterThan(0);
  });

  it('should update project auditIds on each audit', async () => {
    unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps));
    unwrap(await auditUXUseCase({ ...base, correlationId: 'c2', projectId, url }, deps));
    const p = unwrap(await getResearchProjectUseCase('t-1', projectId, deps));
    expect(p.auditIds.length).toBe(2);
  });
});

// ═════════ PROVIDER PLUGIN ARCHITECTURE ═════════
describe('Provider Plugin Architecture', () => {
  it('should use swappable website audit provider', async () => {
    const deps = makeDeps();
    const projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'plug-p', industry: 'tech' }, deps)).projectId;
    deps.websiteAuditProvider = { async audit(url) { return Ok({ url, title: 'Custom', pages: 5, loadTime: 500, mobile: false, ssl: false }); } };
    const r = await auditWebsiteUseCase({ ...base, projectId, url: 'https://test.com' }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.score).toBeLessThan(50);
  });

  it('should use swappable LLM provider for brief generation', async () => {
    const deps = makeDeps();
    const projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'llm-p', industry: 'tech' }, deps)).projectId;
    unwrap(await conductInterviewUseCase({ ...base, projectId, businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] }, deps));
    deps.llmProvider = {
      async analyze() { return Ok({ analysis: 'custom', confidence: 0.99, insights: ['x'] }); },
      async generateBrief(input) {
        const brief: CreativeBrief = {
          id: 'custom-brief', tenantId: '', projectId: '', goals: ['Custom goal'], audience: 'custom',
          competitors: input.interview.competitors, constraints: [], successMetrics: [], budget: '0', timeline: '0',
          evidence: [], confidence: 0.99, attributes: {}, createdAt: new Date().toISOString(),
        };
        return Ok({ brief, confidence: 0.99 });
      },
    };
    const r = await generateCreativeBriefUseCase({ ...base, projectId }, deps);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.confidence).toBe(0.99);
  });

  it('should use swappable research provider for market data', async () => {
    const deps = makeDeps();
    deps.researchProvider = { async research(query) { return Ok({ query, summary: 'Custom research', keyFindings: ['Finding 1'], sources: [{ title: 'S1', url: 'mock://s1' }] }); } };
    const result = await deps.researchProvider.research('test');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.keyFindings[0]).toBe('Finding 1');
  });
});

// ═════════ EVIDENCE VALIDATION ═════════
describe('Evidence Validation', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'ev-val-p', industry: 'tech' }, deps)).projectId; });

  it('should support all evidence source types', async () => {
    const types: Array<'audit' | 'competitor' | 'market' | 'user' | 'benchmark' | 'interview'> = ['audit', 'competitor', 'market', 'user', 'benchmark', 'interview'];
    for (let i = 0; i < types.length; i++) {
      unwrap(await generateEvidenceUseCase({ ...base, correlationId: `c${i}`, projectId, claim: `Claim ${i}`, source: `src-${i}`, sourceType: types[i]!, data: {}, confidence: 0.8 }, deps));
    }
    const ev = await deps.evidenceRepo.findByProject('t-1', projectId);
    expect(ev.length).toBe(6);
  });

  it('should include claim text in evidence', async () => {
    unwrap(await generateEvidenceUseCase({ ...base, projectId, claim: 'Custom claim text here', source: 's', sourceType: 'market', data: {}, confidence: 0.9 }, deps));
    const ev = await deps.evidenceRepo.findByProject('t-1', projectId);
    expect(ev[0]!.claim).toBe('Custom claim text here');
  });

  it('should store confidence per evidence item', async () => {
    unwrap(await generateEvidenceUseCase({ ...base, projectId, claim: 'A', source: 's', sourceType: 'audit', data: {}, confidence: 0.42 }, deps));
    const ev = await deps.evidenceRepo.findByProject('t-1', projectId);
    expect(ev[0]!.confidence).toBe(0.42);
  });

  it('should update project evidenceIds on new evidence', async () => {
    unwrap(await generateEvidenceUseCase({ ...base, projectId, claim: 'A', source: 's', sourceType: 'audit', data: {}, confidence: 0.9 }, deps));
    unwrap(await generateEvidenceUseCase({ ...base, correlationId: 'c2', projectId, claim: 'B', source: 's', sourceType: 'audit', data: {}, confidence: 0.8 }, deps));
    const p = unwrap(await getResearchProjectUseCase('t-1', projectId, deps));
    expect(p.evidenceIds.length).toBe(2);
  });
});

// ═════════ GAP ANALYSIS DETAILS ═════════
describe('Gap Analysis Details', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  const url = 'https://example.com';
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'gap-det', industry: 'tech' }, deps)).projectId; });

  it('should produce positive gap when audit below benchmark', async () => {
    unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps));
    unwrap(await generateBenchmarkUseCase({ ...base, correlationId: 'c2', projectId, referenceApp: 'Apple' }, deps));
    const r = unwrap(await generateGapAnalysisUseCase({ ...base, projectId }, deps));
    expect(r.gap).toBeGreaterThan(0);
  });

  it('should store gap analysis with per-area breakdown', async () => {
    unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps));
    unwrap(await auditUXUseCase({ ...base, correlationId: 'c2', projectId, url }, deps));
    unwrap(await generateGapAnalysisUseCase({ ...base, projectId }, deps));
    const stored = await deps.gapAnalysisRepo.findByProject('t-1', projectId);
    expect(stored).not.toBeNull();
    expect(stored!.gaps.length).toBe(2);
  });

  it('should include benchmark score in gap analysis', async () => {
    unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps));
    unwrap(await generateBenchmarkUseCase({ ...base, correlationId: 'c2', projectId, referenceApp: 'Stripe' }, deps));
    unwrap(await generateGapAnalysisUseCase({ ...base, projectId }, deps));
    const stored = await deps.gapAnalysisRepo.findByProject('t-1', projectId);
    expect(stored!.benchmarkScore).toBeGreaterThan(0);
  });

  it('should generate recommendations from gaps', async () => {
    unwrap(await auditWebsiteUseCase({ ...base, projectId, url }, deps));
    unwrap(await generateBenchmarkUseCase({ ...base, correlationId: 'c2', projectId, referenceApp: 'Apple' }, deps));
    unwrap(await generateGapAnalysisUseCase({ ...base, projectId }, deps));
    const stored = await deps.gapAnalysisRepo.findByProject('t-1', projectId);
    expect(stored!.recommendations.length).toBeGreaterThan(0);
  });
});

// ═════════ KNOWLEDGE MANAGEMENT ADVANCED ═════════
describe('Knowledge Management Advanced', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should respect search limit', async () => {
    for (let i = 0; i < 5; i++) {
      await createKnowledgeUseCase({ ...base, correlationId: `c${i}`, title: `Article ${i}`, slug: `art-${i}`, category: 'design', content: 'design patterns' }, deps);
    }
    const r = await searchKnowledgeUseCase({ tenantId: 't-1', query: 'design', limit: 3 }, deps);
    if (r.ok) expect(r.value.results.length).toBe(3);
  });

  it('should search by tags', async () => {
    await createKnowledgeUseCase({ ...base, title: 'Grid Systems', slug: 'grid', category: 'design', content: 'grid content', tags: ['grid', 'layout'] }, deps);
    const r = await searchKnowledgeUseCase({ tenantId: 't-1', query: 'layout' }, deps);
    if (r.ok) expect(r.value.results.length).toBe(1);
  });

  it('should include sources in knowledge articles', async () => {
    unwrap(await createKnowledgeUseCase({ ...base, title: 'With Sources', slug: 'wsrc', category: 'c', content: 'x', sources: [{ title: 'Apple', url: 'mock://apple' }, { title: 'Stripe', url: 'mock://stripe' }] }, deps));
    const r = await searchKnowledgeUseCase({ tenantId: 't-1', query: 'Sources' }, deps);
    if (r.ok) expect(r.value.results[0]!.sources.length).toBe(2);
  });

  it('should include confidence in knowledge articles', async () => {
    unwrap(await createKnowledgeUseCase({ ...base, title: 'Confident', slug: 'conf', category: 'c', content: 'x', confidence: 0.95 }, deps));
    const r = await searchKnowledgeUseCase({ tenantId: 't-1', query: 'Confident' }, deps);
    if (r.ok) expect(r.value.results[0]!.confidence).toBe(0.95);
  });

  it('should return empty results for no match', async () => {
    await createKnowledgeUseCase({ ...base, title: 'Known', slug: 'known', category: 'c', content: 'x' }, deps);
    const r = await searchKnowledgeUseCase({ tenantId: 't-1', query: 'nonexistent' }, deps);
    if (r.ok) expect(r.value.results.length).toBe(0);
  });
});

// ═════════ AUDIT LOG VERIFICATION ═════════
describe('Audit Log Verification', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'alog-p', industry: 'tech' }, deps)).projectId; });

  it('should record audit log on project creation', async () => {
    const logs = await deps.auditRepo.findByTenant('t-1');
    expect(logs.some((l) => l.eventType === 'research_created')).toBe(true);
  });

  it('should record audit log on interview', async () => {
    await conductInterviewUseCase({ ...base, projectId, businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] }, deps);
    const logs = await deps.auditRepo.findByProject('t-1', projectId);
    expect(logs.some((l) => l.eventType === 'interview_completed')).toBe(true);
  });

  it('should record audit log on evidence generation', async () => {
    await generateEvidenceUseCase({ ...base, projectId, claim: 'C', source: 's', sourceType: 'audit', data: {}, confidence: 0.9 }, deps);
    const logs = await deps.auditRepo.findByProject('t-1', projectId);
    expect(logs.some((l) => l.eventType === 'evidence_generated')).toBe(true);
  });

  it('should record audit log on recommendation generation', async () => {
    await generateRecommendationsUseCase({ ...base, projectId }, deps);
    const logs = await deps.auditRepo.findByProject('t-1', projectId);
    expect(logs.some((l) => l.eventType === 'recommendation_generated')).toBe(true);
  });
});

// ═════════ INDUSTRY AGNOSTIC ═════════
describe('Industry Agnostic', () => {
  it('should support restaurant industry', async () => {
    const deps = makeDeps();
    const r = await createResearchProjectUseCase({ ...base, name: 'R', slug: 'restaurant', industry: 'restaurant' }, deps);
    expect(r.ok).toBe(true);
  });

  it('should support travel industry', async () => {
    const deps = makeDeps();
    const r = await createResearchProjectUseCase({ ...base, name: 'T', slug: 'travel', industry: 'travel' }, deps);
    expect(r.ok).toBe(true);
  });

  it('should support fintech industry', async () => {
    const deps = makeDeps();
    const r = await createResearchProjectUseCase({ ...base, name: 'F', slug: 'fintech', industry: 'fintech' }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═════════ CONSTRAINT & VALIDATION EDGE CASES ═════════
describe('Constraint Validation', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should reject empty name', async () => {
    const r = await createResearchProjectUseCase({ ...base, name: '', slug: 'x', industry: 'tech' }, deps);
    expect(r.ok).toBe(false);
  });

  it('should reject empty industry', async () => {
    const r = await createResearchProjectUseCase({ ...base, name: 'P', slug: 'x', industry: '' }, deps);
    expect(r.ok).toBe(false);
  });

  it('should reject name over 200 chars', async () => {
    const r = await createResearchProjectUseCase({ ...base, name: 'A'.repeat(201), slug: 'x', industry: 'tech' }, deps);
    expect(r.ok).toBe(false);
  });

  it('should reject invalid evidence confidence > 1', async () => {
    const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'conf-p', industry: 'tech' }, deps));
    const r = await generateEvidenceUseCase({ ...base, projectId: p.projectId, claim: 'c', source: 's', sourceType: 'audit', data: {}, confidence: 1.5 }, deps);
    expect(r.ok).toBe(false);
  });

  it('should reject invalid evidence confidence < 0', async () => {
    const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'P', slug: 'conf-n', industry: 'tech' }, deps));
    const r = await generateEvidenceUseCase({ ...base, projectId: p.projectId, claim: 'c', source: 's', sourceType: 'audit', data: {}, confidence: -0.5 }, deps);
    expect(r.ok).toBe(false);
  });

  it('should respect max projects policy', async () => {
    deps.policyProvider.set('t-1', { maxProjects: 1 });
    unwrap(await createResearchProjectUseCase({ ...base, name: 'A', slug: 'max-1', industry: 'tech' }, deps));
    const r = await createResearchProjectUseCase({ ...base, correlationId: 'c2', name: 'B', slug: 'max-2', industry: 'tech' }, deps);
    expect(r.ok).toBe(false);
  });
});

// ═════════ FULL PIPELINE ═════════
describe('Full Research Pipeline', () => {
  it('should complete full research workflow', async () => {
    const deps = makeDeps();
    const url = 'https://acme-restaurant.com';

    // 1. Create Research Project
    const p = unwrap(await createResearchProjectUseCase({ ...base, name: 'Acme Restaurant Research', slug: 'acme-full', industry: 'restaurant' }, deps));

    // 2. Conduct Interview
    unwrap(await conductInterviewUseCase({ ...base, projectId: p.projectId, businessGoal: 'Increase online orders 50%', targetAudience: 'Food enthusiasts 25-45', targetRegion: 'New York', competitors: ['DoorDash', 'Uber Eats'], brandPersonality: 'Premium yet approachable', preferredStyle: 'Modern', dislikedStyle: 'Generic templates', businessModel: 'Direct-to-consumer', revenueModel: 'Per-order commission', budget: '$30K', timeline: '6 weeks', successMetrics: ['50% order increase', '4.5 star UX rating'] }, deps));

    // 3. Update Business Profile
    unwrap(await updateBusinessProfileUseCase({ ...base, projectId: p.projectId, companyName: 'Acme Restaurant', industry: 'restaurant', description: 'Farm-to-table dining experience', targetMarket: 'Urban professionals', competitiveAdvantage: 'Unique seasonal menu', revenueModel: 'Direct sales', maturity: 'Established' }, deps));

    // 4. Run All Audits
    unwrap(await auditWebsiteUseCase({ ...base, projectId: p.projectId, url }, deps));
    unwrap(await auditUXUseCase({ ...base, correlationId: 'c2', projectId: p.projectId, url }, deps));
    unwrap(await auditSEOUseCase({ ...base, correlationId: 'c3', projectId: p.projectId, url }, deps));
    unwrap(await auditAccessibilityUseCase({ ...base, correlationId: 'c4', projectId: p.projectId, url }, deps));
    unwrap(await auditPerformanceUseCase({ ...base, correlationId: 'c5', projectId: p.projectId, url }, deps));
    unwrap(await auditContentUseCase({ ...base, correlationId: 'c6', projectId: p.projectId, url }, deps));

    // 5. Analyze Competitors
    unwrap(await analyzeCompetitorUseCase({ ...base, correlationId: 'c7', projectId: p.projectId, name: 'Competitor A', url: 'https://competitor-a.com' }, deps));

    // 6. Extract Patterns
    unwrap(await extractVisualPatternsUseCase({ ...base, correlationId: 'c8', projectId: p.projectId }, deps));

    // 7. Generate Benchmark
    unwrap(await generateBenchmarkUseCase({ ...base, correlationId: 'c9', projectId: p.projectId, referenceApp: 'Airbnb' }, deps));

    // 8. Generate Gap Analysis
    const gap = unwrap(await generateGapAnalysisUseCase({ ...base, correlationId: 'c10', projectId: p.projectId }, deps));
    expect(gap.gap).toBeGreaterThan(0);

    // 9. Generate Recommendations
    const recs = unwrap(await generateRecommendationsUseCase({ ...base, correlationId: 'c11', projectId: p.projectId }, deps));
    expect(recs.recommendations.length).toBeGreaterThan(0);
    expect(recs.evidenceBacked).toBe(true);

    // 10. Generate Creative Brief
    const brief = unwrap(await generateCreativeBriefUseCase({ ...base, correlationId: 'c12', projectId: p.projectId }, deps));
    expect(brief.confidence).toBeGreaterThan(0);

    // 11. Complete Research
    unwrap(await completeResearchUseCase({ ...base, correlationId: 'c13', projectId: p.projectId }, deps));

    // 12. Verify Research Memory
    const mem = unwrap(await getResearchMemoryUseCase('t-1', p.projectId, deps));
    expect(mem.history.length).toBeGreaterThan(5);

    // 13. Verify Evidence
    const conf = unwrap(await calculateConfidenceUseCase({ tenantId: 't-1', projectId: p.projectId }, deps));
    expect(conf.evidenceCount).toBeGreaterThan(0);
  });
});
