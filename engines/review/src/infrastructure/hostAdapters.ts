/**
 * Host Stubs + EventBus — Test/Demo only
 */

import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
  IUserVerifier,
  IMediaVerifier,
  ITransactionVerifier,
  ICustomDataPolicyProvider,
  IModerationHook,
  ModerationVerdict,
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

export class InMemoryTransactionVerifier implements ITransactionVerifier {
  private store = new Set<string>();
  add(tenantId: string, refType: string, refId: string): void { this.store.add(`${tenantId}::${refType}::${refId}`); }
  async verify(tenantId: string, refType: string, refId: string): Promise<boolean> {
    return this.store.has(`${tenantId}::${refType}::${refId}`);
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticReviewPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, {
    allowedTypes: readonly string[];
    maxReviews: number;
    maxRating: number;
    autoModeration: boolean;
    allowDuplicate: boolean;
  }>();

  set(tenantId: string, config: Partial<{
    allowedTypes: readonly string[];
    maxReviews: number;
    maxRating: number;
    autoModeration: boolean;
    allowDuplicate: boolean;
  }>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedTypes: config.allowedTypes ?? prev?.allowedTypes ?? ['default'],
      maxReviews: config.maxReviews ?? prev?.maxReviews ?? 1000,
      maxRating: config.maxRating ?? prev?.maxRating ?? 5,
      autoModeration: config.autoModeration ?? prev?.autoModeration ?? false,
      allowDuplicate: config.allowDuplicate ?? prev?.allowDuplicate ?? false,
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

  async getAllowedReviewTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedTypes ?? ['default'];
  }

  async getMaxReviewsPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxReviews ?? 1000;
  }

  async getMaxRating(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxRating ?? 5;
  }

  async isAutoModerationEnabled(tenantId: string): Promise<boolean> {
    return this.tenantConfig.get(tenantId)?.autoModeration ?? false;
  }

  async isDuplicateReviewAllowed(tenantId: string): Promise<boolean> {
    return this.tenantConfig.get(tenantId)?.allowDuplicate ?? false;
  }

  clear(): void { this.tenantConfig.clear(); }
}

// ═══════════════════════════════════════════
// Moderation Hook (Mock)
// ═══════════════════════════════════════════

export class MockModerationHook implements IModerationHook {
  private autoApprove = true;

  setAutoApprove(value: boolean): void { this.autoApprove = value; }

  async moderate(
    _tenantId: string,
    _reviewId: string,
    _content: string,
  ): Promise<Result<ModerationVerdict, Error>> {
    if (this.autoApprove) {
      return Ok({ action: 'approve', reason: 'auto-approved', confidence: 0.99, categories: [] });
    }
    return Ok({ action: 'flag', reason: 'needs manual review', confidence: 0.5, categories: ['pending'] });
  }
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
