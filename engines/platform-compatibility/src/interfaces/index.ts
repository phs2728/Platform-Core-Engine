/**
 * Platform Compatibility Suite — Core Types & Interfaces
 *
 * 사장님 확립 (2026-07-11): "Platform이 커질수록 Engine 간 계약(Contract)이
 * 깨지는 것이 더 위험합니다. 호환성과 품질을 자동 검증하는 QA Engine을 만드세요."
 *
 * This engine reads engine.json manifests from all engines in the monorepo
 * and validates contracts, events, references, APIs, dependencies, and
 * produces compatibility matrices, health scores, and release reports.
 *
 * NO BUSINESS LOGIC. QA ONLY.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Engine Manifest (parsed from engine.json)
// ═══════════════════════════════════════════

export interface EngineManifest {
  id: string;
  name: string;
  version: string;
  phase: number;
  status?: string;
  description?: string;
  depends_on: string[];
  provides: string[];
  events_emitted: string[];
  events_subscribed: string[];
  strict_boundaries?: {
    owns: string[];
    forbidden: string[];
  };
}

// ═══════════════════════════════════════════
// Contract Types
// ═══════════════════════════════════════════

export type ContractType =
  | 'event' | 'reference' | 'api' | 'schema' | 'dependency';

export type Severity = 'critical' | 'warning' | 'info';

export interface ContractViolation {
  engineId: string;
  contractType: ContractType;
  severity: Severity;
  rule: string;
  message: string;
  detail?: Record<string, unknown>;
}

export interface ContractResult {
  engineId: string;
  passed: boolean;
  violations: ContractViolation[];
  checkedAt: string;
}

// ═══════════════════════════════════════════
// Event Contract Types
// ═══════════════════════════════════════════

export interface EventContract {
  eventType: string;
  engineId: string;          // publisher
  version: string;
  schemaRef: string;
  subscribers: string[];     // engine IDs that subscribe
}

export interface EventContractResult {
  eventType: string;
  publisher: string;
  subscribers: string[];
  hasPublisher: boolean;
  hasSubscribers: boolean;
  orphanedSubscribers: string[];   // subscribe to non-existent event
  status: 'pass' | 'fail' | 'warning';
}

// ═══════════════════════════════════════════
// Reference Contract Types
// ═══════════════════════════════════════════

export interface ReferenceContract {
  refType: string;           // e.g., 'CatalogReference', 'UserReference'
  ownerEngine: string;
  consumerEngines: string[];
  requiredFields: string[];
}

export interface ReferenceContractResult {
  refType: string;
  ownerEngine: string;
  consumerEngines: string[];
  ownerExists: boolean;
  status: 'pass' | 'fail' | 'warning';
}

// ═══════════════════════════════════════════
// API / Public Surface Types
// ═══════════════════════════════════════════

export interface ApiSnapshot {
  engineId: string;
  capturedAt: string;
  exports: string[];             // sorted export names
  exportCount: number;
  hash: string;                  // deterministic hash
}

export interface ApiDiffEntry {
  engineId: string;
  kind: 'added' | 'removed' | 'changed';
  exportName: string;
  detail: string;
  breaking: boolean;
}

export interface ApiDiffResult {
  engineId: string;
  baseline: ApiSnapshot | null;
  current: ApiSnapshot;
  diffs: ApiDiffEntry[];
  hasBreakingChange: boolean;
}

// ═══════════════════════════════════════════
// Dependency / Boundary Types
// ═══════════════════════════════════════════

export interface DependencyEdge {
  from: string;
  to: string;
  declared: boolean;       // declared in engine.json depends_on
}

export interface DependencyResult {
  edges: DependencyEdge[];
  cycles: string[][];       // array of cycles, each cycle is engine IDs
  forbiddenImports: Array<{ engine: string; imports: string[] }>;
  layerViolations: Array<{ engine: string; layer: string; detail: string }>;
  status: 'pass' | 'fail' | 'warning';
}

// ═══════════════════════════════════════════
// Compatibility Matrix Types
// ═══════════════════════════════════════════

export interface CompatibilityCell {
  from: string;
  to: string;
  relation: 'depends' | 'event' | 'reference' | 'none';
  status: 'pass' | 'fail' | 'warning' | 'n/a';
  detail: string;
}

export interface CompatibilityMatrix {
  engines: string[];
  cells: CompatibilityCell[][];
  generatedAt: string;
}

// ═══════════════════════════════════════════
// Health Score Types
// ═══════════════════════════════════════════

export interface EngineHealthScore {
  engineId: string;
  score: number;              // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: HealthFactor[];
}

export interface HealthFactor {
  name: string;
  maxPoints: number;
  earnedPoints: number;
  detail: string;
}

// ═══════════════════════════════════════════
// Release / Certification Types
// ═══════════════════════════════════════════

export type ReleaseStatus = 'PASS' | 'FAIL' | 'WARNING';

export interface ReleaseReport {
  engineId: string;
  version: string;
  status: ReleaseStatus;
  checks: ReleaseCheck[];
  summary: string;
  generatedAt: string;
}

export interface ReleaseCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
}

// ═══════════════════════════════════════════
// Platform Readiness (aggregate)
// ═══════════════════════════════════════════

export interface PlatformReadiness {
  totalEngines: number;
  compatibilityPercent: number;
  brokenContracts: number;
  breakingChanges: number;
  warnings: number;
  totalPublicApis: number;
  totalEvents: number;
  totalReferences: number;
  averageHealthScore: number;
  status: ReleaseStatus;
  generatedAt: string;
}

// ═══════════════════════════════════════════
// Event Graph
// ═══════════════════════════════════════════

export interface EventGraphEdge {
  eventType: string;
  publisher: string;
  subscriber: string;
}

export interface EventGraph {
  nodes: string[];           // engine IDs
  edges: EventGraphEdge[];
}

// ═══════════════════════════════════════════
// Port Interfaces (3-Layer DI)
// ═══════════════════════════════════════════

export interface IEngineManifestLoader {
  loadAll(): Promise<EngineManifest[]>;
  loadById(engineId: string): Promise<EngineManifest | null>;
}

export interface IApiSnapshotStore {
  getBaseline(engineId: string): Promise<ApiSnapshot | null>;
  saveBaseline(engineId: string, snapshot: ApiSnapshot): Promise<void>;
  listAll(): Promise<ApiSnapshot[]>;
}

export interface IReportWriter {
  writeReport(filename: string, content: string): Promise<void>;
  getReportDir(): string;
}

export interface ICompatibilityResultStore {
  saveContractResults(results: ContractResult[]): Promise<void>;
  getContractResults(): Promise<ContractResult[]>;
  saveEventResults(results: EventContractResult[]): Promise<void>;
  getEventResults(): Promise<EventContractResult[]>;
  saveReferenceResults(results: ReferenceContractResult[]): Promise<void>;
  getReferenceResults(): Promise<ReferenceContractResult[]>;
  saveDependencyResult(result: DependencyResult): Promise<void>;
  getDependencyResult(): Promise<DependencyResult | null>;
  saveApiDiffResults(results: ApiDiffResult[]): Promise<void>;
  getApiDiffResults(): Promise<ApiDiffResult[]>;
  saveHealthScores(scores: EngineHealthScore[]): Promise<void>;
  getHealthScores(): Promise<EngineHealthScore[]>;
  saveCompatibilityMatrix(matrix: CompatibilityMatrix): Promise<void>;
  getCompatibilityMatrix(): Promise<CompatibilityMatrix | null>;
  saveEventGraph(graph: EventGraph): Promise<void>;
  getEventGraph(): Promise<EventGraph | null>;
  savePlatformReadiness(readiness: PlatformReadiness): Promise<void>;
  getPlatformReadiness(): Promise<PlatformReadiness | null>;
  clear(): void;
}

export { type Result, type EventEnvelope };
