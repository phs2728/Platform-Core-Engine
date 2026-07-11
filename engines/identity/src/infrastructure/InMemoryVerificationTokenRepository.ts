/**
 * In-Memory Verification Token Repository (Epic 1 — Verification)
 * 사장님 확립: Token Hash만 저장 (raw Token ❌)
 */

import { createHash } from 'node:crypto';
import type {
  IVerificationTokenRepository,
  VerificationTokenRecord,
  VerificationPurpose,
} from '../interfaces/index.js';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class InMemoryVerificationTokenRepository implements IVerificationTokenRepository {
  private readonly records = new Map<string, VerificationTokenRecord>();
  private readonly otpIndex = new Map<string, string>(); // "target:purpose" -> tokenHash

  async insert(record: Omit<VerificationTokenRecord, 'tokenHash'> & { rawToken: string }): Promise<{ tokenHash: string }> {
    const tokenHash = hashToken(record.rawToken);
    const full: VerificationTokenRecord = {
      tokenHash,
      accountId: record.accountId,
      tenantId: record.tenantId,
      channel: record.channel,
      purpose: record.purpose,
      code: null,
      target: record.target,
      expiresAt: record.expiresAt,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    };
    this.records.set(tokenHash, full);
    return { tokenHash };
  }

  async insertOtp(record: Omit<VerificationTokenRecord, 'tokenHash' | 'code'> & { code: string }): Promise<void> {
    const otpKey = `${record.target}:${record.purpose}`;
    const tokenHash = hashToken(record.code + ':' + record.target);
    const full: VerificationTokenRecord = {
      tokenHash,
      accountId: record.accountId,
      tenantId: record.tenantId,
      channel: record.channel,
      purpose: record.purpose,
      code: record.code,
      target: record.target,
      expiresAt: record.expiresAt,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    };
    this.records.set(tokenHash, full);
    this.otpIndex.set(otpKey, tokenHash);
  }

  async findByHash(tokenHash: string): Promise<VerificationTokenRecord | null> {
    const record = this.records.get(tokenHash);
    if (!record || record.usedAt) return null;
    if (new Date(record.expiresAt) < new Date()) return null;
    return record;
  }

  async findByOtp(target: string, purpose: VerificationPurpose): Promise<VerificationTokenRecord | null> {
    const otpKey = `${target}:${purpose}`;
    const tokenHash = this.otpIndex.get(otpKey);
    if (!tokenHash) return null;
    const record = this.records.get(tokenHash);
    if (!record || record.usedAt) return null;
    if (new Date(record.expiresAt) < new Date()) return null;
    return record;
  }

  async markUsed(tokenHash: string): Promise<void> {
    const record = this.records.get(tokenHash);
    if (record) {
      record.usedAt = new Date().toISOString();
      if (record.code) {
        this.otpIndex.delete(`${record.target}:${record.purpose}`);
      }
    }
  }

  async incrementAttempts(tokenHash: string): Promise<number> {
    const record = this.records.get(tokenHash);
    if (!record) return 0;
    record.attempts += 1;
    return record.attempts;
  }

  async invalidateForAccount(accountId: string, purpose: VerificationPurpose): Promise<void> {
    for (const [hash, record] of this.records) {
      if (record.accountId === accountId && record.purpose === purpose && !record.usedAt) {
        record.usedAt = new Date().toISOString();
      }
    }
  }

  async deleteExpired(): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const [hash, record] of this.records) {
      if (new Date(record.expiresAt) < now) {
        this.records.delete(hash);
        if (record.code) {
          this.otpIndex.delete(`${record.target}:${record.purpose}`);
        }
        count++;
      }
    }
    return count;
  }

  async all(): Promise<VerificationTokenRecord[]> {
    return Array.from(this.records.values());
  }
}
