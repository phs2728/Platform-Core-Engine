/** Example helpers — Studio Engine */
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
import type { Result } from '../src/index.js';

export function makeDemoDeps(): StudioUseCaseDeps {
  const organizationVerifier = new InMemoryOrganizationVerifier();
  organizationVerifier.add('demo', 'org-demo');
  const policyProvider = new StaticStudioPolicyProvider();
  policyProvider.set('demo', { maxWorkspaces: 50 });
  const themeReader = new MockStudioThemeReader();
  themeReader.strictMode = true;
  themeReader.set('demo', 'theme-luxury', {
    manifestId: 'm-lux', themeId: 'theme-luxury', brandId: 'b-aman', version: '1.0.0',
    resolvedTokens: { '--brand-whitespace': 'generous', '--brand-wcag-level': 'AAA' },
    manifestHash: 'hash-lux-aman',
  });
  const componentReader = new MockStudioComponentReader();
  componentReader.strictMode = true;
  componentReader.set('demo', 'hero-exp', {
    tenantId: 'demo', componentId: 'hero-exp', name: 'Hero Experience', slug: 'hero',
    componentType: 'Experience', tier: 'Experience', defaultProps: {}, version: '1.0.0',
  });
  componentReader.set('demo', 'cta-btn', {
    tenantId: 'demo', componentId: 'cta-btn', name: 'CTA Button', slug: 'cta',
    componentType: 'Button', tier: 'Atomic', defaultProps: {}, version: '1.0.0',
  });
  const cmsReader = new MockStudioCMSReader();
  cmsReader.strictMode = true;
  cmsReader.addContent('demo', 'content-hello', { contentId: 'content-hello', type: 'Text', locale: 'en', body: 'Welcome', status: 'Published' });
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
    idGenerator: { generate: () => `demo-${Date.now()}-${++idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}` },
    clock: { now: () => new Date('2026-07-13T08:00:00.000Z') },
  };
}

export function unwrap<T>(r: Result<T, Error>): T {
  if (!r.ok) throw new Error(`Expected Ok but got Err: ${JSON.stringify(r.error)}`);
  return r.value;
}

export const base = {
  tenantId: 'demo',
  organizationId: 'org-demo',
  correlationId: 'demo-studio',
  actorId: 'demo-user',
};