/**
 * Platform Validation Engine — Validation Status Machine
 *
 * ValidationRun: Pending → Running → Passed/Failed/Aborted
 * StepStatus: Pending → Running → Passed/Failed/Skipped/Error
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

export function isRunTerminal(status: string): boolean {
  return status === 'Passed' || status === 'Failed' || status === 'Aborted';
}

export function isRunMutable(status: string): boolean {
  return status === 'Pending' || status === 'Running';
}

export function validateRunTransition(current: string, next: string): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(`Run is already in status "${current}"`));
  }
  if (isRunTerminal(current)) {
    return Err(new ConflictError(`Terminal status "${current}" cannot transition`));
  }
  const allowed: Record<string, string[]> = {
    Pending: ['Running', 'Aborted', 'Skipped'],
    Running: ['Passed', 'Failed', 'Aborted'],
  };
  const ok = allowed[current] ?? [];
  if (!ok.includes(next)) {
    return Err(new ConflictError(`Transition "${current}" → "${next}" not allowed`));
  }
  return Ok(true);
}

export function computePassRate(passed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((passed / total) * 100);
}

export function computeHealthScore(
  passRate: number,
  coverage: number,
  guardianScore: number,
  compatibilityScore: number,
): number {
  return Math.round(
    passRate * 0.3 + coverage * 0.25 + guardianScore * 0.225 + compatibilityScore * 0.225,
  );
}

export function computeReadiness(passRate: number, failedScenarios: number, brokenContracts: number): number {
  const penalty = failedScenarios * 5 + brokenContracts * 10;
  return Math.max(0, Math.min(100, passRate - penalty));
}

export function determinePlatformStatus(healthScore: number): 'Healthy' | 'Degraded' | 'Critical' | 'Unknown' {
  if (healthScore >= 85) return 'Healthy';
  if (healthScore >= 60) return 'Degraded';
  return 'Critical';
}
