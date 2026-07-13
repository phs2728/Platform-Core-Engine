/**
 * Agency OS — Workflow & Swarm Use Cases
 *
 * CEO Agent + Project Manager + Agency Orchestrator 역할 수행
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import { initiateWorkflowSchema, advanceWorkflowSchema, createSwarmSchema, swarmActionSchema } from '../domain/validation.js';
import { AGENCY_EVENTS, AGENCY_EVENT_SCHEMAS } from '../domain/events.js';
import { WORKFLOW_TEMPLATES, SWARM_SPECIALISTS } from '../interfaces/index.js';
import { envelope, auditLog, now } from './helpers.js';
import type { AgencyUseCaseDeps } from './types.js';
import type { AgencyWorkflow, Swarm, WorkflowPhase, SwarmType } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// WORKFLOW (4 UCs)
// ═══════════════════════════════════════════

export async function initiateWorkflowUseCase(
  input: z.infer<typeof initiateWorkflowSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ workflowId: string; templateName: string; requiredSwarms: string[] }, ValidationError>> {
  const v = initiateWorkflowSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  const template = WORKFLOW_TEMPLATES[d.templateType];
  const id = deps.idGenerator.generate();
  const wf: AgencyWorkflow = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, templateType: d.templateType,
    status: 'Initiated', currentPhase: 'Plan',
    phaseHistory: [{ phase: 'Plan', enteredAt: now(deps) }],
    taskIds: [], swarmIds: [], debateIds: [], decisionIds: [],
    createdAt: now(deps), updatedAt: now(deps),
  };
  await deps.workflowRepo.insert(wf);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, AGENCY_EVENTS.WORKFLOW_INITIATED, AGENCY_EVENT_SCHEMAS['agency.workflow.initiated'], { workflowId: id, template: template.name }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'workflow_initiated', { template: d.templateType }, id);
  return Ok({ workflowId: id, templateName: template.name, requiredSwarms: template.requiredSwarms });
}

export async function advanceWorkflowPhaseUseCase(
  input: z.infer<typeof advanceWorkflowSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ workflowId: string; newPhase: WorkflowPhase; newStatus: string }, ValidationError | NotFoundError>> {
  const v = advanceWorkflowSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const wf = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (!wf) return Err(new NotFoundError('Workflow not found'));
  const phases: WorkflowPhase[] = ['Plan', 'SwarmCreation', 'ParallelExecution', 'Debate', 'Merge', 'Verification', 'Retry', 'Learning', 'Memory', 'Release'];
  const currentIdx = phases.indexOf(wf.currentPhase);
  if (currentIdx >= phases.length - 1) return Err(new ValidationError('Workflow already at final phase'));
  const nextPhase: WorkflowPhase = phases[currentIdx + 1]!;
  const statusMap: Record<WorkflowPhase, string> = {
    Plan: 'Planning', SwarmCreation: 'Planning', ParallelExecution: 'Executing',
    Debate: 'Debating', Merge: 'Executing', Verification: 'Verifying',
    Retry: 'Executing', Learning: 'Executing', Memory: 'Executing', Release: 'Released',
  };
  const newStatus = statusMap[nextPhase];
  // Close current phase
  const phaseHistory = wf.phaseHistory.map((p: { phase: WorkflowPhase; enteredAt: string; exitedAt?: string }) => p.exitedAt ? p : p.phase === wf.currentPhase ? { ...p, exitedAt: now(deps) } : p);
  phaseHistory.push({ phase: nextPhase, enteredAt: now(deps) });
  await deps.workflowRepo.update(d.tenantId, d.workflowId, { currentPhase: nextPhase, status: newStatus as never, phaseHistory });
  const eventMap: Record<WorkflowPhase, string> = {
    Plan: AGENCY_EVENTS.WORKFLOW_PHASE_CHANGED, SwarmCreation: AGENCY_EVENTS.WORKFLOW_PHASE_CHANGED,
    ParallelExecution: AGENCY_EVENTS.WORKFLOW_PHASE_CHANGED, Debate: AGENCY_EVENTS.WORKFLOW_PHASE_CHANGED,
    Merge: AGENCY_EVENTS.WORKFLOW_PHASE_CHANGED, Verification: AGENCY_EVENTS.WORKFLOW_PHASE_CHANGED,
    Retry: AGENCY_EVENTS.WORKFLOW_PHASE_CHANGED, Learning: AGENCY_EVENTS.WORKFLOW_PHASE_CHANGED,
    Memory: AGENCY_EVENTS.WORKFLOW_PHASE_CHANGED, Release: AGENCY_EVENTS.WORKFLOW_RELEASED,
  };
  await deps.eventBus.emit(envelope(deps, d.workflowId, d.tenantId, d.correlationId, eventMap[nextPhase], AGENCY_EVENT_SCHEMAS[nextPhase === 'Release' ? 'agency.workflow.released' : 'agency.workflow.phase_changed'], { workflowId: d.workflowId, newPhase: nextPhase }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'workflow_phase_changed', { newPhase: nextPhase }, d.workflowId);
  return Ok({ workflowId: d.workflowId, newPhase: nextPhase, newStatus });
}

export async function getWorkflowUseCase(
  tenantId: string, workflowId: string, deps: AgencyUseCaseDeps,
): Promise<Result<AgencyWorkflow, NotFoundError>> {
  const wf = await deps.workflowRepo.findById(tenantId, workflowId);
  if (!wf) return Err(new NotFoundError('Workflow not found'));
  return Ok(wf);
}

export async function listWorkflowsUseCase(
  tenantId: string, orgId: string, deps: AgencyUseCaseDeps,
): Promise<Result<AgencyWorkflow[], NotFoundError>> {
  return Ok(await deps.workflowRepo.findByOrganization(tenantId, orgId));
}

// ═══════════════════════════════════════════
// SWARM (3 UCs)
// ═══════════════════════════════════════════

export async function createSwarmUseCase(
  input: z.infer<typeof createSwarmSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ swarmId: string; type: SwarmType; specialistCount: number }, ValidationError | NotFoundError>> {
  const v = createSwarmSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const preset = SWARM_SPECIALISTS[d.type];
  const id = deps.idGenerator.generate();
  const swarm: Swarm = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    type: d.type, leader: preset.leader,
    specialists: preset.specialists.map((s, idx) => ({ id: `spec-${id}-${idx}`, role: s.role, swarmType: d.type, capabilities: s.capabilities })),
    status: 'Active', taskIds: [],
    createdAt: now(deps),
  } as Swarm & { workflowId?: string };
  (swarm as Swarm & { workflowId?: string }).workflowId = d.workflowId;
  await deps.swarmRepo.insert(swarm as never);
  // Add swarm to workflow
  const wf = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (wf) {
    await deps.workflowRepo.update(d.tenantId, d.workflowId, { swarmIds: [...wf.swarmIds, id] });
  }
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, AGENCY_EVENTS.SWARM_CREATED, AGENCY_EVENT_SCHEMAS['agency.swarm.created'], { swarmId: id, type: d.type, leader: preset.leader }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'swarm_created', { type: d.type, leader: preset.leader }, id);
  return Ok({ swarmId: id, type: d.type, specialistCount: preset.specialists.length });
}

export async function completeSwarmUseCase(
  input: z.infer<typeof swarmActionSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ swarmId: string; status: string }, ValidationError | NotFoundError>> {
  const v = swarmActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const swarm = await deps.swarmRepo.findById(d.tenantId, d.swarmId);
  if (!swarm) return Err(new NotFoundError('Swarm not found'));
  await deps.swarmRepo.update(d.tenantId, d.swarmId, { status: 'Completed' });
  await deps.eventBus.emit(envelope(deps, d.swarmId, d.tenantId, d.correlationId, AGENCY_EVENTS.SWARM_COMPLETED, AGENCY_EVENT_SCHEMAS['agency.swarm.completed'], { swarmId: d.swarmId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'swarm_completed', {}, d.swarmId);
  return Ok({ swarmId: d.swarmId, status: 'Completed' });
}

export async function getSwarmUseCase(
  tenantId: string, swarmId: string, deps: AgencyUseCaseDeps,
): Promise<Result<Swarm, NotFoundError>> {
  const s = await deps.swarmRepo.findById(tenantId, swarmId);
  if (!s) return Err(new NotFoundError('Swarm not found'));
  return Ok(s);
}

// ═══════════════════════════════════════════
// AGENCY FIRST PRINCIPLE VALIDATION
// ═══════════════════════════════════════════

/**
 * Agency First Principle: No single agent makes important decisions alone.
 * Validates that a decision passed through the full pipeline:
 * Research → ExpertReview → Debate → EvidenceVerification → ExecutiveDecision → Learning
 */
export function validateAgencyFirstPrinciple(gates: { phase: string; passed: boolean }[]): {
  allPassed: boolean;
  failedGates: string[];
} {
  const requiredPhases = ['Research', 'ExpertReview', 'Debate', 'EvidenceVerification', 'ExecutiveDecision', 'Learning'];
  const failedGates = requiredPhases.filter(phase => !gates.some(g => g.phase === phase && g.passed));
  return { allPassed: failedGates.length === 0, failedGates };
}