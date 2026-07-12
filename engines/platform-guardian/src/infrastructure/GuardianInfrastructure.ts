/**
 * Guardian Input Providers
 *
 * Collects input from the Platform Compatibility Suite.
 * In production, reads from the Compatibility Suite's result store.
 * In tests, uses pre-built fixtures.
 */

import type {
  GuardianInput,
  IGuardianInputProvider,
  EngineManifestSummary,
  ContractResultSummary,
  EventContractSummary,
  ReferenceContractSummary,
  DependencySummary,
  ApiDiffSummary,
  HealthScoreSummary,
  ReleaseReportSummary,
  PlatformReadinessSummary,
  CompatibilityMatrixSummary,
} from '../interfaces/index.js';

/**
 * In-memory input provider for testing.
 */
export class InMemoryInputProvider implements IGuardianInputProvider {
  constructor(private readonly input: GuardianInput) {}

  async collect(): Promise<GuardianInput> {
    return this.input;
  }
}

/**
 * Compatibility Suite bridge — reads from the Compatibility Suite's
 * result store and converts to GuardianInput.
 *
 * This is the production adapter that connects the two engines.
 */
export class CompatibilitySuiteBridge implements IGuardianInputProvider {
  constructor(private readonly suite: {
    manifests: EngineManifestSummary[];
    contractResults: ContractResultSummary[];
    eventResults: EventContractSummary[];
    referenceResults: ReferenceContractSummary[];
    dependencyResult: DependencySummary | null;
    apiDiffResults: ApiDiffSummary[];
    healthScores: HealthScoreSummary[];
    releaseReports: ReleaseReportSummary[];
    platformReadiness: PlatformReadinessSummary | null;
    compatibilityMatrix: CompatibilityMatrixSummary | null;
  }) {}

  async collect(): Promise<GuardianInput> {
    return {
      manifests: this.suite.manifests,
      contractResults: this.suite.contractResults,
      eventResults: this.suite.eventResults,
      referenceResults: this.suite.referenceResults,
      dependencyResult: this.suite.dependencyResult,
      apiDiffResults: this.suite.apiDiffResults,
      healthScores: this.suite.healthScores,
      releaseReports: this.suite.releaseReports,
      platformReadiness: this.suite.platformReadiness,
      compatibilityMatrix: this.suite.compatibilityMatrix,
    };
  }
}

/**
 * Filesystem report writer for Guardian reports.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export class FileSystemGuardianReportWriter {
  private readonly reportDir: string;

  constructor(reportDir?: string) {
    this.reportDir = reportDir ?? resolve(process.cwd(), 'docs', 'platform');
  }

  async writeReport(filename: string, content: string): Promise<void> {
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
    writeFileSync(join(this.reportDir, filename), content, 'utf-8');
  }
}

/**
 * In-memory report writer for testing.
 */
export class InMemoryGuardianReportWriter {
  readonly reports = new Map<string, string>();

  async writeReport(filename: string, content: string): Promise<void> {
    this.reports.set(filename, content);
  }

  getReport(filename: string): string | undefined {
    return this.reports.get(filename);
  }

  getFilenames(): string[] {
    return [...this.reports.keys()].sort();
  }

  clear(): void {
    this.reports.clear();
  }
}
