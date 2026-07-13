/** Studio Engine — Use Case Deps */
import type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  // Sprint D: 3 read-only readers
  IThemeReaderForStudio, IComponentReaderForStudio, ICMSReaderForStudio,
  IWorkspaceRepository, IBuildSessionRepository, IPageDraftRepository,
  IComponentBindingRepository, IContentBindingRepository, IPublishIntentRepository,
  IStudioAssetRepository, IStudioAuditRepository,
} from '../interfaces/index.js';

export interface StudioUseCaseDeps {
  workspaceRepo: IWorkspaceRepository;
  buildSessionRepo: IBuildSessionRepository;
  pageDraftRepo: IPageDraftRepository;
  componentBindingRepo: IComponentBindingRepository;
  contentBindingRepo: IContentBindingRepository;
  publishIntentRepo: IPublishIntentRepository;
  studioAssetRepo: IStudioAssetRepository;
  auditRepo: IStudioAuditRepository;
  eventBus: IEventBus;
  organizationVerifier: IOrganizationVerifier;
  policyProvider: IPolicyProvider;
  // Sprint D: read-only 3 readers
  themeReader: IThemeReaderForStudio;
  componentReader: IComponentReaderForStudio;
  cmsReader: ICMSReaderForStudio;
  idGenerator: IIdGenerator;
  clock: IClock;
}