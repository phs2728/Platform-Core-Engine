/**
 * Compatibility Suite — Use Case Deps
 */

import type {
  IEngineManifestLoader,
  IApiSnapshotStore,
  IReportWriter,
  ICompatibilityResultStore,
} from '../interfaces/index.js';

export interface CompatibilitySuiteDeps {
  manifestLoader: IEngineManifestLoader;
  snapshotStore: IApiSnapshotStore;
  resultStore: ICompatibilityResultStore;
  reportWriter: IReportWriter;
}
