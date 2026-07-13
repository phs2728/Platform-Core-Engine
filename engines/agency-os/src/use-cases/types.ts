/** Agency OS — Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus, IOrganizationVerifier,
  IWorkflowRepository, ISwarmRepository, ITaskRepository,
  IDebateRepository, IExecutiveDecisionRepository,
  IExecutiveMemoryRepository, IAgencyAuditRepository,
} from '../interfaces/index.js';
import type { MockSwarmExecutor, MockDebateResolver } from '../infrastructure/hostAdapters.js';

export interface AgencyUseCaseDeps {
  workflowRepo: IWorkflowRepository;
  swarmRepo: ISwarmRepository;
  taskRepo: ITaskRepository;
  debateRepo: IDebateRepository;
  decisionRepo: IExecutiveDecisionRepository;
  memoryRepo: IExecutiveMemoryRepository;
  auditRepo: IAgencyAuditRepository;
  eventBus: IEventBus;
  organizationVerifier: IOrganizationVerifier;
  swarmExecutor: MockSwarmExecutor;
  debateResolver: MockDebateResolver;
  idGenerator: IIdGenerator;
  clock: IClock;
}