/**
 * Scenario CRUD UseCases (6) —
 *   createScenario / updateScenario / deleteScenario /
 *   getScenario / listScenarios / searchScenarios
 *
 * Plus: seedBuiltinScenarios (loads 8 built-in scenarios)
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordValidationAudit } from '../domain/audit.js';
import {
  createScenarioSchema, updateScenarioSchema, deleteScenarioSchema,
  getScenarioSchema, searchScenariosSchema,
} from '../domain/validation.js';
import { emitValidationEvent } from '../domain/events.js';
import type { ValidationUseCaseDeps } from './types.js';
import type { Scenario, ScenarioSearchCriteria, ScenarioSearchResult, ScenarioStep } from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// helper: parse steps from zod output
// ════════════════════════════════════════════════════════════════════════════

function parseSteps(raw: {
  name: string; description: string; engineId: string; actionName: string;
  params: Record<string, unknown>;
  expectations: { type: string; description: string; validator: string; params: Record<string, unknown>; required: boolean }[];
  timeoutMs: number; continueOnFailure: boolean; sequence: number;
}[]): ScenarioStep[] {
  return raw.map((s, i) => ({
    id: `step-${i + 1}`,
    name: s.name,
    description: s.description,
    engineId: s.engineId,
    actionName: s.actionName,
    params: s.params,
    expectations: s.expectations.map((e) => ({
      type: e.type as 'event_published',
      description: e.description,
      validator: e.validator,
      params: e.params,
      required: e.required,
    })),
    timeoutMs: s.timeoutMs,
    continueOnFailure: s.continueOnFailure,
    sequence: s.sequence,
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// CREATE
// ════════════════════════════════════════════════════════════════════════════

export interface CreateScenarioInput {
  tenantId: string; correlationId: string; actorId: string;
  name: string; description: string;
  category: string;
  type: 'smoke' | 'regression' | 'certification' | 'release' | 'scenario' | 'e2e';
  tags?: string[];
  steps: {
    name: string; description: string; engineId: string; actionName: string;
    params: Record<string, unknown>;
    expectations: { type: string; description: string; validator: string; params: Record<string, unknown>; required: boolean }[];
    timeoutMs: number; continueOnFailure: boolean; sequence: number;
  }[];
}

export async function createScenarioUseCase(
  input: CreateScenarioInput,
  deps: ValidationUseCaseDeps,
): Promise<Result<{ scenarioId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createScenarioSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid scenario input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const allowedCategories = await deps.policyProvider.getAllowedScenarioCategories(d.tenantId);
  if (!allowedCategories.includes(d.category)) {
    return Err(new ValidationError(`category "${d.category}" not allowed`, { details: { allowed: allowedCategories } }));
  }

  const scenarioId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const scenario: Scenario = {
    id: scenarioId,
    tenantId: d.tenantId,
    name: d.name,
    description: d.description,
    category: d.category,
    type: d.type,
    tags: d.tags ?? [],
    steps: parseSteps(d.steps),
    status: 'Active',
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: d.actorId,
  };

  await deps.scenarioRepo.insert(scenario);

  const envelope: EventEnvelope<{ scenarioId: string; category: string }> =
    await emitValidationEvent(deps,
      { aggregateId: scenarioId, tenantId: d.tenantId, correlationId: d.correlationId },
      'scenario.started', 'scenario.started.v1',
      { scenarioId, category: d.category });
  await deps.eventBus.emit(envelope);

  await recordValidationAudit(deps.auditRepo, {
    tenantId: d.tenantId,
    scenarioId,
    actorId: d.actorId,
    correlationId: d.correlationId,
    eventType: 'scenario_created',
    metadata: { name: d.name, category: d.category, steps: d.steps.length },
  });

  return Ok({ scenarioId, createdAt: now });
}

// ════════════════════════════════════════════════════════════════════════════
// UPDATE
// ════════════════════════════════════════════════════════════════════════════

export interface UpdateScenarioInput {
  tenantId: string; correlationId: string; actorId: string;
  scenarioId: string;
  name?: string; description?: string; tags?: string[];
  steps?: CreateScenarioInput['steps'];
}

export async function updateScenarioUseCase(
  input: UpdateScenarioInput,
  deps: ValidationUseCaseDeps,
): Promise<Result<Scenario, ValidationError | NotFoundError | ConflictError>> {
  const v = updateScenarioSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid update input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.scenarioRepo.findById(d.tenantId, d.scenarioId);
  if (!existing) return Err(new NotFoundError('Scenario not found'));
  if (existing.status === 'Archived') return Err(new ConflictError('Cannot update archived scenario'));

  const now = deps.clock.now().toISOString();
  const newVersion = existing.version + 1;
  const patch: Partial<Scenario> = {
    updatedAt: now,
    version: newVersion,
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.description !== undefined ? { description: d.description } : {}),
    ...(d.tags !== undefined ? { tags: d.tags } : {}),
    ...(d.steps !== undefined ? { steps: parseSteps(d.steps) } : {}),
  };

  await deps.scenarioRepo.update(d.tenantId, d.scenarioId, patch);
  const updated: Scenario = { ...existing, ...patch };

  await recordValidationAudit(deps.auditRepo, {
    tenantId: d.tenantId,
    scenarioId: d.scenarioId,
    actorId: d.actorId,
    correlationId: d.correlationId,
    eventType: 'scenario_updated',
    metadata: { version: newVersion },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE (soft — archive)
// ════════════════════════════════════════════════════════════════════════════

export interface DeleteScenarioInput {
  tenantId: string; correlationId: string; actorId: string;
  scenarioId: string;
}

export async function deleteScenarioUseCase(
  input: DeleteScenarioInput,
  deps: ValidationUseCaseDeps,
): Promise<Result<{ scenarioId: string; deleted: boolean }, ValidationError | NotFoundError>> {
  const v = deleteScenarioSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid delete input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.scenarioRepo.findById(d.tenantId, d.scenarioId);
  if (!existing) return Err(new NotFoundError('Scenario not found'));

  await deps.scenarioRepo.update(d.tenantId, d.scenarioId, { status: 'Archived', updatedAt: deps.clock.now().toISOString() });

  await recordValidationAudit(deps.auditRepo, {
    tenantId: d.tenantId,
    scenarioId: d.scenarioId,
    actorId: d.actorId,
    correlationId: d.correlationId,
    eventType: 'scenario_deleted',
    metadata: {},
  });

  return Ok({ scenarioId: d.scenarioId, deleted: true });
}

// ════════════════════════════════════════════════════════════════════════════
// GET / LIST / SEARCH
// ════════════════════════════════════════════════════════════════════════════

export async function getScenarioUseCase(
  input: { tenantId: string; scenarioId: string },
  deps: ValidationUseCaseDeps,
): Promise<Result<Scenario | null, ValidationError>> {
  const v = getScenarioSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid get input', { details: { issues: v.error.errors } }));
  const d = v.data;
  return Ok(await deps.scenarioRepo.findById(d.tenantId, d.scenarioId));
}

export async function listScenariosUseCase(
  tenantId: string,
  deps: ValidationUseCaseDeps,
): Promise<Result<Scenario[], ValidationError>> {
  if (!tenantId) return Err(new ValidationError('tenantId required'));
  return Ok(await deps.scenarioRepo.findAll(tenantId));
}

export async function searchScenariosUseCase(
  input: ScenarioSearchCriteria,
  deps: ValidationUseCaseDeps,
): Promise<Result<ScenarioSearchResult, ValidationError>> {
  const v = searchScenariosSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid search input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const criteria: ScenarioSearchCriteria = {
    tenantId: d.tenantId,
    ...(d.category !== undefined ? { category: d.category } : {}),
    ...(d.type !== undefined ? { type: d.type } : {}),
    ...(d.status !== undefined ? { status: d.status } : {}),
    ...(d.tags !== undefined ? { tags: d.tags } : {}),
    ...(d.query !== undefined ? { query: d.query } : {}),
    ...(d.limit !== undefined ? { limit: d.limit } : {}),
    ...(d.offset !== undefined ? { offset: d.offset } : {}),
  };

  return Ok(await deps.scenarioRepo.search(criteria));
}

// ════════════════════════════════════════════════════════════════════════════
// SEED BUILTIN SCENARIOS (loads 8 built-in)
// ════════════════════════════════════════════════════════════════════════════

export async function seedBuiltinScenariosUseCase(
  input: { tenantId: string; correlationId: string; actorId: string },
  deps: ValidationUseCaseDeps,
): Promise<Result<{ seeded: number; scenarioIds: string[] }, ValidationError>> {
  // Import here to avoid circular ref in scenario module
  const { getBuiltinScenarios } = await import('../scenario/builtinScenarios.js');
  const builtins = getBuiltinScenarios();
  const scenarioIds: string[] = [];

  for (const def of builtins) {
    const scenarioId = deps.idGenerator.generate();
    const now = deps.clock.now().toISOString();

    const scenario: Scenario = {
      ...def,
      id: scenarioId,
      tenantId: input.tenantId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: input.actorId,
    };

    await deps.scenarioRepo.insert(scenario);
    scenarioIds.push(scenarioId);
  }

  await recordValidationAudit(deps.auditRepo, {
    tenantId: input.tenantId,
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventType: 'scenario_created',
    metadata: { builtin: true, count: builtins.length },
  });

  return Ok({ seeded: builtins.length, scenarioIds });
}
