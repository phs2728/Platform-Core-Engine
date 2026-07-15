/**
 * Experience Engine — Host Adapters (Test/Demo only)
 *
 * Mock providers and resolvers. In production, Host provides real
 * implementations of these interfaces.
 */
import type { EventEnvelope } from '@platform/core-sdk';
import { Ok, Err, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier, IPolicyProvider,
  IMediaReferenceResolver, ISearchIntegration, IAIRecommendationEngine,
  MediaReference, RecommendationResult,
} from '../interfaces/index.js';

export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(t: string, o: string): void { this.store.add(`${t}::${o}`); }
  async verify(t: string, o: string): Promise<boolean> { return this.store.has(`${t}::${o}`); }
  clear(): void { this.store.clear(); }
}

export class StaticExperiencePolicyProvider implements IPolicyProvider {
  private cfg = new Map<string, { maxExperiences: number; allowedTypes: readonly string[] }>();
  set(t: string, c: Partial<{ maxExperiences: number; allowedTypes: readonly string[] }>): void {
    const prev = this.cfg.get(t);
    this.cfg.set(t, {
      maxExperiences: c.maxExperiences ?? prev?.maxExperiences ?? 100,
      allowedTypes: c.allowedTypes ?? prev?.allowedTypes ?? [
        'Landing','Dashboard','Catalog','Detail','Search','Checkout','Profile','Admin','Workspace','Wizard',
      ],
    });
  }
  async validateAttributes(_t: string, _type: string, attr: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> {
    return Ok(attr);
  }
  async getMaxExperiencesPerOrg(t: string): Promise<number> {
    return this.cfg.get(t)?.maxExperiences ?? 100;
  }
  async getAllowedLayoutTypes(t: string): Promise<readonly string[]> {
    return this.cfg.get(t)?.allowedTypes ?? ['Landing','Dashboard','Catalog','Detail','Search','Checkout','Profile','Admin','Workspace','Wizard'];
  }
  clear(): void { this.cfg.clear(); }
}

export class InMemoryMediaResolver implements IMediaReferenceResolver {
  private byId = new Map<string, MediaReference>();
  register(ref: MediaReference): void { this.byId.set(ref.id, { ...ref }); }
  async resolve(_tenantId: string, mediaRefId: string): Promise<Result<MediaReference, Error>> {
    const r = this.byId.get(mediaRefId);
    return r ? Ok(r) : Err(new Error(`Media reference not found: ${mediaRefId}`));
  }
  clear(): void { this.byId.clear(); }
}

export class InMemorySearchIntegration implements ISearchIntegration {
  private corpus = new Map<string, string[]>();
  index(tenantId: string, docId: string, terms: string[]): void {
    const k = `${tenantId}::${docId}`;
    this.corpus.set(k, terms);
  }
  async search(tenantId: string, query: string, options?: { limit?: number; offset?: number }): Promise<Result<{ hits: unknown[]; total: number }, Error>> {
    const terms = query.toLowerCase().split(/\s+/);
    const hits: unknown[] = [];
    for (const [k, docTerms] of this.corpus.entries()) {
      if (!k.startsWith(`${tenantId}::`)) continue;
      if (terms.some((t) => docTerms.some((d) => d.toLowerCase().includes(t)))) {
        hits.push({ docId: k.split('::')[1] });
      }
    }
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 10;
    return Ok({ hits: hits.slice(offset, offset + limit), total: hits.length });
  }
  clear(): void { this.corpus.clear(); }
}

export class InMemoryAIEngine implements IAIRecommendationEngine {
  async recommend(tenantId: string, experienceId: string, _context?: Record<string, unknown>): Promise<Result<RecommendationResult, Error>> {
    const id = `rec-${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    return Ok({
      id, tenantId, experienceId,
      recommendations: [
        { section: 'Hero', reference: 'hero.primary', score: 0.95 },
        { section: 'Banner', reference: 'banner.welcome', score: 0.85 },
        { section: 'Layout', reference: 'layout.default', score: 0.78 },
      ],
      generatedAt: now,
    });
  }
}

export interface RecordedEnvelope<T = unknown> { envelope: EventEnvelope<T>; recordedAt: number; }
export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];
  async emit<T>(e: EventEnvelope<T>): Promise<void> { this.emitted.push({ envelope: e, recordedAt: Date.now() }); }
  byType(t: string): RecordedEnvelope[] { return this.emitted.filter((r) => r.envelope.eventType === t); }
  countByType(t: string): number { return this.byType(t).length; }
  clear(): void { this.emitted.length = 0; }
}
