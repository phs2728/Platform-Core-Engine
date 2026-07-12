/**
 * Guardian Use Cases
 *
 * The core use cases that run the Guardian analysis pipeline.
 * Each use case orchestrates analyzers, scorer, and decision maker.
 */

import { Ok, Err, type Result } from '@platform/core-sdk';
import type {
  GuardianInput,
  GuardianAudit,
  GuardianDecision,
  GuardianScore,
  RoadmapAnalysis,
  IGuardianInputProvider,
  IGuardianReportWriter,
} from '../interfaces/index.js';
import { analyzeArchitecture } from '../analyzers/ArchitectureAnalyzer.js';
import { analyzeRisk } from '../analyzers/RiskAnalyzer.js';
import { analyzeTechnicalDebt } from '../analyzers/TechnicalDebtAnalyzer.js';
import { generateRoadmap } from '../analyzers/RoadmapGenerator.js';
import { calculateGuardianScore } from '../scorer/GuardianScorer.js';
import { makeGuardianDecision } from '../decision/GuardianDecisionMaker.js';
import { generateAllGuardianReports } from '../report/GuardianReportGenerator.js';

export interface GuardianDeps {
  inputProvider: IGuardianInputProvider;
  reportWriter: IGuardianReportWriter;
}

/**
 * Run the full Guardian audit: architecture, risk, debt, roadmap, score, decision.
 */
export async function runGuardianScanUseCase(
  deps: GuardianDeps,
): Promise<Result<GuardianAudit, Error>> {
  const input = await deps.inputProvider.collect();

  const architecture = analyzeArchitecture(input);
  const risk = analyzeRisk(input);
  const technicalDebt = analyzeTechnicalDebt(input);
  const roadmap = generateRoadmap(input, architecture, risk, technicalDebt);
  const score = calculateGuardianScore(input, architecture, risk, technicalDebt);
  const decision = makeGuardianDecision(score, risk, technicalDebt, architecture);

  const audit: GuardianAudit = {
    score,
    architecture,
    risk,
    technicalDebt,
    roadmap,
    decision,
    inputSnapshot: {
      totalEngines: input.manifests.length,
      totalPublicApis: input.manifests.reduce((s, m) => s + m.provides.length, 0),
      totalEvents: input.manifests.reduce((s, m) => s + m.events_emitted.length, 0),
      brokenContracts: input.contractResults.filter((c) => !c.passed).length,
      breakingChanges: input.apiDiffResults.filter((a) => a.hasBreakingChange).length,
      cycles: input.dependencyResult?.cycles.length ?? 0,
    },
    generatedAt: new Date().toISOString(),
  };

  return Ok(audit);
}

/**
 * Run the Guardian merge gate — returns the decision only.
 */
export async function runGuardianMergeUseCase(
  deps: GuardianDeps,
): Promise<Result<GuardianDecision, Error>> {
  const auditResult = await runGuardianScanUseCase(deps);
  if (!auditResult.ok) return Err(auditResult.error);
  return Ok(auditResult.value.decision);
}

/**
 * Run the Guardian release check — returns the score.
 */
export async function runGuardianReleaseUseCase(
  deps: GuardianDeps,
): Promise<Result<GuardianScore, Error>> {
  const auditResult = await runGuardianScanUseCase(deps);
  if (!auditResult.ok) return Err(auditResult.error);
  return Ok(auditResult.value.score);
}

/**
 * Run the Guardian roadmap generator.
 */
export async function runGuardianRoadmapUseCase(
  deps: GuardianDeps,
): Promise<Result<RoadmapAnalysis, Error>> {
  const auditResult = await runGuardianScanUseCase(deps);
  if (!auditResult.ok) return Err(auditResult.error);
  return Ok(auditResult.value.roadmap);
}

/**
 * Run the Guardian health check — returns the full audit.
 * Also generates all 5 reports.
 */
export async function runGuardianHealthUseCase(
  deps: GuardianDeps,
): Promise<Result<GuardianAudit, Error>> {
  const auditResult = await runGuardianScanUseCase(deps);
  if (!auditResult.ok) return Err(auditResult.error);

  // Generate reports
  await generateAllGuardianReports(deps.reportWriter, auditResult.value);

  return Ok(auditResult.value);
}

/**
 * Run the full Guardian scan AND generate all reports.
 */
export async function runFullGuardianScanWithReportsUseCase(
  deps: GuardianDeps,
): Promise<Result<{ audit: GuardianAudit; reports: string[] }, Error>> {
  const auditResult = await runGuardianScanUseCase(deps);
  if (!auditResult.ok) return Err(auditResult.error);

  await generateAllGuardianReports(deps.reportWriter, auditResult.value);

  return Ok({
    audit: auditResult.value,
    reports: ['guardian-report.md', 'architecture-report.md', 'technical-debt.md', 'risk-report.md', 'roadmap.md'],
  });
}
