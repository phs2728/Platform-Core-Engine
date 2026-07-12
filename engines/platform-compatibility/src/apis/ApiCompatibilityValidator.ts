/**
 * API Compatibility Validator
 *
 * Captures public API snapshots from engine manifests (the `provides` array)
 * and compares them against baselines to detect breaking changes.
 */

import type {
  EngineManifest,
  ApiSnapshot,
  ApiDiffEntry,
  ApiDiffResult,
} from '../interfaces/index.js';

/**
 * Create a deterministic hash of the export list.
 */
export function hashExports(exports: string[]): string {
  const sorted = [...exports].sort();
  let hash = 0;
  const str = sorted.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `h${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Capture an API snapshot from an engine manifest.
 */
export function captureSnapshot(
  manifest: EngineManifest,
  capturedAt: string,
): ApiSnapshot {
  const exports = [...manifest.provides].sort();
  return {
    engineId: manifest.id,
    capturedAt,
    exports,
    exportCount: exports.length,
    hash: hashExports(exports),
  };
}

/**
 * Capture snapshots for all engines.
 */
export function captureAllSnapshots(
  manifests: EngineManifest[],
  capturedAt: string,
): ApiSnapshot[] {
  return manifests
    .map((m) => captureSnapshot(m, capturedAt))
    .sort((a, b) => a.engineId.localeCompare(b.engineId));
}

/**
 * Diff a baseline snapshot against a current snapshot.
 * Detects: added exports (non-breaking), removed exports (breaking).
 */
export function diffSnapshots(
  engineId: string,
  baseline: ApiSnapshot | null,
  current: ApiSnapshot,
): ApiDiffResult {
  const diffs: ApiDiffEntry[] = [];

  if (baseline) {
    const baselineSet = new Set(baseline.exports);
    const currentSet = new Set(current.exports);

    // Removed = breaking
    for (const exp of baseline.exports) {
      if (!currentSet.has(exp)) {
        diffs.push({
          engineId,
          kind: 'removed',
          exportName: exp,
          detail: `Export "${exp}" was removed`,
          breaking: true,
        });
      }
    }

    // Added = non-breaking
    for (const exp of current.exports) {
      if (!baselineSet.has(exp)) {
        diffs.push({
          engineId,
          kind: 'added',
          exportName: exp,
          detail: `Export "${exp}" was added`,
          breaking: false,
        });
      }
    }

    // Hash changed = something changed
    if (baseline.hash !== current.hash && diffs.length === 0) {
      diffs.push({
        engineId,
        kind: 'changed',
        exportName: '*',
        detail: `API hash changed (${baseline.hash} → ${current.hash}) but no individual diffs detected`,
        breaking: false,
      });
    }
  } else {
    // No baseline — all exports are "added" (first snapshot)
    for (const exp of current.exports) {
      diffs.push({
        engineId,
        kind: 'added',
        exportName: exp,
        detail: `Export "${exp}" captured for the first time`,
        breaking: false,
      });
    }
  }

  const hasBreakingChange = diffs.some((d) => d.breaking);

  return {
    engineId,
    baseline,
    current,
    diffs,
    hasBreakingChange,
  };
}

/**
 * Diff all engine snapshots against stored baselines.
 */
export function diffAllSnapshots(
  manifests: EngineManifest[],
  baselines: Map<string, ApiSnapshot>,
  capturedAt: string,
): ApiDiffResult[] {
  const results: ApiDiffResult[] = [];

  for (const m of manifests) {
    const current = captureSnapshot(m, capturedAt);
    const baseline = baselines.get(m.id) ?? null;
    results.push(diffSnapshots(m.id, baseline, current));
  }

  return results.sort((a, b) => a.engineId.localeCompare(b.engineId));
}
