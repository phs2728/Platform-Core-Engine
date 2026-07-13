/**
 * Agency OS — Memory & Report Use Cases
 *
 * Executive Memory + 6 Report types
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import { storeMemorySchema, memoryQuerySchema, generateReportSchema } from '../domain/validation.js';
import { AGENCY_EVENTS, AGENCY_EVENT_SCHEMAS } from '../domain/events.js';
import { EXECUTIVE_MEMORY_PRESETS } from '../interfaces/index.js';
import { envelope, auditLog, now } from './helpers.js';
import type { AgencyUseCaseDeps } from './types.js';
import type { ExecutiveMemory, MemoryCategory } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// MEMORY (4 UCs)
// ═══════════════════════════════════════════

export async function storeMemoryUseCase(
  input: z.infer<typeof storeMemorySchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ memoryId: string; pattern: string; outcome: string }, ValidationError>> {
  const v = storeMemorySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  const memory: ExecutiveMemory = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    category: d.category, pattern: d.pattern, trigger: d.trigger, outcome: d.outcome,
    evidence: d.evidence ?? [], confidence: d.confidence,
    createdAt: now(deps), updatedAt: now(deps),
  };
  await deps.memoryRepo.insert(memory);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, AGENCY_EVENTS.MEMORY_STORED, AGENCY_EVENT_SCHEMAS['agency.memory.stored'], { memoryId: id, pattern: d.pattern }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'memory_stored', { pattern: d.pattern, category: d.category }, id);
  return Ok({ memoryId: id, pattern: d.pattern, outcome: d.outcome });
}

export async function queryMemoryUseCase(
  input: z.infer<typeof memoryQuerySchema>, deps: AgencyUseCaseDeps,
): Promise<Result<ExecutiveMemory[], ValidationError>> {
  const v = memoryQuerySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  if (d.category) return Ok(await deps.memoryRepo.findByCategory(d.tenantId, d.organizationId, d.category));
  return Ok(await deps.memoryRepo.findByOrganization(d.tenantId, d.organizationId));
}

export async function seedDefaultMemoryUseCase(
  tenantId: string, orgId: string, deps: AgencyUseCaseDeps,
): Promise<Result<{ seeded: number }, ValidationError>> {
  let count = 0;
  for (const preset of EXECUTIVE_MEMORY_PRESETS) {
    const id = deps.idGenerator.generate();
    const memory: ExecutiveMemory = {
      id, tenantId, organizationId: orgId,
      category: preset.category, pattern: preset.pattern, trigger: preset.trigger, outcome: preset.outcome,
      evidence: preset.evidence, confidence: preset.confidence,
      createdAt: now(deps), updatedAt: now(deps),
    };
    await deps.memoryRepo.insert(memory);
    count++;
  }
  return Ok({ seeded: count });
}

export async function updateMemoryUseCase(
  tenantId: string, memoryId: string, patch: Partial<ExecutiveMemory>,
  deps: AgencyUseCaseDeps,
): Promise<Result<{ memoryId: string }, NotFoundError>> {
  const existing = await deps.memoryRepo.findById(tenantId, memoryId);
  if (!existing) return Err(new NotFoundError('Memory not found'));
  await deps.memoryRepo.update(tenantId, memoryId, patch);
  await deps.eventBus.emit(envelope(deps, memoryId, tenantId, '', AGENCY_EVENTS.MEMORY_UPDATED, AGENCY_EVENT_SCHEMAS['agency.memory.updated'], { memoryId }));
  return Ok({ memoryId });
}

// ═══════════════════════════════════════════
// REPORTS (6 types)
// ═══════════════════════════════════════════

export async function generateReportUseCase(
  input: z.infer<typeof generateReportSchema>, deps: AgencyUseCaseDeps,
): Promise<Result<{ reportId: string; reportType: string; summary: string }, ValidationError | NotFoundError>> {
  const v = generateReportSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const wf = await deps.workflowRepo.findById(d.tenantId, d.workflowId);
  if (!wf) return Err(new NotFoundError('Workflow not found'));
  const id = deps.idGenerator.generate();
  let summary = '';

  switch (d.reportType) {
    case 'Execution': {
      const tasks = await deps.taskRepo.findByWorkflow(d.tenantId, d.workflowId);
      const debates = await deps.debateRepo.findByWorkflow(d.tenantId, d.workflowId);
      summary = `Phases: ${wf.phaseHistory.length}, Tasks: ${tasks.length} (${tasks.filter(t => t.status === 'Done').length} done), Debates: ${debates.length}`;
      break;
    }
    case 'SwarmCollaboration': {
      const swarms = await deps.swarmRepo.findByWorkflow(d.tenantId, d.workflowId);
      summary = `${swarms.length} swarms: ${swarms.map(s => `${s.type}(${s.status})`).join(', ')}`;
      break;
    }
    case 'DebateSummary': {
      const debates = await deps.debateRepo.findByWorkflow(d.tenantId, d.workflowId);
      summary = `${debates.length} debates resolved`;
      break;
    }
    case 'DecisionLog': {
      const decisions = await deps.decisionRepo.findByOrganization(d.tenantId, d.organizationId);
      summary = `${decisions.length} decisions made (${decisions.filter(d => d.allGatesPassed).length} passed all gates)`;
      break;
    }
    case 'ExecutiveMemory': {
      const memories = await deps.memoryRepo.findByOrganization(d.tenantId, d.organizationId);
      summary = `${memories.length} memories stored`;
      break;
    }
    case 'LearningEvolution': {
      const memories = await deps.memoryRepo.findByOrganization(d.tenantId, d.organizationId);
      summary = `Patterns learned: ${memories.length}, Avg confidence: ${memories.length > 0 ? Math.round(memories.reduce((s, m) => s + m.confidence, 0) / memories.length * 100) / 100 : 0}`;
      break;
    }
  }

  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, AGENCY_EVENTS.REPORT_GENERATED, AGENCY_EVENT_SCHEMAS['agency.report.generated'], { reportId: id, reportType: d.reportType, workflowId: d.workflowId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'report_generated', { reportType: d.reportType }, id);
  return Ok({ reportId: id, reportType: d.reportType, summary });
}

export async function listWorkflowTemplatesUseCase(
  _deps: AgencyUseCaseDeps,
): Promise<Result<{ type: string; name: string; description: string; swarms: string[]; tasks: number }[], ValidationError>> {
  const { WORKFLOW_TEMPLATES } = await import('../interfaces/index.js');
  return Ok(Object.entries(WORKFLOW_TEMPLATES).map(([type, t]) => ({
    type, name: t.name, description: t.description, swarms: t.requiredSwarms, tasks: t.estimatedTasks,
  })));
}