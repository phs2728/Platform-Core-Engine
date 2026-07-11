/**
 * Payment Engine — Audit Helper
 */

import type {
  IPaymentAuditRepository,
  PaymentAuditEventType,
  PaymentAuditRecord,
} from '../interfaces/index.js';

export interface PaymentAuditLogInput {
  paymentId?: string;
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: PaymentAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordPaymentAudit(
  repo: IPaymentAuditRepository,
  input: PaymentAuditLogInput,
): Promise<PaymentAuditRecord> {
  const rec: Record<string, unknown> = {
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
  };
  if (input.paymentId !== undefined) rec.paymentId = input.paymentId;
  return repo.insert(rec as Parameters<typeof repo.insert>[0]);
}
