/**
 * In-Memory Verification Token Repository
 *
 * 사장님 확립 (Sprint 2C-2):
 * - Email Verification Token: SHA256 Hash만 DB 저장
 * - Password Reset Token: SHA256 Hash만 DB 저장
 *
 * 원본 Token은 이메일로만 발송. DB에는 Hash만.
 */

import { createHash } from 'node:crypto';

export type VerificationTokenType = 'email_verification' | 'password_reset';

export interface VerificationTokenRecord {
  /** Token Hash (SHA256) */
  tokenHash: string;
  accountId: string;
  tenantId: string;
  type: VerificationTokenType;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

/**
 * Hash Function: SHA256
 *
 * Sprint 2C-2: Token은 무작위 생성 후 Hash 저장.
 * 원본 Token은 URL/Email로만 전송.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface IVerificationTokenRepository {
  /** Token Hash + Record 저장 (Hash된 값만) */
  insert(record: Omit<VerificationTokenRecord, 'tokenHash'> & { rawToken: string }): Promise<{ tokenHash: string }>;
  /** Hash로 조회 (검증 시) */
  findByHash(tokenHash: string, type: VerificationTokenType): Promise<VerificationTokenRecord | null>;
  /** 사용 완료 표시 */
  markUsed(tokenHash: string): Promise<void>;
  /** 특정 account의 모든 토큰 무효화 */
  invalidateForAccount(accountId: string, type: VerificationTokenType): Promise<void>;
}

export class InMemoryVerificationTokenRepository implements IVerificationTokenRepository {
  private readonly records = new Map<string, VerificationTokenRecord>(); // key: tokenHash

  async insert(
    record: Omit<VerificationTokenRecord, 'tokenHash'> & { rawToken: string },
  ): Promise<{ tokenHash: string }> {
    const tokenHash = hashToken(record.rawToken);
    this.records.set(tokenHash, {
      tokenHash,
      accountId: record.accountId,
      tenantId: record.tenantId,
      type: record.type,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    });
    return { tokenHash };
  }

  async findByHash(tokenHash: string, type: VerificationTokenType): Promise<VerificationTokenRecord | null> {
    const record = this.records.get(tokenHash);
    if (!record || record.type !== type) return null;
    if (record.usedAt) return null;
    if (new Date(record.expiresAt) < new Date()) return null;
    return record;
  }

  async markUsed(tokenHash: string): Promise<void> {
    const record = this.records.get(tokenHash);
    if (record) {
      record.usedAt = new Date().toISOString();
    }
  }

  async invalidateForAccount(accountId: string, type: VerificationTokenType): Promise<void> {
    for (const [hash, record] of this.records) {
      if (record.accountId === accountId && record.type === type && !record.usedAt) {
        this.records.delete(hash);
      }
    }
  }

  async all(): Promise<VerificationTokenRecord[]> {
    return Array.from(this.records.values());
  }
}
