/**
 * In-Memory Audit Log Repository (Sprint 2C-2-5)
 *
 * 사장님 확립 — Audit Trail 필수:
 * - LOGIN_SUCCESS
 * - LOGIN_FAILED
 * - PASSWORD_CHANGED
 * - PASSWORD_RESET
 * - EMAIL_CHANGED
 * - SESSION_REVOKED
 *
 * 위 6개 + 추가 (OAuth, MFA, Phone Login 등)
 */

export type AuditEventType =
  | 'login_success'
  | 'login_failed'
  | 'password_changed'
  | 'password_reset'
  | 'email_changed'
  | 'session_revoked'
  | 'account_locked'
  | 'account_unlocked'
  | 'email_verified'
  | 'session_refreshed'
  | 'oauth_login'
  | 'oauth_unlinked';

export interface AuditLogRecord {
  id: string;
  accountId: string | null;
  tenantId: string;
  eventType: AuditEventType;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface IAuditLogRepository {
  insert(record: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord>;
  findByAccount(accountId: string): Promise<AuditLogRecord[]>;
  findByTenant(tenantId: string, limit?: number): Promise<AuditLogRecord[]>;
  findByEventType(eventType: AuditEventType, limit?: number): Promise<AuditLogRecord[]>;
}

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
