/**
 * Workflow Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 6 — Platform Layer Foundation Engine.
 * 8-state machine: Draft→Active→Waiting→Paused→Completed (+Cancelled/Failed/Expired)
 *
 * Workflow Engine은 플랫폼 전체의 상태 전이(State Machine)와
 * 프로세스 자동화(Process Orchestration)를 담당한다.
 * Business Logic은 절대 포함하지 않는다.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces (6-Layer DI)
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface IUserVerifier {
  verify(tenantId: string, userId: string): Promise<boolean>;
}

export interface IIdentityVerifier {
  verify(tenantId: string, identityId: string): Promise<boolean>;
}

export interface ICustomDataPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getAllowedWorkflowTypes(tenantId: string): Promise<readonly string[]>;
  getMaxWorkflowsPerOrg(tenantId: string): Promise<number>;
  getDefaultSlaMinutes(tenantId: string): Promise<number>;
  getDefaultTimerTtlSeconds(tenantId: string): Promise<number>;
}

// ═══════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════

export type WorkflowStatus =
  | 'Draft' | 'Active' | 'Waiting' | 'Paused'
  | 'Completed' | 'Cancelled' | 'Failed' | 'Expired';

export type WorkflowInstanceStatus =
  | 'Draft' | 'Active' | 'Waiting' | 'Paused'
  | 'Completed' | 'Cancelled' | 'Failed' | 'Expired';

export type ApprovalStepStatus = 'Pending' | 'Approved' | 'Rejected' | 'Skipped' | 'Expired';

export type TaskStatus = 'Pending' | 'Assigned' | 'Completed' | 'Cancelled';

export type TimerType = 'Delay' | 'Deadline' | 'Reminder' | 'Retry' | 'Timeout';
export type TimerStatus = 'Scheduled' | 'Active' | 'Expired' | 'Cancelled';

export type RetryStrategy = 'FixedDelay' | 'Linear' | 'ExponentialBackoff';

export type EscalationTarget =
  | 'Manager' | 'Admin' | 'Owner' | 'Webhook' | 'CommunicationEngine';

export type AutomationHookType =
  | 'BeforeTransition' | 'AfterTransition'
  | 'OnFailure' | 'OnTimeout' | 'OnComplete';

export interface TransitionRule {
  fromState: string;
  toState: string;
  guardExpression?: string;
  automationHooks?: AutomationHookType[];
}

export interface RetryPolicy {
  maxAttempts: number;
  strategy: RetryStrategy;
  initialDelaySeconds: number;
  multiplier?: number;
}

export interface SlaPolicy {
  responseMinutes: number;
  resolutionMinutes: number;
  escalationTarget: EscalationTarget;
}

export interface WorkflowReference {
  refType: string;    // generic cross-engine reference type identifier
  refId: string;
  metadata: Record<string, unknown>;
}

export interface EscalationRule {
  id: string;
  condition: string;
  target: EscalationTarget;
  delayMinutes: number;
  metadata: Record<string, unknown>;
}

export interface CompensationAction {
  id: string;
  stepName: string;
  action: string;
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

/**
 * Workflow Definition — the template/blueprint for instances.
 * Defines the state machine, transitions, approval steps, timers, escalations.
 */
export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  version: number;
  states: string[];
  initialState: string;
  transitions: TransitionRule[];
  approvalSteps: ApprovalStepDef[];
  timerConfigs: TimerConfig[];
  escalationRules: EscalationRule[];
  compensationActions: CompensationAction[];
  retryPolicy: RetryPolicy | null;
  sla: SlaPolicy | null;
  isActive: boolean;
  publishedAt: string | null;
}

export interface ApprovalStepDef {
  stepName: string;
  approverRole: string;
  sequence: number;
  isRequired: boolean;
  slaMinutes?: number;
}

export interface TimerConfig {
  name: string;
  type: TimerType;
  ttlSeconds: number;
  metadata: Record<string, unknown>;
}

/**
 * Workflow — the aggregate root. A reusable process template
 * that Organizations create and Instances run against.
 */
export interface Workflow {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  status: WorkflowStatus;
  version: number;
  definition: WorkflowDefinition;
  references: WorkflowReference[];
  attributes: Record<string, unknown>;
  customFields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  failedAt: string | null;
  failReason: string | null;
  expiredAt: string | null;
  archivedAt: string | null;
}

/**
 * Workflow Instance — a runtime execution of a Workflow Definition.
 */
export interface WorkflowInstance {
  id: string;
  tenantId: string;
  organizationId: string;
  workflowId: string;
  definitionVersion: number;
  instanceNumber: string;
  currentState: string;
  status: WorkflowInstanceStatus;
  previousState: string | null;
  initiatedBy: string;
  references: WorkflowReference[];
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  variables: Record<string, unknown>;
  retryCount: number;
  attemptHistory: string[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  failedAt: string | null;
  failReason: string | null;
  expiredAt: string | null;
  archivedAt: string | null;
}

/**
 * Approval Step — runtime approval tracking per instance.
 */
export interface ApprovalStep {
  id: string;
  tenantId: string;
  instanceId: string;
  stepName: string;
  approverRole: string;
  sequence: number;
  status: ApprovalStepStatus;
  approverId: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  skippedAt: string | null;
  expiredAt: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Workflow Task — human or system work item.
 */
export interface WorkflowTask {
  id: string;
  tenantId: string;
  organizationId: string;
  instanceId: string;
  workflowId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  assigneeRole: string | null;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  dueDate: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Timer — scheduled time-based action.
 */
export interface WorkflowTimer {
  id: string;
  tenantId: string;
  organizationId: string;
  instanceId: string;
  name: string;
  type: TimerType;
  status: TimerStatus;
  fireAt: string;
  firedAt: string | null;
  cancelledAt: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Workflow History — append-only transition log (separate from audit).
 */
export interface WorkflowHistoryEntry {
  id: string;
  tenantId: string;
  instanceId: string;
  sequenceNumber: number;
  eventType: string;
  fromState: string | null;
  toState: string;
  actorId: string;
  correlationId: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Workflow Timeline — human-readable narrative (separate from structured history).
 */
export interface WorkflowTimelineEntry {
  id: string;
  tenantId: string;
  instanceId: string;
  eventType: string;
  actorId: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface WorkflowSearchCriteria {
  tenantId: string;
  organizationId?: string;
  query?: string;
  type?: string;
  status?: WorkflowStatus;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface WorkflowSearchResult {
  workflows: Workflow[];
  total: number;
  limit: number;
  offset: number;
}

export interface InstanceSearchCriteria {
  tenantId: string;
  organizationId?: string;
  workflowId?: string;
  status?: WorkflowInstanceStatus;
  currentState?: string;
  initiatedBy?: string;
  limit?: number;
  offset?: number;
}

export interface InstanceSearchResult {
  instances: WorkflowInstance[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type WorkflowAuditEventType =
  | 'workflow_created' | 'workflow_updated' | 'workflow_activated'
  | 'workflow_archived' | 'workflow_restored' | 'workflow_deleted'
  | 'instance_started' | 'instance_cancelled' | 'instance_restarted'
  | 'instance_transitioned' | 'instance_completed' | 'instance_failed'
  | 'instance_expired'
  | 'task_created' | 'task_assigned' | 'task_completed' | 'task_cancelled' | 'task_reassigned'
  | 'timer_scheduled' | 'timer_cancelled' | 'timer_expired'
  | 'approval_requested' | 'approval_completed' | 'approval_rejected' | 'approval_skipped'
  | 'rollback_executed' | 'retry_executed' | 'skip_executed'
  | 'escalation_triggered'
  | 'reference_attached' | 'timeline_appended';

export interface WorkflowAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  workflowId?: string;
  instanceId?: string;
  actorId: string;
  correlationId: string;
  eventType: WorkflowAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories (5 core + audit + timeline)
// ═══════════════════════════════════════════

export interface IWorkflowRepository {
  insert(workflow: Workflow): Promise<void>;
  findById(tenantId: string, id: string): Promise<Workflow | null>;
  findBySlug(tenantId: string, organizationId: string, slug: string): Promise<Workflow | null>;
  update(tenantId: string, id: string, patch: Partial<Workflow>): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
  search(criteria: WorkflowSearchCriteria): Promise<WorkflowSearchResult>;
  countByOrganization(tenantId: string, organizationId: string): Promise<number>;
}

export interface IWorkflowInstanceRepository {
  insert(instance: WorkflowInstance): Promise<void>;
  findById(tenantId: string, id: string): Promise<WorkflowInstance | null>;
  findByInstanceNumber(tenantId: string, instanceNumber: string): Promise<WorkflowInstance | null>;
  update(tenantId: string, id: string, patch: Partial<WorkflowInstance>): Promise<void>;
  search(criteria: InstanceSearchCriteria): Promise<InstanceSearchResult>;
}

export interface IApprovalStepRepository {
  insert(step: ApprovalStep): Promise<void>;
  findById(tenantId: string, id: string): Promise<ApprovalStep | null>;
  findByInstance(tenantId: string, instanceId: string): Promise<ApprovalStep[]>;
  update(tenantId: string, id: string, patch: Partial<ApprovalStep>): Promise<void>;
}

export interface ITaskRepository {
  insert(task: WorkflowTask): Promise<void>;
  findById(tenantId: string, id: string): Promise<WorkflowTask | null>;
  findByInstance(tenantId: string, instanceId: string): Promise<WorkflowTask[]>;
  findByAssignee(tenantId: string, assigneeId: string): Promise<WorkflowTask[]>;
  update(tenantId: string, id: string, patch: Partial<WorkflowTask>): Promise<void>;
}

export interface ITimerRepository {
  insert(timer: WorkflowTimer): Promise<void>;
  findById(tenantId: string, id: string): Promise<WorkflowTimer | null>;
  findByInstance(tenantId: string, instanceId: string): Promise<WorkflowTimer[]>;
  findExpired(tenantId: string, now: string): Promise<WorkflowTimer[]>;
  update(tenantId: string, id: string, patch: Partial<WorkflowTimer>): Promise<void>;
}

export interface IHistoryRepository {
  insert(entry: WorkflowHistoryEntry): Promise<void>;
  findByInstance(tenantId: string, instanceId: string, limit?: number): Promise<WorkflowHistoryEntry[]>;
}

export interface ITimelineRepository {
  insert(entry: WorkflowTimelineEntry): Promise<void>;
  findByInstance(tenantId: string, instanceId: string, limit?: number): Promise<WorkflowTimelineEntry[]>;
}

export interface IWorkflowAuditRepository {
  insert(record: Omit<WorkflowAuditRecord, 'id' | 'createdAt'>): Promise<WorkflowAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<WorkflowAuditRecord[]>;
  findByInstance(tenantId: string, instanceId: string, limit?: number): Promise<WorkflowAuditRecord[]>;
}

export { type Result, type EventEnvelope };
