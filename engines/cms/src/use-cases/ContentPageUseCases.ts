/**
 * CMS Engine — Content & Page Lifecycle Use Cases
 *
 * Sprint C: CMS manages Content + Page only.
 * Theme/Component는 read-only Host Interface로만 참조.
 */
import { Ok, Err, type Result, ValidationError, ConflictError, NotFoundError, z } from '@platform/core-sdk';
import {
  createContentSchema, updateContentSchema, contentActionSchema,
  createPageSchema, updatePageSchema, pageActionSchema,
  createLocaleVariantSchema,
} from '../domain/validation.js';
import { CMS_EVENTS, CMS_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { CMSUseCaseDeps } from './types.js';
import type { Content, ContentVersion, Page, LocaleVariant } from '../interfaces/index.js';

const now = (deps: CMSUseCaseDeps) => deps.clock.now().toISOString();

// ═══════════════════════════════════════════
// CONTENT LIFECYCLE (5)
// ═══════════════════════════════════════════

export async function createContentUseCase(
  input: z.infer<typeof createContentSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ contentId: string; version: string }, ValidationError>> {
  const v = createContentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  const id = deps.idGenerator.generate();
  const versionId = deps.idGenerator.generate();
  const ts = now(deps);
  const version = '1.0.0';
  const content: Content = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    type: d.type, status: 'Draft', body: d.body, locale: d.locale as Content['locale'],
    metadata: d.metadata ?? {},
    parentContentId: d.parentContentId ?? null, version,
    createdAt: ts, updatedAt: ts, publishedAt: null, createdBy: d.actorId,
  };
  await deps.contentRepo.insert(content);
  const cv: ContentVersion = {
    id: versionId, tenantId: d.tenantId, contentId: id, version, body: d.body,
    locale: d.locale as Content['locale'], createdAt: ts, createdBy: d.actorId,
  };
  await deps.contentVersionRepo.insert(cv);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CMS_EVENTS.CONTENT_CREATED, CMS_EVENT_SCHEMAS['cms.content.created'], { contentId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'content_created', { type: d.type }, 'content', id);
  return Ok({ contentId: id, version });
}

export async function updateContentUseCase(
  input: z.infer<typeof updateContentSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ contentId: string; version: string }, ValidationError | NotFoundError>> {
  const v = updateContentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.contentRepo.findById(d.tenantId, d.contentId);
  if (!c) return Err(new NotFoundError('Content not found'));
  const nowTs = now(deps);
  // Bump version on update (semver minor)
  const oldVersion = c.version;
  const parts = oldVersion.split('.').map(Number);
  parts[1] = (parts[1] ?? 0) + 1; parts[2] = 0;
  const newVersion = parts.join('.');
  const patch: Partial<Content> = { updatedAt: nowTs, version: newVersion };
  if (d.body !== undefined) patch.body = d.body;
  if (d.metadata !== undefined) patch.metadata = d.metadata;
  await deps.contentRepo.update(d.tenantId, d.contentId, patch);
  if (d.body !== undefined) {
    const versionId = deps.idGenerator.generate();
    await deps.contentVersionRepo.insert({
      id: versionId, tenantId: d.tenantId, contentId: d.contentId, version: newVersion,
      body: d.body, locale: c.locale, createdAt: nowTs, createdBy: d.actorId,
    });
  }
  await deps.eventBus.emit(envelope(deps, d.contentId, d.tenantId, d.correlationId, CMS_EVENTS.CONTENT_UPDATED, CMS_EVENT_SCHEMAS['cms.content.updated'], { contentId: d.contentId, version: newVersion }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'content_updated', { newVersion }, 'content', d.contentId);
  return Ok({ contentId: d.contentId, version: newVersion });
}

export async function deleteContentUseCase(
  input: z.infer<typeof contentActionSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ contentId: string; deleted: boolean }, ValidationError | NotFoundError>> {
  const v = contentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.contentRepo.findById(d.tenantId, d.contentId);
  if (!c) return Err(new NotFoundError('Content not found'));
  await deps.contentRepo.update(d.tenantId, d.contentId, { status: 'Archived', updatedAt: now(deps) });
  await deps.eventBus.emit(envelope(deps, d.contentId, d.tenantId, d.correlationId, CMS_EVENTS.CONTENT_DELETED, CMS_EVENT_SCHEMAS['cms.content.deleted'], { contentId: d.contentId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'content_deleted', {}, 'content', d.contentId);
  return Ok({ contentId: d.contentId, deleted: true });
}

export async function getContentUseCase(
  tenantId: string, contentId: string, deps: CMSUseCaseDeps,
): Promise<Result<Content, NotFoundError>> {
  const c = await deps.contentRepo.findById(tenantId, contentId);
  if (!c) return Err(new NotFoundError('Content not found'));
  return Ok(c);
}

export async function listContentByTypeUseCase(
  tenantId: string, type: Content['type'], deps: CMSUseCaseDeps,
): Promise<Result<Content[], NotFoundError>> {
  return Ok(await deps.contentRepo.findByType(tenantId, type));
}

export async function publishContentUseCase(
  input: z.infer<typeof contentActionSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ contentId: string; publishedAt: string }, ValidationError | NotFoundError>> {
  const v = contentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.contentRepo.findById(d.tenantId, d.contentId);
  if (!c) return Err(new NotFoundError('Content not found'));
  if (c.status === 'Published') return Err(new ValidationError('Already published'));
  const ts = now(deps);
  await deps.contentRepo.update(d.tenantId, d.contentId, { status: 'Published', publishedAt: ts, updatedAt: ts });
  await deps.eventBus.emit(envelope(deps, d.contentId, d.tenantId, d.correlationId, CMS_EVENTS.CONTENT_PUBLISHED, CMS_EVENT_SCHEMAS['cms.content.published'], { contentId: d.contentId, publishedAt: ts }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'content_published', {}, 'content', d.contentId);
  return Ok({ contentId: d.contentId, publishedAt: ts });
}

export async function listContentVersionsUseCase(
  tenantId: string, contentId: string, deps: CMSUseCaseDeps,
): Promise<Result<ContentVersion[], NotFoundError>> {
  return Ok(await deps.contentVersionRepo.findByContent(tenantId, contentId));
}

// ═══════════════════════════════════════════
// PAGE LIFECYCLE (5)
// ═══════════════════════════════════════════

export async function createPageUseCase(
  input: z.infer<typeof createPageSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ pageId: string }, ValidationError | ConflictError>> {
  const v = createPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  if (await deps.pageRepo.existsBySlug(d.tenantId, d.slug)) return Err(new ConflictError('slug already exists'));
  const maxPages = await deps.policyProvider.getMaxPagesPerOrg(d.tenantId);
  const current = await deps.pageRepo.countByOrganization(d.tenantId, d.organizationId);
  if (current >= maxPages) return Err(new ConflictError(`Max pages (${maxPages}) reached`));
  // Verify themeRef exists via read-only host interface (no write)
  const themeResult = await deps.themeReader.resolveThemeManifest(d.tenantId, d.themeRef);
  if (!themeResult.ok || !themeResult.value.manifestHash) return Err(new ValidationError('Theme reference invalid'));

  const id = deps.idGenerator.generate(); const ts = now(deps);
  const page: Page = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    slug: d.slug, title: d.title, description: d.description ?? '',
    status: 'Draft', defaultLocale: d.defaultLocale as Page['defaultLocale'],
    themeRef: d.themeRef, primaryComponentRefs: d.primaryComponentRefs ?? [],
    sectionIds: [], metadata: {},
    createdAt: ts, updatedAt: ts, publishedAt: null, createdBy: d.actorId,
  };
  await deps.pageRepo.insert(page);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CMS_EVENTS.PAGE_CREATED, CMS_EVENT_SCHEMAS['cms.page.created'], { pageId: id, slug: d.slug }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'page_created', { slug: d.slug }, 'page', id);
  return Ok({ pageId: id });
}

export async function updatePageUseCase(
  input: z.infer<typeof updatePageSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ pageId: string }, ValidationError | NotFoundError>> {
  const v = updatePageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const p = await deps.pageRepo.findById(d.tenantId, d.pageId);
  if (!p) return Err(new NotFoundError('Page not found'));
  const patch: Partial<Page> = { updatedAt: now(deps) };
  if (d.title !== undefined) patch.title = d.title;
  if (d.description !== undefined) patch.description = d.description;
  if (d.themeRef !== undefined) {
    // Verify new themeRef via read-only host interface
    const themeResult = await deps.themeReader.resolveThemeManifest(d.tenantId, d.themeRef);
    if (!themeResult.ok || !themeResult.value.manifestHash) return Err(new ValidationError('Theme reference invalid'));
    patch.themeRef = d.themeRef;
  }
  await deps.pageRepo.update(d.tenantId, d.pageId, patch);
  await deps.eventBus.emit(envelope(deps, d.pageId, d.tenantId, d.correlationId, CMS_EVENTS.PAGE_UPDATED, CMS_EVENT_SCHEMAS['cms.page.updated'], { pageId: d.pageId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'page_updated', {}, 'page', d.pageId);
  return Ok({ pageId: d.pageId });
}

export async function archivePageUseCase(
  input: z.infer<typeof pageActionSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ pageId: string; archived: boolean }, ValidationError | NotFoundError>> {
  const v = pageActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const p = await deps.pageRepo.findById(d.tenantId, d.pageId);
  if (!p) return Err(new NotFoundError('Page not found'));
  await deps.pageRepo.update(d.tenantId, d.pageId, { status: 'Archived', updatedAt: now(deps) });
  await deps.eventBus.emit(envelope(deps, d.pageId, d.tenantId, d.correlationId, CMS_EVENTS.PAGE_ARCHIVED, CMS_EVENT_SCHEMAS['cms.page.archived'], { pageId: d.pageId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'page_archived', {}, 'page', d.pageId);
  return Ok({ pageId: d.pageId, archived: true });
}

export async function getPageUseCase(
  tenantId: string, pageId: string, deps: CMSUseCaseDeps,
): Promise<Result<Page, NotFoundError>> {
  const p = await deps.pageRepo.findById(tenantId, pageId);
  if (!p) return Err(new NotFoundError('Page not found'));
  return Ok(p);
}

export async function listPagesUseCase(
  tenantId: string, deps: CMSUseCaseDeps,
): Promise<Result<Page[], NotFoundError>> {
  return Ok(await deps.pageRepo.findAll(tenantId));
}

// ═══════════════════════════════════════════
// LOCALE VARIANT (1)
// ═══════════════════════════════════════════

export async function createLocaleVariantUseCase(
  input: z.infer<typeof createLocaleVariantSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ localeVariantId: string }, ValidationError | NotFoundError>> {
  const v = createLocaleVariantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const p = await deps.pageRepo.findById(d.tenantId, d.pageId);
  if (!p) return Err(new NotFoundError('Page not found'));
  const existing = await deps.localeVariantRepo.findByPageAndLocale(d.tenantId, d.pageId, d.locale as LocaleVariant['locale']);
  if (existing) return Err(new ValidationError('Locale variant already exists'));
  const id = deps.idGenerator.generate(); const ts = now(deps);
  const lv: LocaleVariant = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageId: d.pageId,
    locale: d.locale as LocaleVariant['locale'], title: d.title, description: d.description ?? '',
    sectionOverrides: d.sectionOverrides ?? {},
    createdAt: ts, updatedAt: ts,
  };
  await deps.localeVariantRepo.insert(lv);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CMS_EVENTS.LOCALE_VARIANT_CREATED, CMS_EVENT_SCHEMAS['cms.locale.created'], { localeVariantId: id, locale: d.locale }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'locale_variant_created', { locale: d.locale }, 'locale', id);
  return Ok({ localeVariantId: id });
}