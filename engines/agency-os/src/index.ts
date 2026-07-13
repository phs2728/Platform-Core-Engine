/**
 * Agency OS Engine — Public API
 *
 * Platform Agency OS RC1 — AI Digital Agency Operating System
 */

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

// Agency OS types from core-sdk
export { AGENCY_FIRST_PRINCIPLE, DECISION_PIPELINE, WORKFLOW_PHASES } from '@platform/core-sdk';
export type {
  DecisionPhase, DecisionGate,
  ExecutiveRole, ExecutiveAgent, ExecutiveDecision,
  SwarmType, SwarmSpecialist, Swarm,
  TaskStatus, TaskPriority, AgencyTask, TaskResult,
  DebateStance, DebateOpinion, ExpertDebate,
  WorkflowPhase, WorkflowStatus, AgencyWorkflow,
  WorkflowTemplateType, WorkflowTemplate,
  MemoryCategory, ExecutiveMemory,
  AgencyExecutionReport, SwarmCollaborationReport,
  DebateSummaryReport, DecisionLogReport,
  ExecutiveMemoryReport, LearningEvolutionReport,
  AgencyAuditEventType, AgencyAuditRecord,
} from '@platform/core-sdk';

// Engine-specific types
export type {
  IClock, IIdGenerator, IEventBus, IOrganizationVerifier,
  IWorkflowRepository, ISwarmRepository, ITaskRepository,
  IDebateRepository, IExecutiveDecisionRepository,
  IExecutiveMemoryRepository, IAgencyAuditRepository,
} from './interfaces/index.js';

// Engine-specific data (const exports)
export { WORKFLOW_TEMPLATES, SWARM_SPECIALISTS, EXECUTIVE_MEMORY_PRESETS } from './interfaces/index.js';

// Use Cases — Workflow & Swarm
export {
  initiateWorkflowUseCase, advanceWorkflowPhaseUseCase,
  getWorkflowUseCase, listWorkflowsUseCase,
  createSwarmUseCase, completeSwarmUseCase, getSwarmUseCase,
  validateAgencyFirstPrinciple,
} from './use-cases/WorkflowSwarmUseCases.js';

// Use Cases — Task, Debate, Decision
export {
  createTaskUseCase, executeTaskUseCase, retryTaskUseCase, getTaskUseCase,
  startDebateUseCase, addOpinionUseCase, resolveDebateUseCase,
  makeDecisionUseCase, listDecisionsUseCase,
} from './use-cases/TaskDebateDecisionUseCases.js';

// Use Cases — Memory & Report
export {
  storeMemoryUseCase, queryMemoryUseCase, seedDefaultMemoryUseCase, updateMemoryUseCase,
  generateReportUseCase, listWorkflowTemplatesUseCase,
} from './use-cases/MemoryReportUseCases.js';

// Events
export { AGENCY_EVENTS, type AgencyEventType, AGENCY_EVENT_SCHEMAS } from './domain/events.js';

export type { AgencyUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryWorkflowRepository, InMemorySwarmRepository, InMemoryTaskRepository,
  InMemoryDebateRepository, InMemoryExecutiveDecisionRepository,
  InMemoryExecutiveMemoryRepository, InMemoryAgencyAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Adapters
export {
  InMemoryOrganizationVerifier, InMemoryEventBus, type RecordedEnvelope,
  MockSwarmExecutor, MockDebateResolver,
} from './infrastructure/hostAdapters.js';