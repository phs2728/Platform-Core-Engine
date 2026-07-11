/**
 * In-Memory Audit Log Repository (Epic 7)
 */

import type {
  IAuditLogRepository,
  AuditEventType,
  AuditLogRecord,
} from '../interfaces/index.js';

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private readonly records: AuditLogRecord[] = [];
  private idCounter = 0;

  async insert(record: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord> {
    const full: AuditLogRecord = {
      ...record,
      id: `audit-${++this.idCounter}`,
      createdAt: new Date().toISOString(),
    };
    this.records.push(full);
    return full;
  }

  async findByAccount(accountId: string): Promise<AuditLogRecord[]> {
    return this.records.filter((r) => r.accountId === accountId);
  }

  async findByTenant(tenantId: string, limit = 1000): Promise<AuditLogRecord[]> {
    return this.records.filter((r) => r.tenantId === tenantId).slice(0, limit);
  }

  async findByEventType(eventType: AuditEventType, limit = 1000): Promise<AuditLogRecord[]> {
    return this.records.filter((r) => r.eventType === eventType).slice(0, limit);
  }

  async all(): Promise<AuditLogRecord[]> {
    return [...this.records];
  }
}

export type { AuditEventType, AuditLogRecord };
