/**
 * Events Module — Authorization Engine Event Definitions
 *
 * Authorization Flow:
 * Identity → Authorization → Role → Permission → Policy → Condition → Decision → ALLOW/DENY
 *
 * 발행되는 이벤트 목록.
 */

import type { EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Event Types
// ═══════════════════════════════════════════

export type AuthorizationEventType =
  // Role Events
  | 'authorization.role.created'
  | 'authorization.role.updated'
  | 'authorization.role.deleted'
  | 'authorization.role.assigned'
  // Permission Events
  | 'authorization.permission.assigned'
  | 'authorization.permission.revoked'
  // Policy Events
  | 'authorization.policy.created'
  | 'authorization.policy.updated'
  | 'authorization.policy.deleted'
  // Decision Events
  | 'authorization.decision.allow'
  | 'authorization.decision.deny'
  | 'authorization.decision.conditional';

// ═══════════════════════════════════════════
// Event Payload Types
// ═══════════════════════════════════════════

export interface RoleCreatedPayload {
  roleId: string;
  roleName: string;
  tenantId: string;
}

export interface RoleAssignedPayload {
  accountId: string;
  roleId: string;
  tenantId: string;
}

export interface PermissionAssignedPayload {
  roleId: string;
  permissionKey: string;
  tenantId: string;
}

export interface PolicyCreatedPayload {
  policyId: string;
  policyName: string;
  effect: string;
  tenantId: string;
}

export interface DecisionPayload {
  accountId: string;
  permission: string;
  decision: string;
  evaluationTimeMs: number;
  tenantId: string;
}

// ═══════════════════════════════════════════
// Event Helper
// ═══════════════════════════════════════════

/**
 * Authorization Event Envelope 생성 헬퍼
 */
export function createAuthorizationEvent<T>(
  eventType: AuthorizationEventType,
  aggregateId: string,
  tenantId: string,
  payload: T,
  idGenerator: () => string,
): EventEnvelope<T> {
  return {
    eventId: idGenerator(),
    aggregateId,
    occurredAt: new Date().toISOString(),
    version: '1.0.0',
    tenantId,
    correlationId: '',
    causationId: '',
    engine: 'authorization',
    eventType,
    schemaRef: `${eventType}.v1`,
    payload,
  };
}
