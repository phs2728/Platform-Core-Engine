/**
 * Platform Validation Engine — Demo: Full Lifecycle
 *
 * Seeds 8 built-in scenarios → Runs regression → Generates report → Calculates health
 */

import {
  seedBuiltinScenariosUseCase,
  runRegressionUseCase,
  generateReportUseCase,
  calculateHealthUseCase,
  calculateCoverageUseCase,
  calculateReadinessUseCase,
  runCertificationUseCase,
  InMemoryScenarioRepository, InMemoryValidationRepository,
  InMemoryReportRepository, InMemoryMetricsRepository,
  InMemoryCertificationRepository, InMemoryValidationAuditRepository,
  MockEngineManifestProvider, MockEngineActionProvider,
  MockGuardianProvider, MockCompatibilityProvider,
  StaticValidationPolicyProvider, InMemoryEventBus,
} from '../src/index.js';
import type { EngineManifest } from '../src/interfaces/index.js';

async function main() {
  console.log('═══ Platform Validation Engine — Demo ═══\n');

  // Setup deps (same pattern as test helpers)
  const scenarioRepo = new InMemoryScenarioRepository();
  const validationRepo = new InMemoryValidationRepository();
  const reportRepo = new InMemoryReportRepository();
  const metricsRepo = new InMemoryMetricsRepository();
  const certificationRepo = new InMemoryCertificationRepository();
  const auditRepo = new InMemoryValidationAuditRepository();
  const eventBus = new InMemoryEventBus();
  const manifestProvider = new MockEngineManifestProvider();
  const actionProvider = new MockEngineActionProvider();
  const guardianProvider = new MockGuardianProvider();
  const compatibilityProvider = new MockCompatibilityProvider();
  const policyProvider = new StaticValidationPolicyProvider();

  const engineIds = ['core-sdk','identity','user','organization','catalog','pricing','media','inventory','booking','order','workflow','payment','communication','review'];
  for (const eid of engineIds) {
    const m: EngineManifest = { id: eid, name: eid, version: '1.0.0', status: 'Stable', phase: 6, dependsOn: ['core-sdk'], eventsEmitted: [`${eid}.created`], eventsSubscribed: [], provides: [eid] };
    manifestProvider.add(m);
    actionProvider.registerSimple(eid, 'create', true, [`${eid}.created`]);
  }
  // Register specific action names
  const actionMap: Record<string, [string, string][]> = {
    user: [['createUser', 'user.created']],
    organization: [['createOrganization', 'organization.created']],
    catalog: [['createCatalog', 'catalog.created'], ['archiveCatalog', 'catalog.archived'], ['updateCatalog', '']],
    pricing: [['createPricePlan', 'pricing.plan.created']],
    inventory: [['createStockItem', 'inventory.created'], ['releaseReservation', ''], ['releaseAllocation', ''], ['archiveStockItem', '']],
    booking: [['createBooking', 'booking.created'], ['cancelBooking', 'booking.cancelled'], ['rejectBooking', 'booking.rejected']],
    order: [['createOrder', 'order.created'], ['rejectOrder', 'order.rejected']],
    workflow: [['startWorkflow', ''], ['cancelWorkflow', ''], ['rollbackWorkflow', '']],
    payment: [['createPayment', 'payment.created'], ['failPayment', 'payment.failed'], ['refundPayment', 'payment.refunded']],
    communication: [['sendMessage', ''], ['retryMessage', ''], ['moveToDLQ', ''], ['sendAlert', '']],
    review: [['createReview', 'review.created'], ['archiveReview', ''], ['updateReview', '']],
    authorization: [['denyPermission', ''], ['checkPermission', '']],
    identity: [['login', 'identity.login.success']],
    media: [['uploadAsset', 'media.created']],
    'core-sdk': [['recordAudit', ''], ['indexSearchable', '']],
    'platform-guardian': [['issueWarning', '']],
  };
  for (const [eid, actions] of Object.entries(actionMap)) {
    for (const [action, event] of actions) {
      actionProvider.registerSimple(eid, action, true, event ? [event] : []);
    }
  }

  policyProvider.set('demo', { allowedCategories: ['lifecycle','cancellation','failure','archive','authorization','media','communication','identity'], maxScenarios: 500, defaultTimeoutMs: 30000 });
  guardianProvider.setHealthScore(88);
  compatibilityProvider.setScore(92);

  let idSeq = 0;
  const deps = {
    scenarioRepo, validationRepo, reportRepo, metricsRepo,
    certificationRepo, auditRepo, eventBus,
    manifestProvider, actionProvider, guardianProvider, compatibilityProvider,
    policyProvider,
    idGenerator: { generate: () => `demo-${++idSeq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };

  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'error'));
    return r.value as T;
  };

  // 1) Seed built-in scenarios
  console.log('▶ 1) Seed 8 built-in scenarios');
  const seeded = u(await seedBuiltinScenariosUseCase(
    { tenantId: 'demo', correlationId: 'd-1', actorId: 'admin' }, deps));
  console.log(`  ✓ seeded ${seeded.seeded} scenarios\n`);

  // 2) Run regression (all scenarios)
  console.log('▶ 2) Run Regression Suite');
  const reg = u(await runRegressionUseCase(
    { tenantId: 'demo', correlationId: 'd-2', actorId: 'tester' }, deps));
  console.log(`  ✓ ${reg.scenariosRun} scenarios run, status = ${reg.status}\n`);

  // 3) Generate report
  console.log('▶ 3) Generate Validation Report');
  const report = u(await generateReportUseCase(
    { tenantId: 'demo', correlationId: 'd-3', actorId: 'tester', runId: reg.runId, type: 'regression' }, deps));
  console.log(`  ✓ scenarios: ${report.summary.totalScenarios}, steps: ${report.summary.totalSteps}`);
  console.log(`  ✓ pass rate: ${report.metrics.passRate}%, coverage: ${report.metrics.coverage}%`);
  console.log(`  ✓ health score: ${report.metrics.healthScore}/100\n`);

  // 4) Certify an engine
  console.log('▶ 4) Certify Review Engine');
  const cert = u(await runCertificationUseCase(
    { tenantId: 'demo', correlationId: 'd-4', actorId: 'admin', engineId: 'review', engineVersion: '1.0.0' }, deps));
  console.log(`  ✓ status: ${cert.status}, score: ${cert.score}/100\n`);

  // 5) Calculate platform health
  console.log('▶ 5) Calculate Platform Health');
  const health = u(await calculateHealthUseCase(
    { tenantId: 'demo', correlationId: 'd-5', actorId: 'admin' }, deps));
  console.log(`  ✓ overall: ${health.overallScore}/100, status: ${health.status}`);
  console.log(`  ✓ engines monitored: ${health.engineHealth.length}\n`);

  // 6) Calculate coverage
  console.log('▶ 6) Calculate Coverage');
  const coverage = u(await calculateCoverageUseCase(
    { tenantId: 'demo' }, deps));
  console.log(`  ✓ coverage: ${coverage.coverage}% (${coverage.enginesCovered}/${coverage.totalEngines} engines)\n`);

  // 7) Calculate readiness
  console.log('▶ 7) Calculate Release Readiness');
  const readiness = u(await calculateReadinessUseCase(
    { tenantId: 'demo' }, deps));
  console.log(`  ✓ readiness: ${readiness.readiness}/100, ready: ${readiness.ready}\n`);

  // Summary
  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);

  console.log('\n═══ Demo Complete ═══');
}

main().catch((e) => { console.error('Demo failed:', e); process.exit(1); });
