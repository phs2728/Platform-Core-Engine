#!/usr/bin/env tsx
/**
 * Platform Compatibility Suite — CLI: Full Platform Scan
 *
 * Usage: pnpm platform:compat
 *
 * Runs the full scan: events, references, dependencies, APIs, contracts,
 * compatibility matrix, event graph, health scores, release reports,
 * platform readiness, and writes all 8 markdown reports to docs/platform/.
 */

import {
  FileSystemEngineManifestLoader,
  InMemoryResultStore,
  InMemoryApiSnapshotStore,
  FileSystemReportWriter,
  runFullPlatformScanUseCase,
  generateReleaseReportsUseCase,
  generateAllReports,
} from '../src/index.js';

async function main(): Promise<void> {
  const rootDir = process.env.PLATFORM_REPO_ROOT ?? process.cwd();
  console.log('═══════════════════════════════════════════════════');
  console.log('  Platform Compatibility Suite — Full Platform Scan');
  console.log('═══════════════════════════════════════════════════\n');

  const manifestLoader = new FileSystemEngineManifestLoader(rootDir);
  const resultStore = new InMemoryResultStore();
  const snapshotStore = new InMemoryApiSnapshotStore();
  const reportWriter = new FileSystemReportWriter(`${rootDir}/docs/platform`);

  const deps = { manifestLoader, resultStore, snapshotStore, reportWriter };

  console.log('  ⏳ Running full platform scan...\n');

  const scanResult = await runFullPlatformScanUseCase(deps);
  if (!scanResult.ok) {
    console.error('  ❌ Scan failed:', scanResult.error);
    process.exit(1);
  }

  const readiness = scanResult.value;
  console.log('  ✅ Scan completed.\n');

  // Generate release reports
  const releaseResult = await generateReleaseReportsUseCase(deps);
  const releaseReports = releaseResult.ok ? releaseResult.value : [];

  // Generate all 8 reports
  await generateAllReports(reportWriter, {
    contracts: await resultStore.getContractResults(),
    events: await resultStore.getEventResults(),
    references: await resultStore.getReferenceResults(),
    dependency: (await resultStore.getDependencyResult())!,
    apiDiffs: await resultStore.getApiDiffResults(),
    healthScores: await resultStore.getHealthScores(),
    matrix: (await resultStore.getCompatibilityMatrix())!,
    eventGraph: await resultStore.getEventGraph(),
    releaseReports,
    readiness,
  });

  // Print summary
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │            PLATFORM READINESS                │');
  console.log('  ├─────────────────────────────────────────────┤');
  console.log(`  │  Status:           ${readiness.status.padEnd(25)}│`);
  console.log(`  │  Total Engines:    ${String(readiness.totalEngines).padEnd(25)}│`);
  console.log(`  │  Compatibility:    ${(readiness.compatibilityPercent + '%').padEnd(25)}│`);
  console.log(`  │  Broken Contracts: ${String(readiness.brokenContracts).padEnd(25)}│`);
  console.log(`  │  Breaking Changes: ${String(readiness.breakingChanges).padEnd(25)}│`);
  console.log(`  │  Warnings:         ${String(readiness.warnings).padEnd(25)}│`);
  console.log(`  │  Avg Health:       ${(readiness.averageHealthScore + '/100').padEnd(25)}│`);
  console.log(`  │  Public APIs:      ${String(readiness.totalPublicApis).padEnd(25)}│`);
  console.log(`  │  Events:           ${String(readiness.totalEvents).padEnd(25)}│`);
  console.log(`  │  References:       ${String(readiness.totalReferences).padEnd(25)}│`);
  console.log('  └─────────────────────────────────────────────┘');
  console.log('');
  console.log(`  📄 Reports written to: ${reportWriter.getReportDir()}/`);
  console.log('');

  // Print health scores
  const health = await resultStore.getHealthScores();
  if (health.length > 0) {
    console.log('  Engine Health Scores:');
    for (const h of health) {
      const bar = '█'.repeat(Math.floor(h.score / 10)) + '░'.repeat(10 - Math.floor(h.score / 10));
      console.log(`    ${h.engineId.padEnd(20)} ${bar} ${h.score}/100 (${h.grade})`);
    }
    console.log('');
  }

  if (readiness.totalEngines === 0 || readiness.totalPublicApis === 0 || readiness.totalEvents === 0) {
    console.error('  ❌ Manifest discovery failed: engines, public APIs, and events are required.');
    process.exit(1);
  }

  if (readiness.status === 'FAIL') {
    console.log('  ❌ Platform has critical issues. Merge NOT recommended.');
    process.exit(1);
  } else if (readiness.status === 'WARNING') {
    console.log('  ⚠️  Platform has warnings. Review before merge.');
    process.exit(0);
  } else {
    console.log('  ✅ Platform is READY. Merge approved.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
