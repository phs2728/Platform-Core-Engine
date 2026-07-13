/**
 * skill_standard/knowledge/index.ts — Knowledge Evolution Model
 *
 * Every production project feeds back into Learning Engine.
 * Skills → Skill Packs → Playbooks continuously improve.
 */

import type { SkillCertification } from '../index.js';
import type { DesignDNA } from '../reverse/index.js';
import type { EvidenceClassification } from '../reverse/index.js';

// ═══════════════════════════════════════════
// Knowledge Asset
// ═══════════════════════════════════════════

export type KnowledgeAssetType =
  | 'Pattern' | 'AntiPattern' | 'DesignDNA' | 'Benchmark'
  | 'ConversionRule' | 'TrustRule' | 'IndustryInsight'
  | 'UserBehavior' | 'PerformanceFinding' | 'AccessibilityFinding';

export interface KnowledgeAsset {
  readonly id: string;
  readonly type: KnowledgeAssetType;
  readonly title: string;
  readonly description: string;
  readonly evidence: string;
  readonly evidenceClassification: EvidenceClassification;
  readonly sourceAssets: string[];            // Design DNA IDs or reference URLs
  readonly confidence: number;                // 0-1
  readonly industry?: string | undefined;
  readonly tags: string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly usageCount: number;                // how many times referenced
  readonly linkedSkillIds: string[];          // Skills that use this knowledge
  readonly linkedPackIds: string[];           // Packs that use this
  readonly linkedPlaybookIds: string[];       // Playbooks that use this
}

// ═══════════════════════════════════════════
// Knowledge Base
// ═══════════════════════════════════════════

export interface IKnowledgeBase {
  store(asset: KnowledgeAsset): void;
  get(id: string): KnowledgeAsset | null;
  findByType(type: KnowledgeAssetType): KnowledgeAsset[];
  findByIndustry(industry: string): KnowledgeAsset[];
  findByTag(tag: string): KnowledgeAsset[];
  search(query: string): KnowledgeAsset[];
  incrementUsage(id: string): void;
  linkToSkill(knowledgeId: string, skillId: string): void;
  all(): KnowledgeAsset[];
  count(): number;
}

export class InMemoryKnowledgeBase implements IKnowledgeBase {
  private assets = new Map<string, KnowledgeAsset>();

  store(asset: KnowledgeAsset): void { this.assets.set(asset.id, asset); }
  get(id: string): KnowledgeAsset | null { return this.assets.get(id) ?? null; }

  findByType(type: KnowledgeAssetType): KnowledgeAsset[] {
    return [...this.assets.values()].filter(a => a.type === type);
  }

  findByIndustry(industry: string): KnowledgeAsset[] {
    return [...this.assets.values()].filter(a => a.industry === industry);
  }

  findByTag(tag: string): KnowledgeAsset[] {
    return [...this.assets.values()].filter(a => a.tags.includes(tag));
  }

  search(query: string): KnowledgeAsset[] {
    const q = query.toLowerCase();
    return [...this.assets.values()].filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q)),
    );
  }

  incrementUsage(id: string): void {
    const a = this.assets.get(id);
    if (a) this.assets.set(id, { ...a, usageCount: a.usageCount + 1 });
  }

  linkToSkill(knowledgeId: string, skillId: string): void {
    const a = this.assets.get(knowledgeId);
    if (a && !a.linkedSkillIds.includes(skillId)) {
      this.assets.set(knowledgeId, { ...a, linkedSkillIds: [...a.linkedSkillIds, skillId] });
    }
  }

  all(): KnowledgeAsset[] { return [...this.assets.values()]; }
  count(): number { return this.assets.size; }
}

// ═══════════════════════════════════════════
// Knowledge Evolution
// ═══════════════════════════════════════════

export interface KnowledgeEvolutionEvent {
  readonly id: string;
  readonly type: 'skill_improved' | 'pack_updated' | 'playbook_refined'
    | 'confidence_adjusted' | 'new_pattern_discovered' | 'anti_pattern_found'
    | 'evidence_upgraded' | 'evidence_downgraded' | 'knowledge_deprecated';
  readonly assetId: string;
  readonly description: string;
  readonly previousValue?: string | undefined;
  readonly newValue?: string | undefined;
  readonly projectSource?: string | undefined;  // which production project triggered this
  readonly timestamp: string;
}

export interface KnowledgeEvolutionReport {
  readonly totalEvents: number;
  readonly skillsImproved: number;
  readonly packsUpdated: number;
  readonly playbooksRefined: number;
  readonly newPatterns: number;
  readonly antiPatternsFound: number;
  readonly avgConfidenceDelta: number;
  readonly events: KnowledgeEvolutionEvent[];
}

export class KnowledgeEvolutionTracker {
  private events: KnowledgeEvolutionEvent[] = [];

  record(event: KnowledgeEvolutionEvent): void { this.events.push(event); }

  report(): KnowledgeEvolutionReport {
    return {
      totalEvents: this.events.length,
      skillsImproved: this.events.filter(e => e.type === 'skill_improved').length,
      packsUpdated: this.events.filter(e => e.type === 'pack_updated').length,
      playbooksRefined: this.events.filter(e => e.type === 'playbook_refined').length,
      newPatterns: this.events.filter(e => e.type === 'new_pattern_discovered').length,
      antiPatternsFound: this.events.filter(e => e.type === 'anti_pattern_found').length,
      avgConfidenceDelta: 0,
      events: [...this.events],
    };
  }

  /**
   * Feed back production data into the knowledge base.
   * This is the core learning loop.
   */
  feedbackFromProduction(input: {
    projectId: string;
    metrics: { conversionRate?: number; bounceRate?: number; avgTimeOnPage?: number; ctaClickRate?: number };
    userFeedback: string[];
    abTestResults?: { variant: string; winner: boolean; uplift: number }[];
  }, knowledgeBase: IKnowledgeBase): KnowledgeEvolutionEvent[] {
    const newEvents: KnowledgeEvolutionEvent[] = [];

    // High bounce rate → anti-pattern
    if (input.metrics.bounceRate !== undefined && input.metrics.bounceRate > 0.7) {
      const event: KnowledgeEvolutionEvent = {
        id: `evo-${Date.now()}-bounce`,
        type: 'anti_pattern_found',
        assetId: input.projectId,
        description: `High bounce rate (${(input.metrics.bounceRate * 100).toFixed(0)}%) detected — investigate page structure`,
        projectSource: input.projectId,
        timestamp: new Date().toISOString(),
      };
      this.record(event);
      newEvents.push(event);
    }

    // High CTA click rate → pattern
    if (input.metrics.ctaClickRate !== undefined && input.metrics.ctaClickRate > 0.15) {
      const event: KnowledgeEvolutionEvent = {
        id: `evo-${Date.now()}-cta`,
        type: 'new_pattern_discovered',
        assetId: input.projectId,
        description: `High CTA click rate (${(input.metrics.ctaClickRate * 100).toFixed(1)}%) — extract as pattern`,
        projectSource: input.projectId,
        timestamp: new Date().toISOString(),
      };
      this.record(event);
      newEvents.push(event);
    }

    // A/B test winners → pattern
    if (input.abTestResults) {
      for (const result of input.abTestResults.filter(r => r.winner)) {
        const event: KnowledgeEvolutionEvent = {
          id: `evo-${Date.now()}-${result.variant}`,
          type: 'new_pattern_discovered',
          assetId: input.projectId,
          description: `A/B test winner: ${result.variant} (+${(result.uplift * 100).toFixed(1)}% uplift)`,
          projectSource: input.projectId,
          timestamp: new Date().toISOString(),
        };
        this.record(event);
        newEvents.push(event);
      }
    }

    return newEvents;
  }
}