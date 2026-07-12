/** Host Stubs + EventBus — Test/Demo only */
import type { EventEnvelope } from '@platform/core-sdk';
import type {
  ICompatibilityProvider, IValidationProvider, IGuardianProvider,
  IBuildProvider, ICustomDataPolicyProvider,
  CompatibilityResult, ValidationResult, GuardianResult, BuildResult,
} from '../interfaces/index.js';
import { Ok, Err, type Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Compatibility Provider (Mock)
// ═══════════════════════════════════════════

export class MockCompatibilityProvider implements ICompatibilityProvider {
  private scores = new Map<string, number>();
  private violations = new Map<string, string[]>();

  setScore(tenantId: string, engineId: string, score: number, violations: string[] = []): void {
    this.scores.set(`${tenantId}::${engineId}`, score);
    this.violations.set(`${tenantId}::${engineId}`, violations);
  }

  async runCheck(tenantId: string, engineId: string): Promise<Result<CompatibilityResult, Error>> {
    const score = this.scores.get(`${tenantId}::${engineId}`) ?? 95;
    const viols = this.violations.get(`${tenantId}::${engineId}`) ?? [];
    return Ok({ engineId, score, violations: viols, passed: score >= 80 && viols.length === 0 });
  }

  async getScore(tenantId: string, engineId: string): Promise<number> {
    return this.scores.get(`${tenantId}::${engineId}`) ?? 95;
  }
  clear(): void { this.scores.clear(); this.violations.clear(); }
}

// ═══════════════════════════════════════════
// Validation Provider (Mock)
// ═══════════════════════════════════════════

export class MockValidationProvider implements IValidationProvider {
  private status = new Map<string, 'Passed' | 'Failed'>();

  setStatus(tenantId: string, engineId: string, status: 'Passed' | 'Failed'): void {
    this.status.set(`${tenantId}::${engineId}`, status);
  }

  async runValidation(tenantId: string, engineId: string): Promise<Result<ValidationResult, Error>> {
    const status = this.status.get(`${tenantId}::${engineId}`) ?? 'Passed';
    return Ok({ engineId, status, scenariosRun: 50, scenariosPassed: status === 'Passed' ? 50 : 40, healthScore: status === 'Passed' ? 90 : 60 });
  }
  clear(): void { this.status.clear(); }
}

// ═══════════════════════════════════════════
// Guardian Provider (Mock)
// ═══════════════════════════════════════════

export class MockGuardianProvider implements IGuardianProvider {
  private decisions = new Map<string, string>();

  setDecision(tenantId: string, engineId: string, decision: string): void {
    this.decisions.set(`${tenantId}::${engineId}`, decision);
  }

  async runGuardianCheck(tenantId: string, engineId: string): Promise<Result<GuardianResult, Error>> {
    const decision = this.decisions.get(`${tenantId}::${engineId}`) ?? 'APPROVED';
    return Ok({ engineId, decision: decision as 'APPROVED', score: decision === 'REJECTED' ? 40 : 85, risks: decision === 'REJECTED' ? ['critical_violation'] : [] });
  }
  clear(): void { this.decisions.clear(); }
}

// ═══════════════════════════════════════════
// Build Provider (Mock)
// ═══════════════════════════════════════════

export class MockBuildProvider implements IBuildProvider {
  private failEngines = new Set<string>();

  setFail(engineId: string): void { this.failEngines.add(engineId); }

  async runBuild(engineId: string): Promise<Result<BuildResult, Error>> {
    const fail = this.failEngines.has(engineId);
    return Ok({
      engineId,
      build: !fail, lint: !fail, typecheck: !fail,
      tests: !fail, testCount: 50, testPassed: fail ? 40 : 50,
      examples: !fail,
    });
  }
  clear(): void { this.failEngines.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticReleasePolicyProvider implements ICustomDataPolicyProvider {
  private config = new Map<string, { maxReleases: number; requiredApprovals: number }>();
  set(tenantId: string, c: Partial<{ maxReleases: number; requiredApprovals: number }>): void {
    const prev = this.config.get(tenantId);
    this.config.set(tenantId, {
      maxReleases: c.maxReleases ?? prev?.maxReleases ?? 100,
      requiredApprovals: c.requiredApprovals ?? prev?.requiredApprovals ?? 1,
    });
  }
  async validateAttributes(_t: string, _type: string, attrs: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> { return Ok(attrs); }
  async getMaxReleasesPerEngine(t: string): Promise<number> { return this.config.get(t)?.maxReleases ?? 100; }
  async getRequiredApprovals(t: string): Promise<number> { return this.config.get(t)?.requiredApprovals ?? 1; }
  clear(): void { this.config.clear(); }
}

// ═══════════════════════════════════════════
// EventBus
// ═══════════════════════════════════════════

export interface RecordedEnvelope<T = unknown> { envelope: EventEnvelope<T>; recordedAt: number; }

export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];
  async emit<T>(e: EventEnvelope<T>): Promise<void> { this.emitted.push({ envelope: e, recordedAt: Date.now() }); }
  byType(t: string): RecordedEnvelope[] { return this.emitted.filter((r) => r.envelope.eventType === t); }
  countByType(t: string): number { return this.byType(t).length; }
  clear(): void { this.emitted.length = 0; }
}
