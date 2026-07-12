/**
 * Host Stubs + EventBus — Test/Demo only
 *
 * Catalog/Media Engine hostAdapters 패턴 동일.
 * Order Engine 전용 Verifier: Organization.
 */

import type { EventEnvelope } from '@platform/core-sdk';
import { Ok, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
  ICustomDataPolicyProvider,
} from '../interfaces/index.js';

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

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticOrderPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, {
    allowedTypes: readonly string[];
    maxOrders: number;
    defaultExpirySeconds: number;
    requiresApproval: boolean | ((orderType: string) => boolean);
  }>();

  set(tenantId: string, config: Partial<{
    allowedTypes: readonly string[];
    maxOrders: number;
    defaultExpirySeconds: number;
    requiresApproval: boolean | ((orderType: string) => boolean);
  }>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedTypes: config.allowedTypes ?? prev?.allowedTypes ?? ['standard'],
      maxOrders: config.maxOrders ?? prev?.maxOrders ?? 1000,
      defaultExpirySeconds: config.defaultExpirySeconds ?? prev?.defaultExpirySeconds ?? 86400,
      requiresApproval: config.requiresApproval ?? prev?.requiresApproval ?? false,
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

  async getAllowedOrderTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedTypes ?? ['standard'];
  }

  async getMaxOrdersPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxOrders ?? 1000;
  }

  async getDefaultExpirySeconds(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultExpirySeconds ?? 86400;
  }

  async requiresApproval(tenantId: string, orderType: string): Promise<boolean> {
    const cfg = this.tenantConfig.get(tenantId)?.requiresApproval ?? false;
    return typeof cfg === 'function' ? cfg(orderType) : cfg;
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
