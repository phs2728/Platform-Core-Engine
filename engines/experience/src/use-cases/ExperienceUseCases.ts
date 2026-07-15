/**
 * Experience Engine — Experience Lifecycle Use Cases (8)
 * createExperience, updateExperience, deleteExperience, archiveExperience,
 * restoreExperience, getExperience, listExperiences, searchExperiences
 */
import { Ok, Err, type Result, ValidationError, ConflictError, NotFoundError, z } from '@platform/core-sdk';
import {
  createExperienceSchema, updateExperienceSchema, archiveExperienceSchema, restoreExperienceSchema,
  deleteExperienceSchema, getExperienceSchema, searchExperiencesSchema,
} from '../domain/validation.js';
import { EXPERIENCE_EVENTS, EXPERIENCE_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { ExperienceUseCaseDeps } from './types.js';
import type { Experience } from '../interfaces/index.js';

export async function createExperienceUseCase(
  input: z.infer<typeof createExperienceSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ experienceId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createExperienceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  const pr = await deps.policyProvider.validateAttributes(d.tenantId, 'experience', { type: d.type });
  if (!pr.ok) return Err(new ValidationError('CustomDataPolicy rejected'));
  const existing = await deps.experienceRepo.findBySlug(d.tenantId, d.slug);
  if (existing) return Err(new ConflictError(`Experience with slug "${d.slug}" already exists`));
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const exp: Experience = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, slug: d.slug, type: d.type,
    description: d.description,
    layoutRefs: [], heroRefs: [], bannerRefs: [], navigationRefs: [],
    dashboardRefs: [], searchExperienceRefs: [], personalizationProfileRefs: [],
    responsiveProfileRef: undefined, accessibilityProfileRef: undefined, animationProfileRef: undefined,
    status: 'Draft',
    attributes: d.attributes, metadata: d.metadata,
    createdAt: now, updatedAt: now,
  };
  await deps.experienceRepo.insert(exp);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.EXPERIENCE_CREATED, EXPERIENCE_EVENT_SCHEMAS['experience.created'],
    { experienceId: id, name: d.name, type: d.type }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId,
    'experience_created', { name: d.name, type: d.type }, id);
  return Ok({ experienceId: id, createdAt: now });
}

export async function updateExperienceUseCase(
  input: z.infer<typeof updateExperienceSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ experienceId: string; updatedAt: string }, ValidationError | NotFoundError>> {
  const v = updateExperienceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const exp = await deps.experienceRepo.findById(d.tenantId, d.experienceId);
  if (!exp) return Err(new NotFoundError('Experience not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<Experience> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.description !== undefined) patch.description = d.description;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  if (d.metadata !== undefined) patch.metadata = d.metadata;
  await deps.experienceRepo.update(d.tenantId, d.experienceId, patch);
  await deps.eventBus.emit(envelope(deps, d.experienceId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.EXPERIENCE_UPDATED, EXPERIENCE_EVENT_SCHEMAS['experience.updated'],
    { experienceId: d.experienceId }));
  await auditLog(deps, exp.organizationId, d.tenantId, d.actorId, d.correlationId,
    'experience_updated', { experienceId: d.experienceId }, d.experienceId);
  return Ok({ experienceId: d.experienceId, updatedAt: now });
}

export async function deleteExperienceUseCase(
  input: z.infer<typeof deleteExperienceSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ experienceId: string }, ValidationError | NotFoundError>> {
  const v = deleteExperienceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const exp = await deps.experienceRepo.findById(d.tenantId, d.experienceId);
  if (!exp) return Err(new NotFoundError('Experience not found'));
  await deps.experienceRepo.delete(d.tenantId, d.experienceId);
  await deps.eventBus.emit(envelope(deps, d.experienceId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.EXPERIENCE_DELETED, EXPERIENCE_EVENT_SCHEMAS['experience.deleted'],
    { experienceId: d.experienceId }));
  await auditLog(deps, exp.organizationId, d.tenantId, d.actorId, d.correlationId,
    'experience_deleted', { experienceId: d.experienceId }, d.experienceId);
  return Ok({ experienceId: d.experienceId });
}

export async function archiveExperienceUseCase(
  input: z.infer<typeof archiveExperienceSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ experienceId: string }, ValidationError | NotFoundError>> {
  const v = archiveExperienceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const exp = await deps.experienceRepo.findById(d.tenantId, d.experienceId);
  if (!exp) return Err(new NotFoundError('Experience not found'));
  const now = deps.clock.now().toISOString();
  await deps.experienceRepo.update(d.tenantId, d.experienceId, { status: 'Archived', updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.experienceId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.EXPERIENCE_ARCHIVED, EXPERIENCE_EVENT_SCHEMAS['experience.archived'],
    { experienceId: d.experienceId }));
  await auditLog(deps, exp.organizationId, d.tenantId, d.actorId, d.correlationId,
    'experience_archived', { experienceId: d.experienceId }, d.experienceId);
  return Ok({ experienceId: d.experienceId });
}

export async function restoreExperienceUseCase(
  input: z.infer<typeof restoreExperienceSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ experienceId: string }, ValidationError | NotFoundError>> {
  const v = restoreExperienceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const exp = await deps.experienceRepo.findById(d.tenantId, d.experienceId);
  if (!exp) return Err(new NotFoundError('Experience not found'));
  const now = deps.clock.now().toISOString();
  await deps.experienceRepo.update(d.tenantId, d.experienceId, { status: 'Draft', updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.experienceId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.EXPERIENCE_RESTORED, EXPERIENCE_EVENT_SCHEMAS['experience.restored'],
    { experienceId: d.experienceId }));
  await auditLog(deps, exp.organizationId, d.tenantId, d.actorId, d.correlationId,
    'experience_restored', { experienceId: d.experienceId }, d.experienceId);
  return Ok({ experienceId: d.experienceId });
}

export async function getExperienceUseCase(
  input: z.infer<typeof getExperienceSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<Experience, NotFoundError>> {
  const v = getExperienceSchema.safeParse(input);
  if (!v.success) return Err(new NotFoundError('Invalid input'));
  const d = v.data;
  const exp = await deps.experienceRepo.findById(d.tenantId, d.experienceId);
  if (!exp) return Err(new NotFoundError('Experience not found'));
  return Ok(exp);
}

export async function listExperiencesUseCase(
  tenantId: string, deps: ExperienceUseCaseDeps,
): Promise<Result<Experience[], NotFoundError>> {
  const list = await deps.experienceRepo.search(tenantId, { tenantId, limit: 100, offset: 0 });
  return Ok(list.experiences);
}

export async function searchExperiencesUseCase(
  input: z.infer<typeof searchExperiencesSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<import('../interfaces/index.js').ExperienceSearchResult, ValidationError>> {
  const v = searchExperiencesSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const result = await deps.experienceRepo.search(v.data.tenantId ?? '', v.data as Parameters<typeof deps.experienceRepo.search>[1]);
  return Ok(result);
}
