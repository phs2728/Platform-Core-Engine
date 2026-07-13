/**
 * Creative Intelligence RC2 — Host Adapters + Mock Creative Director
 *
 * Sprint: Senior Art Director Upgrade
 * - IOrganizationVerifier
 * - ICreativeKnowledgeReader (read-only)
 * - InMemoryEventBus
 *
 * The Mock Creative Director simulates AI-powered design review:
 * - Detects AI artifact patterns
 * - Scores Premium/Luxury based on style + heuristics
 * - Generates Design Critique with Senior Art Director tone
 */
import { Ok, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier, ICreativeKnowledgeReader,
  CompetitorResearch, DesignTrend,
} from '../interfaces/index.js';

// ── Organization Verifier ──
export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

// ── Creative Knowledge Reader (read-only) ──
export class MockCreativeKnowledgeReader implements ICreativeKnowledgeReader {
  private competitors = new Map<string, CompetitorResearch>();
  private trends = new Map<string, DesignTrend>();
  addCompetitor(industry: string, research: CompetitorResearch): void { this.competitors.set(industry, research); }
  addTrend(style: string, trend: DesignTrend): void { this.trends.set(style, trend); }
  clear(): void { this.competitors.clear(); this.trends.clear(); }
  async getCompetitorResearch(_t: string, industry: string): Promise<Result<CompetitorResearch, Error>> {
    const r = this.competitors.get(industry);
    if (r) return Ok(r);
    return Ok({
      industry,
      topCompetitors: [],
      marketStandards: { premiumLevel: 70, trustSignals: ['clear CTAs', 'professional photography'] },
    });
  }
  async getDesignTrends(_t: string, style: string): Promise<Result<DesignTrend, Error>> {
    const r = this.trends.get(style);
    if (r) return Ok(r);
    return Ok({
      style,
      emergingPatterns: [],
      colorTrends: [],
      typographyTrends: [],
    });
  }
}

// ── EventBus ──
export interface RecordedEnvelope<T = unknown> { envelope: import('@platform/core-sdk').EventEnvelope<T>; recordedAt: number; }
export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];
  async emit<T>(e: import('@platform/core-sdk').EventEnvelope<T>): Promise<void> {
    this.emitted.push({ envelope: e, recordedAt: Date.now() });
  }
  byType(t: string): RecordedEnvelope[] { return this.emitted.filter((r) => r.envelope.eventType === t); }
  countByType(t: string): number { return this.byType(t).length; }
  clear(): void { this.emitted.length = 0; }
}

// ── Mock Creative Director (Senior Art Director simulation) ──
// Deterministic scoring based on style + contentSnapshot heuristics
export class MockCreativeDirector {
  /** Senior Art Director tone — Premium score with style multiplier */
  scorePremium(style: string, contentSnapshot: Record<string, unknown> | undefined): {
    premiumFeeling: number; luxury: number; trust: number; visualHierarchy: number;
    whitespace: number; typography: number; photography: number; composition: number;
    microInteraction: number; consistency: number;
  } {
    const styleBoost = this.getStyleMultiplier(style);
    const base = 88;  // baseline premium score
    const hasLuxuryCues = this.detectLuxuryCues(contentSnapshot);
    const hasWhitespace = this.detectWhitespace(contentSnapshot);
    const hasPhotography = this.detectPhotography(contentSnapshot);
    return {
      premiumFeeling: Math.min(100, base + (hasLuxuryCues ? 8 : 0) + styleBoost),
      luxury: Math.min(100, base - 2 + (hasLuxuryCues ? 12 : 0) + styleBoost),
      trust: Math.min(100, base + 3 + (hasWhitespace ? 5 : 0)),
      visualHierarchy: Math.min(100, base + styleBoost),
      whitespace: Math.min(100, base + (hasWhitespace ? 10 : -5) + styleBoost),
      typography: Math.min(100, base + 4 + styleBoost),
      photography: Math.min(100, base + (hasPhotography ? 8 : -10) + styleBoost),
      composition: Math.min(100, base + styleBoost),
      microInteraction: Math.min(100, base + 2),
      consistency: Math.min(100, base + 5),
      // Corporate style = lower baseline
      ...(style === 'Corporate' ? {
        premiumFeeling: 80, luxury: 70, trust: 90, visualHierarchy: 85,
        whitespace: 80, typography: 80, photography: 75, composition: 82,
        microInteraction: 80, consistency: 88,
      } : {}),
    };
  }

  /** 3-Second First Impression scoring */
  scoreFirstImpression(contentSnapshot: Record<string, unknown> | undefined): {
    trust: number; premium: number; brand: number; professional: number; memorable: number;
  } {
    const hasHero = !!contentSnapshot?.['hero'];
    const hasPhotography = !!contentSnapshot?.['photography'];
    const hasNavigation = !!contentSnapshot?.['navigation'];
    return {
      trust: hasHero ? 96 : 78,
      premium: hasPhotography ? 96 : 75,
      brand: hasNavigation ? 95 : 80,
      professional: hasHero ? 96 : 82,
      memorable: hasPhotography ? 95 : 70,
    };
  }

  /** AI Artifact Detection (9 categories) */
  detectAIArtifacts(contentSnapshot: Record<string, unknown> | undefined): {
    aiLayout: number; aiCopy: number; aiHero: number; aiCard: number; aiCTA: number;
    aiGradient: number; aiIconPattern: number; genericSection: number; templateFeeling: number;
    detectedPatterns: string[];
  } {
    const detected: string[] = [];
    const cs = contentSnapshot ?? {};
    // Check for AI smell patterns
    if (typeof cs['heroTitle'] === 'string' && /unlock your potential|empower|transform/i.test(cs['heroTitle'])) {
      detected.push('AI Copy: cliché hero title');
    }
    if (cs['gradient'] === 'purple-blue') detected.push('AI Gradient: purple→blue');
    if (cs['cta'] === 'Get Started') detected.push('AI CTA: generic Get Started');
    if (cs['sections'] === 'Features-3x') detected.push('Generic Section: Features × 3');
    if (cs['heroImage'] === '3d-character') detected.push('AI Hero: 3D character');
    if (cs['cardStyle'] === 'glassmorphism') detected.push('AI Card: glassmorphism overuse');
    if (cs['icons'] === 'lucide-default') detected.push('AI Icon Pattern: lucide default');
    if (cs['template'] === 'wordpress-default') detected.push('Template Feeling');
    if (cs['layout'] === '3-column-grid') detected.push('AI Layout: 3-column grid');
    return {
      aiLayout: detected.some(d => d.includes('Layout')) ? 80 : 5,
      aiCopy: detected.some(d => d.includes('Copy')) ? 90 : 5,
      aiHero: detected.some(d => d.includes('Hero')) ? 85 : 5,
      aiCard: detected.some(d => d.includes('Card')) ? 75 : 5,
      aiCTA: detected.some(d => d.includes('CTA')) ? 80 : 5,
      aiGradient: detected.some(d => d.includes('Gradient')) ? 95 : 5,
      aiIconPattern: detected.some(d => d.includes('Icon')) ? 70 : 5,
      genericSection: detected.some(d => d.includes('Section')) ? 85 : 5,
      templateFeeling: detected.some(d => d.includes('Template')) ? 100 : 5,
      detectedPatterns: detected,
    };
  }

  /** Senior Art Director Critique */
  generateCritique(
    pageSnapshot: Record<string, unknown> | undefined,
    scores: { premium: number; whitespace: number; typography: number; photography: number; aiSmell: number },
  ): { critiques: { severity: 'Critical' | 'Major' | 'Minor' | 'Suggestion'; category: string; observation: string; suggestion: string }[]; verdict: string } {
    const critiques: { severity: 'Critical' | 'Major' | 'Minor' | 'Suggestion'; category: string; observation: string; suggestion: string }[] = [];
    if (scores.premium < 95) {
      critiques.push({
        severity: 'Critical', category: 'Premium',
        observation: 'Premium feeling below threshold — first impression lacks luxury cue',
        suggestion: 'Increase whitespace by 30%, add editorial photography, use serif headline accent',
      });
    }
    if (scores.whitespace < 95) {
      critiques.push({
        severity: 'Major', category: 'Whitespace',
        observation: 'Whitespace below threshold — sections feel cramped',
        suggestion: 'Double the padding between sections, reduce hero CTA count to 1',
      });
    }
    if (scores.typography < 95) {
      critiques.push({
        severity: 'Major', category: 'Typography',
        observation: 'Typography scale lacks editorial rhythm',
        suggestion: 'Adopt Display+Editorial scale pair: 96/64/24/16 instead of uniform 32/24/16',
      });
    }
    if (scores.photography < 90) {
      critiques.push({
        severity: 'Critical', category: 'Photography',
        observation: 'Photography does not communicate lifestyle — looks stock',
        suggestion: 'Use lifestyle photography with negative space, shallow DOF, warm light',
      });
    }
    if (scores.aiSmell > 30) {
      critiques.push({
        severity: 'Critical', category: 'AI Smell',
        observation: 'AI patterns detected — design feels generic',
        suggestion: 'Remove purple→blue gradient, replace with brand-specific palette',
      });
    }
    const verdict = critiques.length === 0
      ? 'Design meets Senior Art Director standards. Approve.'
      : `Design requires ${critiques.filter(c => c.severity === 'Critical').length} critical and ${critiques.filter(c => c.severity === 'Major').length} major revisions.`;
    return { critiques, verdict };
  }

  /** Design Recommendations */
  generateRecommendations(critique: { critiques: { severity: string; category: string }[] }): {
    recommendations: { category: 'photography' | 'layout' | 'motion' | 'cta' | 'hierarchy' | 'typography' | 'copy' | 'color'; current: string; suggested: string; rationale: string }[];
    priority: 'critical' | 'high' | 'medium' | 'low';
  } {
    const recommendations = critique.critiques.map(c => ({
      category: this.categoryToRecommendationCategory(c.category),
      current: `${c.category} requires attention`,
      suggested: `Improve ${c.category.toLowerCase()} per Senior Art Director review`,
      rationale: `Detected as ${c.severity} severity — addresses platform Premium/Luxury standards`,
    }));
    const priority: 'critical' | 'high' | 'medium' | 'low' =
      critique.critiques.some(c => c.severity === 'Critical') ? 'critical' :
      critique.critiques.some(c => c.severity === 'Major') ? 'high' :
      critique.critiques.some(c => c.severity === 'Minor') ? 'medium' : 'low';
    return { recommendations, priority };
  }

  // ── Helpers ──
  private getStyleMultiplier(style: string): number {
    const map: Record<string, number> = { Luxury: 6, Premium: 5, Editorial: 4, Boutique: 4, Corporate: 2, Minimal: 3, Modern: 2, Playful: 0 };
    return map[style] ?? 2;
  }
  private detectLuxuryCues(s: Record<string, unknown> | undefined): boolean {
    if (!s) return false;
    return s['serifAccent'] === true || s['editorialLayout'] === true || s['shallowDOF'] === true;
  }
  private detectWhitespace(s: Record<string, unknown> | undefined): boolean {
    if (!s) return false;
    const w = s['whitespaceRatio'] as number | undefined;
    return w !== undefined && w >= 0.4;
  }
  private detectPhotography(s: Record<string, unknown> | undefined): boolean {
    if (!s) return false;
    return s['lifestylePhotography'] === true || s['editorialPhotography'] === true;
  }
  private categoryToRecommendationCategory(c: string): 'photography' | 'layout' | 'motion' | 'cta' | 'hierarchy' | 'typography' | 'copy' | 'color' {
    if (c === 'Photography') return 'photography';
    if (c === 'AI Smell') return 'color';
    if (c === 'Typography') return 'typography';
    if (c === 'Whitespace') return 'layout';
    if (c === 'Premium') return 'hierarchy';
    return 'copy';
  }
}