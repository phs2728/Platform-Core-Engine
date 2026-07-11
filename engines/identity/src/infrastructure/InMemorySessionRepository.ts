/**
 * In-Memory Session Repository (테스트 + 개발용)
 */

import {
  Ok,
  Err,
  NotFoundError,
  type Result,
} from '@platform/core-sdk';
import type { ISessionRepository, SessionRecord } from '../interfaces/index.js';

export class InMemorySessionRepository implements ISessionRepository {
  private readonly records = new Map<string, SessionRecord>();
  private readonly tokenIndex = new Map<string, string>(); // token -> id

  async insert(record: SessionRecord): Promise<void> {
    if (this.tokenIndex.has(record.token)) {
      throw new Error('Session token already exists');
    }
    this.records.set(record.id, record);
    this.tokenIndex.set(record.token, record.id);
  }

  async findByToken(token: string): Promise<Result<SessionRecord, NotFoundError>> {
    const id = this.tokenIndex.get(token);
    if (!id) {
      return Err(new NotFoundError('Session not found', { details: { resource: 'session' } }));
    }
    const record = this.records.get(id);
    if (!record) {
      return Err(new NotFoundError('Session not found', { details: { resource: 'session', id } }));
    }
    return Ok(record);
  }

  async delete(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      this.tokenIndex.delete(record.token);
      this.records.delete(id);
    }
  }

  async deleteByAccountId(accountId: string): Promise<void> {
    for (const [id, record] of this.records) {
      if (record.accountId === accountId) {
        this.tokenIndex.delete(record.token);
        this.records.delete(id);
      }
    }
  }

  /** Sprint 2C-2-4: Session Rotation */
  async rotate(oldSessionId: string, newRecord: SessionRecord): Promise<void> {
    await this.delete(oldSessionId);
    await this.insert(newRecord);
  }

  async findByAccountId(accountId: string): Promise<SessionRecord[]> {
    return Array.from(this.records.values()).filter((r) => r.accountId === accountId);
  }

  async all(): Promise<SessionRecord[]> {
    return Array.from(this.records.values());
  }
}
