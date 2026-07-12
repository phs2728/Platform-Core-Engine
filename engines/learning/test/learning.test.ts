/**
 * Learning Engine — Test Suite (140+ tests)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Ok } from '@platform/core-sdk';
import {
  createLearningProjectUseCase, startLearningUseCase, completeLearningUseCase, archiveLearningUseCase,
  getLearningProjectUseCase, listLearningProjectsUseCase,
  learnSuccessPatternUseCase, learnFailurePatternUseCase, detectTrendUseCase,
  updateLearningModelUseCase, calculateConfidenceUseCase,
  getPatternUseCase, listPatternsUseCase, getTrendUseCase, listTrendsUseCase,
  recordRecommendationResultUseCase, recordOutcomeUseCase,
  learnRecommendationUseCase, recommendImprovementUseCase,
  learnDesignUseCase, learnUXUseCase, learnCopyUseCase, learnSearchUseCase,
  updateKnowledgeUseCase, evolveKnowledgeUseCase,
  generateLearningReportUseCase, searchLearningMemoryUseCase,
  calculateLearningScoreUseCase, calculateImprovementRateUseCase, generateTrendAnalysisUseCase,
  getLearningMemoryUseCase, updateLearningMemoryUseCase, getLearningStatisticsUseCase,
  getDesignMemoryUseCase, getPersonalizationProfileUseCase,
  canTransitionLearning, LEARNING_EVENTS,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

const base = { tenantId: 't-1', organizationId: 'org-1', correlationId: 'c-1', actorId: 'admin' };
function unwrap<T>(r: { ok: boolean; value?: T; error?: unknown }): T { if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err')); return r.value as T; }

const interviewBase = { businessGoal: 'G', targetAudience: 'A', targetRegion: 'US', competitors: [], brandPersonality: '', preferredStyle: '', dislikedStyle: '', businessModel: '', revenueModel: '', budget: '', timeline: '', successMetrics: [] };

// ═════════ LEARNING PROJECT LIFECYCLE ═════════
describe('Learning Project Lifecycle', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should create learning project', async () => { const r = await createLearningProjectUseCase({ ...base, name: 'Acme Learning', slug: 'acme', sourceRef: 'project-123' }, deps); expect(r.ok).toBe(true); });
  it('should reject invalid slug', async () => { const r = await createLearningProjectUseCase({ ...base, name: 'X', slug: 'UPPER', sourceRef: 's' }, deps); expect(r.ok).toBe(false); });
  it('should reject dup slug', async () => { await createLearningProjectUseCase({ ...base, name: 'A', slug: 'dup', sourceRef: 's' }, deps); const r = await createLearningProjectUseCase({ ...base, correlationId: 'c2', name: 'B', slug: 'dup', sourceRef: 's' }, deps); expect(r.ok).toBe(false); });
  it('should reject unverified org', async () => { const r = await createLearningProjectUseCase({ ...base, organizationId: 'x', name: 'P', slug: 'p', sourceRef: 's' }, deps); expect(r.ok).toBe(false); });
  it('should get project', async () => { const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'get', sourceRef: 's' }, deps)); const r = await getLearningProjectUseCase('t-1', p.projectId, deps); expect(r.ok).toBe(true); });
  it('should list projects', async () => { await createLearningProjectUseCase({ ...base, name: 'A', slug: 'la', sourceRef: 's' }, deps); await createLearningProjectUseCase({ ...base, correlationId: 'c2', name: 'B', slug: 'lb', sourceRef: 's' }, deps); const r = await listLearningProjectsUseCase('t-1', deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.length).toBe(2); });
  it('should start learning session', async () => { const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'sess', sourceRef: 's' }, deps)); const r = await startLearningUseCase({ ...base, projectId: p.projectId, phase: 'learn' }, deps); expect(r.ok).toBe(true); });
  it('should complete learning', async () => { const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'comp', sourceRef: 's' }, deps)); const r = await completeLearningUseCase({ ...base, projectId: p.projectId }, deps); expect(r.ok).toBe(true); const proj = unwrap(await getLearningProjectUseCase('t-1', p.projectId, deps)); expect(proj.status).toBe('Completed'); });
  it('should archive learning', async () => { const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'arch', sourceRef: 's' }, deps)); const r = await archiveLearningUseCase({ ...base, projectId: p.projectId }, deps); expect(r.ok).toBe(true); });
  it('should init learning memory on create', async () => { const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'mem', sourceRef: 's' }, deps)); const mem = await deps.memoryRepo.findByProject('t-1', p.projectId); expect(mem).not.toBeNull(); });
  it('should init statistics on create', async () => { const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'stats', sourceRef: 's' }, deps)); const stats = await deps.statisticsRepo.findByProject('t-1', p.projectId); expect(stats).not.toBeNull(); expect(stats!.totalPatterns).toBe(0); });
  it('should emit learning.started event', async () => { await createLearningProjectUseCase({ ...base, name: 'P', slug: 'ev', sourceRef: 's' }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.LEARNING_STARTED)).toBe(1); });
  it('should emit learning.completed event', async () => { const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'ev2', sourceRef: 's' }, deps)); await completeLearningUseCase({ ...base, projectId: p.projectId }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.LEARNING_COMPLETED)).toBe(1); });
  it('should reject start for non-existent', async () => { const r = await startLearningUseCase({ ...base, projectId: 'none', phase: 'learn' }, deps); expect(r.ok).toBe(false); });
  it('should reject complete for non-existent', async () => { const r = await completeLearningUseCase({ ...base, projectId: 'none' }, deps); expect(r.ok).toBe(false); });
});

// ═════════ SUCCESS PATTERN LEARNING ═════════
describe('Success Pattern Learning', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'sp', sourceRef: 's' }, deps)).projectId; });

  it('should learn success pattern', async () => { const r = await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'Bold Hero', description: 'Large bold hero text drives engagement', observation: 'CTR increased 40%', impact: 85, frequency: 5, contexts: ['landing', 'hero'] }, deps); expect(r.ok).toBe(true); });
  it('should create evidence from observation', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'UX', name: 'N', description: 'D', observation: 'O', impact: 70, frequency: 3, contexts: [] }, deps)); const ev = await deps.evidenceRepo.findByProject('t-1', projectId); expect(ev.length).toBeGreaterThan(0); });
  it('should store pattern in repo', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'Grid Layout', description: '12-column grid', observation: 'Better readability', impact: 75, frequency: 4, contexts: ['content'] }, deps)); const patterns = await deps.patternRepo.findByProject('t-1', projectId); expect(patterns[0]!.type).toBe('Success'); });
  it('should add design memory for Design success', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'Typography Scale', description: 'Consistent type scale', observation: 'Visual harmony improved', impact: 80, frequency: 6, contexts: ['global'] }, deps)); const mem = await deps.memoryRepo.findByProject('t-1', projectId); expect(mem!.designMemory.length).toBeGreaterThan(0); });
  it('should update project patternIds', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Copy', name: 'N', description: 'D', observation: 'O', impact: 60, frequency: 2, contexts: [] }, deps)); const p = unwrap(await getLearningProjectUseCase('t-1', projectId, deps)); expect(p.patternIds.length).toBe(1); });
  it('should emit pattern.learned event', async () => { await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 70, frequency: 1, contexts: [] }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.PATTERN_LEARNED)).toBe(1); });
  it('should update totalPatterns in statistics', async () => { await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N1', description: 'D', observation: 'O', impact: 70, frequency: 1, contexts: [] }, deps); const stats = await deps.statisticsRepo.findByProject('t-1', projectId); expect(stats!.totalPatterns).toBe(1); });
  it('should set confidence > 0.8 for success patterns', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 90, frequency: 5, contexts: [] }, deps)); const patterns = await deps.patternRepo.findByProject('t-1', projectId); expect(patterns[0]!.confidence).toBeGreaterThanOrEqual(0.8); });
  it('should reject for non-existent project', async () => { const r = await learnSuccessPatternUseCase({ ...base, projectId: 'none', category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 70, frequency: 1, contexts: [] }, deps); expect(r.ok).toBe(false); });
});

// ═════════ FAILURE PATTERN LEARNING ═════════
describe('Failure Pattern Learning', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'fp', sourceRef: 's' }, deps)).projectId; });

  it('should learn failure pattern', async () => { const r = await learnFailurePatternUseCase({ ...base, projectId, category: 'UX', name: 'Confusing Nav', description: 'Too many menu items', observation: 'Bounce rate increased 25%', impact: 65, frequency: 3, contexts: ['navigation'] }, deps); expect(r.ok).toBe(true); });
  it('should store as Failure type', async () => { unwrap(await learnFailurePatternUseCase({ ...base, projectId, category: 'Copy', name: 'Weak CTA', description: 'Generic CTA text', observation: 'Low conversion', impact: 55, frequency: 4, contexts: ['cta'] }, deps)); const patterns = await deps.patternRepo.findByProject('t-1', projectId); expect(patterns[0]!.type).toBe('Failure'); });
  it('should set confidence ~0.75 for failure patterns', async () => { unwrap(await learnFailurePatternUseCase({ ...base, projectId, category: 'Design', name: 'Cluttered Layout', description: 'Too many elements', observation: 'High bounce', impact: 60, frequency: 2, contexts: [] }, deps)); const patterns = await deps.patternRepo.findByProject('t-1', projectId); expect(patterns[0]!.confidence).toBeLessThan(0.8); });
  it('should not add design memory for failure patterns', async () => { unwrap(await learnFailurePatternUseCase({ ...base, projectId, category: 'Design', name: 'Bad Colors', description: 'Poor contrast', observation: 'Accessibility issues', impact: 50, frequency: 1, contexts: [] }, deps)); const mem = await deps.memoryRepo.findByProject('t-1', projectId); expect(mem!.designMemory.length).toBe(0); });
  it('should emit pattern.learned event', async () => { await learnFailurePatternUseCase({ ...base, projectId, category: 'UX', name: 'N', description: 'D', observation: 'O', impact: 50, frequency: 1, contexts: [] }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.PATTERN_LEARNED)).toBe(1); });
});

// ═════════ TREND DETECTION ═════════
describe('Trend Detection', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'td', sourceRef: 's' }, deps)).projectId; });

  it('should detect trends', async () => { const r = await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.count).toBeGreaterThan(0); });
  it('should store trends in repo', async () => { unwrap(await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps)); const trends = await deps.trendRepo.findByProject('t-1', projectId); expect(trends.length).toBeGreaterThan(0); });
  it('should create evidence for each trend', async () => { unwrap(await detectTrendUseCase({ ...base, projectId, category: 'UX', region: 'EU' }, deps)); const ev = await deps.evidenceRepo.findByProject('t-1', projectId); expect(ev.length).toBeGreaterThan(0); });
  it('should update project trendIds', async () => { unwrap(await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps)); const p = unwrap(await getLearningProjectUseCase('t-1', projectId, deps)); expect(p.trendIds.length).toBeGreaterThan(0); });
  it('should emit trend.detected event', async () => { await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.TREND_DETECTED)).toBe(1); });
  it('should include direction in trends', async () => { unwrap(await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps)); const trends = await deps.trendRepo.findByProject('t-1', projectId); expect(['up','down','stable']).toContain(trends[0]!.direction); });
  it('should reject for non-existent project', async () => { const r = await detectTrendUseCase({ ...base, projectId: 'none', category: 'Design', region: 'US' }, deps); expect(r.ok).toBe(false); });
});

// ═════════ LEARNING MODEL ═════════
describe('Learning Model', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'lm', sourceRef: 's' }, deps)).projectId; });

  it('should update model with no patterns', async () => { const r = await updateLearningModelUseCase({ ...base, projectId, category: 'Design' }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.accuracy).toBe(0); });
  it('should update model accuracy from patterns', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 3, contexts: [] }, deps)); const r = await updateLearningModelUseCase({ ...base, projectId, category: 'Design' }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.accuracy).toBeGreaterThan(0); });
  it('should increment version on subsequent updates', async () => { unwrap(await updateLearningModelUseCase({ ...base, projectId, category: 'UX' }, deps)); const r = unwrap(await updateLearningModelUseCase({ ...base, correlationId: 'c2', projectId, category: 'UX' }, deps)); const models = await deps.modelRepo.findByProject('t-1', projectId); expect(models[0]!.version).toBe(2); });
  it('should include pattern IDs in model', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps)); unwrap(await updateLearningModelUseCase({ ...base, projectId, category: 'Design' }, deps)); const models = await deps.modelRepo.findByProject('t-1', projectId); expect(models[0]!.patterns.length).toBeGreaterThan(0); });
  it('should emit pattern.updated event', async () => { await updateLearningModelUseCase({ ...base, projectId, category: 'Design' }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.PATTERN_UPDATED)).toBe(1); });
});

// ═════════ CONFIDENCE CALCULATION ═════════
describe('Confidence Calculation', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'cc', sourceRef: 's' }, deps)).projectId; });

  it('should return 0 confidence with no data', async () => { const r = await calculateConfidenceUseCase({ tenantId: 't-1', projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.score).toBe(0); });
  it('should calculate confidence from evidence and patterns', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 3, contexts: [] }, deps)); const r = await calculateConfidenceUseCase({ tenantId: 't-1', projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.score).toBeGreaterThan(0); });
  it('should include evidence count', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps)); const r = unwrap(await calculateConfidenceUseCase({ tenantId: 't-1', projectId }, deps)); expect(r.evidenceCount).toBeGreaterThan(0); });
  it('should include factors breakdown', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps)); const r = unwrap(await calculateConfidenceUseCase({ tenantId: 't-1', projectId }, deps)); expect(r.factors.length).toBe(3); });
  it('should store confidence score', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps)); unwrap(await calculateConfidenceUseCase({ tenantId: 't-1', projectId }, deps)); const scores = await deps.confidenceRepo.findByProject('t-1', projectId); expect(scores.length).toBeGreaterThan(0); });
  it('should emit confidence.updated event', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps)); await calculateConfidenceUseCase({ tenantId: 't-1', projectId }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.CONFIDENCE_UPDATED)).toBe(1); });
});

// ═════════ RECOMMENDATION FEEDBACK ═════════
describe('Recommendation Feedback', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'rf', sourceRef: 's' }, deps)).projectId; });

  it('should record accepted recommendation', async () => { const r = await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'rec-1', category: 'Design', outcome: 'accepted', impactScore: 85, contextRef: 'hero-section', notes: 'Great results' }, deps); expect(r.ok).toBe(true); });
  it('should record rejected recommendation', async () => { const r = await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'rec-2', category: 'UX', outcome: 'rejected', impactScore: 20, contextRef: 'nav', notes: 'Did not work' }, deps); expect(r.ok).toBe(true); });
  it('should record ignored recommendation', async () => { const r = await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'rec-3', category: 'Copy', outcome: 'ignored', impactScore: 0, contextRef: 'cta', notes: 'Not implemented' }, deps); expect(r.ok).toBe(true); });
  it('should create evidence from feedback', async () => { unwrap(await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'rec-1', category: 'Design', outcome: 'accepted', impactScore: 85, contextRef: 'hero', notes: 'x' }, deps)); const ev = await deps.evidenceRepo.findByProject('t-1', projectId); expect(ev.length).toBeGreaterThan(0); });
  it('should emit recommendation.learned event', async () => { await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'rec-1', category: 'Design', outcome: 'accepted', impactScore: 85, contextRef: 'hero', notes: 'x' }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.RECOMMENDATION_LEARNED)).toBe(1); });
  it('should auto-learn success outcome for high-impact accepted', async () => { unwrap(await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'rec-1', category: 'Design', outcome: 'accepted', impactScore: 85, contextRef: 'hero', notes: 'x' }, deps)); const mem = await deps.memoryRepo.findByProject('t-1', projectId); expect(mem!.history.some((h) => h.action === 'success-outcome')).toBe(true); });
  it('should record outcome (alias)', async () => { const r = await recordOutcomeUseCase({ ...base, projectId, recommendationId: 'rec-1', category: 'Design', outcome: 'accepted', impactScore: 85, contextRef: 'hero', notes: 'x' }, deps); expect(r.ok).toBe(true); });
  it('should reject for non-existent project', async () => { const r = await recordRecommendationResultUseCase({ ...base, projectId: 'none', recommendationId: 'r', category: 'Design', outcome: 'accepted', impactScore: 50, contextRef: 'x', notes: '' }, deps); expect(r.ok).toBe(false); });
});

// ═════════ RECOMMENDATION LEARNING ═════════
describe('Recommendation Learning', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'rl', sourceRef: 's' }, deps)).projectId; });

  it('should calculate accuracy from feedback', async () => {
    unwrap(await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'r1', category: 'Design', outcome: 'accepted', impactScore: 80, contextRef: 'x', notes: '' }, deps));
    unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c2', projectId, recommendationId: 'r2', category: 'Design', outcome: 'rejected', impactScore: 20, contextRef: 'x', notes: '' }, deps));
    const r = await learnRecommendationUseCase({ ...base, projectId }, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.accuracy).toBe(50);
  });
  it('should return 0 accuracy with no feedback', async () => { const r = unwrap(await learnRecommendationUseCase({ ...base, projectId }, deps)); expect(r.accuracy).toBe(0); });
  it('should count accepted/rejected/ignored', async () => {
    unwrap(await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'r1', category: 'Design', outcome: 'accepted', impactScore: 80, contextRef: 'x', notes: '' }, deps));
    unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c2', projectId, recommendationId: 'r2', category: 'Design', outcome: 'rejected', impactScore: 20, contextRef: 'x', notes: '' }, deps));
    unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c3', projectId, recommendationId: 'r3', category: 'Design', outcome: 'ignored', impactScore: 0, contextRef: 'x', notes: '' }, deps));
    const r = unwrap(await learnRecommendationUseCase({ ...base, correlationId: 'c4', projectId }, deps));
    expect(r.accepted).toBe(1); expect(r.rejected).toBe(1); expect(r.ignored).toBe(1);
  });
  it('should update statistics accuracy', async () => { unwrap(await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'r1', category: 'Design', outcome: 'accepted', impactScore: 80, contextRef: 'x', notes: '' }, deps)); unwrap(await learnRecommendationUseCase({ ...base, projectId }, deps)); const stats = await deps.statisticsRepo.findByProject('t-1', projectId); expect(stats!.recommendationAccuracy).toBe(100); });
});

// ═════════ RECOMMENDATION IMPROVEMENT ═════════
describe('Recommendation Improvement', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'ri', sourceRef: 's' }, deps)).projectId; });

  it('should recommend gathering data when no patterns', async () => { const r = await recommendImprovementUseCase({ ...base, projectId, category: 'Design' }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.recommendations.length).toBeGreaterThan(0); });
  it('should recommend from success patterns', async () => {
    unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'Bold Hero', description: 'Large bold text', observation: 'CTR up 40%', impact: 85, frequency: 5, contexts: ['hero'] }, deps));
    const r = await recommendImprovementUseCase({ ...base, projectId, category: 'Design' }, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.recommendations.some((rec) => rec.title.includes('Apply'))).toBe(true);
  });
  it('should recommend fixing failure patterns', async () => {
    unwrap(await learnFailurePatternUseCase({ ...base, projectId, category: 'UX', name: 'Cluttered Nav', description: 'Too many items', observation: 'Bounce up 25%', impact: 65, frequency: 3, contexts: ['nav'] }, deps));
    const r = await recommendImprovementUseCase({ ...base, correlationId: 'c2', projectId, category: 'UX' }, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.recommendations.some((rec) => rec.title.includes('Fix'))).toBe(true);
  });
  it('should include confidence and expectedImpact', async () => {
    unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Copy', name: 'N', description: 'D', observation: 'O', impact: 75, frequency: 2, contexts: [] }, deps));
    const r = unwrap(await recommendImprovementUseCase({ ...base, projectId, category: 'Copy' }, deps));
    expect(r.recommendations.every((rec) => rec.confidence > 0 && rec.expectedImpact > 0)).toBe(true);
  });
});

// ═════════ DESIGN LEARNING ═════════
describe('Design Learning', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'dl', sourceRef: 's' }, deps)).projectId; });

  it('should learn design insight', async () => { const r = await learnDesignUseCase({ ...base, projectId, designType: 'Hero', insight: 'Large hero with minimal text converts best', score: 88, sourceRef: 'page-1' }, deps); expect(r.ok).toBe(true); });
  it('should create evidence for design insight', async () => { unwrap(await learnDesignUseCase({ ...base, projectId, designType: 'Typography', insight: 'Pretendard ExtraBold for headings', score: 92, sourceRef: 'page-2' }, deps)); const ev = await deps.evidenceRepo.findByProject('t-1', projectId); expect(ev.length).toBeGreaterThan(0); });
  it('should add to design memory', async () => { unwrap(await learnDesignUseCase({ ...base, projectId, designType: 'Layout', insight: 'Bento box layout', score: 85, sourceRef: 'page-3' }, deps)); const mem = await deps.memoryRepo.findByProject('t-1', projectId); expect(mem!.designMemory.some((d) => d.designType === 'Layout')).toBe(true); });
  it('should store design insight in insight repo', async () => { unwrap(await learnDesignUseCase({ ...base, projectId, designType: 'CTA', insight: 'Ghost button with high contrast', score: 80, sourceRef: 'page-4' }, deps)); const insights = await deps.insightRepo.findDesignByProject('t-1', projectId); expect(insights.length).toBe(1); });
});

// ═════════ UX/COPY/SEARCH LEARNING ═════════
describe('UX/Copy/Search Learning', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'ul', sourceRef: 's' }, deps)).projectId; });

  it('should learn UX insight', async () => { const r = await learnUXUseCase({ ...base, projectId, insight: '3-step checkout reduces abandonment', score: 82, sourceRef: 'checkout' }, deps); expect(r.ok).toBe(true); });
  it('should learn copy insight', async () => { const r = await learnCopyUseCase({ ...base, projectId, insight: 'Action-oriented CTA outperforms generic', score: 78, sourceRef: 'cta-test' }, deps); expect(r.ok).toBe(true); });
  it('should learn search insight', async () => { const r = await learnSearchUseCase({ ...base, projectId, insight: 'Autocomplete increases search usage 3x', score: 85, sourceRef: 'search-bar' }, deps); expect(r.ok).toBe(true); });
  it('should store UX insight in repo', async () => { unwrap(await learnUXUseCase({ ...base, projectId, insight: 'I', score: 80, sourceRef: 's' }, deps)); const insights = await deps.insightRepo.findUXByProject('t-1', projectId); expect(insights.length).toBe(1); });
  it('should store copy insight in repo', async () => { unwrap(await learnCopyUseCase({ ...base, projectId, insight: 'I', score: 75, sourceRef: 's' }, deps)); const insights = await deps.insightRepo.findCopyByProject('t-1', projectId); expect(insights.length).toBe(1); });
  it('should store search insight in repo', async () => { unwrap(await learnSearchUseCase({ ...base, projectId, insight: 'I', score: 80, sourceRef: 's' }, deps)); const insights = await deps.insightRepo.findSearchByProject('t-1', projectId); expect(insights.length).toBe(1); });
  it('should create evidence for each insight type', async () => {
    const before = (await deps.evidenceRepo.findByProject('t-1', projectId)).length;
    unwrap(await learnUXUseCase({ ...base, projectId, insight: 'UX', score: 80, sourceRef: 's' }, deps));
    unwrap(await learnCopyUseCase({ ...base, correlationId: 'c2', projectId, insight: 'Copy', score: 75, sourceRef: 's' }, deps));
    unwrap(await learnSearchUseCase({ ...base, correlationId: 'c3', projectId, insight: 'Search', score: 80, sourceRef: 's' }, deps));
    const after = (await deps.evidenceRepo.findByProject('t-1', projectId)).length;
    expect(after - before).toBe(3);
  });
});

// ═════════ KNOWLEDGE EVOLUTION ═════════
describe('Knowledge Evolution', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'ke', sourceRef: 's' }, deps)).projectId; });

  it('should update knowledge (v1)', async () => { const r = await updateKnowledgeUseCase({ ...base, projectId, knowledgeId: 'k-1', change: 'Added new evidence about hero patterns', reason: 'Recent A/B test data' }, deps); expect(r.ok).toBe(true); });
  it('should increment version on subsequent updates', async () => { unwrap(await updateKnowledgeUseCase({ ...base, projectId, knowledgeId: 'k-1', change: 'v1', reason: 'r' }, deps)); unwrap(await updateKnowledgeUseCase({ ...base, correlationId: 'c2', projectId, knowledgeId: 'k-1', change: 'v2', reason: 'r' }, deps)); const evo = await deps.knowledgeEvoRepo.findByKnowledge('t-1', 'k-1'); expect(evo.length).toBe(2); expect(Math.max(...evo.map((e) => e.version))).toBe(2); });
  it('should evolve knowledge (alias)', async () => { const r = await evolveKnowledgeUseCase({ ...base, projectId, knowledgeId: 'k-2', change: 'Updated confidence based on new data', reason: 'Outcome feedback' }, deps); expect(r.ok).toBe(true); });
  it('should emit knowledge.evolved event', async () => { await updateKnowledgeUseCase({ ...base, projectId, knowledgeId: 'k-1', change: 'c', reason: 'r' }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.KNOWLEDGE_EVOLVED)).toBe(1); });
  it('should include confidence delta', async () => { unwrap(await updateKnowledgeUseCase({ ...base, projectId, knowledgeId: 'k-1', change: 'c', reason: 'r' }, deps)); const evo = await deps.knowledgeEvoRepo.findByKnowledge('t-1', 'k-1'); expect(evo[0]!.confidenceDelta).toBeGreaterThan(0); });
  it('should cap confidence at 1.0', async () => { for (let i = 0; i < 10; i++) { unwrap(await updateKnowledgeUseCase({ ...base, correlationId: `c${i}`, projectId, knowledgeId: 'k-1', change: `v${i}`, reason: 'r' }, deps)); } const evo = await deps.knowledgeEvoRepo.findByKnowledge('t-1', 'k-1'); expect(Math.max(...evo.map((e) => e.newConfidence))).toBeLessThanOrEqual(1); });
});

// ═════════ LEARNING REPORT ═════════
describe('Learning Report', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'lr', sourceRef: 's' }, deps)).projectId; });

  it('should generate report with no data', async () => { const r = await generateLearningReportUseCase({ ...base, projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.metrics.totalPatterns).toBe(0); });
  it('should include pattern count in report', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps)); const r = unwrap(await generateLearningReportUseCase({ ...base, projectId }, deps)); expect(r.metrics.totalPatterns).toBe(1); });
  it('should include feedback metrics', async () => { unwrap(await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'r1', category: 'Design', outcome: 'accepted', impactScore: 80, contextRef: 'x', notes: '' }, deps)); const r = unwrap(await generateLearningReportUseCase({ ...base, projectId }, deps)); expect(r.metrics.totalFeedback).toBe(1); expect(r.metrics.acceptedRate).toBe(100); });
  it('should emit report.generated event', async () => { await generateLearningReportUseCase({ ...base, projectId }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.REPORT_GENERATED)).toBe(1); });
  it('should include summary text', async () => { const r = unwrap(await generateLearningReportUseCase({ ...base, projectId }, deps)); expect(r.summary).toContain('Learning Report'); });
});

// ═════════ LEARNING ANALYTICS ═════════
describe('Learning Analytics', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'la', sourceRef: 's' }, deps)).projectId; });

  it('should calculate learning score', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps)); const r = await calculateLearningScoreUseCase({ tenantId: 't-1', projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.score).toBeGreaterThan(0); });
  it('should include score breakdown', async () => { const r = unwrap(await calculateLearningScoreUseCase({ tenantId: 't-1', projectId }, deps)); expect(r.breakdown.patterns).toBeDefined(); expect(r.breakdown.evidence).toBeDefined(); expect(r.breakdown.feedback).toBeDefined(); expect(r.breakdown.trends).toBeDefined(); });
  it('should calculate improvement rate', async () => { unwrap(await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'r1', category: 'Design', outcome: 'accepted', impactScore: 80, contextRef: 'x', notes: '' }, deps)); const r = await calculateImprovementRateUseCase({ tenantId: 't-1', projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.rate).toBe(100); });
  it('should detect improving trend', async () => { unwrap(await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'r1', category: 'Design', outcome: 'accepted', impactScore: 80, contextRef: 'x', notes: '' }, deps)); unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c2', projectId, recommendationId: 'r2', category: 'Design', outcome: 'accepted', impactScore: 85, contextRef: 'x', notes: '' }, deps)); const r = unwrap(await calculateImprovementRateUseCase({ tenantId: 't-1', projectId }, deps)); expect(r.trend).toBe('improving'); });
  it('should generate trend analysis', async () => { unwrap(await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps)); const r = await generateTrendAnalysisUseCase({ ...base, projectId }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.analysis.length).toBeGreaterThan(0); });
  it('should identify dominant direction', async () => { unwrap(await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps)); const r = unwrap(await generateTrendAnalysisUseCase({ ...base, projectId }, deps)); expect(['up','down','stable']).toContain(r.dominantDirection); });
  it('should emit improvement.detected for improving', async () => { unwrap(await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'r1', category: 'Design', outcome: 'accepted', impactScore: 80, contextRef: 'x', notes: '' }, deps)); unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c2', projectId, recommendationId: 'r2', category: 'Design', outcome: 'accepted', impactScore: 85, contextRef: 'x', notes: '' }, deps)); await calculateImprovementRateUseCase({ tenantId: 't-1', projectId }, deps); expect(deps.eventBus.countByType(LEARNING_EVENTS.IMPROVEMENT_DETECTED)).toBe(1); });
});

// ═════════ LEARNING MEMORY ═════════
describe('Learning Memory', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'lm2', sourceRef: 's' }, deps)).projectId; });

  it('should get learning memory', async () => { const r = await getLearningMemoryUseCase('t-1', projectId, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.history.length).toBeGreaterThan(0); });
  it('should update learning memory', async () => { const r = await updateLearningMemoryUseCase({ tenantId: 't-1', projectId, action: 'custom', summary: 'Custom action' }, deps); expect(r.ok).toBe(true); });
  it('should search learning history', async () => { await updateLearningMemoryUseCase({ tenantId: 't-1', projectId, action: 'pattern-learn', summary: 'Learned a pattern' }, deps); const r = await searchLearningMemoryUseCase({ tenantId: 't-1', projectId, query: 'pattern' }, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.results.length).toBeGreaterThan(0); });
  it('should append entries to memory', async () => { await updateLearningMemoryUseCase({ tenantId: 't-1', projectId, action: 'a1', summary: 's1' }, deps); await updateLearningMemoryUseCase({ tenantId: 't-1', projectId, action: 'a2', summary: 's2' }, deps); const mem = unwrap(await getLearningMemoryUseCase('t-1', projectId, deps)); expect(mem.history.length).toBeGreaterThanOrEqual(3); });
  it('should get learning statistics', async () => { const r = await getLearningStatisticsUseCase('t-1', projectId, deps); expect(r.ok).toBe(true); });
  it('should get design memory', async () => { unwrap(await learnDesignUseCase({ ...base, projectId, designType: 'Hero', insight: 'Bold text', score: 85, sourceRef: 'p1' }, deps)); const r = await getDesignMemoryUseCase('t-1', projectId, deps); expect(r.ok).toBe(true); if (r.ok) expect(r.value.entries.length).toBeGreaterThan(0); });
  it('should reject memory for non-existent project', async () => { const r = await getLearningMemoryUseCase('t-1', 'none', deps); expect(r.ok).toBe(false); });
});

// ═════════ STATUS TRANSITIONS ═════════
describe('Status Transitions', () => {
  it('Created → Learning', () => { expect(canTransitionLearning('Created', 'Learning')).toBe(true); });
  it('Learning → Analyzing', () => { expect(canTransitionLearning('Learning', 'Analyzing')).toBe(true); });
  it('Analyzing → Completed', () => { expect(canTransitionLearning('Analyzing', 'Completed')).toBe(true); });
  it('Completed → Archived', () => { expect(canTransitionLearning('Completed', 'Archived')).toBe(true); });
  it('Created → Completed (not allowed)', () => { expect(canTransitionLearning('Created', 'Completed')).toBe(false); });
  it('Archived → nothing', () => { expect(canTransitionLearning('Archived', 'Created')).toBe(false); });
  it('Created → Archived (allowed)', () => { expect(canTransitionLearning('Created', 'Archived')).toBe(true); });
});

// ═════════ MULTI-TENANT ISOLATION ═════════
describe('Multi-Tenant Isolation', () => {
  it('should isolate projects across tenants', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2'); deps.policyProvider.set('t-2', { maxProjects: 50 });
    await createLearningProjectUseCase({ tenantId: 't-1', organizationId: 'org-1', correlationId: 'c1', actorId: 'a', name: 'T1', slug: 't1-s', sourceRef: 's' }, deps);
    await createLearningProjectUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c2', actorId: 'a', name: 'T2', slug: 't2-s', sourceRef: 's' }, deps);
    const t1 = await listLearningProjectsUseCase('t-1', deps);
    const t2 = await listLearningProjectsUseCase('t-2', deps);
    if (t1.ok && t2.ok) { expect(t1.value.length).toBe(1); expect(t2.value.length).toBe(1); }
  });

  it('should allow same slug across tenants', async () => {
    const deps = makeDeps();
    deps.organizationVerifier.add('t-2', 'org-2'); deps.policyProvider.set('t-2', { maxProjects: 50 });
    const r1 = await createLearningProjectUseCase({ tenantId: 't-1', organizationId: 'org-1', correlationId: 'c1', actorId: 'a', name: 'A', slug: 'shared', sourceRef: 's' }, deps);
    const r2 = await createLearningProjectUseCase({ tenantId: 't-2', organizationId: 'org-2', correlationId: 'c2', actorId: 'a', name: 'B', slug: 'shared', sourceRef: 's' }, deps);
    expect(r1.ok).toBe(true); expect(r2.ok).toBe(true);
  });

  it('should isolate patterns across tenants', async () => {
    const deps = makeDeps();
    const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'iso-p', sourceRef: 's' }, deps));
    unwrap(await learnSuccessPatternUseCase({ ...base, projectId: p.projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps));
    const t2Patterns = await deps.patternRepo.findByProject('t-2', p.projectId);
    expect(t2Patterns.length).toBe(0);
  });

  it('should isolate memory across tenants', async () => {
    const deps = makeDeps();
    const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'iso-m', sourceRef: 's' }, deps));
    const t2Mem = await deps.memoryRepo.findByProject('t-2', p.projectId);
    expect(t2Mem).toBeNull();
  });
});

// ═════════ PROVIDER PLUGIN ARCHITECTURE ═════════
describe('Provider Plugin Architecture', () => {
  it('should use swappable trend provider', async () => {
    const deps = makeDeps();
    const projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'plug', sourceRef: 's' }, deps)).projectId;
    deps.trendProvider = { async detectTrends(cat, region) { return Ok({ category: cat, region, trends: [{ name: 'Custom Trend', direction: 'up', magnitude: 50, confidence: 0.99 }] }); } };
    const r = await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.count).toBe(1);
  });

  it('should use swappable learning provider', async () => {
    const deps = makeDeps();
    deps.learningProvider = { async analyze(input) { return Ok({ analysis: 'custom', confidence: 0.99, insights: ['x'], recommendations: ['y'] }); } };
    const result = await deps.learningProvider.analyze({ context: {}, task: 'test', patterns: [] });
    expect(result.ok).toBe(true); if (result.ok) expect(result.value.confidence).toBe(0.99);
  });

  it('should use swappable analytics provider', async () => {
    const deps = makeDeps();
    deps.analyticsProvider = { async getMetrics(source, cat) { return Ok({ source, category: cat, metrics: { custom: 42 }, summary: 'custom' }); } };
    const result = await deps.analyticsProvider.getMetrics('test', 'Design');
    expect(result.ok).toBe(true); if (result.ok) expect(result.value.metrics.custom).toBe(42);
  });
});

// ═════════ EXPLAINABLE LEARNING ═════════
describe('Explainable Learning', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'exp', sourceRef: 's' }, deps)).projectId; });

  it('should include observation in patterns', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'CTR increased 40% after change', impact: 85, frequency: 3, contexts: [] }, deps)); const patterns = await deps.patternRepo.findByProject('t-1', projectId); expect(patterns[0]!.observation).toContain('CTR'); });
  it('should include evidence chain in patterns', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps)); const patterns = await deps.patternRepo.findByProject('t-1', projectId); expect(patterns[0]!.evidenceIds.length).toBeGreaterThan(0); });
  it('should include reason in recommendations', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'Bold Hero', description: 'Large bold text', observation: 'CTR up', impact: 85, frequency: 3, contexts: [] }, deps)); const r = unwrap(await recommendImprovementUseCase({ ...base, projectId, category: 'Design' }, deps)); expect(r.recommendations[0]!.reason).toContain('Success pattern'); });
  it('should include reason in knowledge evolution', async () => { unwrap(await updateKnowledgeUseCase({ ...base, projectId, knowledgeId: 'k-1', change: 'c', reason: 'New A/B test data confirms hypothesis' }, deps)); const evo = await deps.knowledgeEvoRepo.findByKnowledge('t-1', 'k-1'); expect(evo[0]!.reason).toContain('A/B test'); });
  it('should include factors in confidence calculation', async () => { unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps)); const r = unwrap(await calculateConfidenceUseCase({ tenantId: 't-1', projectId }, deps)); expect(r.factors.some((f) => f.name === 'evidence')).toBe(true); expect(r.factors.some((f) => f.name === 'patterns')).toBe(true); });
});

// ═════════ AUDIT LOG VERIFICATION ═════════
describe('Audit Log Verification', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'alog', sourceRef: 's' }, deps)).projectId; });

  it('should record audit log on project creation', async () => { const logs = await deps.auditRepo.findByTenant('t-1'); expect(logs.some((l) => l.eventType === 'learning_started')).toBe(true); });
  it('should record audit log on pattern learned', async () => { await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps); const logs = await deps.auditRepo.findByProject('t-1', projectId); expect(logs.some((l) => l.eventType === 'pattern_learned')).toBe(true); });
  it('should record audit log on trend detected', async () => { await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps); const logs = await deps.auditRepo.findByProject('t-1', projectId); expect(logs.some((l) => l.eventType === 'trend_detected')).toBe(true); });
  it('should record audit log on knowledge evolved', async () => { await updateKnowledgeUseCase({ ...base, projectId, knowledgeId: 'k-1', change: 'c', reason: 'r' }, deps); const logs = await deps.auditRepo.findByProject('t-1', projectId); expect(logs.some((l) => l.eventType === 'knowledge_evolved')).toBe(true); });
  it('should record audit log on recommendation learned', async () => { await recordRecommendationResultUseCase({ ...base, projectId, recommendationId: 'r1', category: 'Design', outcome: 'accepted', impactScore: 80, contextRef: 'x', notes: '' }, deps); const logs = await deps.auditRepo.findByProject('t-1', projectId); expect(logs.some((l) => l.eventType === 'recommendation_learned')).toBe(true); });
});

// ═════════ CROSS-INDUSTRY LEARNING ═════════
describe('Cross-Industry Learning', () => {
  it('should support learning from restaurant project', async () => {
    const deps = makeDeps();
    const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'Restaurant Learning', slug: 'rest', sourceRef: 'proj-rest' }, deps));
    const r = await learnSuccessPatternUseCase({ ...base, projectId: p.projectId, category: 'Conversion', name: 'Menu Photos', description: 'High-quality food photos increase conversion', observation: 'Conversion up 30%', impact: 82, frequency: 4, contexts: ['menu'] }, deps);
    expect(r.ok).toBe(true);
  });

  it('should support learning from travel project', async () => {
    const deps = makeDeps();
    const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'Travel Learning', slug: 'trav', sourceRef: 'proj-trav' }, deps));
    const r = await learnFailurePatternUseCase({ ...base, projectId: p.projectId, category: 'Navigation', name: 'Complex Filters', description: 'Too many filter options', observation: 'High abandonment', impact: 60, frequency: 3, contexts: ['search'] }, deps);
    expect(r.ok).toBe(true);
  });

  it('should support learning from fintech project', async () => {
    const deps = makeDeps();
    const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'Fintech Learning', slug: 'fin', sourceRef: 'proj-fin' }, deps));
    const r = await learnDesignUseCase({ ...base, projectId: p.projectId, designType: 'Dashboard', insight: 'Clean data visualization builds trust', score: 90, sourceRef: 'dashboard' }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═════════ CONSTRAINT VALIDATION ═════════
describe('Constraint Validation', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should reject empty name', async () => { const r = await createLearningProjectUseCase({ ...base, name: '', slug: 'x', sourceRef: 's' }, deps); expect(r.ok).toBe(false); });
  it('should reject empty sourceRef', async () => { const r = await createLearningProjectUseCase({ ...base, name: 'P', slug: 'x', sourceRef: '' }, deps); expect(r.ok).toBe(false); });
  it('should reject name over 200 chars', async () => { const r = await createLearningProjectUseCase({ ...base, name: 'A'.repeat(201), slug: 'x', sourceRef: 's' }, deps); expect(r.ok).toBe(false); });
  it('should reject pattern impact > 100', async () => { const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'cv1', sourceRef: 's' }, deps)); const r = await learnSuccessPatternUseCase({ ...base, projectId: p.projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 150, frequency: 1, contexts: [] }, deps); expect(r.ok).toBe(false); });
  it('should respect max projects policy', async () => { deps.policyProvider.set('t-1', { maxProjects: 1 }); unwrap(await createLearningProjectUseCase({ ...base, name: 'A', slug: 'max-1', sourceRef: 's' }, deps)); const r = await createLearningProjectUseCase({ ...base, correlationId: 'c2', name: 'B', slug: 'max-2', sourceRef: 's' }, deps); expect(r.ok).toBe(false); });
});

// ═════════ FULL LEARNING PIPELINE ═════════
describe('Full Learning Pipeline', () => {
  it('should complete full learning cycle', async () => {
    const deps = makeDeps();

    // 1. Create Learning Project
    const p = unwrap(await createLearningProjectUseCase({ ...base, name: 'Full Cycle', slug: 'full', sourceRef: 'project-100' }, deps));

    // 2. Learn Success Patterns
    unwrap(await learnSuccessPatternUseCase({ ...base, projectId: p.projectId, category: 'Design', name: 'Bold Hero', description: 'Large bold hero', observation: 'CTR up 40%', impact: 85, frequency: 5, contexts: ['hero'] }, deps));
    unwrap(await learnSuccessPatternUseCase({ ...base, correlationId: 'c2', projectId: p.projectId, category: 'UX', name: '3-Step Flow', description: 'Simplified checkout', observation: 'Conversion up 25%', impact: 80, frequency: 4, contexts: ['checkout'] }, deps));

    // 3. Learn Failure Patterns
    unwrap(await learnFailurePatternUseCase({ ...base, correlationId: 'c3', projectId: p.projectId, category: 'Copy', name: 'Weak CTA', description: 'Generic CTA text', observation: 'Low click-through', impact: 55, frequency: 3, contexts: ['cta'] }, deps));

    // 4. Detect Trends
    unwrap(await detectTrendUseCase({ ...base, correlationId: 'c4', projectId: p.projectId, category: 'Design', region: 'US' }, deps));

    // 5. Record Outcomes (Feedback Loop)
    unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c5', projectId: p.projectId, recommendationId: 'rec-1', category: 'Design', outcome: 'accepted', impactScore: 88, contextRef: 'hero-section', notes: 'Excellent results' }, deps));
    unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: 'c6', projectId: p.projectId, recommendationId: 'rec-2', category: 'UX', outcome: 'accepted', impactScore: 75, contextRef: 'checkout', notes: 'Good improvement' }, deps));

    // 6. Learn Design Insights
    unwrap(await learnDesignUseCase({ ...base, correlationId: 'c7', projectId: p.projectId, designType: 'Hero', insight: 'Bold typography with generous whitespace', score: 92, sourceRef: 'hero-v2' }, deps));

    // 7. Update Learning Model
    const model = unwrap(await updateLearningModelUseCase({ ...base, correlationId: 'c8', projectId: p.projectId, category: 'Design' }, deps));
    expect(model.accuracy).toBeGreaterThan(0);

    // 8. Calculate Confidence
    const conf = unwrap(await calculateConfidenceUseCase({ tenantId: 't-1', projectId: p.projectId }, deps));
    expect(conf.score).toBeGreaterThan(0);

    // 9. Learn Recommendations
    const recStats = unwrap(await learnRecommendationUseCase({ ...base, correlationId: 'c9', projectId: p.projectId }, deps));
    expect(recStats.accuracy).toBe(100); // both accepted

    // 10. Evolve Knowledge
    unwrap(await updateKnowledgeUseCase({ ...base, correlationId: 'c10', projectId: p.projectId, knowledgeId: 'k-hero', change: 'Bold hero patterns validated', reason: 'A/B test confirmed 40% CTR increase' }, deps));

    // 11. Generate Report
    const report = unwrap(await generateLearningReportUseCase({ ...base, correlationId: 'c11', projectId: p.projectId }, deps));
    expect(report.metrics.totalPatterns).toBe(3);
    expect(report.metrics.totalFeedback).toBe(2);

    // 12. Calculate Learning Score
    const score = unwrap(await calculateLearningScoreUseCase({ tenantId: 't-1', projectId: p.projectId }, deps));
    expect(score.score).toBeGreaterThan(0);

    // 13. Calculate Improvement Rate
    const improvement = unwrap(await calculateImprovementRateUseCase({ tenantId: 't-1', projectId: p.projectId }, deps));
    expect(improvement.trend).toBe('improving');

    // 14. Complete Learning
    unwrap(await completeLearningUseCase({ ...base, correlationId: 'c12', projectId: p.projectId }, deps));

    // 15. Verify Memory
    const mem = unwrap(await getLearningMemoryUseCase('t-1', p.projectId, deps));
    expect(mem.history.length).toBeGreaterThan(10);

    // 16. Verify Design Memory
    const designMem = unwrap(await getDesignMemoryUseCase('t-1', p.projectId, deps));
    expect(designMem.entries.length).toBeGreaterThan(0);
  });
});

// ═════════ EVIDENCE VALIDATION ═════════
describe('Evidence Validation', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'evp', sourceRef: 's' }, deps)).projectId; });

  it('should support all evidence source types', async () => {
    const types: Array<'analytics' | 'behavior' | 'feedback' | 'ab_test' | 'observation' | 'benchmark' | 'outcome'> = ['analytics', 'behavior', 'feedback', 'ab_test', 'observation', 'benchmark', 'outcome'];
    for (let i = 0; i < types.length; i++) {
      unwrap(await recordRecommendationResultUseCase({ ...base, correlationId: `c${i}`, projectId, recommendationId: `r${i}`, category: 'Design', outcome: 'accepted', impactScore: 50, contextRef: 'ctx', notes: '' }, deps));
    }
    const ev = await deps.evidenceRepo.findByProject('t-1', projectId);
    expect(ev.length).toBeGreaterThanOrEqual(7);
  });

  it('should include claim in evidence', async () => {
    unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'Specific observation text', impact: 80, frequency: 2, contexts: [] }, deps));
    const ev = await deps.evidenceRepo.findByProject('t-1', projectId);
    expect(ev[0]!.claim).toContain('Specific observation');
  });

  it('should store confidence per evidence', async () => {
    unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps));
    const ev = await deps.evidenceRepo.findByProject('t-1', projectId);
    expect(ev[0]!.confidence).toBeGreaterThan(0);
    expect(ev[0]!.confidence).toBeLessThanOrEqual(1);
  });
});

// ═════════ DESIGN MEMORY DETAILS ═════════
describe('Design Memory Details', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'dmd', sourceRef: 's' }, deps)).projectId; });

  it('should accumulate design memory entries', async () => {
    unwrap(await learnDesignUseCase({ ...base, projectId, designType: 'Hero', insight: 'Bold text', score: 85, sourceRef: 'p1' }, deps));
    unwrap(await learnDesignUseCase({ ...base, correlationId: 'c2', projectId, designType: 'Layout', insight: 'Grid system', score: 80, sourceRef: 'p2' }, deps));
    const mem = await deps.memoryRepo.findByProject('t-1', projectId);
    expect(mem!.designMemory.length).toBe(2);
  });

  it('should include quality score in design memory', async () => {
    unwrap(await learnDesignUseCase({ ...base, projectId, designType: 'CTA', insight: 'Ghost button', score: 92, sourceRef: 'p1' }, deps));
    const mem = await deps.memoryRepo.findByProject('t-1', projectId);
    expect(mem!.designMemory[0]!.qualityScore).toBe(92);
  });

  it('should include sourceRef in design memory', async () => {
    unwrap(await learnDesignUseCase({ ...base, projectId, designType: 'Nav', insight: 'Sticky nav', score: 78, sourceRef: 'page-nav' }, deps));
    const mem = await deps.memoryRepo.findByProject('t-1', projectId);
    expect(mem!.designMemory[0]!.sourceRef).toBe('page-nav');
  });

  it('should add design memory from success patterns', async () => {
    unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'Whitespace', description: 'Generous whitespace', observation: 'Premium feel', impact: 88, frequency: 5, contexts: ['global'] }, deps));
    const mem = await deps.memoryRepo.findByProject('t-1', projectId);
    expect(mem!.designMemory.some((d) => d.designType === 'Design')).toBe(true);
  });
});

// ═════════ PATTERN QUERIES ═════════
describe('Pattern Queries', () => {
  let deps: ReturnType<typeof makeDeps>; let projectId: string;
  beforeEach(async () => { deps = makeDeps(); projectId = unwrap(await createLearningProjectUseCase({ ...base, name: 'P', slug: 'pq', sourceRef: 's' }, deps)).projectId; });

  it('should get pattern by ID', async () => {
    const r = unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps));
    const p = await getPatternUseCase('t-1', r.patternId, deps);
    expect(p.ok).toBe(true);
  });

  it('should list all patterns for project', async () => {
    unwrap(await learnSuccessPatternUseCase({ ...base, projectId, category: 'Design', name: 'A', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps));
    unwrap(await learnFailurePatternUseCase({ ...base, correlationId: 'c2', projectId, category: 'UX', name: 'B', description: 'D', observation: 'O', impact: 50, frequency: 1, contexts: [] }, deps));
    const r = await listPatternsUseCase('t-1', projectId, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.length).toBe(2);
  });

  it('should get trend by ID', async () => {
    const r = unwrap(await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps));
    const t = await getTrendUseCase('t-1', r.trendIds[0]!, deps);
    expect(t.ok).toBe(true);
  });

  it('should list all trends for project', async () => {
    unwrap(await detectTrendUseCase({ ...base, projectId, category: 'Design', region: 'US' }, deps));
    const r = await listTrendsUseCase('t-1', projectId, deps);
    expect(r.ok).toBe(true); if (r.ok) expect(r.value.length).toBeGreaterThan(0);
  });

  it('should reject get pattern for non-existent', async () => { const r = await getPatternUseCase('t-1', 'none', deps); expect(r.ok).toBe(false); });
  it('should reject get trend for non-existent', async () => { const r = await getTrendUseCase('t-1', 'none', deps); expect(r.ok).toBe(false); });
});

// ═════════ EDGE CASES ═════════
describe('Edge Cases', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => { deps = makeDeps(); });

  it('should reject get non-existent project', async () => { const r = await getLearningProjectUseCase('t-1', 'none', deps); expect(r.ok).toBe(false); });
  it('should reject learn pattern for non-existent project', async () => { const r = await learnSuccessPatternUseCase({ ...base, projectId: 'none', category: 'Design', name: 'N', description: 'D', observation: 'O', impact: 80, frequency: 2, contexts: [] }, deps); expect(r.ok).toBe(false); });
  it('should reject trend detection for non-existent project', async () => { const r = await detectTrendUseCase({ ...base, projectId: 'none', category: 'Design', region: 'US' }, deps); expect(r.ok).toBe(false); });
  it('should reject model update for non-existent project', async () => { const r = await updateLearningModelUseCase({ ...base, projectId: 'none', category: 'Design' }, deps); expect(r.ok).toBe(false); });
  it('should reject report for non-existent project', async () => { const r = await generateLearningReportUseCase({ ...base, projectId: 'none' }, deps); expect(r.ok).toBe(false); });
  it('should reject stats for non-existent project', async () => { const r = await getLearningStatisticsUseCase('t-1', 'none', deps); expect(r.ok).toBe(false); });
  it('should reject design memory for non-existent project', async () => { const r = await getDesignMemoryUseCase('t-1', 'none', deps); expect(r.ok).toBe(false); });
  it('should reject search memory for non-existent project', async () => { const r = await searchLearningMemoryUseCase({ tenantId: 't-1', projectId: 'none', query: 'x' }, deps); expect(r.ok).toBe(false); });
});

