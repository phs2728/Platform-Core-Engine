/**
 * Report Generation Tests (8)
 */

import { describe, it, expect } from 'vitest';
import {
  generateCompatibilityReport,
  generateContractReport,
  generateDependencyReport,
  generateEventReport,
  generateReferenceReport,
  generateApiReport,
  generateReleaseReport as generateReleaseReportDoc,
  generateHealthReport,
  generateAllReports,
  InMemoryReportWriter,
} from '../src/index.js';
import { validateEventContracts, validateReferenceContracts, validateDependencies, aggregateContractResults, diffAllSnapshots, calculateAllHealthScores, generateReleaseReport, calculatePlatformReadiness, buildCompatibilityMatrix, buildEventGraph } from '../src/index.js';
import { sampleManifests } from './helpers.js';

function computeAll() {
  const manifests = sampleManifests();
  const events = validateEventContracts(manifests);
  const refs = validateReferenceContracts(manifests);
  const deps = validateDependencies(manifests);
  const apiDiffs = diffAllSnapshots(manifests, new Map(), '2026-07-11');
  const contracts = aggregateContractResults(manifests, events, refs, apiDiffs, deps);
  const healthScores = calculateAllHealthScores(manifests, contracts, events, refs, deps, apiDiffs);
  const matrix = buildCompatibilityMatrix(manifests, events, refs, deps);
  const graph = buildEventGraph(manifests, events);
  const releaseReports = manifests.map((m) => {
    const c = contracts.find((x) => x.engineId === m.id)!;
    const h = healthScores.find((x) => x.engineId === m.id)!;
    return generateReleaseReport(m, c, deps, apiDiffs.find((a) => a.engineId === m.id), h);
  });
  const readiness = calculatePlatformReadiness(manifests, contracts, events, refs, deps, apiDiffs, healthScores, matrix);
  return { manifests, events, references: refs, dependency: deps, apiDiffs, contracts, healthScores, matrix, eventGraph: graph, releaseReports, readiness };
}

describe('Report Generation', () => {
  it('generates compatibility report with matrix and readiness', async () => {
    const data = computeAll();
    const writer = new InMemoryReportWriter();
    await generateCompatibilityReport(writer, data.matrix, data.readiness);
    const report = writer.getReport('compatibility-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('Platform Compatibility Report');
    expect(report).toContain('Platform Readiness');
    expect(report).toContain('Compatibility Matrix');
  });

  it('generates contract report with violations table', async () => {
    const data = computeAll();
    const writer = new InMemoryReportWriter();
    await generateContractReport(writer, data.contracts);
    const report = writer.getReport('contract-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('Contract Report');
    expect(report).toContain('Per-Engine Contract Status');
  });

  it('generates dependency report with edges and cycles', async () => {
    const data = computeAll();
    const writer = new InMemoryReportWriter();
    await generateDependencyReport(writer, data.dependency);
    const report = writer.getReport('dependency-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('Dependency Report');
    expect(report).toContain('Dependency Edges');
    expect(report).toContain('No Circular Dependencies');
  });

  it('generates event report with contract status and flow graph', async () => {
    const data = computeAll();
    const writer = new InMemoryReportWriter();
    await generateEventReport(writer, data.events, data.eventGraph);
    const report = writer.getReport('event-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('Event Report');
    expect(report).toContain('Event Contract Status');
    // Event flow graph only appears if graph has edges
    if (data.eventGraph && data.eventGraph.edges.length > 0) {
      expect(report).toContain('Event Flow Graph');
    }
  });

  it('generates reference report with ownership table', async () => {
    const data = computeAll();
    const writer = new InMemoryReportWriter();
    await generateReferenceReport(writer, data.references);
    const report = writer.getReport('reference-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('Reference Report');
    expect(report).toContain('Reference Contract Status');
  });

  it('generates API report with diffs', async () => {
    const data = computeAll();
    const writer = new InMemoryReportWriter();
    await generateApiReport(writer, data.apiDiffs);
    const report = writer.getReport('api-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('API Report');
    expect(report).toContain('API Snapshot Diffs');
  });

  it('generates health report with scores and factors', async () => {
    const data = computeAll();
    const writer = new InMemoryReportWriter();
    await generateHealthReport(writer, data.healthScores, data.readiness);
    const report = writer.getReport('health-report.md');
    expect(report).toBeDefined();
    expect(report).toContain('Health Report');
    expect(report).toContain('Engine Health Scores');
    expect(report).toContain('Factor Breakdown');
  });

  it('generates all 8 reports via generateAllReports', async () => {
    const data = computeAll();
    const writer = new InMemoryReportWriter();
    await generateAllReports(writer, data);
    const filenames = writer.getFilenames();
    expect(filenames.length).toBe(8);
    expect(filenames).toContain('compatibility-report.md');
    expect(filenames).toContain('contract-report.md');
    expect(filenames).toContain('dependency-report.md');
    expect(filenames).toContain('event-report.md');
    expect(filenames).toContain('reference-report.md');
    expect(filenames).toContain('api-report.md');
    expect(filenames).toContain('release-report.md');
    expect(filenames).toContain('health-report.md');
  });
});
