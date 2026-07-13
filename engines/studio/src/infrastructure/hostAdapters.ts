/**
 * Studio Engine — Host Adapters (Test/Demo only)
 *
 * Mock read-only readers for Theme, Component, CMS.
 * Sprint D 원칙 2: Studio는 read-only API만 사용.
 */
import { Ok, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier, IPolicyProvider,
  IThemeReaderForStudio, ResolvedManifest,
  IComponentReaderForStudio, ComponentManifest,
  ICMSReaderForStudio, PageRef, ContentRef,
} from '../interfaces/index.js';

// ── Organization Verifier ──
export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

// ── Policy Provider ──
export class StaticStudioPolicyProvider implements IPolicyProvider {
  private cfg = new Map<string, { maxWorkspaces: number }>();
  set(t: string, c: Partial<{ maxWorkspaces: number }>): void { this.cfg.set(t, { maxWorkspaces: c.maxWorkspaces ?? 50 }); }
  async validateAttributes(_t: string, _type: string, attr: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> { return Ok(attr); }
  async getMaxWorkspacesPerOrg(t: string): Promise<number> { return this.cfg.get(t)?.maxWorkspaces ?? 50; }
  clear(): void { this.cfg.clear(); }
}

// ── Theme Reader (read-only) ──
export class MockStudioThemeReader implements IThemeReaderForStudio {
  private store = new Map<string, ResolvedManifest>();
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
    return Ok({
      manifestId: `manifest-${themeId}`, themeId, brandId: `brand-${themeId}`, version: '1.0.0',
      resolvedTokens: { '--brand-whitespace': 'medium', '--brand-wcag-level': 'AA' },
      manifestHash: `hash-${themeId.length}-${themeId.charCodeAt(0)}`,
    });
  }
}

// ── Component Reader (read-only) ──
export class MockStudioComponentReader implements IComponentReaderForStudio {
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
      componentType: 'Generic', tier: 'Atomic', defaultProps: {}, version: '1.0.0',
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

// ── CMS Reader (read-only) ──
export class MockStudioCMSReader implements ICMSReaderForStudio {
  private pages = new Map<string, PageRef>();
  private contents = new Map<string, ContentRef>();
  strictMode = false;
  addPage(tenantId: string, pageId: string, page: PageRef): void { this.pages.set(`${tenantId}::${pageId}`, page); }
  addContent(tenantId: string, contentId: string, content: ContentRef): void { this.contents.set(`${tenantId}::${contentId}`, content); }
  clear(): void { this.pages.clear(); this.contents.clear(); }
  async getPage(tenantId: string, pageId: string): Promise<Result<PageRef, Error>> {
    const key = `${tenantId}::${pageId}`;
    const r = this.pages.get(key);
    if (r) return Ok(r);
    if (this.strictMode) return Ok({ pageId, slug: '', title: '', status: 'NotFound' });
    return Ok({ pageId, slug: pageId, title: 'Mock Page', status: 'Draft' });
  }
  async listContent(tenantId: string, type: string): Promise<Result<ContentRef[], Error>> {
    const results: ContentRef[] = [];
    const tenantPrefix = `${tenantId}::`;
    this.contents.forEach((c, key) => {
      if (key.startsWith(tenantPrefix) && c.type === type) results.push({ ...c });
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