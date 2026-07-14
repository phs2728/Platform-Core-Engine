/**
 * Creative Knowledge Engine — Research, Interview, Brief Use Cases
 *
 * createResearchProject, startResearchSession, completeResearch, archiveResearch,
 * getResearchProject, listResearchProjects,
 * conductInterview, generateCreativeBrief, updateBusinessProfile
 */
import { Ok, Err, type Result, ValidationError, ConflictError, NotFoundError, z } from '@platform/core-sdk';
import {
  createResearchSchema, startSessionSchema, completeResearchSchema, archiveResearchSchema,
  conductInterviewSchema, updateBusinessProfileSchema,
} from '../domain/validation.js';
import { KNOWLEDGE_EVENTS, KNOWLEDGE_EVENT_SCHEMAS } from '../domain/events.js';
import { canTransitionResearch } from '../domain/statusTransition.js';
import { envelope, audit, updateMemory } from './helpers.js';
import type { KnowledgeUseCaseDeps } from './types.js';
import type {
  ResearchProject, ClientInterview, BusinessProfile, CreativeBrief, ResearchEvidence,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// RESEARCH PROJECT (4 + 2 getters)
// ═══════════════════════════════════════════

export async function createResearchProjectUseCase(
  input: z.infer<typeof createResearchSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ projectId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createResearchSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  if (await deps.researchRepo.existsBySlug(d.tenantId, d.slug)) return Err(new ConflictError('slug already exists'));
  const maxProjects = await deps.policyProvider.getMaxResearchProjectsPerOrg(d.tenantId);
  const current = await deps.researchRepo.countByOrganization(d.tenantId, d.organizationId);
  if (current >= maxProjects) return Err(new ConflictError(`Max projects (${maxProjects}) reached`));

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const project: ResearchProject = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, name: d.name, slug: d.slug,
    description: d.description ?? '', status: 'Created', industry: d.industry,
    interviewId: null, businessProfileId: null, briefId: null,
    auditIds: [], competitorIds: [], evidenceIds: [], recommendationIds: [],
    attributes: {}, createdAt: now, createdBy: d.actorId, updatedAt: now,
  };
  await deps.researchRepo.insert(project);

  // Initialize research memory
  await deps.memoryRepo.upsert({
    id: deps.idGenerator.generate(), tenantId: d.tenantId, projectId: id,
    history: [{ timestamp: now, action: 'created', summary: `Research project "${d.name}" created` }],
    patternLibrary: [], successfulStrategies: [], failedStrategies: [], updatedAt: now,
  });

  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, KNOWLEDGE_EVENTS.RESEARCH_CREATED, KNOWLEDGE_EVENT_SCHEMAS['research.created'], { projectId: id }));
  await audit(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'research_created', { name: d.name }, id);
  return Ok({ projectId: id, createdAt: now });
}

export async function startResearchSessionUseCase(
  input: z.infer<typeof startSessionSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ sessionId: string }, ValidationError | NotFoundError>> {
  const v = startSessionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.researchRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  // Update status based on phase
  const now = deps.clock.now().toISOString();
  const phaseStatusMap: Record<string, ResearchProject['status']> = {
    'interview': 'Interviewing', 'audit': 'Auditing', 'analysis': 'Analyzing',
  };
  const newStatus = phaseStatusMap[d.phase];
  if (newStatus && canTransitionResearch(p.status, newStatus)) {
    await deps.researchRepo.update(d.tenantId, d.projectId, { status: newStatus, updatedAt: now });
  }

  await updateMemory(deps, d.tenantId, d.projectId, 'session_started', `Phase "${d.phase}" started`);
  return Ok({ sessionId: deps.idGenerator.generate() });
}

export async function completeResearchUseCase(
  input: z.infer<typeof completeResearchSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ projectId: string; completed: boolean }, ValidationError | NotFoundError>> {
  const v = completeResearchSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.researchRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const now = deps.clock.now().toISOString();
  await deps.researchRepo.update(d.tenantId, d.projectId, { status: 'Completed', updatedAt: now });

  await deps.eventBus.emit(envelope(deps, d.projectId, d.tenantId, d.correlationId, KNOWLEDGE_EVENTS.RESEARCH_COMPLETED, KNOWLEDGE_EVENT_SCHEMAS['research.completed'], { projectId: d.projectId }));
  await audit(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'research_completed', {}, d.projectId);
  await updateMemory(deps, d.tenantId, d.projectId, 'completed', 'Research completed');
  return Ok({ projectId: d.projectId, completed: true });
}

export async function archiveResearchUseCase(
  input: z.infer<typeof archiveResearchSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ projectId: string }, ValidationError | NotFoundError>> {
  const v = archiveResearchSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.researchRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));
  const now = deps.clock.now().toISOString();
  await deps.researchRepo.update(d.tenantId, d.projectId, { status: 'Archived', updatedAt: now });
  await audit(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'research_archived', {}, d.projectId);
  return Ok({ projectId: d.projectId });
}

export async function getResearchProjectUseCase(
  tenantId: string, projectId: string, deps: KnowledgeUseCaseDeps,
): Promise<Result<ResearchProject, NotFoundError>> {
  const p = await deps.researchRepo.findById(tenantId, projectId);
  if (!p) return Err(new NotFoundError('Project not found'));
  return Ok(p);
}

export async function listResearchProjectsUseCase(
  tenantId: string, deps: KnowledgeUseCaseDeps,
): Promise<Result<ResearchProject[], NotFoundError>> {
  return Ok(await deps.researchRepo.findAll(tenantId));
}

// ═══════════════════════════════════════════
// CLIENT INTERVIEW (3)
// ═══════════════════════════════════════════

export async function conductInterviewUseCase(
  input: z.infer<typeof conductInterviewSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ interviewId: string }, ValidationError | NotFoundError>> {
  const v = conductInterviewSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } })); const d = v.data;
  const p = await deps.researchRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const interview: ClientInterview = {
    id, tenantId: d.tenantId, projectId: d.projectId,
    businessGoal: d.businessGoal, targetAudience: d.targetAudience, targetRegion: d.targetRegion,
    competitors: d.competitors, brandPersonality: d.brandPersonality, preferredStyle: d.preferredStyle,
    dislikedStyle: d.dislikedStyle, businessModel: d.businessModel, revenueModel: d.revenueModel,
    budget: d.budget, timeline: d.timeline, successMetrics: d.successMetrics,
    attributes: {}, createdAt: now,
  };
  await deps.interviewRepo.insert(interview);
  await deps.researchRepo.update(d.tenantId, d.projectId, { interviewId: id, status: 'Interviewing', updatedAt: now });

  // Create evidence from interview
  const evidenceId = deps.idGenerator.generate();
  const evidence: ResearchEvidence = {
    id: evidenceId, tenantId: d.tenantId, projectId: d.projectId,
    source: 'client-interview', sourceType: 'interview',
    claim: `Client goal: ${d.businessGoal}`,
    data: { targetAudience: d.targetAudience, budget: d.budget, timeline: d.timeline },
    confidence: 0.95, createdAt: now,
  };
  await deps.evidenceRepo.insert(evidence);
  await deps.researchRepo.update(d.tenantId, d.projectId, {
    evidenceIds: [...p.evidenceIds, evidenceId],
  });

  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, KNOWLEDGE_EVENTS.INTERVIEW_COMPLETED, KNOWLEDGE_EVENT_SCHEMAS['interview.completed'], { interviewId: id }));
  await audit(deps, p.organizationId, d.tenantId, d.actorId, d.correlationId, 'interview_completed', {}, d.projectId);
  await updateMemory(deps, d.tenantId, d.projectId, 'interview', `Client interview conducted for ${d.projectId}`);
  return Ok({ interviewId: id });
}

export async function generateCreativeBriefUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; projectId: string },
  deps: KnowledgeUseCaseDeps,
): Promise<Result<{ briefId: string; confidence: number }, ValidationError | NotFoundError>> {
  const p = await deps.researchRepo.findById(input.tenantId, input.projectId);
  if (!p) return Err(new NotFoundError('Project not found'));

  const interview = await deps.interviewRepo.findByProject(input.tenantId, input.projectId);
  if (!interview) return Err(new ValidationError('No interview found — conduct interview first'));

  const businessProfile = await deps.businessProfileRepo.findByProject(input.tenantId, input.projectId);

  // Use LLM to generate brief
  const briefResult = await deps.llmProvider.generateBrief({
    interview,
    businessProfile: businessProfile ?? {
      id: '', tenantId: input.tenantId, projectId: input.projectId,
      companyName: '', industry: p.industry, description: '', targetMarket: '',
      competitiveAdvantage: '', revenueModel: '', maturity: '', attributes: {},
      createdAt: '', updatedAt: '',
    },
    auditResults: { website: null, ux: null, seo: null, accessibility: null, performance: null, content: null },
  });
  if (!briefResult.ok) return Err(new ValidationError('Brief generation failed'));

  const now = deps.clock.now().toISOString();
  const brief: CreativeBrief = { ...briefResult.value.brief, id: deps.idGenerator.generate(), tenantId: input.tenantId, projectId: input.projectId, createdAt: now };

  // Attach evidence
  const evidence = await deps.evidenceRepo.findByProject(input.tenantId, input.projectId);
  brief.evidence = evidence;

  await deps.briefRepo.insert(brief);
  await deps.researchRepo.update(input.tenantId, input.projectId, { briefId: brief.id, updatedAt: now });

  await deps.eventBus.emit(envelope(deps, brief.id, input.tenantId, input.correlationId, KNOWLEDGE_EVENTS.BRIEF_GENERATED, KNOWLEDGE_EVENT_SCHEMAS['brief.generated'], { briefId: brief.id }));
  await audit(deps, p.organizationId, input.tenantId, input.actorId, input.correlationId, 'brief_generated', { briefId: brief.id }, input.projectId);
  await updateMemory(deps, input.tenantId, input.projectId, 'brief', 'Creative brief generated');
  return Ok({ briefId: brief.id, confidence: brief.confidence });
}

export async function updateBusinessProfileUseCase(
  input: z.infer<typeof updateBusinessProfileSchema>, deps: KnowledgeUseCaseDeps,
): Promise<Result<{ profileId: string }, ValidationError | NotFoundError>> {
  const v = updateBusinessProfileSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input')); const d = v.data;
  const p = await deps.researchRepo.findById(d.tenantId, d.projectId); if (!p) return Err(new NotFoundError('Project not found'));

  const existing = await deps.businessProfileRepo.findByProject(d.tenantId, d.projectId);
  const now = deps.clock.now().toISOString();

  if (existing) {
    await deps.businessProfileRepo.update(d.tenantId, existing.id, {
      companyName: d.companyName, industry: d.industry, description: d.description,
      targetMarket: d.targetMarket, competitiveAdvantage: d.competitiveAdvantage,
      revenueModel: d.revenueModel, maturity: d.maturity, updatedAt: now,
    });
    return Ok({ profileId: existing.id });
  }

  const id = deps.idGenerator.generate();
  const profile: BusinessProfile = {
    id, tenantId: d.tenantId, projectId: d.projectId, companyName: d.companyName,
    industry: d.industry, description: d.description, targetMarket: d.targetMarket,
    competitiveAdvantage: d.competitiveAdvantage, revenueModel: d.revenueModel,
    maturity: d.maturity, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.businessProfileRepo.insert(profile);
  await deps.researchRepo.update(d.tenantId, d.projectId, { businessProfileId: id, updatedAt: now });
  await updateMemory(deps, d.tenantId, d.projectId, 'business-profile', `Business profile updated for ${d.companyName}`);
  return Ok({ profileId: id });
}
