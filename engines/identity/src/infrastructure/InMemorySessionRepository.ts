/**
 * In-Memory Session Repository (Epic 5 — Session Management)
 */

import { Ok, Err } from '@platform/core-sdk';
import type {
  ISessionRepository,
  SessionRecord,
} from '../interfaces/index.js';

export class InMemorySessionRepository implements ISessionRepository {
  private readonly records = new Map<string, SessionRecord>();
  private readonly tokenIndex = new Map<string, string>();

  async insert(record: SessionRecord): Promise<void> {
    this.records.set(record.id, record);
    this.tokenIndex.set(record.token, record.id);
  }

  async findByToken(token: string) {
    const id = this.tokenIndex.get(token);
    if (!id) return Err(new Error('Not found') as any);
    const record = this.records.get(id);
    return record ? Ok(record) : Err(new Error('Not found') as any);
  }

  async findById(id: string) {
    const record = this.records.get(id);
    return record ? Ok(record) : Err(new Error('Not found') as any);
  }

  async findByAccountId(accountId: string): Promise<SessionRecord[]> {
    return Array.from(this.records.values()).filter((r) => r.accountId === accountId);
  }

  async delete(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      this.tokenIndex.delete(record.token);
      this.records.delete(id);
    }
  }

  async deleteByAccountId(accountId: string): Promise<number> {
    let count = 0;
    for (const [id, record] of this.records) {
      if (record.accountId === accountId) {
        this.tokenIndex.delete(record.token);
        this.records.delete(id);
        count++;
      }
    }
    return count;
  }

  async update(id: string, patch: Partial<SessionRecord>): Promise<void> {
    const record = this.records.get(id);
    if (!record) return;
    if (patch.token) {
      this.tokenIndex.delete(record.token);
      this.tokenIndex.set(patch.token, id);
    }
    Object.assign(record, patch);
  }

  async all(): Promise<SessionRecord[]> {
    return Array.from(this.records.values());
  }
}
