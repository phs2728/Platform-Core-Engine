/**
 * Theme Engine — Host Adapters (Test/Demo only)
 *
 * Mock providers that simulate real theme compilation / policy data.
 * In production, Host provides real implementations of these interfaces.
 */
import type { EventEnvelope } from '@platform/core-sdk';
import { Ok, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier, IPolicyProvider, IThemeCompilerProvider,
  ThemeCompilationInput, ThemeCompilationOutput,
  ICreativeIntelligenceProvider, IComponentThemeProvider,
  BrandDirectionInput, BrandDirection,
} from '../interfaces/index.js';

export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

export class StaticThemePolicyProvider implements IPolicyProvider {
  private cfg = new Map<string, { maxThemes: number }>();
  set(t: string, c: Partial<{ maxThemes: number }>): void { this.cfg.set(t, { maxThemes: c.maxThemes ?? 50 }); }
  async validateAttributes(_t: string, _type: string, attr: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> { return Ok(attr); }
  async getMaxThemesPerOrg(t: string): Promise<number> { return this.cfg.get(t)?.maxThemes ?? 50; }
  clear(): void { this.cfg.clear(); }
}

// ── Theme Compiler Provider (Mock) ──
export class MockThemeCompilerProvider implements IThemeCompilerProvider {
  async compile(input: ThemeCompilationInput): Promise<Result<ThemeCompilationOutput, Error>> {
    const entries = Object.entries(input.tokens);
    const cssVars = entries.map(([k, v]) => `  ${k.startsWith('--') ? k : `--${k}`}: ${v};`).join('\n');
    const compiled = `:root {\n${cssVars}\n}`;
    return Ok({
      compiled,
      format: input.format,
      tokenCount: entries.length,
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

// ── RC2: Creative Intelligence Provider (Mock) ──
export class MockCreativeIntelligenceProvider implements ICreativeIntelligenceProvider {
  private presets = new Map<string, BrandDirection>();
  setPreset(key: string, dir: BrandDirection): void { this.presets.set(key, dir); }
  async generateBrandDirection(_t: string, input: BrandDirectionInput): Promise<Result<BrandDirection, Error>> {
    const preset = this.presets.get(input.industry);
    if (preset) return Ok(preset);
    // deterministic generation based on industry + positioning
    const isLuxury = input.positioning.toLowerCase().includes('luxury') || input.targetAudience.toLowerCase().includes('high income');
    return Ok({
      personality: isLuxury ? ['Luxury', 'Elegant', 'Refined'] : ['Approachable', 'Modern', 'Clean'],
      voice: isLuxury ? ['Warm', 'Confident', 'Sophisticated'] : ['Friendly', 'Direct', 'Clear'],
      emotion: isLuxury ? ['Trust', 'Calm', 'Aspiration'] : ['Confidence', 'Clarity', 'Delight'],
      designLanguage: isLuxury ? ['Premium', 'Editorial', 'Minimal'] : ['Functional', 'Contemporary', 'Structured'],
      recommendations: isLuxury
        ? ['Use generous whitespace', 'Editorial typography scale', 'Subtle motion only', 'AAA contrast compliance']
        : ['Use medium density', 'Clean sans-serif typography', 'Moderate motion', 'AA contrast compliance'],
    });
  }
}

// ── RC2: Component Theme Provider (Mock) ──
export class MockComponentThemeProvider implements IComponentThemeProvider {
  readonly notifications: { tenantId: string; themeId: string }[] = [];
  async notifyThemeChanged(tenantId: string, themeId: string): Promise<Result<void, Error>> {
    this.notifications.push({ tenantId, themeId });
    return Ok(undefined);
  }
}
