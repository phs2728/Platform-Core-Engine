/**
 * Host Stubs + EventBus — Test/Demo only
 *
 * Catalog/Pricing Engine hostAdapters 패턴 동일.
 * Billing Engine 전용 Verifier: Organization.
 * Policy: invoice types / max invoices / currency / due days.
 */

import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
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

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

interface BillingTenantConfig {
  allowedTypes: readonly string[];
  maxInvoicesPerOrg: number;
  defaultCurrency: string;
  defaultDueDays: number;
}

export class StaticBillingPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, BillingTenantConfig>();

  set(tenantId: string, config: Partial<BillingTenantConfig>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedTypes: config.allowedTypes ?? prev?.allowedTypes ?? ['standard'],
      maxInvoicesPerOrg: config.maxInvoicesPerOrg ?? prev?.maxInvoicesPerOrg ?? 1000,
      defaultCurrency: config.defaultCurrency ?? prev?.defaultCurrency ?? 'USD',
      defaultDueDays: config.defaultDueDays ?? prev?.defaultDueDays ?? 30,
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

  async getAllowedInvoiceTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedTypes ?? ['standard'];
  }

  async getMaxInvoicesPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxInvoicesPerOrg ?? 1000;
  }

  async getDefaultCurrency(tenantId: string): Promise<string> {
    return this.tenantConfig.get(tenantId)?.defaultCurrency ?? 'USD';
  }

  async getDefaultDueDays(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultDueDays ?? 30;
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
