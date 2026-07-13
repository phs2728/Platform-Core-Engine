/**
 * Agency OS Core Types — Platform Agency OS RC1
 */

// ═══ Agency First Principle ═══
export const AGENCY_FIRST_PRINCIPLE = `No single AI agent is allowed to make an important decision alone. Every strategic decision must pass through: Research → Expert Review → Debate → Evidence Verification → Executive Decision → Learning. The platform must optimize for the quality of decisions, not the speed of generation.`;

export type DecisionPhase = 'Research' | 'ExpertReview' | 'Debate' | 'EvidenceVerification' | 'ExecutiveDecision' | 'Learning';

export const DECISION_PIPELINE: DecisionPhase[] = ['Research', 'ExpertReview', 'Debate', 'EvidenceVerification', 'ExecutiveDecision', 'Learning'];

export interface DecisionGate {
  phase: DecisionPhase;
  passed: boolean;
  notes: string;
}

// ═══ Executive Layer ═══
export type ExecutiveRole = 'CEO' | 'ProjectManager' | 'AgencyOrchestrator' | 'MemoryManager' | 'QualityDirector' | 'ReleaseDirector';

export interface ExecutiveAgent {
  id: string;
  role: ExecutiveRole;
  name: string;
  capabilities: string[];
  active: boolean;
}

export interface ExecutiveDecision {
  id: string;
  tenantId: string;
  organizationId: string;
  decisionBy: ExecutiveRole;
  topic: string;
  rationale: string;
  gates: DecisionGate[];
  allGatesPassed: boolean;
  createdAt: string;
}

// ═══ Swarm Layer ═══
export type SwarmType = 'Research' | 'Creative' | 'UX' | 'Engineering' | 'QA' | 'Learning' | 'Marketing' | 'SEO' | 'Accessibility';

export interface SwarmSpecialist {
  id: string;
  role: string;
  swarmType: SwarmType;
  capabilities: string[];
}

export interface Swarm {
  id: string;
  tenantId: string;
  organizationId: string;
  type: SwarmType;
  leader: string;
  specialists: SwarmSpecialist[];
  status: 'Forming' | 'Active' | 'Completed' | 'Failed';
  taskIds: string[];
  createdAt: string;
}

// ═══ Task ═══
export type TaskStatus = 'Pending' | 'Assigned' | 'InProgress' | 'Review' | 'Done' | 'Failed' | 'Retried';
export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface AgencyTask {
  id: string;
  tenantId: string;
  organizationId: string;
  swarmType: SwarmType;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[];
  assignedSwarmId?: string;
  result?: TaskResult;
  createdAt: string;
  updatedAt: string;
}

export interface TaskResult {
  taskId: string;
  output: Record<string, unknown>;
  evidenceRefs: string[];
  confidenceScore: number;
  issues: string[];
}

// ═══ Debate ═══
export type DebateStance = 'Support' | 'Oppose' | 'Neutral';

export interface DebateOpinion {
  id: string;
  expertRole: string;
  stance: DebateStance;
  argument: string;
  evidence: string[];
  rebuttals: string[];
}

export interface ExpertDebate {
  id: string;
  tenantId: string;
  organizationId: string;
  topic: string;
  opinions: DebateOpinion[];
  finalRecommendation: string;
  resolvedBy: 'Consensus' | 'ChiefDesignOfficer' | 'CEO';
  createdAt: string;
}

// ═══ Workflow ═══
export type WorkflowPhase = 'Plan' | 'SwarmCreation' | 'ParallelExecution' | 'Debate' | 'Merge' | 'Verification' | 'Retry' | 'Learning' | 'Memory' | 'Release';
export const WORKFLOW_PHASES: WorkflowPhase[] = ['Plan', 'SwarmCreation', 'ParallelExecution', 'Debate', 'Merge', 'Verification', 'Retry', 'Learning', 'Memory', 'Release'];

export type WorkflowStatus = 'Initiated' | 'Planning' | 'Executing' | 'Debating' | 'Verifying' | 'Released' | 'Failed';

export interface AgencyWorkflow {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  templateType: WorkflowTemplateType;
  status: WorkflowStatus;
  currentPhase: WorkflowPhase;
  phaseHistory: { phase: WorkflowPhase; enteredAt: string; exitedAt?: string }[];
  taskIds: string[];
  swarmIds: string[];
  debateIds: string[];
  decisionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type WorkflowTemplateType =
  | 'LaunchHotelWebsite' | 'LaunchRestaurantWebsite' | 'LaunchMarketplace'
  | 'LaunchSaaS' | 'LaunchChurchWebsite' | 'LaunchNGOWebsite' | 'LaunchTravelWebsite' | 'Custom';

export interface WorkflowTemplate {
  type: WorkflowTemplateType;
  name: string;
  description: string;
  requiredSwarms: SwarmType[];
  estimatedTasks: number;
  industry?: string;
}

// ═══ Executive Memory ═══
export type MemoryCategory = 'SuccessPattern' | 'FailurePattern' | 'Tradeoff' | 'IndustryRule' | 'ConversionRule';

export interface ExecutiveMemory {
  id: string;
  tenantId: string;
  organizationId: string;
  category: MemoryCategory;
  pattern: string;
  trigger: string;
  outcome: string;
  evidence: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

// ═══ Reports ═══
export interface AgencyExecutionReport {
  id: string;
  tenantId: string;
  organizationId: string;
  workflowId: string;
  phasesCompleted: number;
  tasksCompleted: number;
  debatesResolved: number;
  decisionsMade: number;
  memoriesStored: number;
  summary: string;
  createdAt: string;
}

export interface SwarmCollaborationReport {
  id: string;
  tenantId: string;
  organizationId: string;
  workflowId: string;
  swarmSummaries: { swarmType: SwarmType; taskCount: number; status: string }[];
  createdAt: string;
}

export interface DebateSummaryReport {
  id: string;
  tenantId: string;
  organizationId: string;
  workflowId: string;
  debates: { topic: string; recommendation: string; resolvedBy: string }[];
  createdAt: string;
}

export interface DecisionLogReport {
  id: string;
  tenantId: string;
  organizationId: string;
  decisions: { topic: string; by: string; gatesPassed: boolean }[];
  createdAt: string;
}

export interface ExecutiveMemoryReport {
  id: string;
  tenantId: string;
  organizationId: string;
  memories: { pattern: string; outcome: string; confidence: number }[];
  createdAt: string;
}

export interface LearningEvolutionReport {
  id: string;
  tenantId: string;
  organizationId: string;
  patternsLearned: number;
  memoriesUpdated: number;
  recommendationsGenerated: number;
  createdAt: string;
}

// ═══ Audit ═══
export type AgencyAuditEventType =
  | 'workflow_initiated' | 'workflow_phase_changed' | 'workflow_released' | 'workflow_failed'
  | 'swarm_created' | 'swarm_completed' | 'swarm_failed'
  | 'task_assigned' | 'task_completed' | 'task_failed' | 'task_retried'
  | 'debate_started' | 'debate_resolved'
  | 'decision_made' | 'decision_rejected'
  | 'memory_stored' | 'memory_updated'
  | 'report_generated';

export interface AgencyAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  actorId: string;
  correlationId: string;
  eventType: AgencyAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}
