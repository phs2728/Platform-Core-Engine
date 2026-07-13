/**
 * Agency OS — Host Adapters
 */
import { Ok, type Result } from '@platform/core-sdk';
import type { IOrganizationVerifier } from '../interfaces/index.js';

// ── Organization Verifier ──
export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

// ── EventBus ──
export interface RecordedEnvelope<T = unknown> { envelope: import('@platform/core-sdk').EventEnvelope<T>; recordedAt: number; }
export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];
  async emit<T>(e: import('@platform/core-sdk').EventEnvelope<T>): Promise<void> {
    this.emitted.push({ envelope: e, recordedAt: Date.now() });
  }
  byType(t: string): RecordedEnvelope[] { return this.emitted.filter(r => r.envelope.eventType === t); }
  countByType(t: string): number { return this.byType(t).length; }
  clear(): void { this.emitted.length = 0; }
}

// ── Mock Swarm Executor (simulates parallel task execution) ──
export class MockSwarmExecutor {
  /** Simulates task execution — returns deterministic result based on task type */
  execute(swarmType: string, taskTitle: string): {
    output: Record<string, unknown>;
    evidenceRefs: string[];
    confidenceScore: number;
    issues: string[];
  } {
    const baseConfidence = 85;
    const typeBoost: Record<string, number> = {
      Research: 5, Creative: 3, UX: 4, Engineering: 6, QA: 7,
      Learning: 2, Marketing: 0, SEO: 1, Accessibility: 3,
    };
    return {
      output: { swarmType, taskTitle, result: 'completed', artifacts: [] },
      evidenceRefs: [`${swarmType.toLowerCase()}-evidence-1`, `${swarmType.toLowerCase()}-evidence-2`],
      confidenceScore: baseConfidence + (typeBoost[swarmType] ?? 0),
      issues: [],
    };
  }
}

// ── Mock Debate Resolver (simulates expert debate) ──
export class MockDebateResolver {
  /** Generates mock expert opinions for a topic */
  generateOpinions(topic: string): {
    expertRole: string;
    stance: 'Support' | 'Oppose' | 'Neutral';
    argument: string;
    evidence: string[];
  }[] {
    return [
      { expertRole: 'Creative Director', stance: 'Support', argument: `${topic}은(는) 브랜드 감성에 부합`, evidence: ['brand-alignment', 'mood-board'] },
      { expertRole: 'SEO Specialist', stance: 'Neutral', argument: `${topic}의 키워드 영향 중립적`, evidence: ['keyword-analysis'] },
      { expertRole: 'Trust Architect', stance: 'Support', argument: `${topic}은(는) 신뢰 구축에 기여`, evidence: ['trust-evidence'] },
      { expertRole: 'Conversion Director', stance: 'Oppose', argument: `${topic}은(는) CTA 방해 가능성`, evidence: ['cta-analysis'] },
      { expertRole: 'Accessibility Lead', stance: 'Support', argument: `${topic}은(는) WCAG 준수`, evidence: ['wcag-aaa'] },
      { expertRole: 'Performance Engineer', stance: 'Neutral', argument: `${topic}의 성능 영향 최소`, evidence: ['lighthouse-score'] },
    ];
  }
}

export { Ok, type Result };