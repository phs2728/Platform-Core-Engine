#!/usr/bin/env tsx
/** Generate GuardianInput from repository metadata and run Guardian. */
import { FileSystemEngineManifestLoader, InMemoryResultStore, InMemoryApiSnapshotStore, InMemoryReportWriter, runFullPlatformScanUseCase } from '../../platform-compatibility/src/index.js';
import { CompatibilitySuiteBridge, FileSystemGuardianReportWriter, runFullGuardianScanWithReportsUseCase } from '../src/index.js';
import type { EngineManifestSummary, ContractResultSummary, EventContractSummary, ReferenceContractSummary, DependencySummary, ApiDiffSummary, HealthScoreSummary, ReleaseReportSummary, PlatformReadinessSummary, CompatibilityMatrixSummary } from '../src/index.js';

const rootDir = process.env.PLATFORM_REPO_ROOT ?? process.cwd();
const loader = new FileSystemEngineManifestLoader(rootDir);
const resultStore = new InMemoryResultStore();
const snapshotStore = new InMemoryApiSnapshotStore();
const reportWriter = new InMemoryReportWriter();
const scan = await runFullPlatformScanUseCase({ manifestLoader: loader, resultStore, snapshotStore, reportWriter });
if (!scan.ok) {
  console.error(scan.error.message);
  process.exit(1);
}
const manifests = await loader.loadAll();
if (manifests.length === 0 || manifests.reduce((n, m) => n + m.provides.length, 0) === 0 || manifests.reduce((n, m) => n + m.events_emitted.length, 0) === 0) {
  console.error('Manifest discovery failed: GuardianInput cannot be generated.');
  process.exit(1);
}
const guardianInput = {
  manifests: manifests as EngineManifestSummary[],
  contractResults: await resultStore.getContractResults() as ContractResultSummary[],
  eventResults: await resultStore.getEventResults() as EventContractSummary[],
  referenceResults: await resultStore.getReferenceResults() as ReferenceContractSummary[],
  dependencyResult: await resultStore.getDependencyResult() as DependencySummary | null,
  apiDiffResults: await resultStore.getApiDiffResults() as ApiDiffSummary[],
  healthScores: await resultStore.getHealthScores() as HealthScoreSummary[],
  releaseReports: [],
  platformReadiness: scan.value as PlatformReadinessSummary,
  compatibilityMatrix: await resultStore.getCompatibilityMatrix() as CompatibilityMatrixSummary | null,
};
const guardian = await runFullGuardianScanWithReportsUseCase({ inputProvider: new CompatibilitySuiteBridge(guardianInput), reportWriter: new FileSystemGuardianReportWriter(`${rootDir}/docs/platform-guardian`) });
if (!guardian.ok) {
  console.error(guardian.error.message);
  process.exit(1);
}
console.log(JSON.stringify({ decision: guardian.value.audit.decision.decision, canMerge: guardian.value.audit.decision.canMerge, score: guardian.value.audit.score.overall, engines: guardian.value.audit.inputSnapshot.totalEngines }, null, 2));
process.exit(guardian.value.audit.decision.canMerge ? 0 : 1);
