/**
 * Release Core UseCases (8) —
 *   createRelease / approveRelease / rejectRelease /
 *   publishRelease / rollbackRelease / cancelRelease / getRelease / listReleases
 */
import {
  Ok, Err, type Result,
  ValidationError, NotFoundError, ConflictError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordReleaseAudit } from '../domain/audit.js';
import { createReleaseSchema, approveReleaseSchema, rejectReleaseSchema } from '../domain/validation.js';
import { emitReleaseEvent } from '../domain/events.js';
import {
  calculateNextVersion, formatVersion, nextRCVersion, promoteToStable,
  canApprove, canPromoteToStable, defaultChecklist, allChecklistPassed,
} from '../domain/versionLogic.js';
import type { ReleaseUseCaseDeps } from './types.js';
import type { Release, SemanticVersion, ReleaseStatus } from '../interfaces/index.js';

// CREATE
export async function createReleaseUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    engineId: string; title: string; description: string;
    branch: string; commitSha?: string;
    hasBreakingChanges?: boolean; hasNewFeatures?: boolean;
    initialStatus?: 'Draft' | 'RC1';
  },
  deps: ReleaseUseCaseDeps,
): Promise<Result<{ releaseId: string; version: string }, ValidationError>> {
  const v = createReleaseSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Calculate version
  const latestVersionRecord = await deps.versionRepo.findLatest(d.tenantId, d.engineId);
  const currentVersion = latestVersionRecord?.version ?? null;
  const newVersion = calculateNextVersion(currentVersion, d.hasBreakingChanges ?? false, d.hasNewFeatures ?? true);

  const rid = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const status: ReleaseStatus = d.initialStatus ?? 'RC1';

  const release: Release = {
    id: rid, tenantId: d.tenantId, engineId: d.engineId,
    version: newVersion, status, stage: 'compatibility',
    title: d.title, description: d.description,
    branch: d.branch,
    ...(d.commitSha !== undefined ? { commitSha: d.commitSha } : { commitSha: null }),
    checklist: defaultChecklist(),
    approvals: [], releaseNoteId: null, rollbackPlanId: null,
    tags: [], metadata: {},
    createdBy: d.actorId, createdAt: now, updatedAt: now,
    publishedAt: null, approvedAt: null,
  };
  await deps.releaseRepo.insert(release);
  await deps.checklistRepo.upsert(rid, release.checklist);

  // Register version
  const vid = deps.idGenerator.generate();
  await deps.versionRepo.insert({
    id: vid, tenantId: d.tenantId, engineId: d.engineId,
    version: newVersion, releaseId: rid, createdAt: now,
  });

  const env: EventEnvelope<{ releaseId: string; engineId: string; version: string }> =
    await emitReleaseEvent(deps, { aggregateId: rid, tenantId: d.tenantId, correlationId: d.correlationId },
      'release.created', 'release.created.v1', { releaseId: rid, engineId: d.engineId, version: formatVersion(newVersion) });
  await deps.eventBus.emit(env);

  await recordReleaseAudit(deps.auditRepo, {
    tenantId: d.tenantId, releaseId: rid, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'release_created', metadata: { engineId: d.engineId, version: formatVersion(newVersion), status },
  });

  return Ok({ releaseId: rid, version: formatVersion(newVersion) });
}

// APPROVE
export async function approveReleaseUseCase(
  input: { tenantId: string; correlationId: string; releaseId: string; approverId: string; approverRole: string; reason: string },
  deps: ReleaseUseCaseDeps,
): Promise<Result<Release, ValidationError | NotFoundError | ConflictError>> {
  const v = approveReleaseSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const release = await deps.releaseRepo.findById(d.tenantId, d.releaseId);
  if (!release) return Err(new NotFoundError('Release not found'));
  if (!canApprove(release)) return Err(new ConflictError(`Cannot approve — status "${release.status}"`));

  const approval = {
    id: deps.idGenerator.generate(), approverId: d.approverId, approverRole: d.approverRole,
    decision: 'approved' as const, reason: d.reason, timestamp: deps.clock.now().toISOString(),
  };

  const required = await deps.policyProvider.getRequiredApprovals(d.tenantId);
  const approvals = [...release.approvals, approval];
  const now = deps.clock.now().toISOString();

  const patch: Partial<Release> = { approvals, updatedAt: now };
  if (approvals.filter((a) => a.decision === 'approved').length >= required) {
    patch.status = 'Approved';
    patch.approvedAt = now;
  }

  await deps.releaseRepo.update(d.tenantId, d.releaseId, patch);
  const updated: Release = { ...release, ...patch };

  const env: EventEnvelope<{ releaseId: string }> =
    await emitReleaseEvent(deps, { aggregateId: d.releaseId, tenantId: d.tenantId, correlationId: d.correlationId },
      'release.approved', 'release.approved.v1', { releaseId: d.releaseId });
  await deps.eventBus.emit(env);

  await recordReleaseAudit(deps.auditRepo, {
    tenantId: d.tenantId, releaseId: d.releaseId, actorId: d.approverId, correlationId: d.correlationId,
    eventType: 'release_approved', metadata: { role: d.approverRole },
  });

  return Ok(updated);
}

// REJECT
export async function rejectReleaseUseCase(
  input: { tenantId: string; correlationId: string; releaseId: string; approverId: string; reason: string },
  deps: ReleaseUseCaseDeps,
): Promise<Result<Release, ValidationError | NotFoundError>> {
  const v = rejectReleaseSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const release = await deps.releaseRepo.findById(d.tenantId, d.releaseId);
  if (!release) return Err(new NotFoundError('Release not found'));

  const now = deps.clock.now().toISOString();
  await deps.releaseRepo.update(d.tenantId, d.releaseId, { status: 'Rejected', updatedAt: now });
  const updated: Release = { ...release, status: 'Rejected', updatedAt: now };

  const env = await emitReleaseEvent(deps, { aggregateId: d.releaseId, tenantId: d.tenantId, correlationId: d.correlationId },
    'release.rejected', 'release.rejected.v1', { releaseId: d.releaseId });
  await deps.eventBus.emit(env);

  await recordReleaseAudit(deps.auditRepo, {
    tenantId: d.tenantId, releaseId: d.releaseId, actorId: d.approverId, correlationId: d.correlationId,
    eventType: 'release_rejected', metadata: { reason: d.reason },
  });

  return Ok(updated);
}

// PUBLISH (promote Approved → Stable)
export async function publishReleaseUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; releaseId: string },
  deps: ReleaseUseCaseDeps,
): Promise<Result<{ releaseId: string; status: string; version: string }, ValidationError | NotFoundError | ConflictError>> {
  const release = await deps.releaseRepo.findById(input.tenantId, input.releaseId);
  if (!release) return Err(new NotFoundError('Release not found'));
  if (release.status !== 'Approved') return Err(new ConflictError(`Cannot publish — status "${release.status}" (must be Approved)`));

  if (!allChecklistPassed(release.checklist)) {
    return Err(new ConflictError('Cannot publish — checklist not fully passed'));
  }

  const stableVersion = promoteToStable(release.version);
  const now = deps.clock.now().toISOString();
  await deps.releaseRepo.update(input.tenantId, input.releaseId, {
    status: 'Stable', version: stableVersion, stage: 'stable',
    publishedAt: now, updatedAt: now,
  });

  const env = await emitReleaseEvent(deps, { aggregateId: input.releaseId, tenantId: input.tenantId, correlationId: input.correlationId },
    'release.published', 'release.published.v1', { releaseId: input.releaseId, version: formatVersion(stableVersion) });
  await deps.eventBus.emit(env);

  await recordReleaseAudit(deps.auditRepo, {
    tenantId: input.tenantId, releaseId: input.releaseId, actorId: input.actorId, correlationId: input.correlationId,
    eventType: 'release_published', metadata: { version: formatVersion(stableVersion) },
  });

  return Ok({ releaseId: input.releaseId, status: 'Stable', version: formatVersion(stableVersion) });
}

// ROLLBACK
export async function rollbackReleaseUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; releaseId: string },
  deps: ReleaseUseCaseDeps,
): Promise<Result<{ releaseId: string; rolledBack: boolean }, ValidationError | NotFoundError>> {
  const release = await deps.releaseRepo.findById(input.tenantId, input.releaseId);
  if (!release) return Err(new NotFoundError('Release not found'));

  const now = deps.clock.now().toISOString();
  await deps.releaseRepo.update(input.tenantId, input.releaseId, { status: 'RolledBack', updatedAt: now });

  const env = await emitReleaseEvent(deps, { aggregateId: input.releaseId, tenantId: input.tenantId, correlationId: input.correlationId },
    'release.rollback', 'release.rollback.v1', { releaseId: input.releaseId });
  await deps.eventBus.emit(env);

  await recordReleaseAudit(deps.auditRepo, {
    tenantId: input.tenantId, releaseId: input.releaseId, actorId: input.actorId, correlationId: input.correlationId,
    eventType: 'release_rolled_back', metadata: {},
  });

  return Ok({ releaseId: input.releaseId, rolledBack: true });
}

// CANCEL
export async function cancelReleaseUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; releaseId: string },
  deps: ReleaseUseCaseDeps,
): Promise<Result<{ releaseId: string; cancelled: boolean }, ValidationError | NotFoundError>> {
  const release = await deps.releaseRepo.findById(input.tenantId, input.releaseId);
  if (!release) return Err(new NotFoundError('Release not found'));
  if (release.status === 'Stable' || release.status === 'Published') {
    return Err(new ValidationError('Cannot cancel published/stable release — use rollback'));
  }

  await deps.releaseRepo.update(input.tenantId, input.releaseId, { status: 'Cancelled', updatedAt: deps.clock.now().toISOString() });

  await recordReleaseAudit(deps.auditRepo, {
    tenantId: input.tenantId, releaseId: input.releaseId, actorId: input.actorId, correlationId: input.correlationId,
    eventType: 'release_cancelled', metadata: {},
  });

  return Ok({ releaseId: input.releaseId, cancelled: true });
}

// GET / LIST
export async function getReleaseUseCase(tenantId: string, releaseId: string, deps: ReleaseUseCaseDeps): Promise<Result<Release | null, ValidationError>> {
  if (!tenantId || !releaseId) return Err(new ValidationError('tenantId and releaseId required'));
  return Ok(await deps.releaseRepo.findById(tenantId, releaseId));
}

export async function listReleasesUseCase(tenantId: string, limit: number, deps: ReleaseUseCaseDeps): Promise<Result<Release[], ValidationError>> {
  if (!tenantId) return Err(new ValidationError('tenantId required'));
  return Ok(await deps.releaseRepo.listAll(tenantId, limit));
}
