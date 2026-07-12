/**
 * Platform Validation Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11) Phase 6 — Platform Validation Engine.
 *
 * NOT another Business Engine. This is a QA meta-engine that validates
 * the ENTIRE platform via scenario-based E2E testing.
 *
 * Architecturally distinct:
 *   - No domain data (no entities it owns beyond validation artifacts)
 *   - No entity repositories (only result/report stores)
 *   - Reads engine manifests via IEngineManifestProvider host adapter
 *   - Executes engine actions via IEngineActionProvider host adapter
 *   - Produces validation reports + metrics + health scores
 *
 * Acceptance: if you delete this engine, ALL E2E validation,
 * Release Validation, Platform Certification, and Regression
 * Testing disappears.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra (모든 Engine 공통)
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

/**
 * Engine Manifest Provider — reads engine.json metadata.
 * This engine NEVER imports other engines directly.
 */
export interface IEngineManifestProvider {
  /** List all engine IDs registered on the platform. */
  listEngines(): Promise<readonly string[]>;

  /** Get manifest for a specific engine. */
  getManifest(engineId: string): Promise<Result<EngineManifest, Error>>;

  /** Check if an engine exists and is active. */
  isAlive(engineId: string): Promise<boolean>;
}

/**
 * Engine Manifest — flattened copy of engine.json (NOT the original).
 */
export interface EngineManifest {
  id: string;
  name: string;
  version: string;
  status: string;
  phase: number;
  dependsOn: string[];
  eventsEmitted: string[];
  eventsSubscribed: string[];
  provides: string[];
}

/**
 * Engine Action Provider — executes actions on engines.
 * The host implements this to wire actual engine UseCases.
 * This engine never calls engine UseCases directly.
 */
export interface IEngineActionProvider {
  /**
   * Execute a named action on a specific engine.
   * Returns the action result (generic payload).
   */
  execute(input: EngineActionInput): Promise<Result<EngineActionOutput, Error>>;

  /**
   * Query an engine's state (read-only).
   */
  query(engineId: string, queryName: string, params: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;

  /**
   * Check if a specific capability/action is supported by an engine.
   */
  canExecute(engineId: string, actionName: string): Promise<boolean>;
}

export interface EngineActionInput {
  engineId: string;
  actionName: string;
  params: Record<string, unknown>;
  tenantId: string;
  correlationId: string;
}

export interface EngineActionOutput {
  success: boolean;
  result: Record<string, unknown>;
  durationMs: number;
  events: string[];
  errors: string[];
}

/**
 * Platform Guardian Provider — reads Guardian scores/decisions.
 */
export interface IGuardianProvider {
  getHealthScore(): Promise<number>;
  getMergeDecision(): Promise<string>;
  getRiskLevel(): Promise<string>;
}

/**
 * Compatibility Suite Provider — reads compatibility results.
 */
export interface ICompatibilityProvider {
  getCompatibilityScore(): Promise<number>;
  getViolations(): Promise<readonly string[]>;
  getReportCount(): Promise<number>;
}

/**
 * Custom Data Policy — validation scenario attributes.
 */
export interface ICustomDataPolicyProvider {
  validateAttributes(
    tenantId: string,
    type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>>;

  getAllowedScenarioCategories(tenantId: string): Promise<readonly string[]>;
  getMaxScenariosPerTenant(tenantId: string): Promise<number>;
  getDefaultTimeoutMs(tenantId: string): Promise<number>;
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type ValidationStatus = 'Pending' | 'Running' | 'Passed' | 'Failed' | 'Skipped' | 'Aborted';

export type StepStatus = 'Pending' | 'Running' | 'Passed' | 'Failed' | 'Skipped' | 'Error';

export type ValidationType =
  | 'smoke'        // quick health check
  | 'regression'   // full regression suite
  | 'certification' // engine certification
  | 'release'      // pre-release validation
  | 'scenario'     // single scenario
  | 'e2e';         // end-to-end

export type ReportType =
  | 'validation' | 'scenario' | 'coverage'
  | 'release' | 'regression' | 'certification'
  | 'health';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

/**
 * Scenario — a named sequence of steps that validate a business flow.
 */
export interface Scenario {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: string;              // 'lifecycle', 'cancellation', 'failure', 'archive', 'authorization', 'media', 'communication', 'identity'
  type: ValidationType;
  tags: string[];
  steps: ScenarioStep[];
  status: 'Draft' | 'Active' | 'Archived';
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * ScenarioStep — a single validation step within a scenario.
 */
export interface ScenarioStep {
  id: string;
  name: string;
  description: string;
  engineId: string;              // target engine to execute against
  actionName: string;            // action to execute
  params: Record<string, unknown>;
  expectations: StepExpectation[];
  timeoutMs: number;
  continueOnFailure: boolean;
  sequence: number;
}

/**
 * StepExpectation — what to verify after step execution.
 */
export interface StepExpectation {
  type: 'event_published' | 'repository_updated' | 'workflow_state' | 'permission' | 'organization_ownership' | 'audit' | 'communication' | 'guardian' | 'compatibility' | 'custom';
  description: string;
  validator: string;             // named validator identifier
  params: Record<string, unknown>;
  required: boolean;
}

/**
 * ValidationRun — a single execution of a validation (one or more scenarios).
 */
export interface ValidationRun {
  id: string;
  tenantId: string;
  type: ValidationType;
  status: ValidationStatus;
  scenarioIds: string[];
  startedAt: string;
  completedAt: string | null;
  initiatedBy: string;
  correlationId: string;
  metadata: Record<string, unknown>;
}

/**
 * ValidationResult — result of a single scenario step within a run.
 */
export interface ValidationResult {
  id: string;
  tenantId: string;
  runId: string;
  scenarioId: string;
  stepId: string;
  stepName: string;
  engineId: string;
  status: StepStatus;
  durationMs: number;
  expectationsTotal: number;
  expectationsPassed: number;
  expectationsFailed: number;
  error: string | null;
  details: Record<string, unknown>;
  timestamp: string;
}

/**
 * ValidationReport — aggregated report for a run.
 */
export interface ValidationReport {
  id: string;
  tenantId: string;
  runId: string;
  type: ReportType;
  title: string;
  summary: ReportSummary;
  scenarioResults: ScenarioResult[];
  metrics: ValidationMetrics;
  recommendations: string[];
  generatedAt: string;
}

export interface ReportSummary {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  skippedScenarios: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  duration: number;
  status: ValidationStatus;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  status: ValidationStatus;
  stepResults: { stepName: string; status: StepStatus; durationMs: number; error: string | null }[];
  durationMs: number;
}

export interface ValidationMetrics {
  passRate: number;              // percentage
  coverage: number;              // percentage of engines covered
  executionTimeMs: number;
  averageStepLatencyMs: number;
  healthScore: number;           // 0~100
  readiness: number;             // 0~100
  regressionCount: number;
  brokenContracts: number;
  failedScenarios: number;
  enginesCovered: number;
  totalEngines: number;
}

/**
 * Certification — engine certification record.
 */
export interface Certification {
  id: string;
  tenantId: string;
  engineId: string;
  engineVersion: string;
  status: 'Pending' | 'Certified' | 'Failed' | 'Expired';
  score: number;                 // 0~100
  checksTotal: number;
  checksPassed: number;
  checksFailed: number;
  categories: CertificationCategory[];
  certifiedAt: string | null;
  expiresAt: string | null;
  certifiedBy: string;
}

export interface CertificationCategory {
  name: string;
  status: 'Passed' | 'Failed' | 'Warning';
  score: number;
  details: string;
}

/**
 * PlatformHealth — overall platform health snapshot.
 */
export interface PlatformHealth {
  id: string;
  tenantId: string;
  overallScore: number;          // 0~100
  engineHealth: EngineHealthItem[];
  guardianScore: number;
  compatibilityScore: number;
  validationPassRate: number;
  status: 'Healthy' | 'Degraded' | 'Critical' | 'Unknown';
  computedAt: string;
}

export interface EngineHealthItem {
  engineId: string;
  status: string;
  alive: boolean;
  version: string;
  dependencies: string[];
}

/**
 * BusinessFlow — high-level flow definition for documentation.
 */
export interface BusinessFlow {
  id: string;
  name: string;
  description: string;
  engineChain: string[];         // ordered list of engine IDs
  scenarioId: string;            // linked scenario
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface ScenarioSearchCriteria {
  tenantId: string;
  category?: string;
  type?: ValidationType;
  tags?: string[];
  status?: 'Draft' | 'Active' | 'Archived';
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ScenarioSearchResult {
  scenarios: Scenario[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type ValidationAuditEventType =
  | 'validation_started'
  | 'validation_completed'
  | 'validation_failed'
  | 'scenario_created'
  | 'scenario_updated'
  | 'scenario_deleted'
  | 'scenario_executed'
  | 'scenario_passed'
  | 'scenario_failed'
  | 'certification_completed'
  | 'release_validated'
  | 'health_updated';

export interface ValidationAuditRecord {
  id: string;
  tenantId: string;
  runId?: string;
  scenarioId?: string;
  reportId?: string;
  certificationId?: string;
  actorId: string;
  correlationId: string;
  eventType: ValidationAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IScenarioRepository {
  insert(scenario: Scenario): Promise<void>;
  findById(tenantId: string, id: string): Promise<Scenario | null>;
  findAll(tenantId: string): Promise<Scenario[]>;
  findByCategory(tenantId: string, category: string): Promise<Scenario[]>;
  update(tenantId: string, id: string, patch: Partial<Scenario>): Promise<void>;
  search(criteria: ScenarioSearchCriteria): Promise<ScenarioSearchResult>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IValidationRepository {
  insertRun(run: ValidationRun): Promise<void>;
  findRunById(tenantId: string, id: string): Promise<ValidationRun | null>;
  updateRun(tenantId: string, id: string, patch: Partial<ValidationRun>): Promise<void>;
  listRuns(tenantId: string, limit?: number): Promise<ValidationRun[]>;
  insertResult(result: ValidationResult): Promise<void>;
  findResultsByRun(tenantId: string, runId: string): Promise<ValidationResult[]>;
  findResultsByScenario(tenantId: string, scenarioId: string): Promise<ValidationResult[]>;
}

export interface IReportRepository {
  insert(report: ValidationReport): Promise<void>;
  findById(tenantId: string, id: string): Promise<ValidationReport | null>;
  findByRun(tenantId: string, runId: string): Promise<ValidationReport | null>;
  listByTenant(tenantId: string, limit?: number): Promise<ValidationReport[]>;
}

export interface IMetricsRepository {
  insert(metrics: ValidationMetrics & { id: string; tenantId: string; runId: string; createdAt: string }): Promise<void>;
  findByTenant(tenantId: string, limit?: number): Promise<(ValidationMetrics & { id: string; tenantId: string; runId: string; createdAt: string })[]>;
}

export interface ICertificationRepository {
  insert(cert: Certification): Promise<void>;
  findById(tenantId: string, id: string): Promise<Certification | null>;
  findByEngine(tenantId: string, engineId: string): Promise<Certification[]>;
  update(tenantId: string, id: string, patch: Partial<Certification>): Promise<void>;
}

export interface IValidationAuditRepository {
  insert(record: Omit<ValidationAuditRecord, 'id' | 'createdAt'>): Promise<ValidationAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<ValidationAuditRecord[]>;
  findByRun(tenantId: string, runId: string, limit?: number): Promise<ValidationAuditRecord[]>;
}

export { type Result, type EventEnvelope };
