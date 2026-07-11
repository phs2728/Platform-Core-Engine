/**
 * Host Stubs + EventBus — Test/Demo only
 *
 * Catalog Engine hostAdapters 패턴 동일.
 * Pricing Engine 전용 Verifier: Organization, Catalog.
 */

import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
  ICatalogVerifier,
  ICustomDataPolicyProvider,
} from '../interfaces/index.js';
import { Ok, type Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Verifiers
// ═══════════════════════════════════════════

export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(tenantId: string, orgId: string): void { this.store.add(`${tenantId}::${orgId}`); }
  async verify(tenantId: string, orgId: string): Promise<boolean> {
    return this.store.has(`${tenantId}::${orgId}`);
  }
  clear(): void { this.store.clear(); }
}

export class InMemoryCatalogVerifier implements ICatalogVerifier {
  private store = new Set<string>();
  add(tenantId: string, catalogId: string): void { this.store.add(`${tenantId}::${catalogId}`); }
  async verify(tenantId: string, catalogId: string): Promise<boolean> {
    return this.store.has(`${tenantId}::${catalogId}`);
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticPricingPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, {
    allowedPlanTypes: readonly string[];
    maxPlansPerOrg: number;
    allowedCurrencies: readonly string[];
  }>();

  set(tenantId: string, config: Partial<{
    allowedPlanTypes: readonly string[];
    maxPlansPerOrg: number;
    allowedCurrencies: readonly string[];
  }>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedPlanTypes: config.allowedPlanTypes ?? prev?.allowedPlanTypes ?? ['standard'],
      maxPlansPerOrg: config.maxPlansPerOrg ?? prev?.maxPlansPerOrg ?? 100,
      allowedCurrencies: config.allowedCurrencies ?? prev?.allowedCurrencies ?? ['USD'],
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

  async getAllowedPlanTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedPlanTypes ?? ['standard'];
  }

  async getMaxPlansPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxPlansPerOrg ?? 100;
  }

  async getAllowedCurrencies(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedCurrencies ?? ['USD'];
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
