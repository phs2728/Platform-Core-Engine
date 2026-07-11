/**
 * In-Memory API Snapshot Store
 *
 * Stores baseline API snapshots for comparison.
 * In production, this would persist to a file; for tests, in-memory.
 */

import type {
  ApiSnapshot,
  IApiSnapshotStore,
} from '../interfaces/index.js';

export class InMemoryApiSnapshotStore implements IApiSnapshotStore {
  private store = new Map<string, ApiSnapshot>();

  async getBaseline(engineId: string): Promise<ApiSnapshot | null> {
    return this.store.get(engineId) ?? null;
  }

  async saveBaseline(engineId: string, snapshot: ApiSnapshot): Promise<void> {
    this.store.set(engineId, snapshot);
  }

  async listAll(): Promise<ApiSnapshot[]> {
    return [...this.store.values()].sort((a, b) => a.engineId.localeCompare(b.engineId));
  }

  clear(): void {
    this.store.clear();
  }
}
