/** Test fixtures — Studio Engine */
import type { StudioUseCaseDeps } from '../src/index.js';
import {
  InMemoryWorkspaceRepository, InMemoryBuildSessionRepository,
  InMemoryPageDraftRepository, InMemoryComponentBindingRepository,
  InMemoryContentBindingRepository, InMemoryPublishIntentRepository,
  InMemoryStudioAssetRepository, InMemoryStudioAuditRepository,
  InMemoryOrganizationVerifier, StaticStudioPolicyProvider,
  MockStudioThemeReader, MockStudioComponentReader, MockStudioCMSReader,
  InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let o = 0;
  return { now: () => new Date(new Date('2026-07-13T08:00:00.000Z').getTime() + o++ * 1000) };
}

export function makeDeps(): StudioUseCaseDeps & {
  workspaceRepo: InMemoryWorkspaceRepository;
  buildSessionRepo: InMemoryBuildSessionRepository;
  pageDraftRepo: InMemoryPageDraftRepository;
  componentBindingRepo: InMemoryComponentBindingRepository;
  contentBindingRepo: InMemoryContentBindingRepository;
  publishIntentRepo: InMemoryPublishIntentRepository;
  studioAssetRepo: InMemoryStudioAssetRepository;
  auditRepo: InMemoryStudioAuditRepository;
  eventBus: InMemoryEventBus;
  organizationVerifier: InMemoryOrganizationVerifier;
  policyProvider: StaticStudioPolicyProvider;
  themeReader: MockStudioThemeReader;
  componentReader: MockStudioComponentReader;
  cmsReader: MockStudioCMSReader;
} {
  const organizationVerifier = new InMemoryOrganizationVerifier();
  organizationVerifier.add('t-1', 'org-1');
  const policyProvider = new StaticStudioPolicyProvider();
  policyProvider.set('t-1', { maxWorkspaces: 50 });
  const themeReader = new MockStudioThemeReader();
  themeReader.strictMode = true;
  themeReader.set('t-1', 'theme-luxury', {
    manifestId: 'm-lux', themeId: 'theme-luxury', brandId: 'b-aman', version: '1.0.0',
    resolvedTokens: { '--brand-whitespace': 'generous', '--brand-wcag-level': 'AAA' },
    manifestHash: 'hash-lux-aman',
  });
  const componentReader = new MockStudioComponentReader();
  componentReader.strictMode = true;
  componentReader.set('t-1', 'hero-component', {
    tenantId: 't-1', componentId: 'hero-component', name: 'Hero', slug: 'hero',
    componentType: 'Experience', tier: 'Experience', defaultProps: {}, version: '1.0.0',
  });
  componentReader.set('t-1', 'cta-button', {
    tenantId: 't-1', componentId: 'cta-button', name: 'CTA Button', slug: 'cta',
    componentType: 'Button', tier: 'Atomic', defaultProps: {}, version: '1.0.0',
  });
  const cmsReader = new MockStudioCMSReader();
  cmsReader.strictMode = true;
  cmsReader.addPage('t-1', 'page-ref-1', { pageId: 'page-ref-1', slug: '/home', title: 'Home', status: 'Draft' });
  let idCounter = 0;
  return {
    workspaceRepo: new InMemoryWorkspaceRepository(),
    buildSessionRepo: new InMemoryBuildSessionRepository(),
    pageDraftRepo: new InMemoryPageDraftRepository(),
    componentBindingRepo: new InMemoryComponentBindingRepository(),
    contentBindingRepo: new InMemoryContentBindingRepository(),
    publishIntentRepo: new InMemoryPublishIntentRepository(),
    studioAssetRepo: new InMemoryStudioAssetRepository(),
    auditRepo: new InMemoryStudioAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier, policyProvider,
    themeReader, componentReader, cmsReader,
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