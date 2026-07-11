/**
 * In-Memory Account Repository (테스트 + 개발용)
 *
 * Sprint 2C-3: Full AccountRecord with all Epic fields.
 * - update(id, patch) replaces individual setters (setLocked/setPassword/etc.)
 * - emailIndex + phoneIndex for uniqueness lookups
 */

import {
  Ok,
  Err,
  NotFoundError,
  ConflictError,
  type Result,
} from '@platform/core-sdk';
import type { IAccountRepository, AccountRecord } from '../interfaces/index.js';

export class InMemoryAccountRepository implements IAccountRepository {
  private readonly records = new Map<string, AccountRecord>();
  private readonly emailIndex = new Map<string, string>(); // "tenantId:email" -> id
  private readonly phoneIndex = new Map<string, string>(); // "tenantId:phone" -> id

  async insert(record: AccountRecord): Promise<void> {
    const emailKey = `${record.tenantId}:${record.email}`;
    if (this.emailIndex.has(emailKey)) {
      throw new ConflictError('Email already exists', {
        details: { resource: 'account', email: record.email },
      });
    }
    this.records.set(record.id, record);
    this.emailIndex.set(emailKey, record.id);
    if (record.phone) {
      this.phoneIndex.set(`${record.tenantId}:${record.phone}`, record.id);
    }
  }

  async findByEmail(
    tenantId: string,
    email: string,
  ): Promise<Result<AccountRecord, Error>> {
    const key = `${tenantId}:${email}`;
    const id = this.emailIndex.get(key);
    if (!id) {
      return Err(
        new NotFoundError('Account not found', {
          details: { resource: 'account', email, tenantId },
        }),
      );
    }
    const record = this.records.get(id);
    if (!record) {
      return Err(
        new NotFoundError('Account not found', {
          details: { resource: 'account', id },
        }),
      );
    }
    return Ok(record);
  }

  async findByPhone(
    tenantId: string,
    phone: string,
  ): Promise<Result<AccountRecord, Error>> {
    const key = `${tenantId}:${phone}`;
    const id = this.phoneIndex.get(key);
    if (!id) {
      return Err(
        new NotFoundError('Account not found', {
          details: { resource: 'account', phone, tenantId },
        }),
      );
    }
    const record = this.records.get(id);
    if (!record) {
      return Err(
        new NotFoundError('Account not found', {
          details: { resource: 'account', id },
        }),
      );
    }
    return Ok(record);
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<Result<AccountRecord, Error>> {
    const record = this.records.get(id);
    if (!record || record.tenantId !== tenantId) {
      return Err(
        new NotFoundError('Account not found', {
          details: { resource: 'account', id, tenantId },
        }),
      );
    }
    return Ok(record);
  }

  async update(id: string, patch: Partial<AccountRecord>): Promise<void> {
    const record = this.records.get(id);
    if (!record) return;

    // Update email index if email changed
    if (patch.email !== undefined && patch.email !== record.email) {
      const oldKey = `${record.tenantId}:${record.email}`;
      this.emailIndex.delete(oldKey);
      this.emailIndex.set(`${record.tenantId}:${patch.email}`, id);
    }
    // Update phone index if phone changed
    if (patch.phone !== undefined && patch.phone !== record.phone) {
      if (record.phone) {
        this.phoneIndex.delete(`${record.tenantId}:${record.phone}`);
      }
      if (patch.phone) {
        this.phoneIndex.set(`${record.tenantId}:${patch.phone}`, id);
      }
    }

    this.records.set(id, { ...record, ...patch });
  }

  async incrementFailedAttempts(id: string): Promise<number> {
    const record = this.records.get(id);
    if (!record) return 0;
    const newCount = record.failedAttempts + 1;
    this.records.set(id, { ...record, failedAttempts: newCount });
    return newCount;
  }

  async resetFailedAttempts(id: string): Promise<void> {
    const record = this.records.get(id);
    if (!record) return;
    this.records.set(id, {
      ...record,
      failedAttempts: 0,
      lockedUntil: null,
    });
  }

  /** Test helper */
  async all(): Promise<AccountRecord[]> {
    return Array.from(this.records.values());
  }
}
