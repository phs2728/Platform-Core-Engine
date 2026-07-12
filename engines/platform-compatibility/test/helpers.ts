/**
 * Test fixtures — Platform Compatibility Suite
 */

import type { EngineManifest } from '../src/interfaces/index.js';
import {
  InMemoryManifestLoader,
  InMemoryResultStore,
  InMemoryApiSnapshotStore,
  InMemoryReportWriter,
} from '../src/index.js';
import type { CompatibilitySuiteDeps } from '../src/use-cases/types.js';

/**
 * Sample manifests representing a small platform.
 */
export function sampleManifests(): EngineManifest[] {
  return [
    {
      id: 'core-sdk',
      name: 'Core SDK',
      version: '1.0.0',
      phase: 1,
      status: 'Stable',
      depends_on: ['policy', 'universal-core'],
      provides: ['ILogger', 'Result', 'ValidationError', 'EventEnvelope', 'z'],
      events_emitted: [],
      events_subscribed: [],
    },
    {
      id: 'policy',
      name: 'Policy Engine',
      version: '1.0.0',
      phase: 1,
      depends_on: ['universal-core'],
      provides: ['IPolicyProvider', 'ITenantPolicyResolver'],
      events_emitted: ['policy.created', 'policy.updated', 'policy.deleted'],
      events_subscribed: [],
    },
    {
      id: 'identity',
      name: 'Identity Engine',
      version: '1.0.0',
      phase: 1,
      depends_on: ['core-sdk', 'policy', 'universal-core'],
      provides: ['login', 'register', 'logout', 'resetPassword'],
      events_emitted: ['auth.login.success', 'auth.login.failure', 'auth.register.success', 'identity.account.created'],
      events_subscribed: [],
      strict_boundaries: {
        owns: ['Session', 'Credential'],
        forbidden: ['Payment', 'Order'],
      },
    },
    {
      id: 'user',
      name: 'User Engine',
      version: '1.0.0',
      phase: 2,
      depends_on: ['core-sdk', 'policy', 'identity'],
      provides: ['createUser', 'updateProfile', 'archiveUser', 'getUser'],
      events_emitted: ['user.created', 'user.updated', 'user.archived'],
      events_subscribed: ['identity.account.created'],
      strict_boundaries: {
        owns: ['User', 'Profile'],
        forbidden: ['Password', 'Session'],
      },
    },
    {
      id: 'address',
      name: 'Address Engine',
      version: '1.0.0',
      phase: 3,
      depends_on: ['core-sdk', 'policy'],
      provides: ['createAddress', 'getAddress'],
      events_emitted: ['address.created', 'address.archived'],
      events_subscribed: [],
    },
    {
      id: 'organization',
      name: 'Organization Engine',
      version: '0.1.0',
      phase: 3,
      depends_on: ['core-sdk', 'policy', 'user', 'address'],
      provides: ['createOrganization', 'getOrganization'],
      events_emitted: ['organization.created', 'organization.archived', 'organization.deleted'],
      events_subscribed: ['user.created', 'address.archived'],
    },
    {
      id: 'catalog',
      name: 'Catalog Engine',
      version: '0.1.0',
      phase: 4,
      depends_on: ['core-sdk', 'policy', 'organization', 'event-bus'],
      provides: ['createCatalog', 'createItem', 'createVariant'],
      events_emitted: ['catalog.created', 'catalog.deleted'],
      events_subscribed: ['organization.archived', 'organization.deleted'],
    },
    {
      id: 'pricing',
      name: 'Pricing Engine',
      version: '0.1.0',
      phase: 4,
      depends_on: ['core-sdk', 'policy', 'organization', 'catalog'],
      provides: ['createPricingPlan', 'createPrice'],
      events_emitted: ['pricing.plan.created', 'pricing.created'],
      events_subscribed: ['organization.archived', 'catalog.archived'],
    },
    {
      id: 'event-bus',
      name: 'Universal Event Bus',
      version: '0.1.0',
      phase: 1,
      depends_on: ['core-sdk', 'universal-core'],
      provides: ['IEventBus', 'InMemoryEventBus'],
      events_emitted: ['eventbus.dead_letter'],
      events_subscribed: [],
    },
  ];
}

/**
 * Manifests with a deliberately broken event subscription
 * (subscribes to an event that nobody publishes).
 */
export function brokenEventManifests(): EngineManifest[] {
  return [
    {
      id: 'engine-a',
      name: 'Engine A',
      version: '0.1.0',
      phase: 1,
      depends_on: [],
      provides: ['doA'],
      events_emitted: ['a.created'],
      events_subscribed: ['b.nonexistent'], // nobody publishes this!
    },
    {
      id: 'engine-b',
      name: 'Engine B',
      version: '0.1.0',
      phase: 1,
      depends_on: [],
      provides: ['doB'],
      events_emitted: ['b.created'],
      events_subscribed: ['a.created'],
    },
  ];
}

/**
 * Manifests with a circular dependency.
 */
export function circularDependencyManifests(): EngineManifest[] {
  return [
    {
      id: 'engine-x',
      name: 'Engine X',
      version: '0.1.0',
      phase: 1,
      depends_on: ['engine-y'],
      provides: ['doX'],
      events_emitted: [],
      events_subscribed: [],
    },
    {
      id: 'engine-y',
      name: 'Engine Y',
      version: '0.1.0',
      phase: 1,
      depends_on: ['engine-x'],
      provides: ['doY'],
      events_emitted: [],
      events_subscribed: [],
    },
  ];
}

/**
 * Manifests with a missing dependency.
 */
export function missingDependencyManifests(): EngineManifest[] {
  return [
    {
      id: 'engine-p',
      name: 'Engine P',
      version: '0.1.0',
      phase: 1,
      depends_on: ['engine-nonexistent'],
      provides: ['doP'],
      events_emitted: [],
      events_subscribed: [],
    },
  ];
}

/**
 * Manifests with a phase-ordering violation.
 */
export function phaseViolationManifests(): EngineManifest[] {
  return [
    {
      id: 'foundation-engine',
      name: 'Foundation',
      version: '0.1.0',
      phase: 1,
      depends_on: ['business-engine'], // Phase 1 depending on Phase 4!
      provides: ['foundation'],
      events_emitted: [],
      events_subscribed: [],
    },
    {
      id: 'business-engine',
      name: 'Business',
      version: '0.1.0',
      phase: 4,
      depends_on: ['core-sdk'],
      provides: ['business'],
      events_emitted: [],
      events_subscribed: [],
    },
  ];
}

/**
 * Create deps with sample manifests.
 */
export function makeDeps(manifests?: EngineManifest[]): CompatibilitySuiteDeps & {
  _manifestLoader: InMemoryManifestLoader;
  _resultStore: InMemoryResultStore;
  _snapshotStore: InMemoryApiSnapshotStore;
  _reportWriter: InMemoryReportWriter;
} {
  const m = manifests ?? sampleManifests();
  const manifestLoader = new InMemoryManifestLoader(m);
  const resultStore = new InMemoryResultStore();
  const snapshotStore = new InMemoryApiSnapshotStore();
  const reportWriter = new InMemoryReportWriter();

  return {
    manifestLoader,
    resultStore,
    snapshotStore,
    reportWriter,
    _manifestLoader: manifestLoader,
    _resultStore: resultStore,
    _snapshotStore: snapshotStore,
    _reportWriter: reportWriter,
  };
}
