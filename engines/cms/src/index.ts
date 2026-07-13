/**
 * CMS Engine — Public API
 */

// Core SDK re-exports
export { type Result, Ok, Err, ValidationError, NotFoundError, ConflictError, type EventEnvelope, createEnvelope, z } from '@platform/core-sdk';

// Types
export type {
  Content, ContentVersion, Page, PageSection, ContentSlot, LocaleVariant, LayoutSnapshot,
  ContentStatus, ContentType, Locale, PageStatus, SlotType, DeviceType,
  CMSAuditRecord, CMSAuditEventType,
  // Sprint C: read-only Host Interfaces
  ResolvedManifest, ComponentManifest,
} from './interfaces/index.js';

// Interface types
export type {
  IClock, IIdGenerator, IEventBus,
  IOrganizationVerifier, IPolicyProvider,
  // Sprint C: read-only Host Interfaces (Theme/Component)
  IThemeManifestReader, IComponentReader,
  IContentRepository, IContentVersionRepository, IPageRepository,
  ISectionRepository, ISlotRepository, ILocaleVariantRepository,
  ILayoutSnapshotRepository, ICMSAuditRepository,
} from './interfaces/index.js';

// Use Cases — Content & Page
export {
  createContentUseCase, updateContentUseCase, deleteContentUseCase,
  getContentUseCase, listContentByTypeUseCase, publishContentUseCase,
  listContentVersionsUseCase,
  createPageUseCase, updatePageUseCase, archivePageUseCase,
  getPageUseCase, listPagesUseCase,
  createLocaleVariantUseCase,
} from './use-cases/ContentPageUseCases.js';

// Use Cases — Section & Slot
export {
  addSectionUseCase, updateSectionUseCase, removeSectionUseCase,
  createContentSlotUseCase, assignContentToSlotUseCase, removeContentFromSlotUseCase,
} from './use-cases/SectionSlotUseCases.js';

// Use Cases — Render & Snapshot
export {
  renderPageUseCase, renderSectionUseCase, renderPreviewUseCase,
  createLayoutSnapshotUseCase, getLayoutSnapshotUseCase, compareLayoutSnapshotsUseCase,
  type RenderedPage, type RenderedSection, type RenderedSlot,
} from './use-cases/RenderSnapshotUseCases.js';

// Events
export { CMS_EVENTS, type CMSEventType, CMS_EVENT_SCHEMAS } from './domain/events.js';

export type { CMSUseCaseDeps } from './use-cases/types.js';

// In-Memory Repositories
export {
  InMemoryContentRepository, InMemoryContentVersionRepository,
  InMemoryPageRepository, InMemorySectionRepository,
  InMemorySlotRepository, InMemoryLocaleVariantRepository,
  InMemoryLayoutSnapshotRepository, InMemoryCMSAuditRepository,
} from './infrastructure/InMemoryRepositories.js';

// Host Adapters
export {
  InMemoryOrganizationVerifier, StaticCMSPolicyProvider,
  MockThemeManifestReader, MockComponentReader,
  InMemoryEventBus, type RecordedEnvelope,
} from './infrastructure/hostAdapters.js';