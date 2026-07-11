/**
 * Workflow Engine — Shared Use Case Deps
 */

import type {
  IClock, IIdGenerator, IEventBus,
  IWorkflowRepository, IWorkflowInstanceRepository,
  IApprovalStepRepository, ITaskRepository, ITimerRepository,
  IHistoryRepository, ITimelineRepository, IWorkflowAuditRepository,
  IOrganizationVerifier, IUserVerifier, IIdentityVerifier,
  ICustomDataPolicyProvider,
} from '../interfaces/index.js';

export interface WorkflowUseCaseDeps {
  workflowRepo: IWorkflowRepository;
  instanceRepo: IWorkflowInstanceRepository;
  approvalRepo: IApprovalStepRepository;
  taskRepo: ITaskRepository;
  timerRepo: ITimerRepository;
  historyRepo: IHistoryRepository;
  timelineRepo: ITimelineRepository;
  auditRepo: IWorkflowAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  userVerifier: IUserVerifier;
  identityVerifier: IIdentityVerifier;
  policyProvider: ICustomDataPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
