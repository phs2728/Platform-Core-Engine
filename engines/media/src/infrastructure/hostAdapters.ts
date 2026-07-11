/**
 * Host Stubs + EventBus + Storage Provider — Test/Demo only
 */

import type { EventEnvelope } from '@platform/core-sdk';
import { Ok, Err, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
  ICustomDataPolicyProvider,
  IStorageProvider,
  IStorageProviderResolver,
  StorageMetadata,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Verifiers
// ═══════════════════════════════════════════

export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(tenantId: string, orgId: string): void { this.store.add(`${tenantId}::${orgId}`); }
  async verify(tenantId: string, orgId: string): Promise<boolean> { return this.store.has(`${tenantId}::${orgId}`); }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticMediaPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, {
    allowedAssetTypes: readonly string[];
    maxAssets: number;
    maxVariants: number;
    maxCollections: number;
  }>();

  set(tenantId: string, config: Partial<{
    allowedAssetTypes: readonly string[];
    maxAssets: number;
    maxVariants: number;
    maxCollections: number;
  }>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedAssetTypes: config.allowedAssetTypes ?? prev?.allowedAssetTypes ?? ['image', 'video', 'audio', 'document'],
      maxAssets: config.maxAssets ?? prev?.maxAssets ?? 1000,
      maxVariants: config.maxVariants ?? prev?.maxVariants ?? 20,
      maxCollections: config.maxCollections ?? prev?.maxCollections ?? 100,
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

  async getAllowedAssetTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedAssetTypes ?? ['image', 'video', 'audio', 'document'];
  }

  async getMaxAssetsPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxAssets ?? 1000;
  }

  async getMaxVariantsPerAsset(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxVariants ?? 20;
  }

  async getMaxCollectionsPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxCollections ?? 100;
  }

  clear(): void { this.tenantConfig.clear(); }
}

// ═══════════════════════════════════════════
// Storage Provider (In-Memory simulation)
// ═══════════════════════════════════════════

export class InMemoryStorageProvider implements IStorageProvider {
  readonly providerId = 'in-mem';
  readonly providerType = 'memory';
  private store = new Map<string, { data: Uint8Array; mimeType: string; storedAt: number }>();

  async upload(
    providerKey: string,
    data: Uint8Array,
    mimeType: string,
  ): Promise<Result<{ key: string; sizeBytes: number }, Error>> {
    if (!providerKey) {
      return Err(new Error('providerKey is required'));
    }
    // Copy bytes to avoid external mutation
    const copy = new Uint8Array(data.length);
    copy.set(data);
    this.store.set(providerKey, { data: copy, mimeType, storedAt: Date.now() });
    return Ok({ key: providerKey, sizeBytes: copy.length });
  }

  async download(providerKey: string): Promise<Result<Uint8Array, Error>> {
    const entry = this.store.get(providerKey);
    if (!entry) {
      return Err(new Error(`Storage object not found: ${providerKey}`));
    }
    // Return a copy to prevent external mutation
    const copy = new Uint8Array(entry.data.length);
    copy.set(entry.data);
    return Ok(copy);
  }

  async delete(providerKey: string): Promise<Result<void, Error>> {
    if (!this.store.has(providerKey)) {
      return Err(new Error(`Storage object not found: ${providerKey}`));
    }
    this.store.delete(providerKey);
    return Ok(undefined);
  }

  async generateSignedUrl(providerKey: string, _ttlSeconds: number): Promise<Result<string, Error>> {
    if (!this.store.has(providerKey)) {
      return Err(new Error(`Storage object not found: ${providerKey}`));
    }
    // Fake URL — test/demo only
    const token = Math.random().toString(36).slice(2);
    return Ok(`memory://localhost/${encodeURIComponent(providerKey)}?token=${token}`);
  }

  async exists(providerKey: string): Promise<Result<boolean, Error>> {
    return Ok(this.store.has(providerKey));
  }

  async getMetadata(providerKey: string): Promise<Result<StorageMetadata, Error>> {
    const entry = this.store.get(providerKey);
    if (!entry) {
      return Err(new Error(`Storage object not found: ${providerKey}`));
    }
    const metadata: StorageMetadata = {
      sizeBytes: entry.data.length,
      mimeType: entry.mimeType,
      lastModified: new Date(entry.storedAt).toISOString(),
    };
    return Ok(metadata);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// Storage Provider Resolver
// ═══════════════════════════════════════════

export class InMemoryStorageProviderResolver implements IStorageProviderResolver {
  private readonly defaultProvider: InMemoryStorageProvider;
  private readonly providers = new Map<string, IStorageProvider>();

  constructor(provider?: InMemoryStorageProvider) {
    this.defaultProvider = provider ?? new InMemoryStorageProvider();
    this.providers.set(this.defaultProvider.providerId, this.defaultProvider);
  }

  async resolve(providerId: string): Promise<Result<IStorageProvider, Error>> {
    const p = this.providers.get(providerId);
    if (!p) {
      return Err(new Error(`Unknown storage provider: ${providerId}`));
    }
    return Ok(p);
  }

  async getDefault(_tenantId: string): Promise<Result<IStorageProvider, Error>> {
    return Ok(this.defaultProvider);
  }

  register(provider: IStorageProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  clear(): void {
    for (const p of this.providers.values()) {
      if (p instanceof InMemoryStorageProvider) p.clear();
    }
    this.providers.clear();
    this.providers.set(this.defaultProvider.providerId, this.defaultProvider);
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
