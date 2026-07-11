/**
 * In-Memory OAuth Account Repository (Epic 3, 8 — OAuth, Account Linking)
 */
import { Ok, Err } from '@platform/core-sdk';
import type { IOAuthAccountRepository, OAuthAccountRecord } from '../interfaces/index.js';

export class InMemoryOAuthAccountRepository implements IOAuthAccountRepository {
  private readonly records = new Map<string, OAuthAccountRecord>();
  private readonly providerIndex = new Map<string, string>();

  async insert(record: OAuthAccountRecord): Promise<void> {
    const key = `${record.tenantId}:${record.provider}:${record.providerUserId}`;
    this.records.set(record.id, record);
    this.providerIndex.set(key, record.id);
  }

  async findByProvider(tenantId: string, provider: string, providerUserId: string) {
    const key = `${tenantId}:${provider}:${providerUserId}`;
    const id = this.providerIndex.get(key);
    if (!id) return Err(new Error('Not found') as any);
    const record = this.records.get(id);
    if (!record || record.unlinkedAt) return Err(new Error('Not found') as any);
    return Ok(record);
  }

  async findByAccount(accountId: string): Promise<OAuthAccountRecord[]> {
    return Array.from(this.records.values()).filter(
      (r) => r.accountId === accountId && !r.unlinkedAt,
    );
  }

  async unlink(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.unlinkedAt = new Date().toISOString();
    }
  }

  async all(): Promise<OAuthAccountRecord[]> {
    return Array.from(this.records.values());
  }
}
