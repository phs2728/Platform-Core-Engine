/**
 * Platform Validation Engine — Audit Helper
 */

import type {
  IValidationAuditRepository,
  ValidationAuditEventType,
  ValidationAuditRecord,
} from '../interfaces/index.js';

export interface ValidationAuditLogInput {
  runId?: string;
  scenarioId?: string;
  reportId?: string;
  certificationId?: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: ValidationAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordValidationAudit(
  repo: IValidationAuditRepository,
  input: ValidationAuditLogInput,
): Promise<ValidationAuditRecord> {
  return repo.insert({
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    ...(input.runId !== undefined ? { runId: input.runId } : {}),
    ...(input.scenarioId !== undefined ? { scenarioId: input.scenarioId } : {}),
    ...(input.reportId !== undefined ? { reportId: input.reportId } : {}),
    ...(input.certificationId !== undefined ? { certificationId: input.certificationId } : {}),
  });
}
