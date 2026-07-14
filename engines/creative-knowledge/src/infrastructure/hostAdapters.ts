/**
 * Creative Knowledge Engine — Host Adapters (Test/Demo only)
 *
 * Mock providers that simulate real audit/competitor/research data.
 * In production, Host provides real implementations of these interfaces.
 */
import type { EventEnvelope } from '@platform/core-sdk';
import { Ok, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier, IPolicyProvider,
  IWebsiteAuditProvider, ICompetitorProvider, IScreenshotProvider,
  IHTMLProvider, ISEOProvider, IPerformanceProvider, IAccessibilityProvider,
  IResearchProvider, ILLMProvider,
  WebsiteAuditData, CompetitorData, ScreenshotData, HTMLData,
  SEOData, PerformanceData, AccessibilityData, ResearchData,
  LLMAnalyzeInput, LLMAnalyzeOutput, BriefGenInput, BriefGenOutput,
  ClientInterview, BusinessProfile, AuditSummary, CreativeBrief,
} from '../interfaces/index.js';

export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

export class StaticKnowledgePolicyProvider implements IPolicyProvider {
  private cfg = new Map<string, { maxProjects: number }>();
  set(t: string, c: Partial<{ maxProjects: number }>): void { this.cfg.set(t, { maxProjects: c.maxProjects ?? 50 }); }
  async validateAttributes(_t: string, _type: string, attr: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> { return Ok(attr); }
  async getMaxResearchProjectsPerOrg(t: string): Promise<number> { return this.cfg.get(t)?.maxProjects ?? 50; }
  clear(): void { this.cfg.clear(); }
}

// ── Website Audit Provider (Mock) ──
export class MockWebsiteAuditProvider implements IWebsiteAuditProvider {
  async audit(url: string): Promise<Result<WebsiteAuditData, Error>> {
    return Ok({ url, title: `${url} — Homepage`, pages: 12, loadTime: 1800, mobile: true, ssl: true });
  }
}

// ── Competitor Provider (Mock) ──
export class MockCompetitorProvider implements ICompetitorProvider {
  async analyze(url: string): Promise<Result<CompetitorData, Error>> {
    return Ok({
      url, name: url.replace(/^https?:\/\/(www\.)?/, '').split('.')[0] ?? url,
      strengths: ['Strong brand', 'Good mobile experience'],
      weaknesses: ['Slow load time', 'Weak CTAs'],
      patterns: ['Hero with centered text', '3-column feature grid'],
    });
  }
}

// ── Screenshot Provider (Mock) ──
export class MockScreenshotProvider implements IScreenshotProvider {
  async capture(url: string): Promise<Result<ScreenshotData, Error>> {
    return Ok({ url, desktopImageUrl: `mock://desktop/${encodeURIComponent(url)}`, mobileImageUrl: `mock://mobile/${encodeURIComponent(url)}` });
  }
}

// ── HTML Provider (Mock) ──
export class MockHTMLProvider implements IHTMLProvider {
  async fetch(url: string): Promise<Result<HTMLData, Error>> {
    return Ok({ url, structure: '<html><body><header><nav/></header><main><section/></main></body></html>', metaTags: { title: 'Sample Site', description: 'A sample website' }, headingHierarchy: ['h1: Welcome', 'h2: About', 'h2: Services'] });
  }
}

// ── SEO Provider (Mock) ──
export class MockSEOProvider implements ISEOProvider {
  async audit(url: string): Promise<Result<SEOData, Error>> {
    return Ok({ url, score: 78, issues: ['Missing alt text on 3 images', 'Duplicate meta descriptions on 2 pages'], metaTags: { title: 'Sample Title' }, keywords: ['sample', 'website', 'test'] });
  }
}

// ── Performance Provider (Mock) ──
export class MockPerformanceProvider implements IPerformanceProvider {
  async audit(url: string): Promise<Result<PerformanceData, Error>> {
    return Ok({ url, score: 65, loadTime: 3200, firstContentfulPaint: 1200, largestContentfulPaint: 2800, cumulativeLayoutShift: 0.15 });
  }
}

// ── Accessibility Provider (Mock) ──
export class MockAccessibilityProvider implements IAccessibilityProvider {
  async audit(url: string): Promise<Result<AccessibilityData, Error>> {
    return Ok({ url, score: 72, violations: [{ id: 'color-contrast', impact: 'serious', description: 'Insufficient contrast on buttons' }, { id: 'missing-alt', impact: 'critical', description: 'Images missing alt text' }], level: 'AA' });
  }
}

// ── Research Provider (Mock) ──
export class MockResearchProvider implements IResearchProvider {
  async research(query: string): Promise<Result<ResearchData, Error>> {
    return Ok({ query, summary: `Market research for ${query}: The industry is growing steadily with increasing digital adoption.`, keyFindings: ['70% mobile traffic', 'Key competitors investing in UX', 'Customer expectations rising'], sources: [{ title: 'Industry Report 2026', url: 'mock://report' }] });
  }
}

// ── LLM Provider (Mock) ──
export class MockLLMProvider implements ILLMProvider {
  async analyze(input: LLMAnalyzeInput): Promise<Result<LLMAnalyzeOutput, Error>> {
    return Ok({ analysis: `Analysis of "${input.task}": Based on the provided data, the key insight is that improvements in design hierarchy and CTA placement would yield the highest impact.`, confidence: 0.87, insights: ['Visual hierarchy needs improvement', 'CTA placement is below the fold', 'Typography rhythm is inconsistent'] });
  }
  async generateBrief(input: BriefGenInput): Promise<Result<BriefGenOutput, Error>> {
    const i = input.interview;
    const brief: CreativeBrief = {
      id: `brief-${Date.now()}`, tenantId: '', projectId: '',
      goals: i.successMetrics.length > 0 ? i.successMetrics : [i.businessGoal],
      audience: i.targetAudience, competitors: i.competitors,
      constraints: [{ type: 'brand', description: i.brandPersonality }],
      successMetrics: i.successMetrics, budget: i.budget, timeline: i.timeline,
      evidence: [], confidence: 0.85, attributes: {},
      createdAt: new Date().toISOString(),
    };
    return Ok({ brief, confidence: 0.85 });
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
