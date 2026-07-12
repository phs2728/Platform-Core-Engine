/** Release Manager — Demo */
import {
  createReleaseUseCase, runPipelineUseCase, approveReleaseUseCase,
  generateReleaseNoteUseCase, createTagUseCase, publishReleaseUseCase,
  InMemoryReleaseRepository, InMemoryVersionRepository, InMemoryTagRepository,
  InMemoryHistoryRepository, InMemoryChecklistRepository, InMemoryReleaseAuditRepository,
  MockCompatibilityProvider, MockValidationProvider, MockGuardianProvider,
  MockBuildProvider, StaticReleasePolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Platform Release Manager — Demo ═══\n');
  const deps = {
    releaseRepo: new InMemoryReleaseRepository(), versionRepo: new InMemoryVersionRepository(),
    tagRepo: new InMemoryTagRepository(), historyRepo: new InMemoryHistoryRepository(),
    checklistRepo: new InMemoryChecklistRepository(), auditRepo: new InMemoryReleaseAuditRepository(),
    eventBus: new InMemoryEventBus(),
    compatibilityProvider: new MockCompatibilityProvider(), validationProvider: new MockValidationProvider(),
    guardianProvider: new MockGuardianProvider(), buildProvider: new MockBuildProvider(),
    policyProvider: new StaticReleasePolicyProvider(),
    idGenerator: { generate: () => `demo-${Math.random().toString(36).slice(2)}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  deps.policyProvider.set('demo', { requiredApprovals: 1 });
  const u = <T>(r: { ok: boolean; value?: T }): T => r.value as T;

  console.log('▶ 1) Create Release (RC1)');
  const created = u(await createReleaseUseCase({ tenantId: 'demo', correlationId: 'd-1', actorId: 'admin', engineId: 'review', title: 'Review Engine Release', description: 'RC1 release', branch: 'main', hasNewFeatures: true }, deps));
  console.log(`  ✓ releaseId=${created.releaseId}, version=${created.version}\n`);

  console.log('▶ 2) Run Pipeline (Compatibility → Validation → Guardian → Build)');
  const pipe = u(await runPipelineUseCase({ tenantId: 'demo', correlationId: 'd-2', actorId: 'admin', releaseId: created.releaseId }, deps));
  console.log(`  ✓ allPassed=${pipe.allPassed}, stage=${pipe.stage}\n`);

  console.log('▶ 3) Approve Release');
  const approved = u(await approveReleaseUseCase({ tenantId: 'demo', correlationId: 'd-3', releaseId: created.releaseId, approverId: 'sajangnim', approverRole: 'Platform Owner', reason: 'All checks passed' }, deps));
  console.log(`  ✓ status=${approved.status}\n`);

  console.log('▶ 4) Generate Release Note');
  const note = u(await generateReleaseNoteUseCase({ tenantId: 'demo', correlationId: 'd-4', actorId: 'admin', releaseId: created.releaseId, features: ['Trust Score system', '8-state machine', 'Moderation plugin'] }, deps));
  console.log(`  ✓ ${note.features.length} features documented\n`);

  console.log('▶ 5) Create Git Tag');
  const tag = u(await createTagUseCase({ tenantId: 'demo', correlationId: 'd-5', actorId: 'admin', releaseId: created.releaseId }, deps));
  console.log(`  ✓ tag=${tag.name}\n`);

  console.log('▶ 6) Publish to Stable');
  const published = u(await publishReleaseUseCase({ tenantId: 'demo', correlationId: 'd-6', actorId: 'admin', releaseId: created.releaseId }, deps));
  console.log(`  ✓ status=${published.status}, version=${published.version}\n`);

  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of deps.eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);
  console.log('\n═══ Demo Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
