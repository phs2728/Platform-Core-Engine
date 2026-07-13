/** CMS Engine — Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  IThemeManifestReader, IComponentReader,
  IContentRepository, IContentVersionRepository, IPageRepository,
  ISectionRepository, ISlotRepository, ILocaleVariantRepository,
  ILayoutSnapshotRepository, ICMSAuditRepository,
} from '../interfaces/index.js';

export interface CMSUseCaseDeps {
  contentRepo: IContentRepository;
  contentVersionRepo: IContentVersionRepository;
  pageRepo: IPageRepository;
  sectionRepo: ISectionRepository;
  slotRepo: ISlotRepository;
  localeVariantRepo: ILocaleVariantRepository;
  layoutSnapshotRepo: ILayoutSnapshotRepository;
  auditRepo: ICMSAuditRepository;
  eventBus: IEventBus;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: IPolicyProvider;
  // Sprint C: read-only Host Interfaces only
  themeReader: IThemeManifestReader;
  componentReader: IComponentReader;
  idGenerator: IIdGenerator;
  clock: IClock;
}