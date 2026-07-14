/**
 * Learning Engine — Host Adapters (Test/Demo only)
 *
 * Mock providers that simulate real learning/analytics/behavior data.
 * In production, Host provides real implementations of these interfaces.
 */
import type { EventEnvelope } from '@platform/core-sdk';
import { Ok, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier, IPolicyProvider,
  ILearningProvider, IAnalyticsProvider, IBehaviorProvider,
  ITrendProvider, IEvidenceProvider, IFeedbackProvider, IKnowledgeProvider,
  LearningAnalyzeInput, LearningAnalyzeOutput,
  AnalyticsData, BehaviorData, TrendData, EvidenceData, FeedbackData, KnowledgeData,
  LearningPattern,
} from '../interfaces/index.js';

export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

export class StaticLearningPolicyProvider implements IPolicyProvider {
  private cfg = new Map<string, { maxProjects: number }>();
  set(t: string, c: Partial<{ maxProjects: number }>): void { this.cfg.set(t, { maxProjects: c.maxProjects ?? 50 }); }
  async validateAttributes(_t: string, _type: string, attr: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> { return Ok(attr); }
  async getMaxLearningProjectsPerOrg(t: string): Promise<number> { return this.cfg.get(t)?.maxProjects ?? 50; }
  clear(): void { this.cfg.clear(); }
}

// ── Learning Provider (Mock) ──
export class MockLearningProvider implements ILearningProvider {
  async analyze(input: LearningAnalyzeInput): Promise<Result<LearningAnalyzeOutput, Error>> {
    const insights = input.patterns.length > 0
      ? input.patterns.slice(0, 3).map((p: LearningPattern) => `Pattern "${p.name}" shows ${p.confidence * 100}% confidence`)
      : ['No patterns available yet — gather more data'];
    return Ok({
      analysis: `Based on ${input.patterns.length} patterns and task "${input.task}", the key insight is that consistent design patterns with high impact scores drive better outcomes.`,
      confidence: 0.85,
      insights,
      recommendations: ['Apply top success patterns', 'Address identified failure patterns', 'Monitor outcome feedback'],
    });
  }
}

// ── Analytics Provider (Mock) ──
export class MockAnalyticsProvider implements IAnalyticsProvider {
  async getMetrics(source: string, category: string): Promise<Result<AnalyticsData, Error>> {
    return Ok({
      source, category,
      metrics: { sessions: 1200, bounceRate: 35, conversionRate: 4.5, avgDuration: 180, clickThroughRate: 2.8 },
      summary: `${category} metrics for ${source}: 1200 sessions, 4.5% conversion, 35% bounce`,
    });
  }
}

// ── Behavior Provider (Mock) ──
export class MockBehaviorProvider implements IBehaviorProvider {
  async getBehaviorData(source: string): Promise<Result<BehaviorData, Error>> {
    return Ok({
      source, sessions: 1500, bounceRate: 38, avgDuration: 165, conversionRate: 3.8,
      clickThroughRate: 2.5, topPages: ['/home', '/about', '/contact'],
    });
  }
}

// ── Trend Provider (Mock) ──
export class MockTrendProvider implements ITrendProvider {
  async detectTrends(category: string, region: string): Promise<Result<TrendData, Error>> {
    return Ok({
      category, region,
      trends: [
        { name: 'Minimal hero design', direction: 'up', magnitude: 15, confidence: 0.82 },
        { name: 'Bold typography', direction: 'up', magnitude: 22, confidence: 0.88 },
        { name: 'Excessive animations', direction: 'down', magnitude: 18, confidence: 0.75 },
      ],
    });
  }
}

// ── Evidence Provider (Mock) ──
export class MockEvidenceProvider implements IEvidenceProvider {
  async gatherEvidence(source: string, claim: string): Promise<Result<EvidenceData, Error>> {
    return Ok({ source, claim, supportingData: { verified: true, samples: 42 }, confidence: 0.87 });
  }
}

// ── Feedback Provider (Mock) ──
export class MockFeedbackProvider implements IFeedbackProvider {
  async getFeedback(recommendationId: string): Promise<Result<FeedbackData, Error>> {
    return Ok({ recommendationId, outcome: 'accepted', impactScore: 78, notes: 'Positive user response' });
  }
}

// ── Knowledge Provider (Mock) ──
export class MockKnowledgeProvider implements IKnowledgeProvider {
  async getKnowledge(query: string): Promise<Result<KnowledgeData, Error>> {
    return Ok({
      query,
      articles: [
        { title: 'Design Patterns 2026', content: 'Current best practices for modern web design', confidence: 0.9 },
        { title: 'UX Principles', content: 'Core UX principles for conversion optimization', confidence: 0.85 },
      ],
      summary: `Knowledge for "${query}": 2 relevant articles found`,
    });
  }
}

// ── EventBus ──
export interface RecordedEnvelope<T = unknown> { envelope: EventEnvelope<T>; recordedAt: number; }
export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];
  async emit<T>(e: EventEnvelope<T>): Promise<void> { this.emitted.push({ envelope: e, recordedAt: Date.now() }); }
  byType(t: string): RecordedEnvelope[] { return this.emitted.filter((r) => r.envelope.eventType === t); }
  countByType(t: string): number { return this.byType(t).length; }
  clear(): void { this.emitted.length = 0; }
}
