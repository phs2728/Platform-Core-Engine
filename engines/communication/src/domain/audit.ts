/**
 * Audit Helper — Communication Engine
 *
 * 사장님 확립 — Audit Trail 필수. 모든 UseCase에서 사용.
 * Identity Engine과 동일 패턴.
 */

import type {
  AuditEventType,
  AuditLogRecord,
} from '../interfaces/index.js';

export interface AuditLogInput {
  tenantId: string;
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * AuditLogRecord 생성 (Event Bus 발행용 또는 별도 Audit 저장용)
 *
 * Communication Engine은 별도 IAuditLogRepository를 가지지 않고
 * Event Bus를 통해 Audit Event를 발행한다.
 * 이 헬퍼는 AuditLogRecord를 생성하여 반환한다.
 */
export function createAuditRecord(input: AuditLogInput): AuditLogRecord {
  return {
    id: '', // caller가 idGenerator로 채움
    tenantId: input.tenantId,
    eventType: input.eventType,
    metadata: input.metadata ?? {},
    createdAt: input.createdAt,
  };
}

/**
 * Audit Event 메타데이터 빌더
 * UseCase에서 emit할 때 사용.
 */
export function buildAuditMetadata(
  eventType: AuditEventType,
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    eventType,
    ...data,
    timestamp: new Date().toISOString(),
  };
}
