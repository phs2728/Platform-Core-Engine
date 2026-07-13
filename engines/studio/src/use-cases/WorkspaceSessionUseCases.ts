/**
 * Studio Engine — Workspace & BuildSession Use Cases
 *
 * Sprint D: Studio manages workspace + build sessions.
 * Theme/Component are read-only references (verified via readers).
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  createWorkspaceSchema, workspaceActionSchema,
  startBuildSessionSchema, sessionActionSchema,
} from '../domain/validation.js';
import { STUDIO_EVENTS, STUDIO_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { StudioUseCaseDeps } from './types.js';
import type { Workspace, BuildSession } from '../interfaces/index.js';

const now = (deps: StudioUseCaseDeps) => deps.clock.now().toISOString();

// ═══════════════════════════════════════════
// WORKSPACE (4)
// ═══════════════════════════════════════════

export async function createWorkspaceUseCase(
  input: z.infer<typeof createWorkspaceSchema>, deps: StudioUseCaseDeps,
): Promise<Result<{ workspaceId: string }, ValidationError | NotFoundError>> {
  const v = createWorkspaceSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  if (await deps.workspaceRepo.existsBySlug(d.tenantId, d.slug)) return Err(new ValidationError('Workspace slug already exists'));
  const maxW = await deps.policyProvider.getMaxWorkspacesPerOrg(d.tenantId);
  const current = await deps.workspaceRepo.countByOrganization(d.tenantId, d.organizationId);
  if (current >= maxW) return Err(new ValidationError(`Max workspaces (${maxW}) reached`));
  // defaultThemeRef read-only verify
  if (d.defaultThemeRef !== undefined && d.defaultThemeRef !== null) {
    const themeResult = await deps.themeReader.resolveThemeManifest(d.tenantId, d.defaultThemeRef);
    if (!themeResult.ok || !themeResult.value.manifestHash) return Err(new ValidationError('Default theme reference invalid'));
  }
  const id = deps.idGenerator.generate(); const ts = now(deps);
  const workspace: Workspace = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, slug: d.slug, description: d.description ?? '',
    status: 'Active', defaultThemeRef: d.defaultThemeRef ?? null,
    createdAt: ts, updatedAt: ts, createdBy: d.actorId,
  };
  await deps.workspaceRepo.insert(workspace);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, STUDIO_EVENTS.WORKSPACE_CREATED, STUDIO_EVENT_SCHEMAS['studio.workspace.created'], { workspaceId: id, slug: d.slug }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'workspace_created', { slug: d.slug }, 'workspace', id);
  return Ok({ workspaceId: id });
}

export async function updateWorkspaceUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; workspaceId: string; name?: string; description?: string; defaultThemeRef?: string | null }, deps: StudioUseCaseDeps,
): Promise<Result<{ workspaceId: string }, ValidationError | NotFoundError>> {
  const w = await deps.workspaceRepo.findById(input.tenantId, input.workspaceId);
  if (!w) return Err(new NotFoundError('Workspace not found'));
  if (input.defaultThemeRef !== undefined && input.defaultThemeRef !== null) {
    const themeResult = await deps.themeReader.resolveThemeManifest(input.tenantId, input.defaultThemeRef);
    if (!themeResult.ok || !themeResult.value.manifestHash) return Err(new ValidationError('Default theme reference invalid'));
  }
  const patch: Partial<Workspace> = { updatedAt: now(deps) };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.defaultThemeRef !== undefined) patch.defaultThemeRef = input.defaultThemeRef;
  await deps.workspaceRepo.update(input.tenantId, input.workspaceId, patch);
  await deps.eventBus.emit(envelope(deps, input.workspaceId, input.tenantId, input.correlationId, STUDIO_EVENTS.WORKSPACE_UPDATED, STUDIO_EVENT_SCHEMAS['studio.workspace.updated'], { workspaceId: input.workspaceId }));
  await auditLog(deps, w.organizationId, input.tenantId, input.actorId, input.correlationId, 'workspace_updated', {}, 'workspace', input.workspaceId);
  return Ok({ workspaceId: input.workspaceId });
}

export async function archiveWorkspaceUseCase(
  input: z.infer<typeof workspaceActionSchema>, deps: StudioUseCaseDeps,
): Promise<Result<{ workspaceId: string; archived: boolean }, ValidationError | NotFoundError>> {
  const v = workspaceActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const w = await deps.workspaceRepo.findById(d.tenantId, d.workspaceId);
  if (!w) return Err(new NotFoundError('Workspace not found'));
  await deps.workspaceRepo.update(d.tenantId, d.workspaceId, { status: 'Archived', updatedAt: now(deps) });
  await deps.eventBus.emit(envelope(deps, d.workspaceId, d.tenantId, d.correlationId, STUDIO_EVENTS.WORKSPACE_ARCHIVED, STUDIO_EVENT_SCHEMAS['studio.workspace.archived'], { workspaceId: d.workspaceId }));
  await auditLog(deps, w.organizationId, d.tenantId, d.actorId, d.correlationId, 'workspace_archived', {}, 'workspace', d.workspaceId);
  return Ok({ workspaceId: d.workspaceId, archived: true });
}

export async function listWorkspacesUseCase(
  tenantId: string, organizationId: string, deps: StudioUseCaseDeps,
): Promise<Result<Workspace[], NotFoundError>> {
  return Ok(await deps.workspaceRepo.findByOrganization(tenantId, organizationId));
}

// ═══════════════════════════════════════════
// BUILD SESSION (4)
// ═══════════════════════════════════════════

export async function startBuildSessionUseCase(
  input: z.infer<typeof startBuildSessionSchema>, deps: StudioUseCaseDeps,
): Promise<Result<{ sessionId: string }, ValidationError | NotFoundError>> {
  const v = startBuildSessionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const w = await deps.workspaceRepo.findById(d.tenantId, d.workspaceId);
  if (!w) return Err(new NotFoundError('Workspace not found'));
  // Verify themeRef + componentRefs read-only
  const themeResult = await deps.themeReader.resolveThemeManifest(d.tenantId, d.themeRef);
  if (!themeResult.ok || !themeResult.value.manifestHash) return Err(new ValidationError('Theme reference invalid'));
  for (const cref of d.componentRefs) {
    const cResult = await deps.componentReader.getComponent(d.tenantId, cref);
    if (!cResult.ok || !cResult.value.version) return Err(new ValidationError(`Component reference invalid: ${cref}`));
  }
  const id = deps.idGenerator.generate(); const ts = now(deps);
  const session: BuildSession = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, workspaceId: d.workspaceId,
    themeRef: d.themeRef, componentRefs: d.componentRefs, status: 'Active', draftIds: [],
    metadata: {}, startedAt: ts, endedAt: null, startedBy: d.actorId,
  };
  await deps.buildSessionRepo.insert(session);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, STUDIO_EVENTS.BUILD_SESSION_STARTED, STUDIO_EVENT_SCHEMAS['studio.session.started'], { sessionId: id, workspaceId: d.workspaceId, themeRef: d.themeRef }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'build_session_started', { themeRef: d.themeRef }, 'session', id);
  return Ok({ sessionId: id });
}

export async function attachThemeUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; sessionId: string; themeRef: string }, deps: StudioUseCaseDeps,
): Promise<Result<{ sessionId: string; themeRef: string }, ValidationError | NotFoundError>> {
  const s = await deps.buildSessionRepo.findById(input.tenantId, input.sessionId);
  if (!s) return Err(new NotFoundError('Build session not found'));
  const themeResult = await deps.themeReader.resolveThemeManifest(input.tenantId, input.themeRef);
  if (!themeResult.ok || !themeResult.value.manifestHash) return Err(new ValidationError('Theme reference invalid'));
  await deps.buildSessionRepo.update(input.tenantId, input.sessionId, { themeRef: input.themeRef });
  await deps.eventBus.emit(envelope(deps, input.sessionId, input.tenantId, input.correlationId, STUDIO_EVENTS.THEME_ATTACHED, STUDIO_EVENT_SCHEMAS['studio.theme.attached'], { sessionId: input.sessionId, themeRef: input.themeRef }));
  await auditLog(deps, s.organizationId, input.tenantId, input.actorId, input.correlationId, 'theme_attached', { themeRef: input.themeRef }, 'session', input.sessionId);
  return Ok({ sessionId: input.sessionId, themeRef: input.themeRef });
}

export async function attachComponentLibraryUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; sessionId: string; componentRefs: string[] }, deps: StudioUseCaseDeps,
): Promise<Result<{ sessionId: string; componentRefs: string[] }, ValidationError | NotFoundError>> {
  const s = await deps.buildSessionRepo.findById(input.tenantId, input.sessionId);
  if (!s) return Err(new NotFoundError('Build session not found'));
  for (const cref of input.componentRefs) {
    const cResult = await deps.componentReader.getComponent(input.tenantId, cref);
    if (!cResult.ok || !cResult.value.version) return Err(new ValidationError(`Component reference invalid: ${cref}`));
  }
  await deps.buildSessionRepo.update(input.tenantId, input.sessionId, { componentRefs: input.componentRefs });
  await deps.eventBus.emit(envelope(deps, input.sessionId, input.tenantId, input.correlationId, STUDIO_EVENTS.COMPONENT_LIBRARY_ATTACHED, STUDIO_EVENT_SCHEMAS['studio.component_library.attached'], { sessionId: input.sessionId, count: input.componentRefs.length }));
  await auditLog(deps, s.organizationId, input.tenantId, input.actorId, input.correlationId, 'component_library_attached', { count: input.componentRefs.length }, 'session', input.sessionId);
  return Ok({ sessionId: input.sessionId, componentRefs: input.componentRefs });
}

export async function endBuildSessionUseCase(
  input: z.infer<typeof sessionActionSchema>, deps: StudioUseCaseDeps,
): Promise<Result<{ sessionId: string; ended: boolean }, ValidationError | NotFoundError>> {
  const v = sessionActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const s = await deps.buildSessionRepo.findById(d.tenantId, d.sessionId);
  if (!s) return Err(new NotFoundError('Build session not found'));
  await deps.buildSessionRepo.update(d.tenantId, d.sessionId, { status: 'Completed', endedAt: now(deps) });
  await deps.eventBus.emit(envelope(deps, d.sessionId, d.tenantId, d.correlationId, STUDIO_EVENTS.BUILD_SESSION_ENDED, STUDIO_EVENT_SCHEMAS['studio.session.ended'], { sessionId: d.sessionId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'build_session_ended', {}, 'session', d.sessionId);
  return Ok({ sessionId: d.sessionId, ended: true });
}