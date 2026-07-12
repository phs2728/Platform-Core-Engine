/**
 * In-Memory Compatibility Result Store
 *
 * Stores all validation results in memory for the duration of a run.
 * Used by use-cases and tests.
 */

import type {
  ContractResult,
  EventContractResult,
  ReferenceContractResult,
  DependencyResult,
  ApiDiffResult,
  EngineHealthScore,
  CompatibilityMatrix,
  EventGraph,
  PlatformReadiness,
  ICompatibilityResultStore,
} from '../interfaces/index.js';

export class InMemoryResultStore implements ICompatibilityResultStore {
  private _contracts: ContractResult[] = [];
  private _events: EventContractResult[] = [];
  private _references: ReferenceContractResult[] = [];
  private _dependency: DependencyResult | null = null;
  private _apiDiffs: ApiDiffResult[] = [];
  private _health: EngineHealthScore[] = [];
  private _matrix: CompatibilityMatrix | null = null;
  private _eventGraph: EventGraph | null = null;
  private _readiness: PlatformReadiness | null = null;

  async saveContractResults(results: ContractResult[]): Promise<void> { this._contracts = results; }
  getContractResults(): Promise<ContractResult[]> { return Promise.resolve(this._contracts); }

  async saveEventResults(results: EventContractResult[]): Promise<void> { this._events = results; }
  getEventResults(): Promise<EventContractResult[]> { return Promise.resolve(this._events); }

  async saveReferenceResults(results: ReferenceContractResult[]): Promise<void> { this._references = results; }
  getReferenceResults(): Promise<ReferenceContractResult[]> { return Promise.resolve(this._references); }

  async saveDependencyResult(result: DependencyResult): Promise<void> { this._dependency = result; }
  getDependencyResult(): Promise<DependencyResult | null> { return Promise.resolve(this._dependency); }

  async saveApiDiffResults(results: ApiDiffResult[]): Promise<void> { this._apiDiffs = results; }
  getApiDiffResults(): Promise<ApiDiffResult[]> { return Promise.resolve(this._apiDiffs); }

  async saveHealthScores(scores: EngineHealthScore[]): Promise<void> { this._health = scores; }
  getHealthScores(): Promise<EngineHealthScore[]> { return Promise.resolve(this._health); }

  async saveCompatibilityMatrix(matrix: CompatibilityMatrix): Promise<void> { this._matrix = matrix; }
  getCompatibilityMatrix(): Promise<CompatibilityMatrix | null> { return Promise.resolve(this._matrix); }

  async saveEventGraph(graph: EventGraph): Promise<void> { this._eventGraph = graph; }
  getEventGraph(): Promise<EventGraph | null> { return Promise.resolve(this._eventGraph); }

  async savePlatformReadiness(readiness: PlatformReadiness): Promise<void> { this._readiness = readiness; }
  getPlatformReadiness(): Promise<PlatformReadiness | null> { return Promise.resolve(this._readiness); }

  clear(): void {
    this._contracts = [];
    this._events = [];
    this._references = [];
    this._dependency = null;
    this._apiDiffs = [];
    this._health = [];
    this._matrix = null;
    this._eventGraph = null;
    this._readiness = null;
  }
}
