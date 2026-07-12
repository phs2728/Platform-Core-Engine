/**
 * Workflow Engine — Public API
 *
 * 사장님 확립 (2026-07-11) Phase 6 — Platform Layer Foundation Engine.
 * 30 UseCases: Workflow(8) + Instance(5) + Transition(6) + Task(5) + Timer(2) + History(2) + Reference/Timeline(2)
 */

export {
  type Result, Ok, Err,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope, createEnvelope, z,
} from '@platform/core-sdk';

// ── Entities ───────────────────────────

export type {
  Workflow, WorkflowDefinition, WorkflowInstance, WorkflowTask,
  WorkflowTimer, WorkflowHistoryEntry, WorkflowTimelineEntry,
  ApprovalStep, ApprovalStepDef,
  WorkflowStatus, WorkflowInstanceStatus, ApprovalStepStatus,
  TaskStatus, TimerType, TimerStatus, RetryStrategy,
  EscalationTarget, EscalationRule, AutomationHookType,
  TransitionRule, RetryPolicy, SlaPolicy, CompensationAction,
  WorkflowReference,
  WorkflowSearchCriteria, WorkflowSearchResult,
  InstanceSearchCriteria, InstanceSearchResult,
  WorkflowAuditRecord, WorkflowAuditEventType,
} from './interfaces/index.js';

// ── Host Interfaces ────────────────────

export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IUserVerifier, IIdentityVerifier,
  ICustomDataPolicyProvider,
  IWorkflowRepository, IWorkflowInstanceRepository,
  IApprovalStepRepository, ITaskRepository, ITimerRepository,
  IHistoryRepository, ITimelineRepository, IWorkflowAuditRepository,
} from './interfaces/index.js';

// ── UseCases ───────────────────────────

export {
  createWorkflowUseCase, updateWorkflowUseCase,
  archiveWorkflowUseCase, restoreWorkflowUseCase,
  deleteWorkflowUseCase, getWorkflowUseCase,
  listWorkflowsUseCase, searchWorkflowsUseCase,
  type CreateWorkflowInput,
} from './use-cases/WorkflowCoreUseCases.js';

export {
  startWorkflowUseCase, cancelWorkflowInstanceUseCase,
  restartWorkflowUseCase, getWorkflowInstanceUseCase,
  listWorkflowInstancesUseCase,
  transitionUseCase, approveUseCase, rejectUseCase,
  rollbackUseCase, retryUseCase, skipUseCase,
} from './use-cases/InstanceTransitionUseCases.js';

export {
  createTaskUseCase, assignTaskUseCase, completeTaskUseCase,
  cancelTaskUseCase, reassignTaskUseCase,
  scheduleTimerUseCase, cancelTimerUseCase,
  getHistoryUseCase, getTimelineUseCase,
  attachReferenceUseCase, appendTimelineUseCase,
} from './use-cases/TaskTimerHistoryUseCases.js';

export type { WorkflowUseCaseDeps } from './use-cases/types.js';

// ── In-Memory Repositories + Host Adapters ──

export {
  InMemoryWorkflowRepository, InMemoryWorkflowInstanceRepository,
  InMemoryApprovalStepRepository, InMemoryTaskRepository,
  InMemoryTimerRepository, InMemoryHistoryRepository,
  InMemoryTimelineRepository, InMemoryWorkflowAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

export {
  InMemoryOrganizationVerifier, InMemoryUserVerifier, InMemoryIdentityVerifier,
  StaticWorkflowPolicyProvider, InMemoryEventBus,
  type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';

// ── Domain (for host implementors) ──────

export {
  validateWorkflowStatusTransition, isWorkflowMutable, isTerminalStatus,
  validateStateTransition, WORKFLOW_TRANSITIONS,
} from './domain/statusTransition.js';
