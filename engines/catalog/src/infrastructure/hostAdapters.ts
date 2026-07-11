/**
 * Host Stubs + EventBus — Test/Demo only
 */

import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
  IUserVerifier,
  IMediaVerifier,
  IPricingVerifier,
  ICustomDataPolicyProvider,
} from '../interfaces/index.js';
import { Ok, Err, type Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Verifiers
// ═══════════════════════════════════════════

export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(tenantId: string, orgId: string): void { this.store.add(`${tenantId}::${orgId}`); }
  async verify(tenantId: string, orgId: string): Promise<boolean> { return this.store.has(`${tenantId}::${orgId}`); }
  clear(): void { this.store.clear(); }
}

export class InMemoryUserVerifier implements IUserVerifier {
  private store = new Set<string>();
  add(tenantId: string, userId: string): void { this.store.add(`${tenantId}::${userId}`); }
  async verify(tenantId: string, userId: string): Promise<boolean> { return this.store.has(`${tenantId}::${userId}`); }
  clear(): void { this.store.clear(); }
}

export class InMemoryMediaVerifier implements IMediaVerifier {
  private store = new Set<string>();
  add(tenantId: string, mediaId: string): void { this.store.add(`${tenantId}::${mediaId}`); }
  async verify(tenantId: string, mediaId: string): Promise<boolean> { return this.store.has(`${tenantId}::${mediaId}`); }
  clear(): void { this.store.clear(); }
}

export class InMemoryPricingVerifier implements IPricingVerifier {
  private store = new Set<string>();
  add(tenantId: string, pricingId: string): void { this.store.add(`${tenantId}::${pricingId}`); }
  async verify(tenantId: string, pricingId: string): Promise<boolean> { return this.store.has(`${tenantId}::${pricingId}`); }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticCatalogPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, {
    allowedTypes: readonly string[];
    maxCatalogs: number;
    maxCategories: number;
    maxVariants: number;
    maxBundles: number;
  }>();

  set(tenantId: string, config: Partial<{
    allowedTypes: readonly string[];
    maxCatalogs: number;
    maxCategories: number;
    maxVariants: number;
    maxBundles: number;
  }>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedTypes: config.allowedTypes ?? prev?.allowedTypes ?? ['default'],
      maxCatalogs: config.maxCatalogs ?? prev?.maxCatalogs ?? 100,
      maxCategories: config.maxCategories ?? prev?.maxCategories ?? 200,
      maxVariants: config.maxVariants ?? prev?.maxVariants ?? 50,
      maxBundles: config.maxBundles ?? prev?.maxBundles ?? 100,
    });
  }

  async validateAttributes(
    _tenantId: string,
    _type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>> {
    // Sprint 1: pass-through (Host가 진짜 validation 구현)
    return Ok(attributes);
  }

  async getAllowedTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedTypes ?? ['default'];
  }

  async getMaxCatalogsPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxCatalogs ?? 100;
  }

  async getMaxCategoriesPerCatalog(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxCategories ?? 200;
  }

  async getMaxVariantsPerItem(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxVariants ?? 50;
  }

  async getMaxBundlesPerCatalog(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxBundles ?? 100;
  }

  clear(): void { this.tenantConfig.clear(); }
}

// ═══════════════════════════════════════════
// EventBus
// ═══════════════════════════════════════════

export interface RecordedEnvelope<T = unknown> {
  envelope: EventEnvelope<T>;
  recordedAt: number;
}

export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];

  async emit<T>(envelope: EventEnvelope<T>): Promise<void> {
    this.emitted.push({ envelope, recordedAt: Date.now() });
  }

  byType(eventType: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.eventType === eventType);
  }

  byAggregate(aggregateId: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.aggregateId === aggregateId);
  }

  countByType(eventType: string): number {
    return this.byType(eventType).length;
  }

  clear(): void { this.emitted.length = 0; }
}
