/**
 * Booking Engine — Audit Helper (Catalog/Pricing/Inventory Engine 패턴 동일)
 *
 * 사장님 확립 — 모든 상태 변경은 Audit 기록.
 */

import type {
  IBookingAuditRepository,
  BookingAuditEventType,
  BookingAuditRecord,
} from '../interfaces/index.js';

export interface BookingAuditLogInput {
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: BookingAuditEventType;
  metadata?: Record<string, unknown>;
  bookingId?: string;
}

export async function recordBookingAudit(
  repo: IBookingAuditRepository,
  input: BookingAuditLogInput,
): Promise<BookingAuditRecord> {
  return repo.insert({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.bookingId !== undefined ? { bookingId: input.bookingId } : {}),
  });
}
