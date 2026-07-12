/**
 * Host Stubs + EventBus — Test/Demo only
 *
 * Key design: IEngineActionProvider is the plugin that wires actual
 * engine UseCases. This engine never imports other engines.
 */

import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IEngineManifestProvider,
  IEngineActionProvider,
  IGuardianProvider,
  ICompatibilityProvider,
  ICustomDataPolicyProvider,
  EngineManifest,
  EngineActionInput,
  EngineActionOutput,
} from '../interfaces/index.js';
import { Ok, Err, type Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Engine Manifest Provider (Mock)
// ═══════════════════════════════════════════

export class MockEngineManifestProvider implements IEngineManifestProvider {
  private manifests = new Map<string, EngineManifest>();

  add(manifest: EngineManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  async listEngines(): Promise<readonly string[]> {
    return [...this.manifests.keys()];
  }

  async getManifest(engineId: string): Promise<Result<EngineManifest, Error>> {
    const m = this.manifests.get(engineId);
    if (!m) return Err(new Error(`Engine not found: ${engineId}`));
    return Ok(m);
  }

  async isAlive(engineId: string): Promise<boolean> {
    return this.manifests.has(engineId);
  }

  clear(): void { this.manifests.clear(); }
}

// ═══════════════════════════════════════════
// Engine Action Provider (Mock)
// ═══════════════════════════════════════════

export class MockEngineActionProvider implements IEngineActionProvider {
  private handlers = new Map<string, (input: EngineActionInput) => Promise<Result<EngineActionOutput, Error>>>();
  private supportedActions = new Set<string>();
  private defaultSuccess = true;

  /** Register a handler for a specific engine + action. */
  register(engineId: string, actionName: string,
    handler: (input: EngineActionInput) => Promise<Result<EngineActionOutput, Error>>,
  ): void {
    this.handlers.set(`${engineId}::${actionName}`, handler);
    this.supportedActions.add(`${engineId}::${actionName}`);
  }

  /** Register a simple success/fail for an engine+action. */
  registerSimple(engineId: string, actionName: string, success: boolean, events: string[] = []): void {
    this.register(engineId, actionName, async () => {
      if (success) {
        return Ok({
          success: true,
          result: { status: 'ok' },
          durationMs: Math.floor(Math.random() * 50) + 1,
          events,
          errors: [],
        });
      }
      return Ok({
        success: false,
        result: { status: 'error' },
        durationMs: Math.floor(Math.random() * 50) + 1,
        events: [],
        errors: ['action failed'],
      });
    });
  }

  setDefaultSuccess(value: boolean): void { this.defaultSuccess = value; }

  async execute(input: EngineActionInput): Promise<Result<EngineActionOutput, Error>> {
    const k = `${input.engineId}::${input.actionName}`;
    const handler = this.handlers.get(k);
    if (handler) return handler(input);

    // default behavior
    return Ok({
      success: this.defaultSuccess,
      result: { status: this.defaultSuccess ? 'ok' : 'error' },
      durationMs: Math.floor(Math.random() * 50) + 1,
      events: this.defaultSuccess ? [`${input.actionName}.ok`] : [],
      errors: this.defaultSuccess ? [] : ['default failure'],
    });
  }

  async query(engineId: string, queryName: string, _params: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>> {
    return Ok({ engineId, queryName, result: 'ok' });
  }

  async canExecute(engineId: string, actionName: string): Promise<boolean> {
    return this.supportedActions.has(`${engineId}::${actionName}`);
  }

  clear(): void { this.handlers.clear(); this.supportedActions.clear(); }
}

// ═══════════════════════════════════════════
// Guardian Provider (Mock)
// ═══════════════════════════════════════════

export class MockGuardianProvider implements IGuardianProvider {
  private healthScore = 85;
  private mergeDecision = 'APPROVED';
  private riskLevel = 'low';

  setHealthScore(v: number): void { this.healthScore = v; }
  setMergeDecision(v: string): void { this.mergeDecision = v; }
  setRiskLevel(v: string): void { this.riskLevel = v; }

  async getHealthScore(): Promise<number> { return this.healthScore; }
  async getMergeDecision(): Promise<string> { return this.mergeDecision; }
  async getRiskLevel(): Promise<string> { return this.riskLevel; }
}

// ═══════════════════════════════════════════
// Compatibility Provider (Mock)
// ═══════════════════════════════════════════

export class MockCompatibilityProvider implements ICompatibilityProvider {
  private score = 90;
  private violations: string[] = [];
  private reportCount = 8;

  setScore(v: number): void { this.score = v; }
  setViolations(v: string[]): void { this.violations = v; }
  setReportCount(v: number): void { this.reportCount = v; }

  async getCompatibilityScore(): Promise<number> { return this.score; }
  async getViolations(): Promise<readonly string[]> { return this.violations; }
  async getReportCount(): Promise<number> { return this.reportCount; }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

export class StaticValidationPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, {
    allowedCategories: readonly string[];
    maxScenarios: number;
    defaultTimeoutMs: number;
  }>();

  set(tenantId: string, config: Partial<{
    allowedCategories: readonly string[];
    maxScenarios: number;
    defaultTimeoutMs: number;
  }>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedCategories: config.allowedCategories ?? prev?.allowedCategories ?? ['lifecycle', 'failure', 'cancellation'],
      maxScenarios: config.maxScenarios ?? prev?.maxScenarios ?? 500,
      defaultTimeoutMs: config.defaultTimeoutMs ?? prev?.defaultTimeoutMs ?? 30000,
    });
  }

  async validateAttributes(
    _tenantId: string,
    _type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>> {
    return Ok(attributes);
  }

  async getAllowedScenarioCategories(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedCategories ?? ['lifecycle', 'failure', 'cancellation'];
  }

  async getMaxScenariosPerTenant(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxScenarios ?? 500;
  }

  async getDefaultTimeoutMs(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultTimeoutMs ?? 30000;
  }

  clear(): void { this.tenantConfig.clear(); }
}

// ═══════════════════════════════════════════
// EventBus
// ═══════════════════════════════════════════

export interface RecordedEnvelope<T = unknown> {
  envelope: EventEnvelope<T>;
  recordedAt: number;
}

export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];

  async emit<T>(envelope: EventEnvelope<T>): Promise<void> {
    this.emitted.push({ envelope, recordedAt: Date.now() });
  }

  byType(eventType: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.eventType === eventType);
  }

  byAggregate(aggregateId: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.aggregateId === aggregateId);
  }

  countByType(eventType: string): number {
    return this.byType(eventType).length;
  }

  clear(): void { this.emitted.length = 0; }
}
