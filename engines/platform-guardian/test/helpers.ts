/**
 * Test fixtures — Platform Guardian
 */

import type { GuardianInput } from '../src/interfaces/index.js';

/**
 * Clean platform — everything passes, no issues.
 */
export function cleanInput(): GuardianInput {
  return {
    manifests: [
      {
        id: 'core-sdk', name: 'Core SDK', version: '1.0.0', phase: 1,
        depends_on: ['policy', 'universal-core'],
        provides: ['ILogger', 'Result', 'ValidationError'],
        events_emitted: [],
        events_subscribed: [],
        strict_boundaries: {
          owns: ['Logger', 'Result', 'Validation', 'Error'],
          forbidden: ['Payment', 'Booking'],
        },
      },
      {
        id: 'policy', name: 'Policy', version: '1.0.0', phase: 1,
        depends_on: ['universal-core'],
        provides: ['IPolicyProvider'],
        events_emitted: ['policy.created'],
        events_subscribed: [],
        strict_boundaries: {
          owns: ['Policy', 'Config'],
          forbidden: ['Payment'],
        },
      },
      {
        id: 'identity', name: 'Identity', version: '1.0.0', phase: 1,
        depends_on: ['core-sdk', 'policy'],
        provides: ['login', 'register'],
        events_emitted: ['auth.login.success'],
        events_subscribed: [],
        strict_boundaries: {
          owns: ['Session', 'Credential'],
          forbidden: ['Payment', 'Order'],
        },
      },
      {
        id: 'user', name: 'User', version: '1.0.0', phase: 2,
        depends_on: ['core-sdk', 'policy', 'identity'],
        provides: ['createUser', 'getUser'],
        events_emitted: ['user.created'],
        events_subscribed: ['auth.login.success'],
        strict_boundaries: {
          owns: ['User', 'Profile'],
          forbidden: ['Password', 'Session'],
        },
      },
    ],
    compatibilityMatrix: {
      engines: ['core-sdk', 'identity', 'policy', 'user'],
      cells: [],
    },
    contractResults: [
      { engineId: 'core-sdk', passed: true, violations: [] },
      { engineId: 'policy', passed: true, violations: [] },
      { engineId: 'identity', passed: true, violations: [] },
      { engineId: 'user', passed: true, violations: [] },
    ],
    eventResults: [
      { eventType: 'policy.created', publisher: 'policy', subscribers: [], hasPublisher: true, hasSubscribers: false, orphanedSubscribers: [], status: 'warning' },
      { eventType: 'auth.login.success', publisher: 'identity', subscribers: ['user'], hasPublisher: true, hasSubscribers: true, orphanedSubscribers: [], status: 'pass' },
      { eventType: 'user.created', publisher: 'user', subscribers: [], hasPublisher: true, hasSubscribers: false, orphanedSubscribers: [], status: 'warning' },
    ],
    referenceResults: [
      { refType: 'UserReference', ownerEngine: 'user', consumerEngines: [], ownerExists: true, status: 'pass' },
      { refType: 'OrganizationReference', ownerEngine: 'organization', consumerEngines: [], ownerExists: false, status: 'fail' },
    ],
    dependencyResult: {
      edges: [
        { from: 'identity', to: 'core-sdk', declared: true },
        { from: 'identity', to: 'policy', declared: true },
        { from: 'user', to: 'core-sdk', declared: true },
        { from: 'user', to: 'identity', declared: true },
      ],
      cycles: [],
      forbiddenImports: [],
      layerViolations: [],
      status: 'pass',
    },
    apiDiffResults: [
      { engineId: 'core-sdk', hasBreakingChange: false, diffs: [] },
      { engineId: 'policy', hasBreakingChange: false, diffs: [] },
      { engineId: 'identity', hasBreakingChange: false, diffs: [] },
      { engineId: 'user', hasBreakingChange: false, diffs: [] },
    ],
    healthScores: [
      { engineId: 'core-sdk', score: 95, grade: 'A', factors: [{ name: 'Contracts', maxPoints: 30, earnedPoints: 30, detail: 'clean' }] },
      { engineId: 'policy', score: 90, grade: 'A', factors: [{ name: 'Contracts', maxPoints: 30, earnedPoints: 30, detail: 'clean' }] },
      { engineId: 'identity', score: 88, grade: 'B', factors: [{ name: 'Contracts', maxPoints: 30, earnedPoints: 30, detail: 'clean' }] },
      { engineId: 'user', score: 85, grade: 'B', factors: [{ name: 'Contracts', maxPoints: 30, earnedPoints: 30, detail: 'clean' }] },
    ],
    releaseReports: [
      { engineId: 'core-sdk', version: '1.0.0', status: 'PASS', checks: [], summary: '5/5 passed' },
      { engineId: 'policy', version: '1.0.0', status: 'PASS', checks: [], summary: '5/5 passed' },
      { engineId: 'identity', version: '1.0.0', status: 'PASS', checks: [], summary: '5/5 passed' },
      { engineId: 'user', version: '1.0.0', status: 'PASS', checks: [], summary: '5/5 passed' },
    ],
    platformReadiness: {
      totalEngines: 4,
      compatibilityPercent: 100,
      brokenContracts: 0,
      breakingChanges: 0,
      warnings: 0,
      totalPublicApis: 6,
      totalEvents: 3,
      totalReferences: 2,
      averageHealthScore: 89,
      status: 'PASS',
    },
  };
}

/**
 * Broken platform — has cycles, broken contracts, breaking changes.
 */
export function brokenInput(): GuardianInput {
  const base = cleanInput();
  return {
    ...base,
    manifests: [
      ...base.manifests,
      {
        id: 'broken-engine', name: 'Broken', version: '0.1.0', phase: 5,
        depends_on: ['nonexistent-engine'],
        provides: ['brokenAction'],
        events_emitted: [],
        events_subscribed: ['nonexistent.event'],
      },
    ],
    contractResults: [
      ...base.contractResults,
      {
        engineId: 'broken-engine', passed: false,
        violations: [
          { engineId: 'broken-engine', contractType: 'dependency', severity: 'critical', rule: 'dep.missing', message: 'Depends on nonexistent engine' },
        ],
      },
    ],
    eventResults: [
      ...base.eventResults,
      { eventType: 'nonexistent.event', publisher: '', subscribers: ['broken-engine'], hasPublisher: false, hasSubscribers: true, orphanedSubscribers: ['broken-engine'], status: 'fail' },
    ],
    dependencyResult: {
      edges: base.dependencyResult!.edges,
      cycles: [['engine-a', 'engine-b', 'engine-a']],
      forbiddenImports: [{ engine: 'broken-engine', imports: ['nonexistent-engine'] }],
      layerViolations: [{ engine: 'broken-engine', layer: 'phase', detail: 'Phase 5 depends on Phase 1' }],
      status: 'fail',
    },
    apiDiffResults: [
      ...base.apiDiffResults,
      {
        engineId: 'broken-engine', hasBreakingChange: true,
        diffs: [{ kind: 'removed', exportName: 'oldExport', detail: 'oldExport removed', breaking: true }],
      },
    ],
    healthScores: [
      ...base.healthScores,
      { engineId: 'broken-engine', score: 20, grade: 'F', factors: [{ name: 'Contracts', maxPoints: 30, earnedPoints: 0, detail: 'critical violations' }] },
    ],
    releaseReports: [
      ...base.releaseReports,
      { engineId: 'broken-engine', version: '0.1.0', status: 'FAIL', checks: [], summary: '0/5 passed' },
    ],
    platformReadiness: {
      ...base.platformReadiness!,
      totalEngines: 5,
      brokenContracts: 1,
      breakingChanges: 1,
      warnings: 2,
      averageHealthScore: 75,
      status: 'FAIL',
    },
  };
}

/**
 * Platform with circular dependencies.
 */
export function circularInput(): GuardianInput {
  const base = cleanInput();
  return {
    ...base,
    manifests: [
      {
        id: 'engine-a', name: 'A', version: '0.1.0', phase: 1,
        depends_on: ['engine-b'], provides: ['a'],
        events_emitted: [], events_subscribed: [],
      },
      {
        id: 'engine-b', name: 'B', version: '0.1.0', phase: 1,
        depends_on: ['engine-a'], provides: ['b'],
        events_emitted: [], events_subscribed: [],
      },
      ...base.manifests,
    ],
    dependencyResult: {
      edges: base.dependencyResult!.edges,
      cycles: [['engine-a', 'engine-b', 'engine-a']],
      forbiddenImports: [],
      layerViolations: [],
      status: 'fail',
    },
    contractResults: [
      ...base.contractResults,
      { engineId: 'engine-a', passed: false, violations: [{ engineId: 'engine-a', contractType: 'dependency', severity: 'critical', rule: 'dep.circular', message: 'Circular: a→b→a' }] },
      { engineId: 'engine-b', passed: false, violations: [{ engineId: 'engine-b', contractType: 'dependency', severity: 'critical', rule: 'dep.circular', message: 'Circular: a→b→a' }] },
    ],
    platformReadiness: {
      ...base.platformReadiness!,
      totalEngines: 6,
      brokenContracts: 2,
      status: 'FAIL',
    },
  };
}

/**
 * Platform with phase violations.
 */
export function phaseViolationInput(): GuardianInput {
  const base = cleanInput();
  return {
    ...base,
    manifests: [
      {
        id: 'foundation', name: 'Foundation', version: '0.1.0', phase: 1,
        depends_on: ['business'], provides: ['foundationApi'],
        events_emitted: [], events_subscribed: [],
      },
      {
        id: 'business', name: 'Business', version: '0.1.0', phase: 4,
        depends_on: ['core-sdk'], provides: ['businessApi'],
        events_emitted: [], events_subscribed: [],
      },
      ...base.manifests,
    ],
    dependencyResult: {
      edges: base.dependencyResult!.edges,
      cycles: [],
      forbiddenImports: [],
      layerViolations: [{ engine: 'foundation', layer: 'phase', detail: 'Phase 1 depends on Phase 4 business' }],
      status: 'warning',
    },
    platformReadiness: {
      ...base.platformReadiness!,
      totalEngines: 6,
      status: 'WARNING',
    },
  };
}

/**
 * Empty platform — no engines.
 */
export function emptyInput(): GuardianInput {
  return {
    manifests: [],
    compatibilityMatrix: { engines: [], cells: [] },
    contractResults: [],
    eventResults: [],
    referenceResults: [],
    dependencyResult: null,
    apiDiffResults: [],
    healthScores: [],
    releaseReports: [],
    platformReadiness: null,
  };
}

/**
 * Large platform with many engines for stress testing.
 */
export function largeInput(): GuardianInput {
  const base = cleanInput();
  const extraManifests = [];
  const extraContracts = [];
  const extraHealth = [];

  for (let i = 0; i < 20; i++) {
    const id = `engine-${i}`;
    extraManifests.push({
      id, name: `Engine ${i}`, version: '0.1.0', phase: 3 + (i % 4),
      depends_on: ['core-sdk'],
      provides: [`action${i}a`, `action${i}b`],
      events_emitted: [`${id}.created`],
      events_subscribed: [],
    });
    extraContracts.push({ engineId: id, passed: true, violations: [] });
    extraHealth.push({ engineId: id, score: 75 + (i % 20), grade: 'B', factors: [{ name: 'Test', maxPoints: 100, earnedPoints: 75, detail: 'ok' }] });
  }

  return {
    ...base,
    manifests: [...base.manifests, ...extraManifests],
    contractResults: [...base.contractResults, ...extraContracts],
    healthScores: [...base.healthScores, ...extraHealth],
    apiDiffResults: [...base.apiDiffResults, ...extraManifests.map((m) => ({ engineId: m.id, hasBreakingChange: false, diffs: [] }))],
    releaseReports: [...base.releaseReports, ...extraContracts.map((c) => ({ engineId: c.engineId, version: '0.1.0', status: 'PASS' as const, checks: [], summary: '5/5' }))],
    platformReadiness: {
      ...base.platformReadiness!,
      totalEngines: 4 + 20,
      totalPublicApis: 6 + 40,
      totalEvents: 3 + 20,
    },
  };
}
