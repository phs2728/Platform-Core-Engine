/**
 * Learning Engine — Learning Lifecycle Use Cases
 *
 * createLearningProject, startLearning, completeLearning, archiveLearning,
 * getLearningProject, listLearningProjects
 */
import { Ok, Err, type Result, ValidationError, ConflictError, NotFoundError, z } from '@platform/core-sdk';
import { createLearningSchema, startLearningSchema, completeLearningSchema, archiveLearningSchema } from '../domain/validation.js';
import { LEARNING_EVENTS, LEARNING_EVENT_SCHEMAS } from '../domain/events.js';
import { canTransitionLearning } from '../domain/statusTransition.js';
import { envelope, auditLog, updateMemory } from './helpers.js';
import type { LearningUseCaseDeps } from './types.js';
import type { LearningProject } from '../interfaces/index.js';

export async function createLearningProjectUseCase(
  input: z.infer<typeof createLearningSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ projectId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createLearningSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  if (await deps.learningRepo.existsBySlug(d.tenantId, d.slug)) return Err(new ConflictError('slug already exists'));
  const maxProjects = await deps.policyProvider.getMaxLearningProjectsPerOrg(d.tenantId);
  const current = await deps.learningRepo.countByOrganization(d.tenantId, d.organizationId);
  if (current >= maxProjects) return Err(new ConflictError(`Max projects (${maxProjects}) reached`));

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const project: LearningProject = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, name: d.name, slug: d.slug,
    description: d.description ?? '', status: 'Created', sourceRef: d.sourceRef,
    patternIds: [], trendIds: [], evidenceIds: [], recommendationIds: [], statisticsId: null,
    attributes: {}, createdAt: now, createdBy: d.actorId, updatedAt: now,
  };
  await deps.learningRepo.insert(project);

  // Initialize learning memory
  await deps.memoryRepo.upsert({
    id: deps.idGenerator.generate(), tenantId: d.tenantId, projectId: id,
    history: [{ timestamp: now, action: 'created', summary: `Learning project "${d.name}" created` }],
    successfulStrategies: [], failedStrategies: [], designMemory: [], updatedAt: now,
  });

  // Initialize statistics
  const statsId = deps.idGenerator.generate();
  await deps.statisticsRepo.upsert({
    id: statsId, tenantId: d.tenantId, projectId: id,
    improvementRate: 0, knowledgeGrowth: 0, patternAccuracy: 0, recommendationAccuracy: 0,
    avgConfidence: 0, trendStability: 0, learningCoverage: 0, totalPatterns: 0, totalEvidence: 0,
    updatedAt: now,
  });
  await deps.learningRepo.update(d.tenantId, id, { statisticsId: statsId });

  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, LEARNING_EVENTS.LEARNING_STARTED, LEARNING_EVENT_SCHEMAS['learning.started'], { projectId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'learning_started', { name: d.name }, id);
  return Ok({ projectId: id, createdAt: now });
}

export async function startLearningUseCase(
  input: z.infer<typeof startLearningSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ sessionId: string }, ValidationError | NotFoundError>> {
  const v = startLearningSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const now = deps.clock.now().toISOString();
  const phaseStatusMap: Record<string, LearningProject['status']> = {
    'learn': 'Learning', 'analyze': 'Analyzing',
  };
  const newStatus = phaseStatusMap[d.phase];
  if (newStatus && canTransitionLearning(p.status, newStatus)) {
    await deps.learningRepo.update(d.tenantId, d.projectId, { status: newStatus, updatedAt: now });
  }

  await updateMemory(deps, d.tenantId, d.projectId, 'session_started', `Phase "${d.phase}" started`);
  return Ok({ sessionId: deps.idGenerator.generate() });
}

export async function completeLearningUseCase(
  input: z.infer<typeof completeLearningSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ projectId: string; completed: boolean }, ValidationError | NotFoundError>> {
  const v = completeLearningSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const now = deps.clock.now().toISOString();
  await deps.learningRepo.update(d.tenantId, d.projectId, { status: 'Completed', updatedAt: now });

  await deps.eventBus.emit(envelope(deps, d.projectId, d.tenantId, d.correlationId, LEARNING_EVENTS.LEARNING_COMPLETED, LEARNING_EVENT_SCHEMAS['learning.completed'], { projectId: d.projectId }));
  await auditLog(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'learning_completed', {}, d.projectId);
  await updateMemory(deps, d.tenantId, d.projectId, 'completed', 'Learning cycle completed');
  return Ok({ projectId: d.projectId, completed: true });
}

export async function archiveLearningUseCase(
  input: z.infer<typeof archiveLearningSchema>, deps: LearningUseCaseDeps,
): Promise<Result<{ projectId: string }, ValidationError | NotFoundError>> {
  const v = archiveLearningSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.learningRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));
  const now = deps.clock.now().toISOString();
  await deps.learningRepo.update(d.tenantId, d.projectId, { status: 'Archived', updatedAt: now });
  await auditLog(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'learning_archived', {}, d.projectId);
  return Ok({ projectId: d.projectId });
}

export async function getLearningProjectUseCase(
  tenantId: string, projectId: string, deps: LearningUseCaseDeps,
): Promise<Result<LearningProject, NotFoundError>> {
  const p = await deps.learningRepo.findById(tenantId, projectId);
  if (!p) return Err(new NotFoundError('Project not found'));
  return Ok(p);
}

export async function listLearningProjectsUseCase(
  tenantId: string, deps: LearningUseCaseDeps,
): Promise<Result<LearningProject[], NotFoundError>> {
  return Ok(await deps.learningRepo.findAll(tenantId));
}
