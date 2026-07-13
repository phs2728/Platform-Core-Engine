/**
 * CMS Engine — Host Adapters (Test/Demo only)
 *
 * Mock providers that simulate real Theme/Component engines as read-only sources.
 * Sprint C 원칙 2: CMS는 read-only API만 사용.
 */
import { Ok, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier, IPolicyProvider,
  IThemeManifestReader, ResolvedManifest,
  IComponentReader, ComponentManifest,
} from '../interfaces/index.js';

// ── Organization Verifier ──
export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

// ── Policy Provider ──
export class StaticCMSPolicyProvider implements IPolicyProvider {
  private cfg = new Map<string, { maxPages: number }>();
  set(t: string, c: Partial<{ maxPages: number }>): void { this.cfg.set(t, { maxPages: c.maxPages ?? 100 }); }
  async validateAttributes(_t: string, _type: string, attr: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> { return Ok(attr); }
  async getMaxPagesPerOrg(t: string): Promise<number> { return this.cfg.get(t)?.maxPages ?? 100; }
  clear(): void { this.cfg.clear(); }
}

// ── Theme Manifest Reader (read-only) ──
export class MockThemeManifestReader implements IThemeManifestReader {
  private store = new Map<string, ResolvedManifest>();
  /** strictMode=true: only set() entries are valid; unknown → Err (default false for backward compat) */
  strictMode = false;
  set(tenantId: string, themeId: string, manifest: ResolvedManifest): void {
    this.store.set(`${tenantId}::${themeId}`, manifest);
  }
  clear(): void { this.store.clear(); }
  async resolveThemeManifest(tenantId: string, themeId: string): Promise<Result<ResolvedManifest, Error>> {
    const key = `${tenantId}::${themeId}`;
    const r = this.store.get(key);
    if (r) return Ok(r);
    if (this.strictMode) return Ok({ manifestId: '', themeId, brandId: '', version: '', resolvedTokens: {}, manifestHash: '' });
    // Deterministic default (backward compat)
    return Ok({
      manifestId: `manifest-${themeId}`,
      themeId,
      brandId: `brand-${themeId}`,
      version: '1.0.0',
      resolvedTokens: {
        '--brand-whitespace': 'medium',
        '--brand-hierarchy': 'moderate',
        '--brand-density': 'medium',
        '--brand-motion-intensity': 'subtle',
        '--brand-wcag-level': 'AA',
      },
      manifestHash: `hash-${themeId.length}-${themeId.charCodeAt(0)}`,
    });
  }
}

// ── Component Reader (read-only) ──
export class MockComponentReader implements IComponentReader {
  private store = new Map<string, ComponentManifest>();
  strictMode = false;
  set(tenantId: string, componentId: string, manifest: ComponentManifest): void {
    this.store.set(`${tenantId}::${componentId}`, manifest);
  }
  clear(): void { this.store.clear(); }
  async getComponent(tenantId: string, componentId: string): Promise<Result<ComponentManifest, Error>> {
    const key = `${tenantId}::${componentId}`;
    const r = this.store.get(key);
    if (r) return Ok(r);
    if (this.strictMode) return Ok({ tenantId, componentId, name: '', slug: '', componentType: '', tier: 'Atomic', defaultProps: {}, version: '' });
    return Ok({
      tenantId, componentId, name: 'Mock Component', slug: componentId,
      componentType: 'Generic', tier: 'Atomic',
      defaultProps: {}, version: '1.0.0',
    });
  }
  async listComponentsByType(tenantId: string, componentType: string): Promise<Result<ComponentManifest[], Error>> {
    const results: ComponentManifest[] = [];
    this.store.forEach(c => {
      if (c.tenantId === tenantId && c.componentType === componentType) results.push({ ...c });
    });
    return Ok(results);
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