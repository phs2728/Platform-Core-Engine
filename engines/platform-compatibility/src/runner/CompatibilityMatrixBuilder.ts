/**
 * Compatibility Matrix Builder
 *
 * Generates a matrix showing the relationship between every pair of engines.
 */

import type {
  EngineManifest,
  CompatibilityMatrix,
  CompatibilityCell,
  EventGraph,
  EventGraphEdge,
  DependencyResult,
} from '../interfaces/index.js';

/**
 * Build the compatibility matrix.
 * For each (from, to) pair, determine the relationship and status.
 */
export function buildCompatibilityMatrix(
  manifests: EngineManifest[],
  eventResults: { eventType: string; publisher: string; subscribers: string[]; status: string }[],
  referenceResults: { refType: string; ownerEngine: string; consumerEngines: string[]; status: string }[],
  dependencyResult: DependencyResult,
): CompatibilityMatrix {
  const engineIds = manifests.map((m) => m.id).sort();
  const now = new Date().toISOString();

  // Build lookup maps
  const depMap = new Map<string, Set<string>>();
  for (const m of manifests) {
    depMap.set(m.id, new Set(m.depends_on));
  }

  const eventEdges = new Map<string, { status: string; detail: string }>();
  for (const er of eventResults) {
    for (const sub of er.subscribers) {
      eventEdges.set(`${sub}→${er.publisher}`, {
        status: er.status,
        detail: er.eventType,
      });
    }
  }

  const refEdges = new Map<string, { status: string; detail: string }>();
  for (const rr of referenceResults) {
    for (const consumer of rr.consumerEngines) {
      refEdges.set(`${consumer}→${rr.ownerEngine}`, {
        status: rr.status,
        detail: rr.refType,
      });
    }
  }

  const cyclePairs = new Set<string>();
  for (const cycle of dependencyResult.cycles) {
    for (let i = 0; i < cycle.length - 1; i++) {
      cyclePairs.add(`${cycle[i]}→${cycle[i + 1]}`);
    }
  }

  const cells: CompatibilityCell[][] = [];
  for (const from of engineIds) {
    const row: CompatibilityCell[] = [];
    for (const to of engineIds) {
      if (from === to) {
        row.push({ from, to, relation: 'none', status: 'n/a', detail: 'self' });
        continue;
      }

      const key = `${from}→${to}`;
      const deps = depMap.get(from);
      const isDep = deps?.has(to) ?? false;

      if (isDep) {
        const inCycle = cyclePairs.has(key);
        row.push({
          from, to,
          relation: 'depends',
          status: inCycle ? 'fail' : 'pass',
          detail: inCycle ? 'circular dependency' : 'declared dependency',
        });
      } else if (eventEdges.has(key)) {
        const ee = eventEdges.get(key)!;
        row.push({
          from, to,
          relation: 'event',
          status: ee.status === 'fail' ? 'fail' : ee.status === 'warning' ? 'warning' : 'pass',
          detail: `event: ${ee.detail}`,
        });
      } else if (refEdges.has(key)) {
        const re = refEdges.get(key)!;
        row.push({
          from, to,
          relation: 'reference',
          status: re.status === 'fail' ? 'fail' : 'pass',
          detail: `reference: ${re.detail}`,
        });
      } else {
        row.push({ from, to, relation: 'none', status: 'n/a', detail: 'no relation' });
      }
    }
    cells.push(row);
  }

  return { engines: engineIds, cells, generatedAt: now };
}

/**
 * Build the event flow graph (publisher → subscriber edges).
 */
export function buildEventGraph(
  manifests: EngineManifest[],
  eventResults: { eventType: string; publisher: string; subscribers: string[] }[],
): EventGraph {
  const nodes = manifests.map((m) => m.id).sort();
  const edges: EventGraphEdge[] = [];

  for (const er of eventResults) {
    for (const sub of er.subscribers) {
      edges.push({
        eventType: er.eventType,
        publisher: er.publisher,
        subscriber: sub,
      });
    }
  }

  edges.sort((a, b) => {
    const cmp = a.publisher.localeCompare(b.publisher);
    if (cmp !== 0) return cmp;
    return a.subscriber.localeCompare(b.subscriber);
  });

  return { nodes, edges };
}
