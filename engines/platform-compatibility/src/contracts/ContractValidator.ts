/**
 * Contract Validator — Aggregates all contract checks per engine.
 *
 * Combines event, reference, API, and dependency validation results
 * into a per-engine ContractResult.
 */

import type {
  EngineManifest,
  ContractResult,
  ContractViolation,
  EventContractResult,
  ReferenceContractResult,
  ApiDiffResult,
  DependencyResult,
} from '../interfaces/index.js';

/**
 * Aggregate all validation results into per-engine contract results.
 */
export function aggregateContractResults(
  manifests: EngineManifest[],
  eventResults: EventContractResult[],
  referenceResults: ReferenceContractResult[],
  apiDiffResults: ApiDiffResult[],
  dependencyResult: DependencyResult,
): ContractResult[] {
  const now = new Date().toISOString();
  const violationsByEngine = new Map<string, ContractViolation[]>();

  function addViolation(engineId: string, v: ContractViolation): void {
    const list = violationsByEngine.get(engineId) ?? [];
    list.push(v);
    violationsByEngine.set(engineId, list);
  }

  // Event violations
  for (const er of eventResults) {
    if (er.status === 'fail') {
      addViolation(er.publisher || '_unknown', {
        engineId: er.publisher || '_unknown',
        contractType: 'event',
        severity: 'critical',
        rule: 'event.orphan_subscriber',
        message: `Event "${er.eventType}" has ${er.orphanedSubscribers.length} subscriber(s) but no publisher`,
        detail: { orphanedSubscribers: er.orphanedSubscribers },
      });
    }
    for (const sub of er.orphanedSubscribers) {
      addViolation(sub, {
        engineId: sub,
        contractType: 'event',
        severity: 'critical',
        rule: 'event.subscribe_missing',
        message: `Engine subscribes to "${er.eventType}" which has no publisher`,
        detail: { eventType: er.eventType },
      });
    }
  }

  // Reference violations
  for (const rr of referenceResults) {
    if (!rr.ownerExists) {
      addViolation(rr.refType, {
        engineId: rr.ownerEngine,
        contractType: 'reference',
        severity: 'critical',
        rule: 'reference.owner_missing',
        message: `Reference type "${rr.refType}" owner engine "${rr.ownerEngine}" does not exist`,
        detail: { refType: rr.refType, ownerEngine: rr.ownerEngine },
      });
    }
  }

  // API breaking changes
  for (const ar of apiDiffResults) {
    if (ar.hasBreakingChange) {
      for (const d of ar.diffs) {
        if (d.breaking) {
          addViolation(ar.engineId, {
            engineId: ar.engineId,
            contractType: 'api',
            severity: 'critical',
            rule: 'api.breaking_change',
            message: d.detail,
            detail: { exportName: d.exportName, kind: d.kind },
          });
        }
      }
    }
  }

  // Dependency violations
  for (const cycle of dependencyResult.cycles) {
    for (const engineId of cycle) {
      addViolation(engineId, {
        engineId,
        contractType: 'dependency',
        severity: 'critical',
        rule: 'dependency.circular',
        message: `Circular dependency detected: ${cycle.join(' → ')}`,
        detail: { cycle },
      });
    }
  }

  for (const fi of dependencyResult.forbiddenImports) {
    addViolation(fi.engine, {
      engineId: fi.engine,
      contractType: 'dependency',
      severity: 'critical',
      rule: 'dependency.forbidden_import',
      message: `Engine depends on unknown engine(s): ${fi.imports.join(', ')}`,
      detail: { imports: fi.imports },
    });
  }

  for (const lv of dependencyResult.layerViolations) {
    addViolation(lv.engine, {
      engineId: lv.engine,
      contractType: 'dependency',
      severity: 'warning',
      rule: 'dependency.layer_violation',
      message: lv.detail,
      detail: { layer: lv.layer },
    });
  }

  // Build per-engine results
  const results: ContractResult[] = [];
  for (const m of manifests) {
    const violations = violationsByEngine.get(m.id) ?? [];
    results.push({
      engineId: m.id,
      passed: violations.filter((v) => v.severity === 'critical').length === 0,
      violations,
      checkedAt: now,
    });
  }

  return results.sort((a, b) => a.engineId.localeCompare(b.engineId));
}
