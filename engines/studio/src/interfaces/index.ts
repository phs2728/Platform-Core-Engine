/**
 * Studio Engine RC1 — Public Interfaces
 *
 * Sprint D: Page Builder Process (Process Ownership)
 *  - Theme/Component/CMS는 read-only Host Interface로만 참조
 *  - 직접 publish는 CMS에 위임 (PublishIntent pattern)
 *  - BuildSession 결정성, Composition Verification 필수
 */
import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces — Read-Only (Sprint D 원칙 2)
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface IPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getMaxWorkspacesPerOrg(tenantId: string): Promise<number>;
}

// ── Theme Reader (read-only) ──
export interface IThemeReaderForStudio {
  resolveThemeManifest(tenantId: string, themeId: string): Promise<Result<ResolvedManifest, Error>>;
}

export interface ResolvedManifest {
  manifestId: string;
  themeId: string;
  brandId: string;
  version: string;
  resolvedTokens: Record<string, string>;
  manifestHash: string;
}

// ── Component Reader (read-only) ──
export interface IComponentReaderForStudio {
  getComponent(tenantId: string, componentId: string): Promise<Result<ComponentManifest, Error>>;
  listComponentsByType(tenantId: string, componentType: string): Promise<Result<ComponentManifest[], Error>>;
}

export interface ComponentManifest {
  tenantId: string;
  componentId: string;
  name: string;
  slug: string;
  componentType: string;
  tier: 'Experience' | 'Atomic';
  defaultProps: Record<string, unknown>;
  version: string;
}

// ── CMS Reader (read-only) ──
export interface ICMSReaderForStudio {
  getPage(tenantId: string, pageId: string): Promise<Result<PageRef, Error>>;
  listContent(tenantId: string, type: string): Promise<Result<ContentRef[], Error>>;
}

export interface PageRef {
  pageId: string;
  slug: string;
  title: string;
  status: string;
}

export interface ContentRef {
  contentId: string;
  type: string;
  locale: string;
  body: string;
  status: string;
}

// ═══════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════

export type WorkspaceStatus = 'Active' | 'Archived';
export type BuildSessionStatus = 'Active' | 'Completed' | 'Abandoned';
export type DraftStatus = 'Editing' | 'Reviewing' | 'Verified' | 'Published' | 'Archived';
export type PublishIntentStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';
export type AssetType = 'Image' | 'Video' | 'Audio' | 'Document';
export type ContentType = 'Text' | 'Image' | 'Video' | 'Audio' | 'Document' | 'Code' | 'JSON' | 'Markdown';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface Workspace {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  status: WorkspaceStatus;
  defaultThemeRef: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BuildSession {
  id: string;
  tenantId: string;
  organizationId: string;
  workspaceId: string;
  themeRef: string;
  componentRefs: string[];
  status: BuildSessionStatus;
  draftIds: string[];
  metadata: Record<string, unknown>;
  startedAt: string;
  endedAt: string | null;
  startedBy: string;
}

export interface PageDraft {
  id: string;
  tenantId: string;
  organizationId: string;
  buildSessionId: string;
  workspaceId: string;
  pageSlug: string;
  title: string;
  description: string;
  status: DraftStatus;
  themeRef: string;
  componentBindingIds: string[];
  contentBindingIds: string[];
  defaultLocale: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ComponentBinding {
  id: string;
  tenantId: string;
  organizationId: string;
  draftId: string;
  componentRef: string;
  slotName: string;
  order: number;
  propOverrides: Record<string, unknown>;
  themeOverrideRef: string | null;
  contentBindingIds: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBinding {
  id: string;
  tenantId: string;
  organizationId: string;
  draftId: string;
  componentBindingId: string;
  contentRef: string;
  slotName: string;
  fallbackContentRef: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PublishIntent {
  id: string;
  tenantId: string;
  organizationId: string;
  draftId: string;
  workspaceId: string;
  pageSlug: string;
  themeRef: string;
  componentBindings: PublishComponentRef[];
  contentBindings: PublishContentRef[];
  status: PublishIntentStatus;
  targetPageId: string | null;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
  createdBy: string;
}

export interface PublishComponentRef {
  componentRef: string;
  slotName: string;
  order: number;
  propOverrides: Record<string, unknown>;
  themeOverrideRef: string | null;
}

export interface PublishContentRef {
  contentRef: string;
  componentBindingSlotName: string;
  fallbackContentRef: string | null;
}

export interface StudioAsset {
  id: string;
  tenantId: string;
  organizationId: string;
  workspaceId: string;
  type: AssetType;
  url: string;
  altText: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type StudioAuditEventType =
  | 'workspace_created' | 'workspace_updated' | 'workspace_archived'
  | 'build_session_started' | 'build_session_ended'
  | 'theme_attached' | 'component_library_attached'
  | 'draft_created' | 'draft_updated' | 'draft_archived'
  | 'component_binding_added' | 'component_binding_updated' | 'component_binding_removed'
  | 'content_binding_added' | 'content_binding_updated' | 'content_binding_removed'
  | 'draft_verified' | 'draft_previewed'
  | 'publish_intent_created' | 'publish_intent_processed' | 'publish_intent_failed' | 'publish_intent_cancelled'
  | 'asset_uploaded' | 'asset_attached' | 'asset_removed';

export interface StudioAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  entityType: 'workspace' | 'session' | 'draft' | 'binding' | 'intent' | 'asset';
  entityId?: string | undefined;
  actorId: string;
  correlationId: string;
  eventType: StudioAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repository Contracts
// ═══════════════════════════════════════════

export interface IWorkspaceRepository {
  insert(w: Workspace): Promise<void>;
  findById(tenantId: string, id: string): Promise<Workspace | null>;
  findBySlug(tenantId: string, slug: string): Promise<Workspace | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<Workspace[]>;
  update(tenantId: string, id: string, patch: Partial<Workspace>): Promise<void>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
  countByOrganization(tenantId: string, orgId: string): Promise<number>;
}

export interface IBuildSessionRepository {
  insert(s: BuildSession): Promise<void>;
  findById(tenantId: string, id: string): Promise<BuildSession | null>;
  findByWorkspace(tenantId: string, workspaceId: string): Promise<BuildSession[]>;
  findActiveByWorkspace(tenantId: string, workspaceId: string): Promise<BuildSession | null>;
  update(tenantId: string, id: string, patch: Partial<BuildSession>): Promise<void>;
}

export interface IPageDraftRepository {
  insert(d: PageDraft): Promise<void>;
  findById(tenantId: string, id: string): Promise<PageDraft | null>;
  findBySession(tenantId: string, sessionId: string): Promise<PageDraft[]>;
  findByWorkspace(tenantId: string, workspaceId: string): Promise<PageDraft[]>;
  update(tenantId: string, id: string, patch: Partial<PageDraft>): Promise<void>;
  existsBySlugInSession(tenantId: string, sessionId: string, slug: string): Promise<boolean>;
}

export interface IComponentBindingRepository {
  insert(b: ComponentBinding): Promise<void>;
  findById(tenantId: string, id: string): Promise<ComponentBinding | null>;
  findByDraft(tenantId: string, draftId: string): Promise<ComponentBinding[]>;
  update(tenantId: string, id: string, patch: Partial<ComponentBinding>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IContentBindingRepository {
  insert(b: ContentBinding): Promise<void>;
  findById(tenantId: string, id: string): Promise<ContentBinding | null>;
  findByDraft(tenantId: string, draftId: string): Promise<ContentBinding[]>;
  findByComponentBinding(tenantId: string, componentBindingId: string): Promise<ContentBinding[]>;
  update(tenantId: string, id: string, patch: Partial<ContentBinding>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IPublishIntentRepository {
  insert(p: PublishIntent): Promise<void>;
  findById(tenantId: string, id: string): Promise<PublishIntent | null>;
  findByDraft(tenantId: string, draftId: string): Promise<PublishIntent[]>;
  findByWorkspace(tenantId: string, workspaceId: string): Promise<PublishIntent[]>;
  update(tenantId: string, id: string, patch: Partial<PublishIntent>): Promise<void>;
}

export interface IStudioAssetRepository {
  insert(a: StudioAsset): Promise<void>;
  findById(tenantId: string, id: string): Promise<StudioAsset | null>;
  findByWorkspace(tenantId: string, workspaceId: string): Promise<StudioAsset[]>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IStudioAuditRepository {
  insert(record: Omit<StudioAuditRecord, 'id' | 'createdAt'>): Promise<StudioAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<StudioAuditRecord[]>;
  findByOrganization(tenantId: string, orgId: string, limit?: number): Promise<StudioAuditRecord[]>;
}

export { type Result, type EventEnvelope };