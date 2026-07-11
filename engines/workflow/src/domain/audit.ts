/**
 * Workflow Engine — Audit Helper
 * (Billing/Catalog Engine 패턴 동일)
 *
 * 사장님 확립: 모든 상태 변경은 Audit 기록.
 */

import type {
  IWorkflowAuditRepository,
  WorkflowAuditEventType,
  WorkflowAuditRecord,
} from '../interfaces/index.js';

export interface WorkflowAuditLogInput {
  workflowId?: string;
  instanceId?: string;
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: WorkflowAuditEventType;
  metadata?: Record<string, unknown>;
}

export async function recordWorkflowAudit(
  repo: IWorkflowAuditRepository,
  input: WorkflowAuditLogInput,
): Promise<WorkflowAuditRecord> {
  const rec: Record<string, unknown> = {
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
  };
  if (input.workflowId !== undefined) rec.workflowId = input.workflowId;
  if (input.instanceId !== undefined) rec.instanceId = input.instanceId;
  return repo.insert(rec as Parameters<typeof repo.insert>[0]);
}
