/**
 * Studio Engine — Public API
 */

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

// Types
export type {
  Workspace, BuildSession, PageDraft, ComponentBinding, ContentBinding,
  PublishIntent, StudioAsset,
  WorkspaceStatus, BuildSessionStatus, DraftStatus, PublishIntentStatus, AssetType,
  // Sprint D: read-only Host Interface types
  ResolvedManifest, ComponentManifest, PageRef, ContentRef,
  PublishComponentRef, PublishContentRef,
} from './interfaces/index.js';

// Interface types
export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  // Sprint D: 3 read-only readers
  IThemeReaderForStudio, IComponentReaderForStudio, ICMSReaderForStudio,
  IWorkspaceRepository, IBuildSessionRepository, IPageDraftRepository,
  IComponentBindingRepository, IContentBindingRepository, IPublishIntentRepository,
  IStudioAssetRepository, IStudioAuditRepository,
} from './interfaces/index.js';

// Use Cases — Workspace & BuildSession
export {
  createWorkspaceUseCase, updateWorkspaceUseCase, archiveWorkspaceUseCase, listWorkspacesUseCase,
  startBuildSessionUseCase, attachThemeUseCase, attachComponentLibraryUseCase, endBuildSessionUseCase,
} from './use-cases/WorkspaceSessionUseCases.js';

// Use Cases — Draft & Binding
export {
  createDraftUseCase, updateDraftTitleUseCase, archiveDraftUseCase,
  addComponentBindingUseCase, updateComponentBindingPropsUseCase, removeComponentBindingUseCase,
  addContentBindingUseCase, updateContentBindingUseCase, removeContentBindingUseCase,
} from './use-cases/DraftBindingUseCases.js';

// Use Cases — Verification & PublishIntent
export {
  verifyDraftCompositionUseCase, previewDraftUseCase,
  createPublishIntentUseCase, listPublishIntentsUseCase, cancelPublishIntentUseCase,
  searchComponentsUseCase, searchContentUseCase, getCompatibleThemesUseCase,
  type DraftVerification, type DraftPreview,
} from './use-cases/VerificationPublishUseCases.js';

// Events
export { STUDIO_EVENTS, type StudioEventType, STUDIO_EVENT_SCHEMAS } from './domain/events.js';

export type { StudioUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryWorkspaceRepository, InMemoryBuildSessionRepository,
  InMemoryPageDraftRepository, InMemoryComponentBindingRepository,
  InMemoryContentBindingRepository, InMemoryPublishIntentRepository,
  InMemoryStudioAssetRepository, InMemoryStudioAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Adapters
export {
  InMemoryOrganizationVerifier, StaticStudioPolicyProvider,
  MockStudioThemeReader, MockStudioComponentReader, MockStudioCMSReader,
  InMemoryEventBus, type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';