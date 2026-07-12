/** AI Engine — Audit Helper */
import type { IAIAuditRepository, AIAuditEventType, AIAuditRecord } from '../interfaces/index.js';

export interface AIAuditLogInput {
  conversationId?: string; promptId?: string;
  tenantId: string; actorId: string; correlationId: string;
  eventType: AIAuditEventType; metadata?: Record<string, unknown>;
}

export async function recordAIAudit(repo: IAIAuditRepository, input: AIAuditLogInput): Promise<AIAuditRecord> {
  return repo.insert({
    tenantId: input.tenantId, actorId: input.actorId, correlationId: input.correlationId,
    eventType: input.eventType, metadata: input.metadata ?? {},
    ...(input.conversationId !== undefined ? { conversationId: input.conversationId } : {}),
    ...(input.promptId !== undefined ? { promptId: input.promptId } : {}),
  });
}
