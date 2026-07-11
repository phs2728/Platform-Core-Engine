/**
 * API Snapshot & Diff Tests (10)
 */

import { describe, it, expect } from 'vitest';
import {
  captureSnapshot,
  captureAllSnapshots,
  diffSnapshots,
  diffAllSnapshots,
  hashExports,
  runApiValidationUseCase,
} from '../src/index.js';
import type { EngineManifest, ApiSnapshot } from '../src/interfaces/index.js';
import { sampleManifests, makeDeps } from './helpers.js';

describe('API Snapshots & Diffs', () => {
  const manifests = sampleManifests();
  const now = '2026-07-11T10:00:00.000Z';

  it('hashes exports deterministically', () => {
    const h1 = hashExports(['a', 'b', 'c']);
    const h2 = hashExports(['c', 'b', 'a']); // same content, different order
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^h[0-9a-f]{8}$/);
  });

  it('produces different hashes for different exports', () => {
    const h1 = hashExports(['a', 'b']);
    const h2 = hashExports(['a', 'c']);
    expect(h1).not.toBe(h2);
  });

  it('captures snapshot from manifest', () => {
    const manifest = manifests[0]!;
    const snap = captureSnapshot(manifest, now);
    expect(snap.engineId).toBe(manifest.id);
    expect(snap.exports).toEqual([...manifest.provides].sort());
    expect(snap.exportCount).toBe(manifest.provides.length);
    expect(snap.hash).toBeTruthy();
  });

  it('captures all snapshots sorted by engineId', () => {
    const snaps = captureAllSnapshots(manifests, now);
    expect(snaps.length).toBe(manifests.length);
    for (let i = 1; i < snaps.length; i++) {
      expect(snaps[i]!.engineId.localeCompare(snaps[i - 1]!.engineId)).toBeGreaterThanOrEqual(0);
    }
  });

  it('detects removed exports as breaking change', () => {
    const manifest = manifests.find((m) => m.id === 'user')!;
    const baseline: ApiSnapshot = {
      engineId: 'user',
      capturedAt: '2026-01-01',
      exports: [...manifest.provides, 'legacyExport'].sort(),
      exportCount: manifest.provides.length + 1,
      hash: hashExports([...manifest.provides, 'legacyExport']),
    };
    const current = captureSnapshot(manifest, now);
    const result = diffSnapshots('user', baseline, current);
    expect(result.hasBreakingChange).toBe(true);
    const removed = result.diffs.find((d) => d.kind === 'removed');
    expect(removed?.exportName).toBe('legacyExport');
    expect(removed?.breaking).toBe(true);
  });

  it('detects added exports as non-breaking', () => {
    const manifest = manifests.find((m) => m.id === 'user')!;
    const baseline: ApiSnapshot = {
      engineId: 'user',
      capturedAt: '2026-01-01',
      exports: ['createUser'].sort(),
      exportCount: 1,
      hash: hashExports(['createUser']),
    };
    const current = captureSnapshot(manifest, now);
    const result = diffSnapshots('user', baseline, current);
    expect(result.hasBreakingChange).toBe(false);
    const added = result.diffs.filter((d) => d.kind === 'added');
    expect(added.length).toBeGreaterThan(0);
  });

  it('reports no diffs when exports are identical', () => {
    const manifest = manifests.find((m) => m.id === 'user')!;
    const snap = captureSnapshot(manifest, now);
    const result = diffSnapshots('user', snap, snap);
    expect(result.diffs).toHaveLength(0);
    expect(result.hasBreakingChange).toBe(false);
  });

  it('handles null baseline (first snapshot)', () => {
    const manifest = manifests.find((m) => m.id === 'user')!;
    const current = captureSnapshot(manifest, now);
    const result = diffSnapshots('user', null, current);
    expect(result.hasBreakingChange).toBe(false);
    expect(result.diffs.length).toBe(current.exportCount);
    expect(result.diffs.every((d) => d.kind === 'added')).toBe(true);
  });

  it('diffs all snapshots against stored baselines', () => {
    const baselines = new Map<string, ApiSnapshot>();
    // Set a baseline with an extra export for identity → breaking
    const idManifest = manifests.find((m) => m.id === 'identity')!;
    baselines.set('identity', {
      engineId: 'identity',
      capturedAt: '2026-01-01',
      exports: [...idManifest.provides, 'oldExport'].sort(),
      exportCount: idManifest.provides.length + 1,
      hash: hashExports([...idManifest.provides, 'oldExport']),
    });
    const results = diffAllSnapshots(manifests, baselines, now);
    expect(results.length).toBe(manifests.length);
    const idDiff = results.find((r) => r.engineId === 'identity');
    expect(idDiff?.hasBreakingChange).toBe(true);
  });

  it('runs API validation use case and saves baselines', async () => {
    const deps = makeDeps(manifests);
    const r = await runApiValidationUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBe(manifests.length);
    }
    // Baselines should now be saved
    const baselines = await deps._snapshotStore.listAll();
    expect(baselines.length).toBe(manifests.length);
  });
});
