/**
 * TEMPLATE_TITLE Engine — Audit Helper
 * 사장님 확립: 모든 상태 변경은 Audit 기록.
 */

export interface AuditLogInput {
  accountId: string | null;
  tenantId: string;
  eventType: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

// TODO: Audit implementation
