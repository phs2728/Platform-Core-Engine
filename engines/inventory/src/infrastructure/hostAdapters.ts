/**
 * Host Stubs + EventBus — Test/Demo only
 */

import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
  ICatalogVerifier,
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

export class InMemoryCatalogVerifier implements ICatalogVerifier {
  private itemStore = new Set<string>();
  private variantStore = new Set<string>();

  addItem(tenantId: string, itemId: string): void { this.itemStore.add(`${tenantId}::${itemId}`); }
  addVariant(tenantId: string, variantId: string): void { this.variantStore.add(`${tenantId}::${variantId}`); }
  add(tenantId: string, itemId: string, variantId?: string): void {
    this.itemStore.add(`${tenantId}::${itemId}`);
    if (variantId !== undefined) this.variantStore.add(`${tenantId}::${variantId}`);
  }

  async verifyItem(tenantId: string, itemId: string): Promise<boolean> {
    return this.itemStore.has(`${tenantId}::${itemId}`);
  }

  async verifyVariant(tenantId: string, variantId: string): Promise<boolean> {
    return this.variantStore.has(`${tenantId}::${variantId}`);
  }

  clear(): void { this.itemStore.clear(); this.variantStore.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticInventoryPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, {
    allowedTypes: readonly string[];
    maxInventories: number;
    defaultReservationTtlSeconds: number;
    defaultSafetyStock: number;
  }>();

  set(tenantId: string, config: Partial<{
    allowedTypes: readonly string[];
    maxInventories: number;
    defaultReservationTtlSeconds: number;
    defaultSafetyStock: number;
  }>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedTypes: config.allowedTypes ?? prev?.allowedTypes ?? ['default'],
      maxInventories: config.maxInventories ?? prev?.maxInventories ?? 100,
      defaultReservationTtlSeconds: config.defaultReservationTtlSeconds ?? prev?.defaultReservationTtlSeconds ?? 900,
      defaultSafetyStock: config.defaultSafetyStock ?? prev?.defaultSafetyStock ?? 0,
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

  async getAllowedInventoryTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedTypes ?? ['default'];
  }

  async getMaxInventoriesPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxInventories ?? 100;
  }

  async getDefaultReservationTtlSeconds(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultReservationTtlSeconds ?? 900;
  }

  async getDefaultSafetyStock(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultSafetyStock ?? 0;
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
