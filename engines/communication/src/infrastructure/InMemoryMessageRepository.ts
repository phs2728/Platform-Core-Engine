import type {
  IMessageRepository,
  IMessageRecord,
  MessageStatus,
} from '../interfaces/index.js';

export class InMemoryMessageRepository implements IMessageRepository {
  private readonly records = new Map<string, IMessageRecord>();

  async insert(record: IMessageRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async findById(id: string): Promise<IMessageRecord | null> {
    return this.records.get(id) ?? null;
  }

  async findPending(limit: number): Promise<IMessageRecord[]> {
    const now = new Date();
    return Array.from(this.records.values())
      .filter((r) => r.status === 'queued' && new Date(r.scheduledAt) <= now)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, limit);
  }

  async findByAccount(accountId: string): Promise<IMessageRecord[]> {
    return Array.from(this.records.values()).filter((r) => r.accountId === accountId);
  }

  async findByTenant(tenantId: string, limit = 1000): Promise<IMessageRecord[]> {
    return Array.from(this.records.values())
      .filter((r) => r.tenantId === tenantId)
      .slice(0, limit);
  }

  async findByStatus(status: MessageStatus, limit = 1000): Promise<IMessageRecord[]> {
    return Array.from(this.records.values())
      .filter((r) => r.status === status)
      .slice(0, limit);
  }

  async update(id: string, patch: Partial<IMessageRecord>): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      Object.assign(record, patch, { updatedAt: new Date().toISOString() });
    }
  }

  async countByStatus(status: MessageStatus): Promise<number> {
    return Array.from(this.records.values()).filter((r) => r.status === status).length;
  }

  async all(): Promise<IMessageRecord[]> {
    return Array.from(this.records.values());
  }
}
