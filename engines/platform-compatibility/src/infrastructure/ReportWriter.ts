/**
 * Markdown Report Writer
 *
 * Writes reports to the filesystem or buffers them in memory (for testing).
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { IReportWriter } from '../interfaces/index.js';

export class FileSystemReportWriter implements IReportWriter {
  private readonly reportDir: string;

  constructor(reportDir?: string) {
    this.reportDir = reportDir ?? resolve(process.cwd(), 'docs', 'platform');
  }

  getReportDir(): string {
    return this.reportDir;
  }

  async writeReport(filename: string, content: string): Promise<void> {
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
    const fullPath = join(this.reportDir, filename);
    writeFileSync(fullPath, content, 'utf-8');
  }
}

/**
 * In-memory report writer — stores written reports in a Map.
 * Useful for testing report generation without touching the filesystem.
 */
export class InMemoryReportWriter implements IReportWriter {
  readonly reports = new Map<string, string>();

  getReportDir(): string {
    return '<memory>';
  }

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
