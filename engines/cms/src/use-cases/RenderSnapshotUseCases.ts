/**
 * CMS Engine — Render & Layout Snapshot Use Cases
 *
 * Sprint C 결정성: 같은 입력 → 항상 같은 출력
 * Theme Manifest (read-only) + Component Manifest (read-only) + Content (CMS-owned)
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import { renderPageSchema, createLayoutSnapshotSchema } from '../domain/validation.js';
import { CMS_EVENTS, CMS_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog, deterministicHash } from './helpers.js';
import type { CMSUseCaseDeps } from './types.js';
import type { LayoutSnapshot } from '../interfaces/index.js';

const now = (deps: CMSUseCaseDeps) => deps.clock.now().toISOString();

// ═══════════════════════════════════════════
// RENDER (3)
// 결정적: 같은 (pageId, locale, device) → 같은 rendered string
// ═══════════════════════════════════════════

export async function renderPageUseCase(
  input: z.infer<typeof renderPageSchema>, deps: CMSUseCaseDeps,
): Promise<Result<RenderedPage, ValidationError | NotFoundError>> {
  const v = renderPageSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const page = await deps.pageRepo.findById(d.tenantId, d.pageId);
  if (!page) return Err(new NotFoundError('Page not found'));

  // Resolve Theme Manifest (read-only)
  const themeResult = await deps.themeReader.resolveThemeManifest(d.tenantId, page.themeRef);
  if (!themeResult.ok) return Err(new NotFoundError('Theme manifest not found'));
  const manifest = themeResult.value;

  // Resolve locale variant if specified
  const locale = d.locale ?? page.defaultLocale;
  const localeVariant = await deps.localeVariantRepo.findByPageAndLocale(d.tenantId, page.id, locale as Parameters<typeof deps.localeVariantRepo.findByPageAndLocale>[2]);
  const title = localeVariant?.title ?? page.title;
  const description = localeVariant?.description ?? page.description;

  // Resolve sections
  const sections = await deps.sectionRepo.findByPage(d.tenantId, page.id);

  // Build rendered output (deterministic: sort sections by order)
  const renderedSections: RenderedSection[] = [];
  for (const s of sections) {
    const rs = await renderSectionUseCase({ tenantId: d.tenantId, sectionId: s.id, device: d.device }, deps);
    if (rs.ok) renderedSections.push(rs.value);
  }

  // Deterministic hash: sort sections by id to ensure stable output
  renderedSections.sort((a, b) => a.order - b.order);

  const rendered: RenderedPage = {
    pageId: page.id,
    slug: page.slug,
    title,
    description,
    locale,
    device: d.device,
    themeManifestHash: manifest.manifestHash,
    sections: renderedSections,
    // Deterministic hash: depends on (pageId + locale + device + manifest hash + sections hash)
    renderedHash: deterministicHash([
      page.id, locale, d.device, manifest.manifestHash,
      ...renderedSections.map(rs => rs.sectionId),
    ].join('|')),
  };
  await deps.eventBus.emit(envelope(deps, page.id, d.tenantId, '', CMS_EVENTS.PAGE_RENDERED, CMS_EVENT_SCHEMAS['cms.page.rendered'], { pageId: page.id, hash: rendered.renderedHash }));
  return Ok(rendered);
}

export async function renderSectionUseCase(
  input: { tenantId: string; sectionId: string; device: 'desktop' | 'tablet' | 'mobile' | 'watch' | 'tv' }, deps: CMSUseCaseDeps,
): Promise<Result<RenderedSection, NotFoundError>> {
  const section = await deps.sectionRepo.findById(input.tenantId, input.sectionId);
  if (!section) return Err(new NotFoundError('Section not found'));

  // Resolve component manifest (read-only)
  const componentResult = await deps.componentReader.getComponent(input.tenantId, section.componentRef);
  if (!componentResult.ok) return Err(new NotFoundError('Component manifest not found'));
  const component = componentResult.value;

  // Resolve theme override if any (read-only)
  let themeHash = '';
  const themeRef = section.themeOverrideRef;
  if (themeRef !== null) {
    const themeResult = await deps.themeReader.resolveThemeManifest(input.tenantId, themeRef);
    if (themeResult.ok) themeHash = themeResult.value.manifestHash;
  }

  // Resolve slots + content
  const slots = await deps.slotRepo.findBySection(input.tenantId, section.id);
  const renderedSlots: RenderedSlot[] = [];
  for (const slot of slots) {
    let contentBody: string | null = null;
    let contentId: string | null = null;
    if (slot.contentId !== null) {
      const c = await deps.contentRepo.findById(input.tenantId, slot.contentId);
      if (c) { contentBody = c.body; contentId = c.id; }
    }
    renderedSlots.push({
      slotName: slot.slotName,
      contentId,
      contentBody,
      required: slot.required,
    });
  }
  // Sort by slotName for deterministic output
  renderedSlots.sort((a, b) => a.slotName.localeCompare(b.slotName));

  return Ok({
    sectionId: section.id,
    name: section.name,
    order: section.order,
    componentRef: section.componentRef,
    componentVersion: component.version,
    themeHash,
    device: input.device,
    slots: renderedSlots,
  });
}

export async function renderPreviewUseCase(
  input: { tenantId: string; pageId: string; device: 'desktop' | 'tablet' | 'mobile' | 'watch' | 'tv' },
  deps: CMSUseCaseDeps,
): Promise<Result<{ pageId: string; device: string; previewUri: string; renderedHash: string }, ValidationError | NotFoundError>> {
  const rendered = await renderPageUseCase({ tenantId: input.tenantId, pageId: input.pageId, device: input.device }, deps);
  if (!rendered.ok) return Err(rendered.error);
  return Ok({
    pageId: rendered.value.pageId,
    device: input.device,
    previewUri: `cms://preview/${input.pageId}?device=${input.device}&hash=${rendered.value.renderedHash}`,
    renderedHash: rendered.value.renderedHash,
  });
}

// ═══════════════════════════════════════════
// LAYOUT SNAPSHOT (3)
// ═══════════════════════════════════════════

export async function createLayoutSnapshotUseCase(
  input: z.infer<typeof createLayoutSnapshotSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ snapshotId: string; renderedHash: string }, ValidationError | NotFoundError>> {
  const v = createLayoutSnapshotSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const rendered = await renderPageUseCase({ tenantId: d.tenantId, pageId: d.pageId, device: d.device }, deps);
  if (!rendered.ok) return Err(rendered.error);

  // Build content hashes from rendered sections
  const contentHashes: Record<string, string> = {};
  const componentManifestHashes: Record<string, string> = {};
  for (const s of rendered.value.sections) {
    componentManifestHashes[s.componentRef] = deterministicHash(s.componentRef + ':' + s.componentVersion);
    for (const slot of s.slots) {
      if (slot.contentId !== null) {
        contentHashes[slot.contentId] = deterministicHash(slot.contentId + ':' + (slot.contentBody ?? ''));
      }
    }
  }

  const id = deps.idGenerator.generate();
  const ts = now(deps);
  const snapshot: LayoutSnapshot = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    pageId: d.pageId, device: d.device,
    themeManifestHash: rendered.value.themeManifestHash,
    componentManifestHashes, contentHashes,
    renderedLayout: JSON.stringify(rendered.value),
    createdAt: ts,
  };
  await deps.layoutSnapshotRepo.insert(snapshot);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CMS_EVENTS.LAYOUT_SNAPSHOT_CREATED, CMS_EVENT_SCHEMAS['cms.snapshot.created'], { snapshotId: id, pageId: d.pageId, hash: rendered.value.renderedHash }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'layout_snapshot_created', { device: d.device }, 'snapshot', id);
  return Ok({ snapshotId: id, renderedHash: rendered.value.renderedHash });
}

export async function getLayoutSnapshotUseCase(
  tenantId: string, snapshotId: string, deps: CMSUseCaseDeps,
): Promise<Result<LayoutSnapshot, NotFoundError>> {
  const s = await deps.layoutSnapshotRepo.findById(tenantId, snapshotId);
  if (!s) return Err(new NotFoundError('Snapshot not found'));
  return Ok(s);
}

export async function compareLayoutSnapshotsUseCase(
  input: { tenantId: string; snapshotIdA: string; snapshotIdB: string }, deps: CMSUseCaseDeps,
): Promise<Result<{ identical: boolean; differences: string[] }, NotFoundError>> {
  const a = await deps.layoutSnapshotRepo.findById(input.tenantId, input.snapshotIdA);
  const b = await deps.layoutSnapshotRepo.findById(input.tenantId, input.snapshotIdB);
  if (!a) return Err(new NotFoundError('Snapshot A not found'));
  if (!b) return Err(new NotFoundError('Snapshot B not found'));
  const differences: string[] = [];
  if (a.themeManifestHash !== b.themeManifestHash) differences.push('themeManifestHash');
  if (a.device !== b.device) differences.push('device');
  // Compare content hashes
  const allContentIds = new Set([...Object.keys(a.contentHashes), ...Object.keys(b.contentHashes)]);
  for (const cid of allContentIds) {
    if (a.contentHashes[cid] !== b.contentHashes[cid]) differences.push(`content:${cid}`);
  }
  // Compare component hashes
  const allComponentRefs = new Set([...Object.keys(a.componentManifestHashes), ...Object.keys(b.componentManifestHashes)]);
  for (const cref of allComponentRefs) {
    if (a.componentManifestHashes[cref] !== b.componentManifestHashes[cref]) differences.push(`component:${cref}`);
  }
  return Ok({ identical: differences.length === 0, differences });
}

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface RenderedPage {
  pageId: string;
  slug: string;
  title: string;
  description: string;
  locale: string;
  device: string;
  themeManifestHash: string;
  sections: RenderedSection[];
  renderedHash: string;
}

export interface RenderedSection {
  sectionId: string;
  name: string;
  order: number;
  componentRef: string;
  componentVersion: string;
  themeHash: string;
  device: string;
  slots: RenderedSlot[];
}

export interface RenderedSlot {
  slotName: string;
  contentId: string | null;
  contentBody: string | null;
  required: boolean;
}