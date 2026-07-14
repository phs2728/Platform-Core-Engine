/** Release Manager — Tests */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createReleaseUseCase, approveReleaseUseCase, rejectReleaseUseCase,
  publishReleaseUseCase, rollbackReleaseUseCase, cancelReleaseUseCase,
  getReleaseUseCase, listReleasesUseCase,
  calculateVersionUseCase, validateVersionUseCase, registerVersionUseCase, compareVersionUseCase,
  createTagUseCase, deleteTagUseCase, verifyTagUseCase,
  runPipelineUseCase, runCompatibilityUseCase, runGuardianUseCase, runValidationUseCase, runChecklistUseCase,
  generateReleaseNoteUseCase, generateChangelogUseCase, listReleaseHistoryUseCase,
  createRollbackPlanUseCase, executeRollbackUseCase, verifyRollbackUseCase,
  parseVersion, formatVersion, compareVersions, nextRCVersion, promoteToStable, bumpVersion,
} from '../src/index.js';
import { makeDeps } from './helpers.js';

type Deps = ReturnType<typeof makeDeps>;

async function createRelease(deps: Deps, engineId = 'catalog') {
  const r = await createReleaseUseCase({
    tenantId: 't-1', correlationId: 'c', actorId: 'admin',
    engineId, title: `${engineId} release`, description: 'test',
    branch: 'main', hasNewFeatures: true,
  }, deps);
  if (!r.ok) throw new Error('createRelease failed');
  return r.value;
}

// ═══════════════════════════════════════════
// 1. Version Logic (8 tests)
// ═══════════════════════════════════════════
describe('Version Logic', () => {
  it('parses version v1.2.3', () => {
    const v = parseVersion('v1.2.3');
    expect(v.major).toBe(1); expect(v.minor).toBe(2); expect(v.patch).toBe(3);
    expect(v.channel).toBe('stable');
  });

  it('parses version v1.0.0-rc1', () => {
    const v = parseVersion('v1.0.0-rc1');
    expect(v.channel).toBe('rc'); expect(v.rcNumber).toBe(1);
  });

  it('formats version correctly', () => {
    expect(formatVersion({ major: 1, minor: 2, patch: 3, channel: 'stable', rcNumber: null })).toBe('v1.2.3');
    expect(formatVersion({ major: 1, minor: 0, patch: 0, channel: 'rc', rcNumber: 2 })).toBe('v1.0.0-rc2');
  });

  it('compares versions', () => {
    const a = parseVersion('v1.0.0');
    const b = parseVersion('v2.0.0');
    expect(compareVersions(a, b)).toBeLessThan(0);
  });

  it('compares channels — stable > rc > beta > alpha', () => {
    const stable = parseVersion('v1.0.0');
    const rc = parseVersion('v1.0.0-rc1');
    expect(compareVersions(stable, rc)).toBeGreaterThan(0);
  });

  it('nextRCVersion increments rc number', () => {
    const rc1 = parseVersion('v1.0.0-rc1');
    const rc2 = nextRCVersion(rc1);
    expect(rc2.rcNumber).toBe(2);
  });

  it('promoteToStable removes channel', () => {
    const rc = parseVersion('v1.0.0-rc1');
    const stable = promoteToStable(rc);
    expect(stable.channel).toBe('stable');
    expect(stable.rcNumber).toBeNull();
  });

  it('bumpVersion major resets minor and patch', () => {
    const v = parseVersion('v1.2.3');
    const bumped = bumpVersion(v, 'major');
    expect(bumped.major).toBe(2); expect(bumped.minor).toBe(0); expect(bumped.patch).toBe(0);
  });
});

// ═══════════════════════════════════════════
// 2. Version UseCases (4 tests)
// ═══════════════════════════════════════════
describe('Version UseCases', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('calculates version for new engine', async () => {
    const r = await calculateVersionUseCase({ tenantId: 't-1', engineId: 'new-engine', hasBreakingChanges: false, hasNewFeatures: true }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.version).toBe('v0.1.0-alpha');
  });

  it('validates version format', async () => {
    const r1 = await validateVersionUseCase({ version: 'v1.0.0-rc1' }, deps);
    expect(r1.value!.valid).toBe(true);
    const r2 = await validateVersionUseCase({ version: 'invalid' }, deps);
    expect(r2.value!.valid).toBe(false);
  });

  it('compares versions via usecase', async () => {
    const r = await compareVersionUseCase({ versionA: 'v1.0.0', versionB: 'v2.0.0' }, deps);
    expect(r.value!.newer).toBe('v2.0.0');
  });

  it('registers version', async () => {
    const r = await registerVersionUseCase({ tenantId: 't-1', engineId: 'test', version: 'v1.0.0', releaseId: 'r-1' }, deps);
    expect(r.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 3. Release Lifecycle (10 tests)
// ═══════════════════════════════════════════
describe('Release Lifecycle', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a release with RC1 status', async () => {
    const r = await createRelease(deps);
    expect(r.version).toBeDefined();
    const release = await deps.releaseRepo.findById('t-1', r.releaseId);
    expect(release!.status).toBe('RC1');
  });

  it('emits release.created event', async () => {
    await createRelease(deps);
    expect(deps.eventBus.countByType('release.created')).toBe(1);
  });

  it('approves a release', async () => {
    const created = await createRelease(deps);
    const r = await approveReleaseUseCase({
      tenantId: 't-1', correlationId: 'c', releaseId: created.releaseId,
      approverId: 'ceo', approverRole: 'Platform Owner', reason: 'LGTM',
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Approved');
  });

  it('rejects a release', async () => {
    const created = await createRelease(deps);
    const r = await rejectReleaseUseCase({
      tenantId: 't-1', correlationId: 'c', releaseId: created.releaseId,
      approverId: 'ceo', reason: 'Not ready',
    }, deps);
    expect(r.value!.status).toBe('Rejected');
  });

  it('cannot approve already approved release', async () => {
    const created = await createRelease(deps);
    await approveReleaseUseCase({ tenantId: 't-1', correlationId: 'c', releaseId: created.releaseId, approverId: 'a', approverRole: 'r', reason: 'ok' }, deps);
    const r = await approveReleaseUseCase({ tenantId: 't-1', correlationId: 'c', releaseId: created.releaseId, approverId: 'b', approverRole: 'r', reason: 'ok' }, deps);
    expect(r.ok).toBe(false);
  });

  it('publishes approved release to Stable', async () => {
    const created = await createRelease(deps);
    await approveReleaseUseCase({ tenantId: 't-1', correlationId: 'c', releaseId: created.releaseId, approverId: 'a', approverRole: 'r', reason: 'ok' }, deps);
    // Run pipeline first to pass checklist
    await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    const r = await publishReleaseUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Stable');
  });

  it('cannot publish without approval', async () => {
    const created = await createRelease(deps);
    const r = await publishReleaseUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(false);
  });

  it('rolls back a release', async () => {
    const created = await createRelease(deps);
    const r = await rollbackReleaseUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(true);
    const release = await deps.releaseRepo.findById('t-1', created.releaseId);
    expect(release!.status).toBe('RolledBack');
  });

  it('cancels a release', async () => {
    const created = await createRelease(deps);
    const r = await cancelReleaseUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.cancelled).toBe(true);
  });

  it('lists releases', async () => {
    await createRelease(deps, 'catalog');
    await createRelease(deps, 'review');
    const r = await listReleasesUseCase('t-1', 10, deps);
    expect(r.value!.length).toBe(2);
  });
});

// ═══════════════════════════════════════════
// 4. Pipeline (8 tests)
// ═══════════════════════════════════════════
describe('Pipeline', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('runs full pipeline successfully', async () => {
    const created = await createRelease(deps);
    const r = await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.allPassed).toBe(true);
  });

  it('pipeline fails when build fails', async () => {
    deps.buildProvider.setFail('catalog');
    const created = await createRelease(deps, 'catalog');
    const r = await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.value!.allPassed).toBe(false);
  });

  it('pipeline fails when compatibility fails', async () => {
    deps.compatibilityProvider.setScore('t-1', 'catalog', 50, ['violation1']);
    const created = await createRelease(deps, 'catalog');
    const r = await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.value!.allPassed).toBe(false);
  });

  it('pipeline fails when guardian rejects', async () => {
    deps.guardianProvider.setDecision('t-1', 'catalog', 'REJECTED');
    const created = await createRelease(deps, 'catalog');
    const r = await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.value!.allPassed).toBe(false);
  });

  it('pipeline fails when validation fails', async () => {
    deps.validationProvider.setStatus('t-1', 'catalog', 'Failed');
    const created = await createRelease(deps, 'catalog');
    const r = await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.value!.allPassed).toBe(false);
  });

  it('runCompatibility returns score', async () => {
    const created = await createRelease(deps);
    const r = await runCompatibilityUseCase({ tenantId: 't-1', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.score).toBeGreaterThan(0);
  });

  it('runGuardian returns decision', async () => {
    const created = await createRelease(deps);
    const r = await runGuardianUseCase({ tenantId: 't-1', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.decision).toBe('APPROVED');
  });

  it('runChecklist returns all items', async () => {
    const created = await createRelease(deps);
    await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    const r = await runChecklistUseCase({ tenantId: 't-1', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.checklist.build.status).toBe('passed');
  });
});

// ═══════════════════════════════════════════
// 5. Tag (5 tests)
// ═══════════════════════════════════════════
describe('Tag', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a tag for a release', async () => {
    const created = await createRelease(deps);
    const r = await createTagUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.name).toBeDefined();
  });

  it('prevents duplicate tag', async () => {
    const created = await createRelease(deps);
    await createTagUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    const r = await createTagUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(false);
  });

  it('deletes a tag', async () => {
    const created = await createRelease(deps);
    const tag = await createTagUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    const r = await deleteTagUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', tagId: tag.value!.id }, deps);
    expect(r.ok).toBe(true);
  });

  it('verifies tag existence', async () => {
    const created = await createRelease(deps);
    const tag = await createTagUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    const r = await verifyTagUseCase({ tenantId: 't-1', tagName: tag.value!.name }, deps);
    expect(r.value!.exists).toBe(true);
  });

  it('emits tag.created event', async () => {
    const created = await createRelease(deps);
    await createTagUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(deps.eventBus.countByType('release.tag.created')).toBe(1);
  });
});

// ═══════════════════════════════════════════
// 6. Changelog + Release Note (5 tests)
// ═══════════════════════════════════════════
describe('Changelog + Release Note', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('generates release note with features', async () => {
    const created = await createRelease(deps);
    const r = await generateReleaseNoteUseCase({
      tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId,
      features: ['New AI assistant', 'Multi-language support'],
      bugFixes: ['Fixed search ranking'],
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.features.length).toBe(2);
    expect(r.value!.bugFixes.length).toBe(1);
  });

  it('release note has upgrade guide', async () => {
    const created = await createRelease(deps);
    const r = await generateReleaseNoteUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(r.value!.upgradeGuide).toBeDefined();
  });

  it('release note includes breaking changes migration', async () => {
    const created = await createRelease(deps);
    const r = await generateReleaseNoteUseCase({
      tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId,
      breakingChanges: ['API v1 deprecated'],
    }, deps);
    expect(r.value!.migration.length).toBeGreaterThan(0);
  });

  it('generates changelog', async () => {
    const r = await generateChangelogUseCase({
      tenantId: 't-1', engineId: 'catalog', fromVersion: 'v1.0.0', toVersion: 'v1.1.0',
      entries: [{ type: 'feature', description: 'New search', commitSha: 'abc123' }],
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.entries.length).toBe(1);
  });

  it('listReleaseHistory returns null for unknown engine', async () => {
    const r = await listReleaseHistoryUseCase({ tenantId: 't-1', engineId: 'unknown' }, deps);
    expect(r.value).toBeNull();
  });
});

// ═══════════════════════════════════════════
// 7. Rollback (4 tests)
// ═══════════════════════════════════════════
describe('Rollback', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates rollback plan', async () => {
    const created = await createRelease(deps);
    const r = await createRollbackPlanUseCase({ tenantId: 't-1', releaseId: created.releaseId }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.steps.length).toBe(4);
  });

  it('executes rollback', async () => {
    const created = await createRelease(deps);
    const plan = await createRollbackPlanUseCase({ tenantId: 't-1', releaseId: created.releaseId }, deps);
    const r = await executeRollbackUseCase({ tenantId: 't-1', releaseId: created.releaseId, planId: plan.value!.id }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.executed).toBe(true);
  });

  it('verifies rollback status', async () => {
    const created = await createRelease(deps);
    await executeRollbackUseCase({ tenantId: 't-1', releaseId: created.releaseId, planId: 'p-1' }, deps);
    const r = await verifyRollbackUseCase({ tenantId: 't-1', releaseId: created.releaseId }, deps);
    expect(r.value!.verified).toBe(true);
  });

  it('rollback plan targets previous version', async () => {
    const created = await createRelease(deps);
    const r = await createRollbackPlanUseCase({ tenantId: 't-1', releaseId: created.releaseId }, deps);
    expect(r.value!.targetVersion).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// 8. Audit (4 tests)
// ═══════════════════════════════════════════
describe('Audit', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit for release creation', async () => {
    await createRelease(deps);
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.some((a) => a.eventType === 'release_created')).toBe(true);
  });

  it('records audit for approval', async () => {
    const created = await createRelease(deps);
    await approveReleaseUseCase({ tenantId: 't-1', correlationId: 'c', releaseId: created.releaseId, approverId: 'a', approverRole: 'r', reason: 'ok' }, deps);
    const audit = await deps.auditRepo.findByRelease('t-1', created.releaseId);
    expect(audit.some((a) => a.eventType === 'release_approved')).toBe(true);
  });

  it('records audit for tag creation', async () => {
    const created = await createRelease(deps);
    await createTagUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    const audit = await deps.auditRepo.findByRelease('t-1', created.releaseId);
    expect(audit.some((a) => a.eventType === 'tag_created')).toBe(true);
  });

  it('records audit for pipeline', async () => {
    const created = await createRelease(deps);
    await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    const audit = await deps.auditRepo.findByRelease('t-1', created.releaseId);
    expect(audit.some((a) => a.eventType === 'compatibility_completed')).toBe(true);
    expect(audit.some((a) => a.eventType === 'guardian_completed')).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 9. Full Release Flow (2 tests)
// ═══════════════════════════════════════════
describe('Full Release Flow', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('RC1 → Pipeline → Approve → Publish → Stable', async () => {
    // Create
    const created = await createRelease(deps, 'review');
    expect(created.version).toBeDefined();

    // Run Pipeline
    const pipe = await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(pipe.value!.allPassed).toBe(true);

    // Approve
    const approved = await approveReleaseUseCase({ tenantId: 't-1', correlationId: 'c', releaseId: created.releaseId, approverId: 'owner', approverRole: 'Platform Owner', reason: 'All checks passed' }, deps);
    expect(approved.value!.status).toBe('Approved');

    // Generate Release Note
    const note = await generateReleaseNoteUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId, features: ['New review system'] }, deps);
    expect(note.ok).toBe(true);

    // Create Tag
    const tag = await createTagUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(tag.ok).toBe(true);

    // Publish to Stable
    const published = await publishReleaseUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(published.value!.status).toBe('Stable');

    // Verify
    const release = await deps.releaseRepo.findById('t-1', created.releaseId);
    expect(release!.status).toBe('Stable');
    expect(release!.publishedAt).not.toBeNull();
  });

  it('RC1 → Pipeline fails → stays in RC1', async () => {
    deps.buildProvider.setFail('review');
    const created = await createRelease(deps, 'review');
    const pipe = await runPipelineUseCase({ tenantId: 't-1', correlationId: 'c', actorId: 'a', releaseId: created.releaseId }, deps);
    expect(pipe.value!.allPassed).toBe(false);
    const release = await deps.releaseRepo.findById('t-1', created.releaseId);
    expect(release!.status).toBe('RC1');
  });
});
