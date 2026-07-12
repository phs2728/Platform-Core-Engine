/**
 * Audit Module — Authorization Audit Trail (#6 CTO 리뷰 반영)
 *
 * 사장님 CTO 확립:
 * "Reason을 반드시 남기십시오.
 *  DENY Reason: Missing Permission booking.delete
 *  ALLOW Reason: Role Manager
 *  나중에 고객 문의가 생기면 이유를 알아야 합니다."
 */

import type {
  AuditEventType,
  AuditLogRecord,
  IAuditLogRepository,
  DecisionReason,
} from '../interfaces/index.js';

export interface AuditLogInput {
  accountId: string | null;
  tenantId: string;
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
  /** #6: 결정 사유 (audit에서 필수) */
  reason?: DecisionReason;
}

/**
 * Audit 기록 (Identity Engine과 동일 패턴 + #6 Reason)
 *
 * 모든 권한 확인 Audit에는 reason이 반드시 포함된다.
 */
export async function recordAudit(
  repo: IAuditLogRepository,
  input: AuditLogInput,
): Promise<AuditLogRecord> {
  return repo.insert({
    accountId: input.accountId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    metadata: {
      ...input.metadata,
      // #6: Reason을 metadata에 구조화하여 저장
      ...(input.reason
        ? {
            _reason: {
              code: input.reason.code,
              detail: input.reason.detail,
              source: input.reason.source,
            },
          }
        : {}),
    },
  });
}

/**
 * Authorization 결정 Audit 메타데이터 빌더 (#6 강화)
 *
 * 모든 결정에 대해 reason을 포함한다.
 */
export function buildAuthorizationAuditMetadata(
  permission: string,
  decision: string,
  matchedRules: string[],
  reason: DecisionReason,
): Record<string, unknown> {
  return {
    permission,
    decision,
    matchedRules,
    // #6: 구조화된 reason
    reason: {
      code: reason.code,
      detail: reason.detail,
      source: reason.source,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * DENY Audit 메타데이터 빌더 — "Missing Permission {x}" 형식
 */
export function buildDenyAuditMetadata(
  permission: string,
  reason: DecisionReason,
): Record<string, unknown> {
  return {
    permission,
    decision: 'deny',
    reason: {
      code: reason.code,
      detail: reason.detail,
      source: reason.source,
    },
    // 고객 문의 대응용 요약
    summary: `DENY — ${reason.detail}`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * ALLOW Audit 메타데이터 빌더 — "Role {x}" 형식
 */
export function buildAllowAuditMetadata(
  permission: string,
  reason: DecisionReason,
  roles: string[],
): Record<string, unknown> {
  return {
    permission,
    decision: 'allow',
    roles,
    reason: {
      code: reason.code,
      detail: reason.detail,
      source: reason.source,
    },
    // 고객 문의 대응용 요약
    summary: `ALLOW — ${reason.detail}`,
    timestamp: new Date().toISOString(),
  };
}
