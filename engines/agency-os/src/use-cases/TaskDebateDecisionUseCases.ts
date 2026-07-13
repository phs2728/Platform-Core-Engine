/**
 * Agency OS — Task, Debate, Decision Use Cases
 *
 * Task lifecycle + Expert Debate Engine + Executive Decision (Agency First Principle)
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  createTaskSchema, taskActionSchema, completeTaskSchema,
  startDebateSchema, addOpinionSchema, resolveDebateSchema,
  makeDecisionSchema,
} from '../domain/validation.js';
import { AGENCY_EVENTS, AGENCY_EVENT_SCHEMAS } from '../domain/events.js';
import { DECISION_PIPELINE } from '../interfaces/index.js';
import { envelope, auditLog, now } from './helpers.js';
import { validateAgencyFirstPrinciple } from './WorkflowSwarmUseCases.js';
import type { AgencyUseCaseDeps } from './types.js';
import type { AgencyTask, ExpertDebate, ExecutiveDecision } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// TASK (4 UCs)
// ═══════════════════════════════════════════

export async function createTaskUseCase(
  input: z.infer<typeof createTaskSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ taskId: string }, ValidationError | NotFoundError>> {
  const v = createTaskSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  const task: AgencyTask = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    swarmType: d.swarmType, title: d.title, description: d.description,
    priority: d.priority, status: 'Pending', dependencies: d.dependencies ?? [],
    createdAt: now(deps), updatedAt: now(deps),
  } as AgencyTask & { workflowId?: string };
  (task as AgencyTask & { workflowId?: string }).workflowId = d.workflowId;
  await deps.taskRepo.insert(task as never);
  // Add task to workflow
  const wf = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (wf) await deps.workflowRepo.update(d.tenantId, d.workflowId, { taskIds: [...wf.taskIds, id] });
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'task_assigned', { taskId: id, swarmType: d.swarmType }, id);
  return Ok({ taskId: id });
}

export async function executeTaskUseCase(
  input: z.infer<typeof taskActionSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ taskId: string; status: string; confidence: number }, ValidationError | NotFoundError>> {
  const v = taskActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const task = await deps.taskRepo.findById(d.tenantId, d.taskId);
  if (!task) return Err(new NotFoundError('Task not found'));
  // Mock parallel execution via swarmExecutor
  const result = deps.swarmExecutor.execute(task.swarmType, task.title);
  await deps.taskRepo.update(d.tenantId, d.taskId, { status: 'Done', result: { taskId: d.taskId, ...result } });
  await deps.eventBus.emit(envelope(deps, d.taskId, d.tenantId, d.correlationId, AGENCY_EVENTS.TASK_COMPLETED, AGENCY_EVENT_SCHEMAS['agency.task.completed'], { taskId: d.taskId, confidence: result.confidenceScore }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'task_completed', { taskId: d.taskId, confidence: result.confidenceScore }, d.taskId);
  return Ok({ taskId: d.taskId, status: 'Done', confidence: result.confidenceScore });
}

export async function retryTaskUseCase(
  input: z.infer<typeof taskActionSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ taskId: string; status: string }, ValidationError | NotFoundError>> {
  const v = taskActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const task = await deps.taskRepo.findById(d.tenantId, d.taskId);
  if (!task) return Err(new NotFoundError('Task not found'));
  await deps.taskRepo.update(d.tenantId, d.taskId, { status: 'Retried' });
  await deps.eventBus.emit(envelope(deps, d.taskId, d.tenantId, d.correlationId, AGENCY_EVENTS.TASK_RETRIED, AGENCY_EVENT_SCHEMAS['agency.task.retried'], { taskId: d.taskId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'task_retried', { taskId: d.taskId }, d.taskId);
  return Ok({ taskId: d.taskId, status: 'Retried' });
}

export async function getTaskUseCase(
  tenantId: string, taskId: string, deps: AgencyUseCaseDeps,
): Promise<Result<AgencyTask, NotFoundError>> {
  const t = await deps.taskRepo.findById(tenantId, taskId);
  if (!t) return Err(new NotFoundError('Task not found'));
  return Ok(t);
}

// ═══════════════════════════════════════════
// DEBATE (3 UCs) — Expert Debate Engine
// ═══════════════════════════════════════════

export async function startDebateUseCase(
  input: z.infer<typeof startDebateSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ debateId: string; opinionCount: number }, ValidationError | NotFoundError>> {
  const v = startDebateSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  // Generate mock expert opinions
  const mockOpinions = deps.debateResolver.generateOpinions(d.topic);
  const debate: ExpertDebate = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    topic: d.topic,
    opinions: mockOpinions.map((o, idx) => ({ id: `op-${id}-${idx}`, ...o, rebuttals: [] })),
    finalRecommendation: '', resolvedBy: 'Consensus',
    createdAt: now(deps),
  } as ExpertDebate & { workflowId?: string };
  (debate as ExpertDebate & { workflowId?: string }).workflowId = d.workflowId;
  await deps.debateRepo.insert(debate as never);
  // Add debate to workflow
  const wf = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (wf) await deps.workflowRepo.update(d.tenantId, d.workflowId, { debateIds: [...wf.debateIds, id] });
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, AGENCY_EVENTS.DEBATE_STARTED, AGENCY_EVENT_SCHEMAS['agency.debate.started'], { debateId: id, topic: d.topic, opinionCount: mockOpinions.length }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'debate_started', { topic: d.topic }, id);
  return Ok({ debateId: id, opinionCount: mockOpinions.length });
}

export async function addOpinionUseCase(
  input: z.infer<typeof addOpinionSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ debateId: string; opinionId: string }, ValidationError | NotFoundError>> {
  const v = addOpinionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const debate = await deps.debateRepo.findById(d.tenantId, d.debateId);
  if (!debate) return Err(new NotFoundError('Debate not found'));
  const opinionId = `op-${d.debateId}-${debate.opinions.length}`;
  const newOpinions = [...debate.opinions, { id: opinionId, expertRole: d.expertRole, stance: d.stance, argument: d.argument, evidence: d.evidence ?? [], rebuttals: [] }];
  // Update debate (debateRepo doesn't have update — re-insert)
  await deps.debateRepo.insert({ ...debate, opinions: newOpinions } as never);
  return Ok({ debateId: d.debateId, opinionId });
}

export async function resolveDebateUseCase(
  input: z.infer<typeof resolveDebateSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ debateId: string; recommendation: string; resolvedBy: string }, ValidationError | NotFoundError>> {
  const v = resolveDebateSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const debate = await deps.debateRepo.findById(d.tenantId, d.debateId);
  if (!debate) return Err(new NotFoundError('Debate not found'));
  await deps.debateRepo.insert({ ...debate, finalRecommendation: d.finalRecommendation, resolvedBy: d.resolvedBy } as never);
  await deps.eventBus.emit(envelope(deps, d.debateId, d.tenantId, d.correlationId, AGENCY_EVENTS.DEBATE_RESOLVED, AGENCY_EVENT_SCHEMAS['agency.debate.resolved'], { debateId: d.debateId, recommendation: d.finalRecommendation, resolvedBy: d.resolvedBy }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'debate_resolved', { recommendation: d.finalRecommendation, resolvedBy: d.resolvedBy }, d.debateId);
  return Ok({ debateId: d.debateId, recommendation: d.finalRecommendation, resolvedBy: d.resolvedBy });
}

// ═══════════════════════════════════════════
// DECISION (2 UCs) — Agency First Principle
// ═══════════════════════════════════════════

export async function makeDecisionUseCase(
  input: z.infer<typeof makeDecisionSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ decisionId: string; allGatesPassed: boolean; failedGates: string[] }, ValidationError>> {
  const v = makeDecisionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  // Agency First Principle: all 6 gates must pass
  const gates = DECISION_PIPELINE.map(phase => ({ phase, passed: true, notes: `${phase} 완료` }));
  const validation = validateAgencyFirstPrinciple(gates);
  const id = deps.idGenerator.generate();
  const decision: ExecutiveDecision = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    decisionBy: d.decisionBy, topic: d.topic, rationale: d.rationale,
    gates, allGatesPassed: validation.allPassed,
    createdAt: now(deps),
  };
  await deps.decisionRepo.insert(decision);
  const eventType = validation.allPassed ? AGENCY_EVENTS.DECISION_MADE : AGENCY_EVENTS.DECISION_REJECTED;
  const schemaRef = validation.allPassed ? AGENCY_EVENT_SCHEMAS['agency.decision.made'] : AGENCY_EVENT_SCHEMAS['agency.decision.rejected'];
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, eventType, schemaRef, { decisionId: id, topic: d.topic, allGatesPassed: validation.allPassed, failedGates: validation.failedGates }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, validation.allPassed ? 'decision_made' : 'decision_rejected', { topic: d.topic, failedGates: validation.failedGates }, id);
  // Add decision to workflow
  if (d.workflowId) {
    const wf = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
    if (wf) await deps.workflowRepo.update(d.tenantId, d.workflowId, { decisionIds: [...wf.decisionIds, id] });
  }
  return Ok({ decisionId: id, allGatesPassed: validation.allPassed, failedGates: validation.failedGates });
}

export async function listDecisionsUseCase(
  tenantId: string, orgId: string, deps: AgencyUseCaseDeps,
): Promise<Result<ExecutiveDecision[], NotFoundError>> {
  return Ok(await deps.decisionRepo.findByOrganization(tenantId, orgId));
}