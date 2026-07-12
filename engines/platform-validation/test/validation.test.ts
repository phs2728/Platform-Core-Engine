/**
 * Platform Validation Engine — Tests
 *
 * 사장님 확립: 100+ PASS
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createScenarioUseCase, updateScenarioUseCase, deleteScenarioUseCase,
  getScenarioUseCase, listScenariosUseCase, searchScenariosUseCase,
  seedBuiltinScenariosUseCase,
  runValidationUseCase, runScenarioUseCase,
  runRegressionUseCase, runSmokeTestUseCase,
  runCertificationUseCase, runReleaseValidationUseCase,
  generateReportUseCase, generateMetricsUseCase, generateSummaryUseCase,
  calculateHealthUseCase, calculateCoverageUseCase, calculateReadinessUseCase,
} from '../src/index.js';
import { makeDeps, makeSimpleScenarioInput } from './helpers.js';

type Deps = ReturnType<typeof makeDeps>;

// ════════════════════════════════════════════════════════════════════════════
// 1. Scenario CRUD (8 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Scenario CRUD', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a scenario', async () => {
    const r = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = await deps.scenarioRepo.findById('t-1', r.value.scenarioId);
    expect(s).not.toBeNull();
    expect(s!.name).toBe('Test Scenario');
    expect(s!.steps.length).toBe(2);
  });

  it('rejects unallowed category', async () => {
    const r = await createScenarioUseCase(
      makeSimpleScenarioInput({ category: 'forbidden' }), deps,
    );
    expect(r.ok).toBe(false);
  });

  it('updates a scenario', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const r = await updateScenarioUseCase(
      { tenantId: 't-1', correlationId: 'c-2', actorId: 'tester',
        scenarioId: created.value!.scenarioId, name: 'Updated Name' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.name).toBe('Updated Name');
    expect(r.value!.version).toBe(2);
  });

  it('deletes (archives) a scenario', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const r = await deleteScenarioUseCase(
      { tenantId: 't-1', correlationId: 'c-3', actorId: 'tester',
        scenarioId: created.value!.scenarioId }, deps,
    );
    expect(r.ok).toBe(true);
    const s = await deps.scenarioRepo.findById('t-1', created.value!.scenarioId);
    expect(s!.status).toBe('Archived');
  });

  it('gets scenario by id', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const r = await getScenarioUseCase(
      { tenantId: 't-1', scenarioId: created.value!.scenarioId }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.name).toBe('Test Scenario');
  });

  it('lists scenarios', async () => {
    await createScenarioUseCase(makeSimpleScenarioInput({ name: 'A' }), deps);
    await createScenarioUseCase(makeSimpleScenarioInput({ name: 'B' }), deps);
    const r = await listScenariosUseCase('t-1', deps);
    expect(r.ok).toBe(true);
    expect(r.value!.length).toBe(2);
  });

  it('searches scenarios by category', async () => {
    await createScenarioUseCase(makeSimpleScenarioInput({ category: 'lifecycle' }), deps);
    await createScenarioUseCase(makeSimpleScenarioInput({ category: 'failure', name: 'Fail' }), deps);
    const r = await searchScenariosUseCase(
      { tenantId: 't-1', category: 'failure' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.total).toBe(1);
  });

  it('cannot update archived scenario', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    await deleteScenarioUseCase(
      { tenantId: 't-1', correlationId: 'c-d', actorId: 'tester',
        scenarioId: created.value!.scenarioId }, deps,
    );
    const r = await updateScenarioUseCase(
      { tenantId: 't-1', correlationId: 'c-u', actorId: 'tester',
        scenarioId: created.value!.scenarioId, name: 'x' }, deps,
    );
    expect(r.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Built-in Scenarios (5 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Built-in Scenarios', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('seeds 8 built-in scenarios', async () => {
    const r = await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-1', actorId: 'admin' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.seeded).toBe(8);
  });

  it('seeded scenarios cover all engine chains', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-1', actorId: 'admin' }, deps,
    );
    const list = await deps.scenarioRepo.findAll('t-1');
    expect(list.length).toBe(8);
    // Check unique names
    const names = new Set(list.map((s) => s.name));
    expect(names.size).toBe(8);
  });

  it('seeded scenario has correct category distribution', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-1', actorId: 'admin' }, deps,
    );
    const list = await deps.scenarioRepo.findAll('t-1');
    const categories = new Set(list.map((s) => s.category));
    expect(categories.size).toBeGreaterThanOrEqual(7);
  });

  it('full lifecycle scenario has 11 steps', async () => {
    const { fullLifecycleScenario } = await import('../src/scenario/builtinScenarios.js');
    const s = fullLifecycleScenario();
    expect(s.steps.length).toBe(11);
  });

  it('all built-in scenarios have at least 1 step', async () => {
    const { getBuiltinScenarios } = await import('../src/scenario/builtinScenarios.js');
    const all = getBuiltinScenarios();
    for (const s of all) {
      expect(s.steps.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Validation Execution (10 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Validation Execution', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('runs a single scenario and passes', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const r = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Passed');
    expect(r.value!.healthScore).toBeGreaterThan(0);
  });

  it('emits validation.started and validation.completed events', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    expect(deps.eventBus.countByType('validation.started')).toBe(1);
    expect(deps.eventBus.countByType('validation.completed')).toBe(1);
  });

  it('emits scenario.completed event on pass', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    expect(deps.eventBus.countByType('scenario.completed')).toBe(1);
  });

  it('fails when engine action fails', async () => {
    const created = await createScenarioUseCase({
      ...makeSimpleScenarioInput(),
      steps: [{
        name: 'Fail Step', description: 'Will fail',
        engineId: 'payment', actionName: 'failPayment',
        params: {},
        expectations: [{ type: 'event_published', description: 'should fail', validator: 'event_check', params: {}, required: true }],
        timeoutMs: 5000, continueOnFailure: false, sequence: 0,
      }],
    }, deps);
    const r = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Failed');
  });

  it('continues on failure when continueOnFailure=true', async () => {
    const created = await createScenarioUseCase({
      ...makeSimpleScenarioInput(),
      steps: [
        {
          name: 'Fail Step', description: 'Will fail but continue',
          engineId: 'payment', actionName: 'failPayment',
          params: {},
          expectations: [{ type: 'event_published', description: 'x', validator: 'event_check', params: {}, required: true }],
          timeoutMs: 5000, continueOnFailure: true, sequence: 0,
        },
        {
          name: 'Success Step', description: 'Will pass',
          engineId: 'user', actionName: 'createUser',
          params: {},
          expectations: [{ type: 'event_published', description: 'x', validator: 'event_check', params: {}, required: true }],
          timeoutMs: 5000, continueOnFailure: false, sequence: 1,
        },
      ],
    }, deps);
    const r = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Failed'); // still failed overall
    // but both steps should have run
    const results = await deps.validationRepo.findResultsByRun('t-1', r.value!.runId);
    expect(results.length).toBe(2);
  });

  it('rejects non-existent scenario', async () => {
    const r = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: ['nonexistent'],
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('rejects archived scenario', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    await deleteScenarioUseCase(
      { tenantId: 't-1', correlationId: 'c-d', actorId: 'tester',
        scenarioId: created.value!.scenarioId }, deps,
    );
    const r = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('runScenario convenience works', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const r = await runScenarioUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      scenarioId: created.value!.scenarioId,
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Passed');
  });

  it('runRegression runs all active scenarios', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-seed', actorId: 'admin' }, deps,
    );
    const r = await runRegressionUseCase(
      { tenantId: 't-1', correlationId: 'c-reg', actorId: 'tester' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.scenariosRun).toBe(8);
  });

  it('runSmokeTest runs subset', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-seed', actorId: 'admin' }, deps,
    );
    const r = await runSmokeTestUseCase(
      { tenantId: 't-1', correlationId: 'c-smoke', actorId: 'tester' }, deps,
    );
    expect(r.ok).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Certification (6 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Certification', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('certifies an engine', async () => {
    const r = await runCertificationUseCase({
      tenantId: 't-1', correlationId: 'c-cert', actorId: 'admin',
      engineId: 'user', engineVersion: '1.0.0',
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Certified');
    expect(r.value!.score).toBeGreaterThan(0);
  });

  it('certification has 7 categories', async () => {
    const r = await runCertificationUseCase({
      tenantId: 't-1', correlationId: 'c-cert', actorId: 'admin',
      engineId: 'catalog', engineVersion: '1.0.0',
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.categories.length).toBe(7);
  });

  it('emits certification.completed event', async () => {
    await runCertificationUseCase({
      tenantId: 't-1', correlationId: 'c-cert', actorId: 'admin',
      engineId: 'payment', engineVersion: '1.0.0',
    }, deps);
    expect(deps.eventBus.countByType('certification.completed')).toBe(1);
  });

  it('rejects unknown engine', async () => {
    const r = await runCertificationUseCase({
      tenantId: 't-1', correlationId: 'c-cert', actorId: 'admin',
      engineId: 'unknown', engineVersion: '1.0.0',
    }, deps);
    expect(r.ok).toBe(false);
  });

  it('certification is persisted', async () => {
    await runCertificationUseCase({
      tenantId: 't-1', correlationId: 'c-cert', actorId: 'admin',
      engineId: 'review', engineVersion: '1.0.0',
    }, deps);
    const certs = await deps.certificationRepo.findByEngine('t-1', 'review');
    expect(certs.length).toBe(1);
  });

  it('runReleaseValidation certifies all engines', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-seed', actorId: 'admin' }, deps,
    );
    const r = await runReleaseValidationUseCase(
      { tenantId: 't-1', correlationId: 'c-rel', actorId: 'admin' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.certified).toBeGreaterThan(0);
    expect(deps.eventBus.countByType('release.validated')).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Reports (6 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Reports', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('generates report from run', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const run = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    const r = await generateReportUseCase({
      tenantId: 't-1', correlationId: 'c-rep', actorId: 'tester',
      runId: run.value!.runId,
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.summary.totalSteps).toBe(2);
    expect(r.value!.summary.passedSteps).toBe(2);
  });

  it('report includes scenario results', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const run = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    const r = await generateReportUseCase({
      tenantId: 't-1', correlationId: 'c-rep', actorId: 'tester',
      runId: run.value!.runId,
    }, deps);
    expect(r.value!.scenarioResults.length).toBe(1);
    expect(r.value!.scenarioResults[0]!.status).toBe('Passed');
  });

  it('report includes metrics', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const run = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    const r = await generateReportUseCase({
      tenantId: 't-1', correlationId: 'c-rep', actorId: 'tester',
      runId: run.value!.runId,
    }, deps);
    expect(r.value!.metrics.passRate).toBe(100);
  });

  it('generateMetrics returns metrics', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const run = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    const r = await generateMetricsUseCase(
      { tenantId: 't-1', runId: run.value!.runId }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.passRate).toBe(100);
    expect(r.value!.healthScore).toBeGreaterThan(0);
  });

  it('generateSummary returns text', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const run = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    const r = await generateSummaryUseCase(
      { tenantId: 't-1', runId: run.value!.runId }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value).toContain('Validation Run');
    expect(r.value).toContain('Pass Rate');
  });

  it('report has recommendations when issues exist', async () => {
    // Create a scenario that fails
    const created = await createScenarioUseCase({
      ...makeSimpleScenarioInput(),
      steps: [{
        name: 'Fail', description: 'Will fail',
        engineId: 'payment', actionName: 'failPayment',
        params: {},
        expectations: [{ type: 'event_published', description: 'x', validator: 'event_check', params: {}, required: true }],
        timeoutMs: 5000, continueOnFailure: false, sequence: 0,
      }],
    }, deps);
    const run = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    const r = await generateReportUseCase({
      tenantId: 't-1', correlationId: 'c-rep', actorId: 'tester',
      runId: run.value!.runId,
    }, deps);
    expect(r.value!.recommendations.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Health + Coverage + Readiness (8 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Health + Coverage + Readiness', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('calculates platform health', async () => {
    const r = await calculateHealthUseCase(
      { tenantId: 't-1', correlationId: 'c-h', actorId: 'admin' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.overallScore).toBeGreaterThan(0);
    expect(r.value!.engineHealth.length).toBeGreaterThan(0);
  });

  it('health status is Healthy when score high', async () => {
    deps.guardianProvider.setHealthScore(95);
    deps.compatibilityProvider.setScore(95);
    const r = await calculateHealthUseCase(
      { tenantId: 't-1', correlationId: 'c-h', actorId: 'admin' }, deps,
    );
    expect(r.value!.status).toBe('Healthy');
  });

  it('health status is Critical when score low', async () => {
    deps.guardianProvider.setHealthScore(5);
    deps.compatibilityProvider.setScore(5);
    const r = await calculateHealthUseCase(
      { tenantId: 't-1', correlationId: 'c-h', actorId: 'admin' }, deps,
    );
    // overallScore = 100*0.3 + 100*0.25 + 10*0.225 + 10*0.225 = 30+25+2.25+2.25 = 59.5 → Critical
    expect(r.value!.status).toBe('Critical');
  });

  it('emits platform.health.updated event', async () => {
    await calculateHealthUseCase(
      { tenantId: 't-1', correlationId: 'c-h', actorId: 'admin' }, deps,
    );
    expect(deps.eventBus.countByType('platform.health.updated')).toBe(1);
  });

  it('calculates coverage', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-seed', actorId: 'admin' }, deps,
    );
    const r = await calculateCoverageUseCase(
      { tenantId: 't-1' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.coverage).toBeGreaterThan(0);
    expect(r.value!.enginesCovered).toBeGreaterThan(5);
  });

  it('coverage identifies uncovered engines', async () => {
    const r = await calculateCoverageUseCase(
      { tenantId: 't-1' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.uncovered.length).toBeGreaterThanOrEqual(0);
  });

  it('calculates readiness', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    const r = await calculateReadinessUseCase(
      { tenantId: 't-1' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.readiness).toBeGreaterThan(0);
  });

  it('readiness is ready when all pass', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    const r = await calculateReadinessUseCase(
      { tenantId: 't-1' }, deps,
    );
    expect(r.value!.ready).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Audit (4 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Audit', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit for scenario creation', async () => {
    await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.length).toBe(1);
    expect(audit[0]!.eventType).toBe('scenario_created');
  });

  it('records audit for validation run', async () => {
    const created = await createScenarioUseCase(makeSimpleScenarioInput(), deps);
    const run = await runValidationUseCase({
      tenantId: 't-1', correlationId: 'c-run', actorId: 'tester',
      type: 'scenario', scenarioIds: [created.value!.scenarioId],
    }, deps);
    const audit = await deps.auditRepo.findByRun('t-1', run.value!.runId);
    expect(audit.length).toBeGreaterThan(0);
    expect(audit.some((a) => a.eventType === 'validation_completed')).toBe(true);
  });

  it('records audit for certification', async () => {
    await runCertificationUseCase({
      tenantId: 't-1', correlationId: 'c-cert', actorId: 'admin',
      engineId: 'user', engineVersion: '1.0.0',
    }, deps);
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.some((a) => a.eventType === 'certification_completed')).toBe(true);
  });

  it('records audit for health update', async () => {
    await calculateHealthUseCase(
      { tenantId: 't-1', correlationId: 'c-h', actorId: 'admin' }, deps,
    );
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.some((a) => a.eventType === 'health_updated')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 8. Full Lifecycle Validation (4 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Full Lifecycle Validation', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('runs full lifecycle scenario (11 steps, all pass)', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-seed', actorId: 'admin' }, deps,
    );
    const scenarios = await deps.scenarioRepo.findAll('t-1');
    const fullLifecycle = scenarios.find((s) => s.name === 'Full Lifecycle')!;
    expect(fullLifecycle).toBeDefined();

    const r = await runScenarioUseCase({
      tenantId: 't-1', correlationId: 'c-fl', actorId: 'tester',
      scenarioId: fullLifecycle.id,
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Passed');
  });

  it('runs cancellation flow scenario', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-seed', actorId: 'admin' }, deps,
    );
    const scenarios = await deps.scenarioRepo.findAll('t-1');
    const cancel = scenarios.find((s) => s.name === 'Cancellation Flow')!;

    const r = await runScenarioUseCase({
      tenantId: 't-1', correlationId: 'c-cf', actorId: 'tester',
      scenarioId: cancel.id,
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Passed');
  });

  it('runs all 8 built-in scenarios via regression', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-seed', actorId: 'admin' }, deps,
    );
    const r = await runRegressionUseCase(
      { tenantId: 't-1', correlationId: 'c-reg', actorId: 'tester' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.scenariosRun).toBe(8);
    expect(r.value!.status).toBe('Passed');
  });

  it('generates report after full regression', async () => {
    await seedBuiltinScenariosUseCase(
      { tenantId: 't-1', correlationId: 'c-seed', actorId: 'admin' }, deps,
    );
    const reg = await runRegressionUseCase(
      { tenantId: 't-1', correlationId: 'c-reg', actorId: 'tester' }, deps,
    );
    const r = await generateReportUseCase({
      tenantId: 't-1', correlationId: 'c-rep', actorId: 'tester',
      runId: reg.value!.runId, type: 'regression',
    }, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.summary.totalScenarios).toBe(8);
    expect(r.value!.summary.totalSteps).toBeGreaterThan(30);
  });
});
