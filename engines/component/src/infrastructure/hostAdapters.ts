/**
 * Component Engine — Host Adapters (Test/Demo only)
 *
 * Mock providers that simulate real cross-engine adapters and plugin providers.
 * In production, Host provides real implementations of these interfaces.
 */
import type { EventEnvelope } from '@platform/core-sdk';
import { Ok, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier, IPolicyProvider,
  IExperienceProvider, IThemeProvider, ICreativeIntelligenceProvider,
  ILearningProvider, ISearchProvider, IAIProvider, IRuntimeProvider,
  IComponentRendererProvider, IAnimationProvider, IAccessibilityProvider,
  IPreviewProvider, IAnalyticsProvider, ILearningPluginProvider,
  ExperienceRef, ThemeRef, CreativeDirectionRef,
  ComponentOutcomeRef, ComponentSearchResult,
  ComponentRecommendationContext, ComponentRecommendation, ComponentHealth,
  ComponentRenderInput, ComponentRenderOutput,
  AnimationGenerationInput, AnimationGenerationOutput,
  AccessibilityAuditInput, AccessibilityAuditOutput,
  PreviewInput, PreviewOutput,
  AnalyticsEvent, ComponentMetrics,
  LearningInput, LearningOutput,
} from '../interfaces/index.js';

// ── Organization Verifier ──
export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

// ── Policy Provider ──
export class StaticComponentPolicyProvider implements IPolicyProvider {
  private cfg = new Map<string, { maxComponents: number }>();
  set(t: string, c: Partial<{ maxComponents: number }>): void { this.cfg.set(t, { maxComponents: c.maxComponents ?? 100 }); }
  async validateAttributes(_t: string, _type: string, attr: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> { return Ok(attr); }
  async getMaxComponentsPerOrg(t: string): Promise<number> { return this.cfg.get(t)?.maxComponents ?? 100; }
  clear(): void { this.cfg.clear(); }
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

// ── Experience Provider (Experience Engine adapter) ──
export class MockExperienceProvider implements IExperienceProvider {
  private store = new Map<string, ExperienceRef>();
  add(t: string, id: string, ref: ExperienceRef): void { this.store.set(`${t}::${id}`, ref); }
  async getExperience(t: string, id: string): Promise<Result<ExperienceRef, Error>> {
    const r = this.store.get(`${t}::${id}`);
    return r ? Ok(r) : Ok({ experienceId: id, name: 'Mock Experience', slug: 'mock-experience' });
  }
  async validateExperienceLayout(_t: string, _layout: string[]): Promise<Result<boolean, Error>> { return Ok(true); }
}

// ── Theme Provider (Theme Engine adapter) ──
export class MockThemeProvider implements IThemeProvider {
  private themes = new Map<string, ThemeRef>();
  private tokens = new Map<string, string>();
  add(t: string, themeId: string, ref: ThemeRef): void { this.themes.set(`${t}::${themeId}`, ref); }
  setToken(t: string, themeId: string, key: string, value: string): void { this.tokens.set(`${t}::${themeId}::${key}`, value); }
  async getTheme(t: string, themeId: string): Promise<Result<ThemeRef, Error>> {
    const r = this.themes.get(`${t}::${themeId}`);
    return r ? Ok(r) : Ok({ themeId, name: 'Mock Theme', defaultMode: 'Light' });
  }
  async resolveToken(t: string, themeId: string, key: string): Promise<Result<string, Error>> {
    const r = this.tokens.get(`${t}::${themeId}::${key}`);
    return r ? Ok(r) : Ok(`resolved-${key}`);
  }
}

// ── Creative Intelligence Provider ──
export class MockCreativeIntelligenceProvider implements ICreativeIntelligenceProvider {
  private store = new Map<string, CreativeDirectionRef>();
  add(t: string, style: string, ref: CreativeDirectionRef): void { this.store.set(`${t}::${style}`, ref); }
  async getCreativeDirection(t: string, style: string): Promise<Result<CreativeDirectionRef, Error>> {
    const r = this.store.get(`${t}::${style}`);
    return r ? Ok(r) : Ok({ directionId: 'mock-dir', style, premiumScore: 90, professionalScore: 92 });
  }
}

// ── Learning Provider ──
export class MockLearningProvider implements ILearningProvider {
  private outcomes = new Map<string, ComponentOutcomeRef>();
  add(t: string, componentId: string, outcome: ComponentOutcomeRef): void { this.outcomes.set(`${t}::${componentId}`, outcome); }
  async getComponentOutcome(t: string, componentId: string): Promise<Result<ComponentOutcomeRef, Error>> {
    const r = this.outcomes.get(`${t}::${componentId}`);
    return r ? Ok(r) : Ok({ componentId, conversionRate: 50, userSatisfaction: 75, usageCount: 100 });
  }
  async recordOutcome(t: string, componentId: string, outcome: ComponentOutcomeRef): Promise<Result<void, Error>> {
    this.outcomes.set(`${t}::${componentId}`, outcome);
    return Ok(undefined);
  }
}

// ── Search Provider ──
export class MockSearchProvider implements ISearchProvider {
  private items: ComponentSearchResult[] = [];
  add(t: string, results: ComponentSearchResult[]): void { this.items.push(...results); }
  async searchComponents(_t: string, query: string): Promise<Result<ComponentSearchResult[], Error>> {
    const lower = query.toLowerCase();
    const matches = this.items.filter(i => i.name.toLowerCase().includes(lower));
    return Ok(matches);
  }
}

// ── AI Provider ──
export class MockAIProvider implements IAIProvider {
  private recs = new Map<string, ComponentRecommendation>();
  add(t: string, context: ComponentRecommendationContext, rec: ComponentRecommendation): void {
    this.recs.set(`${t}::${context.industry}::${context.experience}::${context.style}`, rec);
  }
  async recommendComponent(t: string, context: ComponentRecommendationContext): Promise<Result<ComponentRecommendation, Error>> {
    const r = this.recs.get(`${t}::${context.industry}::${context.experience}::${context.style}`);
    return r ? Ok(r) : Ok({ componentId: 'ai-recommended', confidence: 0.8, reason: 'AI suggested' });
  }
}

// ── Runtime Provider ──
export class MockRuntimeProvider implements IRuntimeProvider {
  private health = new Map<string, ComponentHealth>();
  add(t: string, componentId: string, health: ComponentHealth): void { this.health.set(`${t}::${componentId}`, health); }
  async checkComponentHealth(t: string, componentId: string): Promise<Result<ComponentHealth, Error>> {
    const r = this.health.get(`${t}::${componentId}`);
    return r ? Ok(r) : Ok({ componentId, healthy: true, loadTime: 150, errorRate: 0.02 });
  }
}

// ── Component Renderer Provider ──
export class MockComponentRendererProvider implements IComponentRendererProvider {
  async render(input: ComponentRenderInput): Promise<Result<ComponentRenderOutput, Error>> {
    const nodeCount = Object.keys(input.props).length + 1;
    return Ok({ rendered: `<div data-component="${input.componentId}"></div>`, format: input.format, nodeCount });
  }
}

// ── Animation Provider ──
export class MockAnimationProvider implements IAnimationProvider {
  async generate(spec: AnimationGenerationInput): Promise<Result<AnimationGenerationOutput, Error>> {
    return Ok({
      keyframes: `@keyframes ${spec.animationType.toLowerCase()}-${spec.componentId} { from: { opacity: 0 } to: { opacity: 1 } }`,
      cssClass: `anim-${spec.animationType.toLowerCase()}`,
    });
  }
}

// ── Accessibility Provider ──
export class MockAccessibilityProvider implements IAccessibilityProvider {
  async audit(input: AccessibilityAuditInput): Promise<Result<AccessibilityAuditOutput, Error>> {
    return Ok({
      score: 92,
      violations: [],
      passCount: 15,
      failCount: 0,
    });
  }
}

// ── Preview Provider ──
export class MockPreviewProvider implements IPreviewProvider {
  async preview(input: PreviewInput): Promise<Result<PreviewOutput, Error>> {
    return Ok({
      previewUri: `component://preview/${input.componentId}?device=${input.device}&mode=${input.themeMode}`,
      device: input.device,
      ready: true,
    });
  }
}

// ── Analytics Provider ──
export class MockAnalyticsProvider implements IAnalyticsProvider {
  private metrics = new Map<string, ComponentMetrics>();
  async track(event: AnalyticsEvent): Promise<Result<void, Error>> {
    const key = event.componentId;
    const existing = this.metrics.get(key);
    if (existing) {
      existing.views += 1;
      this.metrics.set(key, existing);
    } else {
      this.metrics.set(key, { componentId: key, views: 1, interactions: 0, conversionRate: 0, avgLoadTime: 100 });
    }
    return Ok(undefined);
  }
  async getMetrics(componentId: string): Promise<Result<ComponentMetrics, Error>> {
    const r = this.metrics.get(componentId);
    return r ? Ok(r) : Ok({ componentId, views: 0, interactions: 0, conversionRate: 0, avgLoadTime: 100 });
  }
}

// ── Learning Plugin Provider ──
export class MockLearningPluginProvider implements ILearningPluginProvider {
  async learn(input: LearningInput): Promise<Result<LearningOutput, Error>> {
    return Ok({
      patternId: `pattern-${input.componentId}`,
      confidence: input.outcome === 'success' ? 85 : 40,
      recommendation: input.outcome === 'success' ? 'Maintain current configuration' : 'Consider redesigning layout',
    });
  }
}
