/**
 * File System Engine Manifest Loader
 *
 * Reads engine.json from each engine directory in the monorepo.
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  EngineManifest,
  IEngineManifestLoader,
} from '../interfaces/index.js';

/**
 * Load all engine.json manifests from engines/ directory.
 *
 * This implementation accepts manifests as a constructor argument
 * (for testing) or reads from the filesystem (for production/CLI).
 */
export class FileSystemEngineManifestLoader implements IEngineManifestLoader {
  private readonly rootDir: string;
  private readonly enginesDir: string;

  constructor(rootDir?: string) {
    this.rootDir = rootDir ?? resolve(process.cwd());
    this.enginesDir = join(this.rootDir, 'engines');
  }

  async loadAll(): Promise<EngineManifest[]> {
    if (!existsSync(this.enginesDir)) return [];

    const manifests: EngineManifest[] = [];
    const entries = readdirSync(this.enginesDir);

    for (const entry of entries) {
      const engineDir = join(this.enginesDir, entry);
      if (!statSync(engineDir).isDirectory()) continue;

      const manifestPath = join(engineDir, 'engine.json');
      if (!existsSync(manifestPath)) continue;

      try {
        const content = readFileSync(manifestPath, 'utf-8');
        const parsed = JSON.parse(content) as Partial<EngineManifest>;
        manifests.push(this.normalize(parsed));
      } catch {
        // Skip invalid engine.json
      }
    }

    return manifests.sort((a, b) => a.id.localeCompare(b.id));
  }

  async loadById(engineId: string): Promise<EngineManifest | null> {
    const all = await this.loadAll();
    return all.find((m) => m.id === engineId) ?? null;
  }

  async loadWithEvidence(): Promise<import('../interfaces/index.js').ManifestLoadResult> {
    const invalidManifestPaths: string[] = [];
    if (!existsSync(this.enginesDir)) {
      return { manifests: [], discovered: false, manifestCount: 0, invalidManifestPaths, rootDir: this.rootDir };
    }
    const manifests: EngineManifest[] = [];
    for (const entry of readdirSync(this.enginesDir)) {
      const engineDir = join(this.enginesDir, entry);
      if (!statSync(engineDir).isDirectory()) continue;
      const manifestPath = join(engineDir, 'engine.json');
      if (!existsSync(manifestPath)) continue;
      try {
        manifests.push(this.normalize(JSON.parse(readFileSync(manifestPath, 'utf-8')) as Partial<EngineManifest>));
      } catch {
        invalidManifestPaths.push(manifestPath);
      }
    }
    const sorted = manifests.sort((a, b) => a.id.localeCompare(b.id));
    return { manifests: sorted, discovered: sorted.length > 0 && invalidManifestPaths.length === 0,
      manifestCount: sorted.length, invalidManifestPaths, rootDir: this.rootDir };
  }

  private normalize(parsed: Partial<EngineManifest>): EngineManifest {
    const result: EngineManifest = {
      id: parsed.id ?? 'unknown',
      name: parsed.name ?? parsed.id ?? 'unknown',
      version: parsed.version ?? '0.0.0',
      phase: parsed.phase ?? 99,
      depends_on: parsed.depends_on ?? [],
      provides: parsed.provides ?? [],
      events_emitted: parsed.events_emitted ?? [],
      events_subscribed: parsed.events_subscribed ?? [],
    };
    if (parsed.status !== undefined) result.status = parsed.status;
    if (parsed.description !== undefined) result.description = parsed.description;
    if (parsed.strict_boundaries !== undefined) result.strict_boundaries = parsed.strict_boundaries;
    return result;
  }
}

/**
 * In-Memory manifest loader for testing.
 * Accepts a pre-built list of manifests.
 */
export class InMemoryManifestLoader implements IEngineManifestLoader {
  constructor(private readonly manifests: EngineManifest[]) {}

  async loadAll(): Promise<EngineManifest[]> {
    return [...this.manifests].sort((a, b) => a.id.localeCompare(b.id));
  }

  async loadById(engineId: string): Promise<EngineManifest | null> {
    return this.manifests.find((m) => m.id === engineId) ?? null;
  }
}
