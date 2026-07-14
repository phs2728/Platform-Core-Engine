/**
 * CMS Engine RC1 — Public Interfaces
 *
 * Sprint C: Content-only ownership
 *  - Theme/Component는 절대 수정하지 않음 (read-only Host Interface)
 *  - Content, Page, Section, ContentSlot만 관리
 *  - renderPage는 Theme Manifest + Component + Content를 결정적으로 조립
 */
import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces — Read-Only (Sprint C 원칙 2)
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface IPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getMaxPagesPerOrg(tenantId: string): Promise<number>;
}

// ── Theme: read-only ──
export interface IThemeManifestReader {
  /**
   * CMS가 호출할 수 있는 유일한 Theme API.
   * Theme을 절대 수정/저장하지 않음.
   */
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

// ── Component: read-only ──
export interface IComponentReader {
  /**
   * CMS가 호출할 수 있는 유일한 Component API.
   * Component를 절대 수정/저장하지 않음.
   */
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

// ═══════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════

export type ContentStatus = 'Draft' | 'Published' | 'Archived';
export type ContentType = 'Text' | 'Image' | 'Video' | 'Audio' | 'Document' | 'Code' | 'JSON' | 'Markdown';
export type Locale = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'ka' | 'tr';
export type PageStatus = 'Draft' | 'Published' | 'Archived';
export type SlotType = 'headline' | 'subheadline' | 'body' | 'cta' | 'image' | 'video' | 'icon' | 'tag' | 'metadata' | 'custom';
export type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'watch' | 'tv';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface Content {
  id: string;
  tenantId: string;
  organizationId: string;
  type: ContentType;
  status: ContentStatus;
  body: string;
  locale: Locale;
  metadata: Record<string, unknown>;
  parentContentId: string | null;
  version: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  createdBy: string;
}

export interface ContentVersion {
  id: string;
  tenantId: string;
  contentId: string;
  version: string;
  body: string;
  locale: Locale;
  createdAt: string;
  createdBy: string;
}

export interface Page {
  id: string;
  tenantId: string;
  organizationId: string;
  slug: string;
  title: string;
  description: string;
  status: PageStatus;
  defaultLocale: Locale;
  themeRef: string;       // Theme reference (read-only)
  primaryComponentRefs: string[];  // Component references (read-only)
  sectionIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  createdBy: string;
}

export interface PageSection {
  id: string;
  tenantId: string;
  organizationId: string;
  pageId: string;
  name: string;
  order: number;
  componentRef: string;   // Component reference (read-only)
  themeOverrideRef: string | null;  // Theme reference (read-only, optional)
  slotIds: string[];
  visibilityRules: Record<string, unknown>;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContentSlot {
  id: string;
  tenantId: string;
  organizationId: string;
  sectionId: string;
  slotName: SlotType;
  contentId: string | null;  // CMS-owned Content reference
  required: boolean;
  fallbackContentId: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LocaleVariant {
  id: string;
  tenantId: string;
  organizationId: string;
  pageId: string;
  locale: Locale;
  title: string;
  description: string;
  sectionOverrides: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LayoutSnapshot {
  id: string;
  tenantId: string;
  organizationId: string;
  pageId: string;
  device: DeviceType;
  themeManifestHash: string;  // 결정적: theme reference의 hash
  componentManifestHashes: Record<string, string>;  // componentRef → hash
  contentHashes: Record<string, string>;  // contentId → hash
  renderedLayout: string;  // 결정적 serialized layout (no actual HTML generation)
  createdAt: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type CMSAuditEventType =
  | 'content_created' | 'content_updated' | 'content_deleted' | 'content_published'
  | 'page_created' | 'page_updated' | 'page_archived' | 'page_published'
  | 'section_added' | 'section_updated' | 'section_removed'
  | 'slot_created' | 'slot_assigned' | 'slot_unassigned'
  | 'locale_variant_created' | 'layout_snapshot_created' | 'page_rendered';

export interface CMSAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  entityType: 'content' | 'page' | 'section' | 'slot' | 'locale' | 'snapshot';
  entityId?: string | undefined;
  actorId: string;
  correlationId: string;
  eventType: CMSAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repository Contracts
// ═══════════════════════════════════════════

export interface IContentRepository {
  insert(c: Content): Promise<void>;
  findById(tenantId: string, id: string): Promise<Content | null>;
  findByType(tenantId: string, type: ContentType): Promise<Content[]>;
  findByOrganization(tenantId: string, orgId: string): Promise<Content[]>;
  update(tenantId: string, id: string, patch: Partial<Content>): Promise<void>;
  findAll(tenantId: string): Promise<Content[]>;
}

export interface IContentVersionRepository {
  insert(v: ContentVersion): Promise<void>;
  findById(tenantId: string, id: string): Promise<ContentVersion | null>;
  findByContent(tenantId: string, contentId: string): Promise<ContentVersion[]>;
}

export interface IPageRepository {
  insert(p: Page): Promise<void>;
  findById(tenantId: string, id: string): Promise<Page | null>;
  findBySlug(tenantId: string, slug: string): Promise<Page | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<Page[]>;
  update(tenantId: string, id: string, patch: Partial<Page>): Promise<void>;
  findAll(tenantId: string): Promise<Page[]>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
  countByOrganization(tenantId: string, orgId: string): Promise<number>;
}

export interface ISectionRepository {
  insert(s: PageSection): Promise<void>;
  findById(tenantId: string, id: string): Promise<PageSection | null>;
  findByPage(tenantId: string, pageId: string): Promise<PageSection[]>;
  update(tenantId: string, id: string, patch: Partial<PageSection>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface ISlotRepository {
  insert(s: ContentSlot): Promise<void>;
  findById(tenantId: string, id: string): Promise<ContentSlot | null>;
  findBySection(tenantId: string, sectionId: string): Promise<ContentSlot[]>;
  update(tenantId: string, id: string, patch: Partial<ContentSlot>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface ILocaleVariantRepository {
  insert(l: LocaleVariant): Promise<void>;
  findById(tenantId: string, id: string): Promise<LocaleVariant | null>;
  findByPage(tenantId: string, pageId: string): Promise<LocaleVariant[]>;
  findByPageAndLocale(tenantId: string, pageId: string, locale: Locale): Promise<LocaleVariant | null>;
  update(tenantId: string, id: string, patch: Partial<LocaleVariant>): Promise<void>;
}

export interface ILayoutSnapshotRepository {
  insert(s: LayoutSnapshot): Promise<void>;
  findById(tenantId: string, id: string): Promise<LayoutSnapshot | null>;
  findByPage(tenantId: string, pageId: string): Promise<LayoutSnapshot[]>;
  findByPageAndDevice(tenantId: string, pageId: string, device: DeviceType): Promise<LayoutSnapshot | null>;
}

export interface ICMSAuditRepository {
  insert(record: Omit<CMSAuditRecord, 'id' | 'createdAt'>): Promise<CMSAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<CMSAuditRecord[]>;
  findByOrganization(tenantId: string, orgId: string, limit?: number): Promise<CMSAuditRecord[]>;
}

export { type Result, type EventEnvelope };