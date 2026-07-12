/**
 * Host Stubs + EventBus — Test/Demo only
 *
 * Billing/Catalog Engine hostAdapters 패턴 동일.
 * Workflow Engine 전용 Verifier: Organization + User + Identity.
 * Policy: workflow types / max workflows / SLA / timer TTL.
 */

import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
  IUserVerifier,
  IIdentityVerifier,
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

export class InMemoryUserVerifier implements IUserVerifier {
  private store = new Set<string>();
  add(tenantId: string, userId: string): void { this.store.add(`${tenantId}::${userId}`); }
  async verify(tenantId: string, userId: string): Promise<boolean> {
    return this.store.has(`${tenantId}::${userId}`);
  }
  clear(): void { this.store.clear(); }
}

export class InMemoryIdentityVerifier implements IIdentityVerifier {
  private store = new Set<string>();
  add(tenantId: string, identityId: string): void { this.store.add(`${tenantId}::${identityId}`); }
  async verify(tenantId: string, identityId: string): Promise<boolean> {
    return this.store.has(`${tenantId}::${identityId}`);
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

interface WorkflowTenantConfig {
  allowedTypes: readonly string[];
  maxWorkflowsPerOrg: number;
  defaultSlaMinutes: number;
  defaultTimerTtlSeconds: number;
}

export class StaticWorkflowPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, WorkflowTenantConfig>();

  set(tenantId: string, config: Partial<WorkflowTenantConfig>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedTypes: config.allowedTypes ?? prev?.allowedTypes ?? ['approval', 'sequential', 'parallel'],
      maxWorkflowsPerOrg: config.maxWorkflowsPerOrg ?? prev?.maxWorkflowsPerOrg ?? 500,
      defaultSlaMinutes: config.defaultSlaMinutes ?? prev?.defaultSlaMinutes ?? 1440,
      defaultTimerTtlSeconds: config.defaultTimerTtlSeconds ?? prev?.defaultTimerTtlSeconds ?? 3600,
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

  async getAllowedWorkflowTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedTypes ?? ['approval', 'sequential', 'parallel'];
  }

  async getMaxWorkflowsPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxWorkflowsPerOrg ?? 500;
  }

  async getDefaultSlaMinutes(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultSlaMinutes ?? 1440;
  }

  async getDefaultTimerTtlSeconds(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultTimerTtlSeconds ?? 3600;
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
