/** Test fixtures — CMS Engine */
import type { CMSUseCaseDeps } from '../src/index.js';
import {
  InMemoryContentRepository, InMemoryContentVersionRepository,
  InMemoryPageRepository, InMemorySectionRepository,
  InMemorySlotRepository, InMemoryLocaleVariantRepository,
  InMemoryLayoutSnapshotRepository, InMemoryCMSAuditRepository,
  InMemoryOrganizationVerifier, StaticCMSPolicyProvider,
  MockThemeManifestReader, MockComponentReader,
  InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let o = 0;
  return { now: () => new Date(new Date('2026-07-13T08:00:00.000Z').getTime() + o++ * 1000) };
}

export function makeDeps(): CMSUseCaseDeps & {
  contentRepo: InMemoryContentRepository;
  contentVersionRepo: InMemoryContentVersionRepository;
  pageRepo: InMemoryPageRepository;
  sectionRepo: InMemorySectionRepository;
  slotRepo: InMemorySlotRepository;
  localeVariantRepo: InMemoryLocaleVariantRepository;
  layoutSnapshotRepo: InMemoryLayoutSnapshotRepository;
  auditRepo: InMemoryCMSAuditRepository;
  eventBus: InMemoryEventBus;
  organizationVerifier: InMemoryOrganizationVerifier;
  policyProvider: StaticCMSPolicyProvider;
  themeReader: MockThemeManifestReader;
  componentReader: MockComponentReader;
} {
  const organizationVerifier = new InMemoryOrganizationVerifier();
  organizationVerifier.add('t-1', 'org-1');
  const policyProvider = new StaticCMSPolicyProvider();
  policyProvider.set('t-1', { maxPages: 100 });
  const themeReader = new MockThemeManifestReader();
  themeReader.strictMode = true;  // unknown themeId → empty manifest (rejected by use-case)
  themeReader.set('t-1', 'theme-1', {
    manifestId: 'manifest-1', themeId: 'theme-1', brandId: 'brand-1', version: '1.0.0',
    resolvedTokens: { '--brand-whitespace': 'medium', '--color.primary': '#7c2d3a' },
    manifestHash: 'hash-test-1',
  });
  const componentReader = new MockComponentReader();
  componentReader.strictMode = true;  // unknown componentId → empty manifest (rejected)
  componentReader.set('t-1', 'hero-comp', {
    tenantId: 't-1', componentId: 'hero-comp', name: 'Hero', slug: 'hero',
    componentType: 'Hero', tier: 'Experience', defaultProps: {}, version: '1.0.0',
  });
  componentReader.set('t-1', 'btn-comp', {
    tenantId: 't-1', componentId: 'btn-comp', name: 'Button', slug: 'btn',
    componentType: 'Button', tier: 'Atomic', defaultProps: {}, version: '1.0.0',
  });
  let idCounter = 0;
  return {
    contentRepo: new InMemoryContentRepository(),
    contentVersionRepo: new InMemoryContentVersionRepository(),
    pageRepo: new InMemoryPageRepository(),
    sectionRepo: new InMemorySectionRepository(),
    slotRepo: new InMemorySlotRepository(),
    localeVariantRepo: new InMemoryLocaleVariantRepository(),
    layoutSnapshotRepo: new InMemoryLayoutSnapshotRepository(),
    auditRepo: new InMemoryCMSAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier, policyProvider,
    themeReader, componentReader,
    idGenerator: { generate: () => `id-${Date.now()}-${++idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}` },
    clock: makeClock(),
  } as ReturnType<typeof makeDeps>;
}

export const baseInput = {
  tenantId: 't-1',
  organizationId: 'org-1',
  correlationId: 'corr-1',
  actorId: 'user-1',
};

export function unwrap<T>(r: { ok: boolean; value?: T; error?: unknown }): T {
  if (!r.ok) throw new Error(`Expected Ok but got Err: ${JSON.stringify(r.error)}`);
  return r.value!;
}