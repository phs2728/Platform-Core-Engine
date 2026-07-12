/** Test fixtures — Release Manager */
import type { ReleaseUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryReleaseRepository, InMemoryVersionRepository, InMemoryTagRepository,
  InMemoryHistoryRepository, InMemoryChecklistRepository, InMemoryReleaseAuditRepository,
  MockCompatibilityProvider, MockValidationProvider, MockGuardianProvider,
  MockBuildProvider, StaticReleasePolicyProvider, InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): ReleaseUseCaseDeps & {
  releaseRepo: InMemoryReleaseRepository; versionRepo: InMemoryVersionRepository;
  tagRepo: InMemoryTagRepository; historyRepo: InMemoryHistoryRepository;
  checklistRepo: InMemoryChecklistRepository; auditRepo: InMemoryReleaseAuditRepository;
  compatibilityProvider: MockCompatibilityProvider; validationProvider: MockValidationProvider;
  guardianProvider: MockGuardianProvider; buildProvider: MockBuildProvider;
  policyProvider: StaticReleasePolicyProvider; eventBus: InMemoryEventBus;
  idGenerator: { generate(): string }; clock: { now(): Date };
} {
  const releaseRepo = new InMemoryReleaseRepository();
  const versionRepo = new InMemoryVersionRepository();
  const tagRepo = new InMemoryTagRepository();
  const historyRepo = new InMemoryHistoryRepository();
  const checklistRepo = new InMemoryChecklistRepository();
  const auditRepo = new InMemoryReleaseAuditRepository();
  const eventBus = new InMemoryEventBus();
  const compatibilityProvider = new MockCompatibilityProvider();
  const validationProvider = new MockValidationProvider();
  const guardianProvider = new MockGuardianProvider();
  const buildProvider = new MockBuildProvider();
  const policyProvider = new StaticReleasePolicyProvider();
  policyProvider.set('t-1', { requiredApprovals: 1 });

  let idCounter = 0;
  const idGenerator = {
    generate(): string { idCounter++; return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`; },
  };

  return {
    releaseRepo, versionRepo, tagRepo, historyRepo, checklistRepo, auditRepo,
    eventBus, compatibilityProvider, validationProvider, guardianProvider,
    buildProvider, policyProvider, idGenerator, clock: makeClock(),
  };
}
