import type {
  IAuditLogRepository,
  AuditLogRecord,
} from '../interfaces/index.js';

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private records: AuditLogRecord[] = [];
  private counter = 0;

  async insert(r: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord> {
    const full: AuditLogRecord = {
      ...r,
      id: `addr-audit-${++this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.records.push(full);
    return full;
  }

  async findByTenant(tenantId: string, limit = 1000): Promise<AuditLogRecord[]> {
    return this.records
      .filter((r) => r.tenantId === tenantId)
      .slice(-limit)
      .reverse();
  }

  async findByAddress(addressId: string): Promise<AuditLogRecord[]> {
    return this.records.filter((r) => r.addressId === addressId).reverse();
  }

  async all(): Promise<AuditLogRecord[]> {
    return [...this.records];
  }
}
