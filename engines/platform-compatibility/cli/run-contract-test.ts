#!/usr/bin/env tsx
/** Run contract validation from repository metadata. */
import { FileSystemEngineManifestLoader, InMemoryResultStore, InMemoryApiSnapshotStore, InMemoryReportWriter, runContractValidationUseCase } from '../src/index.js';

const rootDir = process.env.PLATFORM_REPO_ROOT ?? process.cwd();
const loader = new FileSystemEngineManifestLoader(rootDir);
const resultStore = new InMemoryResultStore();
const snapshotStore = new InMemoryApiSnapshotStore();
const reportWriter = new InMemoryReportWriter();
const result = await runContractValidationUseCase({ manifestLoader: loader, resultStore, snapshotStore, reportWriter });
if (!result.ok) {
  console.error(result.error.message);
  process.exit(1);
}
const manifests = await loader.loadAll();
const apiCount = manifests.reduce((sum, manifest) => sum + manifest.provides.length, 0);
const eventCount = manifests.reduce((sum, manifest) => sum + manifest.events_emitted.length, 0);
if (manifests.length === 0 || apiCount === 0 || eventCount === 0) {
  console.error('Manifest discovery failed: engines, public APIs, and events are required.');
  process.exit(1);
}
const failed = result.value.filter((item) => !item.passed);
console.log(JSON.stringify({ status: failed.length === 0 ? 'PASS' : 'FAIL', engines: manifests.length, publicApis: apiCount, events: eventCount, failedContracts: failed.length }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
