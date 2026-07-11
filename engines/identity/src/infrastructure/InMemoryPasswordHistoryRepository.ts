/**
 * In-Memory Password History Repository (Epic 2 — Password)
 */
import type { IPasswordHistoryRepository, PasswordHistoryRecord } from '../interfaces/index.js';

export class InMemoryPasswordHistoryRepository implements IPasswordHistoryRepository {
  private readonly records: PasswordHistoryRecord[] = [];

  async insert(record: PasswordHistoryRecord): Promise<void> {
    this.records.push(record);
  }

  async findByAccount(accountId: string, limit = 10): Promise<PasswordHistoryRecord[]> {
    return this.records
      .filter((r) => r.accountId === accountId)
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
      .slice(0, limit);
  }

  async checkReuse(accountId: string, passwordHash: string, checkCount: number): Promise<boolean> {
    const history = await this.findByAccount(accountId, checkCount);
    return history.some((r) => r.passwordHash === passwordHash);
  }
}
