/** Example helpers — CMS Engine */
import type { CMSUseCaseDeps } from '../src/index.js';
import {
  InMemoryContentRepository, InMemoryContentVersionRepository,
  InMemoryPageRepository, InMemorySectionRepository,
  InMemorySlotRepository, InMemoryLocaleVariantRepository,
  InMemoryLayoutSnapshotRepository, InMemoryCMSAuditRepository,
  InMemoryOrganizationVerifier, StaticCMSPolicyProvider,
  MockThemeManifestReader, MockComponentReader, InMemoryEventBus,
} from '../src/index.js';
import type { Result } from '../src/index.js';

export function makeDemoDeps(): CMSUseCaseDeps {
  const organizationVerifier = new InMemoryOrganizationVerifier();
  organizationVerifier.add('demo', 'org-demo');
  const policyProvider = new StaticCMSPolicyProvider();
  policyProvider.set('demo', { maxPages: 100 });
  const themeReader = new MockThemeManifestReader();
  themeReader.strictMode = true;
  themeReader.set('demo', 'theme-luxury', {
    manifestId: 'm-lux', themeId: 'theme-luxury', brandId: 'b-aman', version: '1.0.0',
    resolvedTokens: { '--brand-whitespace': 'generous', '--brand-wcag-level': 'AAA' },
    manifestHash: 'hash-lux-aman',
  });
  const componentReader = new MockComponentReader();
  componentReader.strictMode = true;
  componentReader.set('demo', 'hero-section', {
    tenantId: 'demo', componentId: 'hero-section', name: 'Hero Section', slug: 'hero',
    componentType: 'Experience', tier: 'Experience', defaultProps: {}, version: '1.0.0',
  });
  componentReader.set('demo', 'cta-button', {
    tenantId: 'demo', componentId: 'cta-button', name: 'CTA Button', slug: 'cta',
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
  correlationId: 'demo-cms',
  actorId: 'demo-user',
};