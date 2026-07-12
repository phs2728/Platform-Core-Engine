/**
 * Workflow Engine — Workflow Core CRUD UseCases (8)
 *
 * createWorkflow, updateWorkflow, archiveWorkflow, restoreWorkflow,
 * deleteWorkflow, getWorkflow, listWorkflows, searchWorkflows
 */

import {
  Ok, Err, type Result,
  ValidationError, ConflictError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import {
  createWorkflowSchema, updateWorkflowSchema,
  simpleWorkflowActionSchema, deleteWorkflowSchema,
  getWorkflowSchema, searchWorkflowsSchema, listWorkflowsSchema,
} from '../domain/validation.js';
import type { WorkflowUseCaseDeps } from './types.js';
import type {
  Workflow, WorkflowDefinition,
  WorkflowSearchCriteria, WorkflowSearchResult,
} from '../interfaces/index.js';

function env(deps: WorkflowUseCaseDeps, agg: string, tenant: string, corr: string, eventType: string, schemaRef: string, payload: unknown): EventEnvelope<unknown> {
  return {
    eventId: deps.idGenerator.generate(), aggregateId: agg, occurredAt: deps.clock.now().toISOString(),
    version: '1.0.0', tenantId: tenant, correlationId: corr, causationId: '',
    engine: 'workflow', eventType, schemaRef, payload,
  };
}

async function audit(deps: WorkflowUseCaseDeps, orgId: string, tenantId: string, actorId: string, corr: string, eventType: string, meta: Record<string, unknown>, workflowId?: string) {
  const rec: Record<string, unknown> = { organizationId: orgId, tenantId, actorId, correlationId: corr, eventType, metadata: meta };
  if (workflowId !== undefined) rec.workflowId = workflowId;
  await deps.auditRepo.insert(rec as Parameters<typeof deps.auditRepo.insert>[0]);
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE
// ════════════════════════════════════════════════════════════════════════════

export interface CreateWorkflowInput {
  tenantId: string; correlationId: string; actorId: string;
  organizationId: string;
  name: string; slug: string; type: string;
  description?: string;
  states: string[]; initialState: string;
  transitions: { fromState: string; toState: string; guardExpression?: string; automationHooks?: string[] }[];
  approvalSteps?: { stepName: string; approverRole: string; sequence: number; isRequired: boolean; slaMinutes?: number }[];
  timerConfigs?: { name: string; type: string; ttlSeconds: number; metadata?: Record<string, unknown> }[];
  escalationRules?: { id: string; condition: string; target: string; delayMinutes: number; metadata?: Record<string, unknown> }[];
  compensationActions?: { id: string; stepName: string; action: string; metadata?: Record<string, unknown> }[];
  retryPolicy?: { maxAttempts: number; strategy: string; initialDelaySeconds: number; multiplier?: number };
  sla?: { responseMinutes: number; resolutionMinutes: number; escalationTarget: string };
  attributes?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export async function createWorkflowUseCase(
  input: CreateWorkflowInput, deps: WorkflowUseCaseDeps,
): Promise<Result<{ workflowId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createWorkflowSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Organization verification (MANDATORY)
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));

  // CustomDataPolicy (1회 호출 at entry)
  const allowedTypes = await deps.policyProvider.getAllowedWorkflowTypes(d.tenantId);
  if (!allowedTypes.includes(d.type)) return Err(new ValidationError(`type "${d.type}" not allowed`));

  const pr = await deps.policyProvider.validateAttributes(d.tenantId, d.type, d.attributes ?? {});
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));

  // Max workflows check
  const maxWf = await deps.policyProvider.getMaxWorkflowsPerOrg(d.tenantId);
  if (await deps.workflowRepo.countByOrganization(d.tenantId, d.organizationId) >= maxWf) {
    return Err(new ConflictError(`Max workflows (${maxWf}) reached`));
  }

  // Slug uniqueness
  const existingSlug = await deps.workflowRepo.findBySlug(d.tenantId, d.organizationId, d.slug);
  if (existingSlug) return Err(new ConflictError(`Slug "${d.slug}" already exists`));

  // Validate initialState is in states
  if (!d.states.includes(d.initialState)) {
    return Err(new ValidationError(`initialState "${d.initialState}" not in states list`));
  }

  const wfId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const definition: WorkflowDefinition = {
    id: deps.idGenerator.generate(),
    tenantId: d.tenantId,
    version: 1,
    states: d.states,
    initialState: d.initialState,
    transitions: d.transitions as WorkflowDefinition['transitions'],
    approvalSteps: (d.approvalSteps ?? []) as WorkflowDefinition['approvalSteps'],
    timerConfigs: (d.timerConfigs ?? []) as WorkflowDefinition['timerConfigs'],
    escalationRules: (d.escalationRules ?? []) as WorkflowDefinition['escalationRules'],
    compensationActions: (d.compensationActions ?? []) as WorkflowDefinition['compensationActions'],
    retryPolicy: (d.retryPolicy as WorkflowDefinition['retryPolicy']) ?? null,
    sla: (d.sla as WorkflowDefinition['sla']) ?? null,
    isActive: false,
    publishedAt: null,
  };

  const workflow: Workflow = {
    id: wfId, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, slug: d.slug, type: d.type, status: 'Draft', version: 1,
    definition,
    references: [],
    attributes: pr.value, customFields: d.customFields ?? {}, metadata: d.metadata ?? {},
    tags: d.tags ?? [],
    createdBy: d.actorId, updatedBy: d.actorId,
    createdAt: now, updatedAt: now,
    activatedAt: null, completedAt: null, cancelledAt: null, cancelReason: null,
    failedAt: null, failReason: null, expiredAt: null, archivedAt: null,
  };
  if (d.description !== undefined) workflow.description = d.description;

  await deps.workflowRepo.insert(workflow);
  await deps.eventBus.emit(env(deps, wfId, d.tenantId, d.correlationId, 'workflow.created', 'workflow.created.v1', { workflowId: wfId, name: d.name }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'workflow_created', { name: d.name }, wfId);
  return Ok({ workflowId: wfId, createdAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// UPDATE
// ════════════════════════════════════════════════════════════════════════════

export async function updateWorkflowUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string; workflowId: string;
    name?: string; description?: string;
    attributes?: Record<string, unknown>; customFields?: Record<string, unknown>; tags?: string[];
  },
  deps: WorkflowUseCaseDeps,
): Promise<Result<Workflow, ValidationError | NotFoundError | ConflictError>> {
  const v = updateWorkflowSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const ex = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (!ex) return Err(new NotFoundError('Workflow not found'));
  if (ex.archivedAt !== null) return Err(new ConflictError('Workflow is archived'));

  const now = deps.clock.now().toISOString();
  const patch: Partial<Workflow> = { updatedAt: now, updatedBy: d.actorId };
  if (d.name !== undefined) patch.name = d.name;
  if (d.description !== undefined) patch.description = d.description;
  if (d.customFields !== undefined) patch.customFields = d.customFields;
  if (d.tags !== undefined) patch.tags = d.tags;
  if (d.attributes !== undefined) {
    const pr = await deps.policyProvider.validateAttributes(d.tenantId, ex.type, d.attributes);
    if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));
    patch.attributes = pr.value;
  }
  await deps.workflowRepo.update(d.tenantId, d.workflowId, patch);
  await deps.eventBus.emit(env(deps, d.workflowId, d.tenantId, d.correlationId, 'workflow.updated', 'workflow.updated.v1', { workflowId: d.workflowId }));
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'workflow_updated', {}, d.workflowId);
  return Ok({ ...ex, ...patch } as Workflow);
}

// ════════════════════════════════════════════════════════════════════════════
// ARCHIVE / RESTORE
// ════════════════════════════════════════════════════════════════════════════

export async function archiveWorkflowUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; workflowId: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<Workflow, ValidationError | NotFoundError | ConflictError>> {
  const v = simpleWorkflowActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (!ex) return Err(new NotFoundError('Workflow not found'));
  if (ex.archivedAt !== null) return Err(new ConflictError('Already archived'));
  const now = deps.clock.now().toISOString();
  await deps.workflowRepo.update(d.tenantId, d.workflowId, { archivedAt: now });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'workflow_archived', {}, d.workflowId);
  return Ok({ ...ex, archivedAt: now });
}

export async function restoreWorkflowUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; workflowId: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<Workflow, ValidationError | NotFoundError | ConflictError>> {
  const v = simpleWorkflowActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (!ex) return Err(new NotFoundError('Workflow not found'));
  if (ex.archivedAt === null) return Err(new ConflictError('Not archived'));
  await deps.workflowRepo.update(d.tenantId, d.workflowId, { archivedAt: null });
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'workflow_restored', {}, d.workflowId);
  return Ok({ ...ex, archivedAt: null });
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE
// ════════════════════════════════════════════════════════════════════════════

export async function deleteWorkflowUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; workflowId: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<{ workflowId: string }, ValidationError | NotFoundError>> {
  const v = deleteWorkflowSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const ex = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (!ex) return Err(new NotFoundError('Workflow not found'));
  await deps.workflowRepo.remove(d.tenantId, d.workflowId);
  await audit(deps, ex.organizationId, d.tenantId, d.actorId, d.correlationId, 'workflow_deleted', { name: ex.name });
  return Ok({ workflowId: d.workflowId });
}

// ════════════════════════════════════════════════════════════════════════════
// GET / LIST / SEARCH
// ════════════════════════════════════════════════════════════════════════════

export async function getWorkflowUseCase(
  input: { tenantId: string; workflowId: string },
  deps: WorkflowUseCaseDeps,
): Promise<Result<Workflow | null, ValidationError>> {
  const v = getWorkflowSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.workflowRepo.findById(v.data.tenantId, v.data.workflowId));
}

export async function listWorkflowsUseCase(
  input: { tenantId: string; organizationId?: string; limit?: number; offset?: number },
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowSearchResult, ValidationError>> {
  const v = listWorkflowsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  return Ok(await deps.workflowRepo.search({
    tenantId: v.data.tenantId,
    ...(v.data.organizationId !== undefined ? { organizationId: v.data.organizationId } : {}),
    ...(v.data.limit !== undefined ? { limit: v.data.limit } : {}),
    ...(v.data.offset !== undefined ? { offset: v.data.offset } : {}),
  }));
}

export async function searchWorkflowsUseCase(
  input: WorkflowSearchCriteria,
  deps: WorkflowUseCaseDeps,
): Promise<Result<WorkflowSearchResult, ValidationError>> {
  const v = searchWorkflowsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search'));
  return Ok(await deps.workflowRepo.search(v.data as WorkflowSearchCriteria));
}
