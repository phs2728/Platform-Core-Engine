/**
 * In-Memory Account Repository (테스트 + 개발용)
 * 사장님 확립 — Sprint 2C-2는 In-Memory로 시작, Phase 후속에서 DB (Postgres) 구현
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
  private readonly emailIndex = new Map<string, string>(); // "tenantId:email" -> accountId

  async insert(record: AccountRecord): Promise<void> {
    const key = `${record.tenantId}:${record.email}`;
    if (this.emailIndex.has(key)) {
      throw new ConflictError('Email already exists', {
        details: { resource: 'account', email: record.email },
      });
    }
    this.records.set(record.id, record);
    this.emailIndex.set(key, record.id);
  }

  async findByEmail(
    tenantId: string,
    email: string,
  ): Promise<Result<AccountRecord, NotFoundError>> {
    const key = `${tenantId}:${email}`;
    const id = this.emailIndex.get(key);
    if (!id) {
      return Err(new NotFoundError('Account not found', {
        details: { resource: 'account', email, tenantId },
      }));
    }
    const record = this.records.get(id);
    if (!record) {
      return Err(new NotFoundError('Account not found', {
        details: { resource: 'account', id },
      }));
    }
    return Ok(record);
  }

  async findById(
    tenantId: string,
    id: string,
  ): Promise<Result<AccountRecord, NotFoundError>> {
    const record = this.records.get(id);
    if (!record || record.tenantId !== tenantId) {
      return Err(new NotFoundError('Account not found', {
        details: { resource: 'account', id, tenantId },
      }));
    }
    return Ok(record);
  }

  /** 추가 메서드: Lock/Unlock (Sprint 2C-2-3) */
  async setLocked(id: string, lockedUntil: string | null): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      (record as any).lockedUntil = lockedUntil;
    }
  }

  async incrementFailedAttempts(id: string): Promise<number> {
    const record = this.records.get(id);
    if (!record) return 0;
    (record as any).failedAttempts = ((record as any).failedAttempts ?? 0) + 1;
    return (record as any).failedAttempts;
  }

  async resetFailedAttempts(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      (record as any).failedAttempts = 0;
      (record as any).lockedUntil = null;
    }
  }

  /** 추가 필드 (Sprint 2C-2 강화) */
  async setPassword(id: string, passwordHash: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.passwordHash = passwordHash;
      record.updatedAt = new Date().toISOString();
    }
  }

  async setEmailVerified(id: string, verified: boolean): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      (record as any).emailVerified = verified;
      record.updatedAt = new Date().toISOString();
    }
  }

  /** 모든 account (테스트용) */
  async all(): Promise<AccountRecord[]> {
    return Array.from(this.records.values());
  }
}

export interface AccountRecordExtended extends AccountRecord {
  lockedUntil?: string | null;
  failedAttempts?: number;
  emailVerified?: boolean;
}
