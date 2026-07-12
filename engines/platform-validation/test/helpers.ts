/**
 * Test fixtures — Platform Validation Engine
 */

import type { ValidationUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryScenarioRepository,
  InMemoryValidationRepository,
  InMemoryReportRepository,
  InMemoryMetricsRepository,
  InMemoryCertificationRepository,
  InMemoryValidationAuditRepository,
  MockEngineManifestProvider,
  MockEngineActionProvider,
  MockGuardianProvider,
  MockCompatibilityProvider,
  StaticValidationPolicyProvider,
  InMemoryEventBus,
} from '../src/index.js';
import type { EngineManifest } from '../src/interfaces/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

const ENGINE_IDS = [
  'core-sdk', 'policy', 'identity', 'user', 'address', 'organization',
  'authorization', 'event-bus', 'communication',
  'catalog', 'pricing', 'media',
  'inventory', 'booking', 'order', 'workflow', 'payment', 'review',
  'platform-compatibility', 'platform-guardian',
];

function makeManifest(id: string): EngineManifest {
  return {
    id, name: id, version: '1.0.0', status: 'Stable', phase: 6,
    dependsOn: ['core-sdk'],
    eventsEmitted: [`${id}.created`],
    eventsSubscribed: [],
    provides: [id],
  };
}

export function makeDeps(): ValidationUseCaseDeps & {
  scenarioRepo: InMemoryScenarioRepository;
  validationRepo: InMemoryValidationRepository;
  reportRepo: InMemoryReportRepository;
  metricsRepo: InMemoryMetricsRepository;
  certificationRepo: InMemoryCertificationRepository;
  auditRepo: InMemoryValidationAuditRepository;
  manifestProvider: MockEngineManifestProvider;
  actionProvider: MockEngineActionProvider;
  guardianProvider: MockGuardianProvider;
  compatibilityProvider: MockCompatibilityProvider;
  policyProvider: StaticValidationPolicyProvider;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const scenarioRepo = new InMemoryScenarioRepository();
  const validationRepo = new InMemoryValidationRepository();
  const reportRepo = new InMemoryReportRepository();
  const metricsRepo = new InMemoryMetricsRepository();
  const certificationRepo = new InMemoryCertificationRepository();
  const auditRepo = new InMemoryValidationAuditRepository();
  const eventBus = new InMemoryEventBus();
  const manifestProvider = new MockEngineManifestProvider();
  const actionProvider = new MockEngineActionProvider();
  const guardianProvider = new MockGuardianProvider();
  const compatibilityProvider = new MockCompatibilityProvider();
  const policyProvider = new StaticValidationPolicyProvider();

  // Register all engine manifests
  for (const eid of ENGINE_IDS) {
    manifestProvider.add(makeManifest(eid));
  }

  // Register default success actions for all engines
  for (const eid of ENGINE_IDS) {
    actionProvider.registerSimple(eid, 'create', true, [`${eid}.created`]);
    actionProvider.registerSimple(eid, 'update', true);
    actionProvider.registerSimple(eid, 'cancel', true, [`${eid}.cancelled`]);
    actionProvider.registerSimple(eid, 'archive', true, [`${eid}.archived`]);
    actionProvider.registerSimple(eid, 'reject', true, [`${eid}.rejected`]);
    actionProvider.registerSimple(eid, 'fail', false);
    actionProvider.registerSimple(eid, 'release', true);
    actionProvider.registerSimple(eid, 'refund', true, [`${eid}.refunded`]);
    actionProvider.registerSimple(eid, 'send', true);
    actionProvider.registerSimple(eid, 'retry', true);
    actionProvider.registerSimple(eid, 'login', true, ['identity.login.success']);
    actionProvider.registerSimple(eid, 'start', true);
    actionProvider.registerSimple(eid, 'deny', false);
    actionProvider.registerSimple(eid, 'upload', true, [`${eid}.created`]);
    actionProvider.registerSimple(eid, 'index', true);
    actionProvider.registerSimple(eid, 'check', true);
    actionProvider.registerSimple(eid, 'record', true);
    actionProvider.registerSimple(eid, 'issue', true);
    actionProvider.registerSimple(eid, 'rollback', true);
    actionProvider.registerSimple(eid, 'moveToDLQ', true);
    actionProvider.registerSimple(eid, 'sendAlert', true);
  }

  // Engine-specific action names
  actionProvider.registerSimple('user', 'createUser', true, ['user.created']);
  actionProvider.registerSimple('organization', 'archiveOrganization', true, ['organization.archived']);
  actionProvider.registerSimple('organization', 'createOrganization', true, ['organization.created']);
  actionProvider.registerSimple('catalog', 'createCatalog', true, ['catalog.created']);
  actionProvider.registerSimple('pricing', 'createPricePlan', true, ['pricing.plan.created']);
  actionProvider.registerSimple('inventory', 'createStockItem', true, ['inventory.created']);
  actionProvider.registerSimple('booking', 'createBooking', true, ['booking.created']);
  actionProvider.registerSimple('order', 'createOrder', true, ['order.created']);
  actionProvider.registerSimple('workflow', 'startWorkflow', true);
  actionProvider.registerSimple('workflow', 'cancelWorkflow', true);
  actionProvider.registerSimple('workflow', 'rollbackWorkflow', true);
  actionProvider.registerSimple('payment', 'createPayment', true, ['payment.created']);
  actionProvider.registerSimple('payment', 'failPayment', false, ['payment.failed']);
  actionProvider.registerSimple('payment', 'refundPayment', true, ['payment.refunded']);
  actionProvider.registerSimple('communication', 'sendMessage', true);
  actionProvider.registerSimple('communication', 'retryMessage', true);
  actionProvider.registerSimple('communication', 'moveToDLQ', true);
  actionProvider.registerSimple('communication', 'sendAlert', true);
  actionProvider.registerSimple('review', 'createReview', true, ['review.created']);
  actionProvider.registerSimple('review', 'archiveReview', true);
  actionProvider.registerSimple('review', 'updateReview', true);
  actionProvider.registerSimple('inventory', 'releaseReservation', true);
  actionProvider.registerSimple('inventory', 'releaseAllocation', true);
  actionProvider.registerSimple('inventory', 'archiveStockItem', true, ['inventory.archived']);
  actionProvider.registerSimple('booking', 'cancelBooking', true, ['booking.cancelled']);
  actionProvider.registerSimple('booking', 'rejectBooking', true, ['booking.rejected']);
  actionProvider.registerSimple('order', 'rejectOrder', true, ['order.rejected']);
  actionProvider.registerSimple('catalog', 'archiveCatalog', true, ['catalog.archived']);
  actionProvider.registerSimple('authorization', 'denyPermission', false);
  actionProvider.registerSimple('authorization', 'checkPermission', true);
  actionProvider.registerSimple('core-sdk', 'recordAudit', true);
  actionProvider.registerSimple('core-sdk', 'indexSearchable', true);
  actionProvider.registerSimple('platform-guardian', 'issueWarning', true);
  actionProvider.registerSimple('media', 'uploadAsset', true, ['media.created']);
  actionProvider.registerSimple('identity', 'login', true, ['identity.login.success']);

  policyProvider.set('t-1', {
    allowedCategories: ['lifecycle', 'cancellation', 'failure', 'archive', 'authorization', 'media', 'communication', 'identity'],
    maxScenarios: 500,
    defaultTimeoutMs: 30000,
  });

  let idCounter = 0;
  const idGenerator = {
    generate(): string {
      idCounter += 1;
      return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };

  return {
    scenarioRepo, validationRepo, reportRepo, metricsRepo,
    certificationRepo, auditRepo, eventBus,
    manifestProvider, actionProvider, guardianProvider, compatibilityProvider,
    policyProvider, idGenerator, clock: makeClock(),
  };
}

export function makeSimpleScenarioInput(overrides?: Partial<{
  name: string;
  category: string;
  type: string;
}>) {
  return {
    tenantId: 't-1',
    correlationId: 'c-1',
    actorId: 'tester',
    name: overrides?.name ?? 'Test Scenario',
    description: 'A simple test scenario',
    category: overrides?.category ?? 'lifecycle',
    type: (overrides?.type ?? 'e2e') as 'smoke' | 'regression' | 'certification' | 'release' | 'scenario' | 'e2e',
    tags: ['test'],
    steps: [
      {
        name: 'Create User',
        description: 'Create a test user',
        engineId: 'user',
        actionName: 'createUser',
        params: {},
        expectations: [
          { type: 'event_published', description: 'user.created emitted', validator: 'event_check', params: {}, required: true },
        ],
        timeoutMs: 5000,
        continueOnFailure: false,
        sequence: 0,
      },
      {
        name: 'Create Organization',
        description: 'Create a test org',
        engineId: 'organization',
        actionName: 'createOrganization',
        params: {},
        expectations: [
          { type: 'event_published', description: 'org.created emitted', validator: 'event_check', params: {}, required: true },
        ],
        timeoutMs: 5000,
        continueOnFailure: false,
        sequence: 1,
      },
    ],
  };
}
