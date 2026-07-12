/**
 * Workflow Engine — Validation Schemas (zod)
 */

import { z } from '@platform/core-sdk';

// ── Enums ──────────────────────────────

export const workflowStatusSchema = z.enum([
  'Draft', 'Active', 'Waiting', 'Paused',
  'Completed', 'Cancelled', 'Failed', 'Expired',
]);

export const instanceStatusSchema = z.enum([
  'Draft', 'Active', 'Waiting', 'Paused',
  'Completed', 'Cancelled', 'Failed', 'Expired',
]);

export const approvalStepStatusSchema = z.enum([
  'Pending', 'Approved', 'Rejected', 'Skipped', 'Expired',
]);

export const taskStatusSchema = z.enum([
  'Pending', 'Assigned', 'Completed', 'Cancelled',
]);

export const timerTypeSchema = z.enum([
  'Delay', 'Deadline', 'Reminder', 'Retry', 'Timeout',
]);

export const retryStrategySchema = z.enum([
  'FixedDelay', 'Linear', 'ExponentialBackoff',
]);

export const escalationTargetSchema = z.enum([
  'Manager', 'Admin', 'Owner', 'Webhook', 'CommunicationEngine',
]);

export const automationHookTypeSchema = z.enum([
  'BeforeTransition', 'AfterTransition',
  'OnFailure', 'OnTimeout', 'OnComplete',
]);

// ── Sub-objects ────────────────────────

const transitionRuleSchema = z.object({
  fromState: z.string().min(1).max(100),
  toState: z.string().min(1).max(100),
  guardExpression: z.string().max(500).optional(),
  automationHooks: z.array(automationHookTypeSchema).optional(),
});

const approvalStepDefSchema = z.object({
  stepName: z.string().min(1).max(200),
  approverRole: z.string().min(1).max(200),
  sequence: z.number().int().min(0),
  isRequired: z.boolean(),
  slaMinutes: z.number().int().min(1).optional(),
});

const timerConfigSchema = z.object({
  name: z.string().min(1).max(200),
  type: timerTypeSchema,
  ttlSeconds: z.number().int().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const escalationRuleSchema = z.object({
  id: z.string().min(1),
  condition: z.string().min(1).max(500),
  target: escalationTargetSchema,
  delayMinutes: z.number().int().min(0),
  metadata: z.record(z.unknown()).optional(),
});

const compensationActionSchema = z.object({
  id: z.string().min(1),
  stepName: z.string().min(1).max(200),
  action: z.string().min(1).max(500),
  metadata: z.record(z.unknown()).optional(),
});

const retryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(100),
  strategy: retryStrategySchema,
  initialDelaySeconds: z.number().int().min(1),
  multiplier: z.number().positive().optional(),
});

const slaPolicySchema = z.object({
  responseMinutes: z.number().int().min(1),
  resolutionMinutes: z.number().int().min(1),
  escalationTarget: escalationTargetSchema,
});

const referenceSchema = z.object({
  refType: z.string().min(1).max(100),
  refId: z.string().min(1).max(128),
  metadata: z.record(z.unknown()).optional(),
});

const workflowDefinitionSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  version: z.number().int().min(1),
  states: z.array(z.string().min(1).max(100)).min(1),
  initialState: z.string().min(1).max(100),
  transitions: z.array(transitionRuleSchema),
  approvalSteps: z.array(approvalStepDefSchema),
  timerConfigs: z.array(timerConfigSchema),
  escalationRules: z.array(escalationRuleSchema),
  compensationActions: z.array(compensationActionSchema),
  retryPolicy: retryPolicySchema.nullable().optional(),
  sla: slaPolicySchema.nullable().optional(),
  isActive: z.boolean(),
  publishedAt: z.string().nullable().optional(),
});

// ── Common fields ──────────────────────

const commonActorFields = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
};

// ── Workflow CRUD ──────────────────────

export const createWorkflowSchema = z.object({
  ...commonActorFields,
  organizationId: z.string().min(1),
  name: z.string().min(1).max(300),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  type: z.string().min(1).max(100),
  states: z.array(z.string().min(1).max(100)).min(1),
  initialState: z.string().min(1).max(100),
  transitions: z.array(transitionRuleSchema),
  approvalSteps: z.array(approvalStepDefSchema).optional(),
  timerConfigs: z.array(timerConfigSchema).optional(),
  escalationRules: z.array(escalationRuleSchema).optional(),
  compensationActions: z.array(compensationActionSchema).optional(),
  retryPolicy: retryPolicySchema.nullable().optional(),
  sla: slaPolicySchema.nullable().optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateWorkflowSchema = z.object({
  ...commonActorFields,
  workflowId: z.string().min(1),
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  attributes: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export const simpleWorkflowActionSchema = z.object({
  ...commonActorFields,
  workflowId: z.string().min(1),
});

export const deleteWorkflowSchema = z.object({
  ...commonActorFields,
  workflowId: z.string().min(1),
});

export const getWorkflowSchema = z.object({
  tenantId: z.string().min(1),
  workflowId: z.string().min(1),
});

export const searchWorkflowsSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  query: z.string().max(200).optional(),
  type: z.string().max(100).optional(),
  status: workflowStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const listWorkflowsSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

// ── Instance ───────────────────────────

export const startWorkflowSchema = z.object({
  ...commonActorFields,
  workflowId: z.string().min(1),
  initiatedBy: z.string().min(1),
  attributes: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  variables: z.record(z.unknown()).optional(),
});

export const cancelInstanceSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const restartInstanceSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
});

export const simpleInstanceActionSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
});

export const getInstanceSchema = z.object({
  tenantId: z.string().min(1),
  instanceId: z.string().min(1),
});

export const listInstancesSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().optional(),
  workflowId: z.string().optional(),
  status: instanceStatusSchema.optional(),
  currentState: z.string().optional(),
  initiatedBy: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

// ── Transition ─────────────────────────

export const transitionSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  toState: z.string().min(1).max(100),
  reason: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const approveSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  stepName: z.string().min(1).max(200),
  approverId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const rejectSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  stepName: z.string().min(1).max(200),
  approverId: z.string().min(1),
  reason: z.string().max(500),
});

export const rollbackSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  toState: z.string().min(1).max(100).optional(),
  reason: z.string().max(500).optional(),
});

export const retrySchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const skipSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  stepName: z.string().min(1).max(200),
  reason: z.string().max(500).optional(),
});

// ── Task ───────────────────────────────

export const createTaskSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  workflowId: z.string().min(1),
  organizationId: z.string().min(1),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().min(1).optional(),
  assigneeRole: z.string().min(1).max(200).optional(),
  priority: z.enum(['Low', 'Normal', 'High', 'Critical']).optional(),
  dueDate: z.string().min(1).optional(),
  attributes: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const assignTaskSchema = z.object({
  ...commonActorFields,
  taskId: z.string().min(1),
  assigneeId: z.string().min(1),
  assigneeRole: z.string().max(200).optional(),
});

export const completeTaskSchema = z.object({
  ...commonActorFields,
  taskId: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export const cancelTaskSchema = z.object({
  ...commonActorFields,
  taskId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const reassignTaskSchema = z.object({
  ...commonActorFields,
  taskId: z.string().min(1),
  assigneeId: z.string().min(1),
  assigneeRole: z.string().max(200).optional(),
});

// ── Timer ──────────────────────────────

export const scheduleTimerSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1).max(200),
  type: timerTypeSchema,
  ttlSeconds: z.number().int().min(1),
  payload: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const cancelTimerSchema = z.object({
  ...commonActorFields,
  timerId: z.string().min(1),
});

// ── Reference + Timeline ───────────────

export const attachReferenceSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  refType: z.string().min(1).max(100),
  refId: z.string().min(1).max(128),
  metadata: z.record(z.unknown()).optional(),
});

export const appendTimelineSchema = z.object({
  ...commonActorFields,
  instanceId: z.string().min(1),
  eventType: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  metadata: z.record(z.unknown()).optional(),
});

export const getHistorySchema = z.object({
  tenantId: z.string().min(1),
  instanceId: z.string().min(1),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const getTimelineSchema = z.object({
  tenantId: z.string().min(1),
  instanceId: z.string().min(1),
  limit: z.number().int().min(1).max(1000).optional(),
});
