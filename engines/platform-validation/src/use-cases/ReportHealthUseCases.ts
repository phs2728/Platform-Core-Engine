/**
 * Report + Health UseCases (6) —
 *   generateReport / generateMetrics / generateSummary +
 *   calculateHealth / calculateCoverage / calculateReadiness
 */

import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordValidationAudit } from '../domain/audit.js';
import { calculateHealthSchema } from '../domain/validation.js';
import { emitValidationEvent } from '../domain/events.js';
import {
  computeHealthScore, computePassRate, computeReadiness, determinePlatformStatus,
} from '../domain/statusTransition.js';
import type { ValidationUseCaseDeps } from './types.js';
import type {
  ValidationReport, ValidationMetrics, ReportSummary, ScenarioResult,
  PlatformHealth, EngineHealthItem,
} from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// GENERATE REPORT (from existing run)
// ════════════════════════════════════════════════════════════════════════════

export interface GenerateReportInput {
  tenantId: string; correlationId: string; actorId: string;
  runId: string;
  type?: 'validation' | 'scenario' | 'coverage' | 'release' | 'regression' | 'certification' | 'health';
}

export async function generateReportUseCase(
  input: GenerateReportInput,
  deps: ValidationUseCaseDeps,
): Promise<Result<ValidationReport, ValidationError | NotFoundError>> {
  if (!input.runId) return Err(new ValidationError('runId required'));

  const run = await deps.validationRepo.findRunById(input.tenantId, input.runId);
  if (!run) return Err(new NotFoundError('Run not found'));

  const results = await deps.validationRepo.findResultsByRun(input.tenantId, input.runId);
  const totalSteps = results.length;
  const passedSteps = results.filter((r) => r.status === 'Passed').length;
  const failedSteps = results.filter((r) => r.status === 'Failed' || r.status === 'Error').length;

  // Group by scenario
  const byScenario = new Map<string, typeof results>();
  for (const r of results) {
    const list = byScenario.get(r.scenarioId) ?? [];
    list.push(r);
    byScenario.set(r.scenarioId, list);
  }

  const scenarioResults: ScenarioResult[] = [];
  let passedScenarios = 0;
  let failedScenarios = 0;
  let totalDuration = 0;

  for (const [scenarioId, stepResults] of byScenario) {
    const scenario = await deps.scenarioRepo.findById(input.tenantId, scenarioId);
    const stepFailed = stepResults.some((r) => r.status === 'Failed' || r.status === 'Error');
    const status = stepFailed ? 'Failed' : 'Passed';
    const duration = stepResults.reduce((s, r) => s + r.durationMs, 0);
    totalDuration += duration;

    if (stepFailed) failedScenarios++;
    else passedScenarios++;

    scenarioResults.push({
      scenarioId,
      scenarioName: scenario?.name ?? scenarioId,
      status,
      stepResults: stepResults.map((r) => ({
        stepName: r.stepName, status: r.status, durationMs: r.durationMs, error: r.error,
      })),
      durationMs: duration,
    });
  }

  const summary: ReportSummary = {
    totalScenarios: byScenario.size,
    passedScenarios,
    failedScenarios,
    skippedScenarios: 0,
    totalSteps,
    passedSteps,
    failedSteps,
    duration: totalDuration,
    status: failedScenarios === 0 ? 'Passed' : 'Failed',
  };

  const metrics = await computeMetricsFromRun(input.tenantId, input.runId, deps, failedScenarios);

  const reportId = deps.idGenerator.generate();
  const report: ValidationReport = {
    id: reportId,
    tenantId: input.tenantId,
    runId: input.runId,
    type: input.type ?? 'validation',
    title: `${run.type} Report`,
    summary,
    scenarioResults,
    metrics,
    recommendations: generateRecommendations(metrics),
    generatedAt: deps.clock.now().toISOString(),
  };

  await deps.reportRepo.insert(report);
  return Ok(report);
}

// ════════════════════════════════════════════════════════════════════════════
// helper: compute metrics
// ════════════════════════════════════════════════════════════════════════════

async function computeMetricsFromRun(
  tenantId: string, runId: string,
  deps: ValidationUseCaseDeps,
  failedScenarios: number,
): Promise<ValidationMetrics> {
  const results = await deps.validationRepo.findResultsByRun(tenantId, runId);
  const totalSteps = results.length;
  const passedSteps = results.filter((r) => r.status === 'Passed').length;
  const passRate = computePassRate(passedSteps, totalSteps);
  const executionTimeMs = results.reduce((s, r) => s + r.durationMs, 0);
  const averageStepLatencyMs = totalSteps > 0 ? Math.round(executionTimeMs / totalSteps) : 0;

  const enginesTouched = new Set(results.map((r) => r.engineId));
  const allEngines = await deps.manifestProvider.listEngines();
  const coverage = allEngines.length > 0 ? Math.round((enginesTouched.size / allEngines.length) * 100) : 0;

  const guardianScore = await deps.guardianProvider.getHealthScore();
  const compatibilityScore = await deps.compatibilityProvider.getCompatibilityScore();
  const violations = await deps.compatibilityProvider.getViolations();
  const healthScore = computeHealthScore(passRate, coverage, guardianScore, compatibilityScore);
  const readiness = computeReadiness(passRate, failedScenarios, violations.length);

  return {
    passRate, coverage, executionTimeMs, averageStepLatencyMs,
    healthScore, readiness, regressionCount: failedScenarios,
    brokenContracts: violations.length, failedScenarios,
    enginesCovered: enginesTouched.size, totalEngines: allEngines.length,
  };
}

function generateRecommendations(metrics: ValidationMetrics): string[] {
  const recs: string[] = [];
  if (metrics.passRate < 100) recs.push(`Pass rate ${metrics.passRate}% — investigate failures`);
  if (metrics.coverage < 80) recs.push(`Coverage ${metrics.coverage}% — add scenarios for uncovered engines`);
  if (metrics.brokenContracts > 0) recs.push(`${metrics.brokenContracts} broken contracts`);
  if (metrics.healthScore < 85) recs.push(`Health score ${metrics.healthScore} below 85 threshold`);
  if (metrics.failedScenarios > 0) recs.push(`${metrics.failedScenarios} failed scenarios need attention`);
  return recs;
}

// ════════════════════════════════════════════════════════════════════════════
// GENERATE METRICS
// ════════════════════════════════════════════════════════════════════════════

export async function generateMetricsUseCase(
  input: { tenantId: string; runId: string },
  deps: ValidationUseCaseDeps,
): Promise<Result<ValidationMetrics, ValidationError | NotFoundError>> {
  const run = await deps.validationRepo.findRunById(input.tenantId, input.runId);
  if (!run) return Err(new NotFoundError('Run not found'));
  return Ok(await computeMetricsFromRun(input.tenantId, input.runId, deps, 0));
}

// ════════════════════════════════════════════════════════════════════════════
// GENERATE SUMMARY (text summary)
// ════════════════════════════════════════════════════════════════════════════

export async function generateSummaryUseCase(
  input: { tenantId: string; runId: string },
  deps: ValidationUseCaseDeps,
): Promise<Result<string, ValidationError | NotFoundError>> {
  const run = await deps.validationRepo.findRunById(input.tenantId, input.runId);
  if (!run) return Err(new NotFoundError('Run not found'));

  const results = await deps.validationRepo.findResultsByRun(input.tenantId, input.runId);
  const passed = results.filter((r) => r.status === 'Passed').length;
  const failed = results.filter((r) => r.status === 'Failed').length;
  const total = results.length;

  const metrics = await computeMetricsFromRun(input.tenantId, input.runId, deps, 0);

  const lines = [
    `Validation Run: ${run.id}`,
    `Type: ${run.type}`,
    `Status: ${run.status}`,
    `Steps: ${passed}/${total} passed, ${failed} failed`,
    `Pass Rate: ${metrics.passRate}%`,
    `Coverage: ${metrics.coverage}% (${metrics.enginesCovered}/${metrics.totalEngines} engines)`,
    `Health Score: ${metrics.healthScore}/100`,
    `Readiness: ${metrics.readiness}/100`,
    `Execution Time: ${metrics.executionTimeMs}ms`,
  ];

  return Ok(lines.join('\n'));
}

// ════════════════════════════════════════════════════════════════════════════
// CALCULATE HEALTH (platform-wide)
// ════════════════════════════════════════════════════════════════════════════

export async function calculateHealthUseCase(
  input: { tenantId: string; correlationId: string; actorId: string },
  deps: ValidationUseCaseDeps,
): Promise<Result<PlatformHealth, ValidationError>> {
  const v = calculateHealthSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const { correlationId, actorId } = input;

  const engineIds = await deps.manifestProvider.listEngines();
  const engineHealth: EngineHealthItem[] = [];

  for (const eid of engineIds) {
    const manifest = await deps.manifestProvider.getManifest(eid);
    const alive = await deps.manifestProvider.isAlive(eid);
    if (manifest.ok) {
      engineHealth.push({
        engineId: eid,
        status: manifest.value.status,
        alive,
        version: manifest.value.version,
        dependencies: manifest.value.dependsOn,
      });
    }
  }

  const guardianScore = await deps.guardianProvider.getHealthScore();
  const compatibilityScore = await deps.compatibilityProvider.getCompatibilityScore();

  // validation pass rate from recent runs
  const recentRuns = await deps.validationRepo.listRuns(d.tenantId, 10);
  let validationPassRate = 100;
  if (recentRuns.length > 0) {
    const passedRuns = recentRuns.filter((r) => r.status === 'Passed').length;
    validationPassRate = computePassRate(passedRuns, recentRuns.length);
  }

  const overallScore = computeHealthScore(validationPassRate, 100, guardianScore, compatibilityScore);
  const status = determinePlatformStatus(overallScore);

  const healthId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  const health: PlatformHealth = {
    id: healthId,
    tenantId: d.tenantId,
    overallScore,
    engineHealth,
    guardianScore,
    compatibilityScore,
    validationPassRate,
    status,
    computedAt: now,
  };

  const envelope: EventEnvelope<{ overallScore: number; status: string }> =
    await emitValidationEvent(deps,
      { aggregateId: healthId, tenantId: d.tenantId, correlationId },
      'platform.health.updated', 'platform.health.updated.v1',
      { overallScore, status });
  await deps.eventBus.emit(envelope);

  await recordValidationAudit(deps.auditRepo, {
    tenantId: d.tenantId,
    actorId,
    correlationId,
    eventType: 'health_updated',
    metadata: { overallScore, status, engines: engineIds.length },
  });

  return Ok(health);
}

// ════════════════════════════════════════════════════════════════════════════
// CALCULATE COVERAGE
// ════════════════════════════════════════════════════════════════════════════

export async function calculateCoverageUseCase(
  input: { tenantId: string; correlationId?: string },
  deps: ValidationUseCaseDeps,
): Promise<Result<{ coverage: number; enginesCovered: number; totalEngines: number; uncovered: string[] }, ValidationError>> {
  if (!input.tenantId) return Err(new ValidationError('tenantId required'));

  const allEngines = await deps.manifestProvider.listEngines();
  const scenarios = await deps.scenarioRepo.findAll(input.tenantId);

  // Collect all engines referenced in scenarios
  const covered = new Set<string>();
  for (const s of scenarios) {
    if (s.status !== 'Active') continue;
    for (const step of s.steps) {
      covered.add(step.engineId);
    }
  }

  const uncovered = allEngines.filter((e) => !covered.has(e));
  const coverage = allEngines.length > 0 ? Math.round((covered.size / allEngines.length) * 100) : 0;

  return Ok({ coverage, enginesCovered: covered.size, totalEngines: allEngines.length, uncovered });
}

// ════════════════════════════════════════════════════════════════════════════
// CALCULATE READINESS
// ════════════════════════════════════════════════════════════════════════════

export async function calculateReadinessUseCase(
  input: { tenantId: string; correlationId?: string },
  deps: ValidationUseCaseDeps,
): Promise<Result<{ readiness: number; passRate: number; failedScenarios: number; brokenContracts: number; ready: boolean }, ValidationError>> {
  if (!input.tenantId) return Err(new ValidationError('tenantId required'));

  const recentRuns = await deps.validationRepo.listRuns(input.tenantId, 5);
  let totalSteps = 0;
  let passedSteps = 0;
  let failedScenarios = 0;

  for (const run of recentRuns) {
    const results = await deps.validationRepo.findResultsByRun(input.tenantId, run.id);
    totalSteps += results.length;
    passedSteps += results.filter((r) => r.status === 'Passed').length;
    if (run.status === 'Failed') failedScenarios++;
  }

  const passRate = computePassRate(passedSteps, totalSteps);
  const violations = await deps.compatibilityProvider.getViolations();
  const readiness = computeReadiness(passRate, failedScenarios, violations.length);

  return Ok({
    readiness, passRate, failedScenarios,
    brokenContracts: violations.length,
    ready: readiness >= 85 && failedScenarios === 0,
  });
}
