/**
 * Built-in Scenario Library — 8 Platform Scenarios
 *
 * 사장님 확립: Sprint 1에서 반드시 구현.
 * 각 시나리오는 플랫폼의 핵심 비즈니스 플로우를 검증.
 *
 * These are definition factories — they return Scenario objects
 * (without id/tenantId/timestamps, which the UseCase fills in).
 */

import type { Scenario, ScenarioStep } from '../interfaces/index.js';

type ScenarioDef = Omit<Scenario, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'version'>;

function step(
  name: string,
  engineId: string,
  actionName: string,
  sequence: number,
  expectations: { type: string; description: string; validator: string; required?: boolean }[] = [],
  continueOnFailure = false,
): ScenarioStep {
  return {
    id: `step-${engineId}-${sequence}`,
    name,
    description: `${actionName} on ${engineId}`,
    engineId,
    actionName,
    params: {},
    expectations: expectations.map((e) => ({
      type: e.type as 'event_published',
      description: e.description,
      validator: e.validator,
      params: {},
      required: e.required ?? true,
    })),
    timeoutMs: 30000,
    continueOnFailure,
    sequence,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 1: Full Lifecycle
// ════════════════════════════════════════════════════════════════════════════

export function fullLifecycleScenario(): ScenarioDef {
  return {
    name: 'Full Lifecycle',
    description: 'User → Organization → Catalog → Pricing → Inventory → Booking → Order → Workflow → Payment → Communication → Review',
    category: 'lifecycle',
    type: 'e2e',
    tags: ['critical', 'lifecycle', 'e2e'],
    status: 'Active',
    steps: [
      step('Create User', 'user', 'createUser', 1, [{ type: 'event_published', description: 'user.created emitted', validator: 'event_check' }]),
      step('Create Organization', 'organization', 'createOrganization', 2, [{ type: 'event_published', description: 'organization.created emitted', validator: 'event_check' }]),
      step('Create Catalog', 'catalog', 'createCatalog', 3, [{ type: 'event_published', description: 'catalog.created emitted', validator: 'event_check' }]),
      step('Create Pricing', 'pricing', 'createPricePlan', 4, [{ type: 'event_published', description: 'pricing.plan.created emitted', validator: 'event_check' }]),
      step('Create Inventory', 'inventory', 'createStockItem', 5, [{ type: 'event_published', description: 'inventory.created emitted', validator: 'event_check' }]),
      step('Create Booking', 'booking', 'createBooking', 6, [{ type: 'event_published', description: 'booking.created emitted', validator: 'event_check' }]),
      step('Create Order', 'order', 'createOrder', 7, [{ type: 'event_published', description: 'order.created emitted', validator: 'event_check' }]),
      step('Start Workflow', 'workflow', 'startWorkflow', 8, [{ type: 'workflow_state', description: 'workflow active', validator: 'workflow_state_check' }]),
      step('Process Payment', 'payment', 'createPayment', 9, [{ type: 'event_published', description: 'payment.created emitted', validator: 'event_check' }]),
      step('Send Communication', 'communication', 'sendMessage', 10, [{ type: 'communication', description: 'message sent', validator: 'comm_check' }]),
      step('Create Review', 'review', 'createReview', 11, [{ type: 'event_published', description: 'review.created emitted', validator: 'event_check' }]),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 2: Cancellation Flow
// ════════════════════════════════════════════════════════════════════════════

export function cancellationFlowScenario(): ScenarioDef {
  return {
    name: 'Cancellation Flow',
    description: 'Booking Cancel → Inventory Release → Workflow Cancel → Payment Refund → Communication → Review Block',
    category: 'cancellation',
    type: 'e2e',
    tags: ['critical', 'cancellation', 'refund'],
    status: 'Active',
    steps: [
      step('Cancel Booking', 'booking', 'cancelBooking', 1, [{ type: 'event_published', description: 'booking.cancelled emitted', validator: 'event_check' }]),
      step('Release Inventory', 'inventory', 'releaseReservation', 2, [{ type: 'repository_updated', description: 'reservation released', validator: 'repo_check' }]),
      step('Cancel Workflow', 'workflow', 'cancelWorkflow', 3, [{ type: 'workflow_state', description: 'workflow cancelled', validator: 'workflow_state_check' }]),
      step('Refund Payment', 'payment', 'refundPayment', 4, [{ type: 'event_published', description: 'payment.refunded emitted', validator: 'event_check' }]),
      step('Send Cancellation Notice', 'communication', 'sendMessage', 5, [{ type: 'communication', description: 'cancellation sent', validator: 'comm_check' }]),
      step('Block Review', 'review', 'archiveReview', 6, [{ type: 'repository_updated', description: 'review archived', validator: 'repo_check' }]),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 3: Payment Failure + Rollback
// ════════════════════════════════════════════════════════════════════════════

export function paymentFailureScenario(): ScenarioDef {
  return {
    name: 'Payment Failure + Rollback',
    description: 'Payment Failure → Workflow Rollback → Inventory Release → Audit → Communication',
    category: 'failure',
    type: 'e2e',
    tags: ['critical', 'failure', 'rollback'],
    status: 'Active',
    steps: [
      step('Fail Payment', 'payment', 'failPayment', 1, [{ type: 'custom', description: 'payment failure handled', validator: 'custom_check' }]),
      step('Rollback Workflow', 'workflow', 'rollbackWorkflow', 2, [{ type: 'workflow_state', description: 'workflow rolled back', validator: 'workflow_state_check' }]),
      step('Release Inventory', 'inventory', 'releaseAllocation', 3, [{ type: 'repository_updated', description: 'allocation released', validator: 'repo_check' }]),
      step('Record Audit', 'core-sdk', 'recordAudit', 4, [{ type: 'audit', description: 'audit logged', validator: 'audit_check' }]),
      step('Send Alert', 'communication', 'sendMessage', 5, [{ type: 'communication', description: 'alert sent', validator: 'comm_check' }]),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 4: Archive Chain
// ════════════════════════════════════════════════════════════════════════════

export function archiveChainScenario(): ScenarioDef {
  return {
    name: 'Archive Chain',
    description: 'Organization Archive → Catalog Archive → Inventory Archive → Booking Reject → Order Reject',
    category: 'archive',
    type: 'e2e',
    tags: ['archive', 'cascade'],
    status: 'Active',
    steps: [
      step('Archive Organization', 'organization', 'archiveOrganization', 1, [{ type: 'event_published', description: 'organization.archived emitted', validator: 'event_check' }]),
      step('Archive Catalog', 'catalog', 'archiveCatalog', 2, [{ type: 'event_published', description: 'catalog.archived emitted', validator: 'event_check' }]),
      step('Archive Inventory', 'inventory', 'archiveStockItem', 3, [{ type: 'event_published', description: 'inventory.archived emitted', validator: 'event_check' }]),
      step('Reject Booking', 'booking', 'rejectBooking', 4, [{ type: 'event_published', description: 'booking.rejected emitted', validator: 'event_check' }], true),
      step('Reject Order', 'order', 'rejectOrder', 5, [{ type: 'event_published', description: 'order.rejected emitted', validator: 'event_check' }], true),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 5: Authorization Deny
// ════════════════════════════════════════════════════════════════════════════

export function authorizationDenyScenario(): ScenarioDef {
  return {
    name: 'Authorization Deny',
    description: 'Authorization Deny → Workflow Stop → Audit → Guardian Warning',
    category: 'authorization',
    type: 'e2e',
    tags: ['security', 'authorization', 'guardian'],
    status: 'Active',
    steps: [
      step('Deny Permission', 'authorization', 'denyPermission', 1, [{ type: 'custom', description: 'permission deny handled', validator: 'custom_check' }]),
      step('Stop Workflow', 'workflow', 'cancelWorkflow', 2, [{ type: 'workflow_state', description: 'workflow stopped', validator: 'workflow_state_check' }]),
      step('Record Audit', 'core-sdk', 'recordAudit', 3, [{ type: 'audit', description: 'deny audit logged', validator: 'audit_check' }]),
      step('Guardian Warning', 'platform-guardian', 'issueWarning', 4, [{ type: 'guardian', description: 'guardian flagged', validator: 'guardian_check' }]),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 6: Media Flow
// ════════════════════════════════════════════════════════════════════════════

export function mediaFlowScenario(): ScenarioDef {
  return {
    name: 'Media Flow',
    description: 'Media Upload → Catalog Update → Search Index → Review Attachment',
    category: 'media',
    type: 'e2e',
    tags: ['media', 'catalog', 'search'],
    status: 'Active',
    steps: [
      step('Upload Media', 'media', 'uploadAsset', 1, [{ type: 'event_published', description: 'media.created emitted', validator: 'event_check' }]),
      step('Update Catalog', 'catalog', 'updateCatalog', 2, [{ type: 'repository_updated', description: 'catalog updated', validator: 'repo_check' }]),
      step('Index for Search', 'core-sdk', 'indexSearchable', 3, [{ type: 'custom', description: 'indexed', validator: 'custom_check' }]),
      step('Attach to Review', 'review', 'updateReview', 4, [{ type: 'repository_updated', description: 'review updated with media', validator: 'repo_check' }]),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 7: Communication Failure + Retry
// ════════════════════════════════════════════════════════════════════════════

export function communicationFailureScenario(): ScenarioDef {
  return {
    name: 'Communication Failure + Retry',
    description: 'Communication Failure → Retry → DLQ → Alert',
    category: 'communication',
    type: 'e2e',
    tags: ['communication', 'retry', 'dlq'],
    status: 'Active',
    steps: [
      step('Fail Message', 'communication', 'sendMessage', 1, [{ type: 'communication', description: 'send failed', validator: 'comm_check' }]),
      step('Retry Send', 'communication', 'retryMessage', 2, [{ type: 'communication', description: 'retry attempted', validator: 'comm_check' }], true),
      step('Move to DLQ', 'communication', 'moveToDLQ', 3, [{ type: 'repository_updated', description: 'in DLQ', validator: 'repo_check' }]),
      step('Send Alert', 'communication', 'sendAlert', 4, [{ type: 'communication', description: 'alert sent', validator: 'comm_check' }]),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Scenario 8: Identity Login → Action
// ════════════════════════════════════════════════════════════════════════════

export function identityLoginScenario(): ScenarioDef {
  return {
    name: 'Identity Login → Action',
    description: 'Identity Login → Permission Check → Workflow Start → Payment → Review',
    category: 'identity',
    type: 'e2e',
    tags: ['identity', 'authorization', 'workflow'],
    status: 'Active',
    steps: [
      step('Login User', 'identity', 'login', 1, [{ type: 'event_published', description: 'identity.login.success emitted', validator: 'event_check' }]),
      step('Check Permission', 'authorization', 'checkPermission', 2, [{ type: 'permission', description: 'permission granted', validator: 'perm_check' }]),
      step('Start Workflow', 'workflow', 'startWorkflow', 3, [{ type: 'workflow_state', description: 'workflow active', validator: 'workflow_state_check' }]),
      step('Create Payment', 'payment', 'createPayment', 4, [{ type: 'event_published', description: 'payment.created emitted', validator: 'event_check' }]),
      step('Create Review', 'review', 'createReview', 5, [{ type: 'event_published', description: 'review.created emitted', validator: 'event_check' }]),
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Registry — returns all 8 built-in scenarios
// ════════════════════════════════════════════════════════════════════════════

export function getBuiltinScenarios(): ScenarioDef[] {
  return [
    fullLifecycleScenario(),
    cancellationFlowScenario(),
    paymentFailureScenario(),
    archiveChainScenario(),
    authorizationDenyScenario(),
    mediaFlowScenario(),
    communicationFailureScenario(),
    identityLoginScenario(),
  ];
}
