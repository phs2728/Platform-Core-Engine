/**
 * CMS Engine — Section & Slot Use Cases
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  addSectionSchema, updateSectionSchema, pageActionSchema,
  createSlotSchema, assignSlotSchema,
} from '../domain/validation.js';
import { CMS_EVENTS, CMS_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { CMSUseCaseDeps } from './types.js';
import type { PageSection, ContentSlot } from '../interfaces/index.js';

const now = (deps: CMSUseCaseDeps) => deps.clock.now().toISOString();

// ═══════════════════════════════════════════
// SECTION (3)
// ═══════════════════════════════════════════

export async function addSectionUseCase(
  input: z.infer<typeof addSectionSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ sectionId: string }, ValidationError | NotFoundError>> {
  const v = addSectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const page = await deps.pageRepo.findById(d.tenantId, d.pageId);
  if (!page) return Err(new NotFoundError('Page not found'));
  // Verify componentRef exists via read-only host interface
  const componentResult = await deps.componentReader.getComponent(d.tenantId, d.componentRef);
  if (!componentResult.ok || !componentResult.value.version) return Err(new ValidationError('Component reference invalid'));
  // Verify themeOverrideRef if provided (read-only)
  if (d.themeOverrideRef !== undefined && d.themeOverrideRef !== null) {
    const themeResult = await deps.themeReader.resolveThemeManifest(d.tenantId, d.themeOverrideRef);
    if (!themeResult.ok || !themeResult.value.manifestHash) return Err(new ValidationError('Theme override reference invalid'));
  }
  const id = deps.idGenerator.generate(); const ts = now(deps);
  const section: PageSection = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, pageId: d.pageId,
    name: d.name, order: d.order, componentRef: d.componentRef,
    themeOverrideRef: d.themeOverrideRef ?? null, slotIds: [],
    visibilityRules: {}, attributes: {},
    createdAt: ts, updatedAt: ts,
  };
  await deps.sectionRepo.insert(section);
  await deps.pageRepo.update(d.tenantId, d.pageId, { sectionIds: [...page.sectionIds, id], updatedAt: ts });
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CMS_EVENTS.SECTION_ADDED, CMS_EVENT_SCHEMAS['cms.section.added'], { sectionId: id, pageId: d.pageId, componentRef: d.componentRef }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'section_added', { name: d.name, componentRef: d.componentRef }, 'section', id);
  return Ok({ sectionId: id });
}

export async function updateSectionUseCase(
  input: z.infer<typeof updateSectionSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ sectionId: string }, ValidationError | NotFoundError>> {
  const v = updateSectionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const s = await deps.sectionRepo.findById(d.tenantId, d.sectionId);
  if (!s) return Err(new NotFoundError('Section not found'));
  const patch: Partial<PageSection> = { updatedAt: now(deps) };
  if (d.name !== undefined) patch.name = d.name;
  if (d.order !== undefined) patch.order = d.order;
  await deps.sectionRepo.update(d.tenantId, d.sectionId, patch);
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'section_updated', {}, 'section', d.sectionId);
  return Ok({ sectionId: d.sectionId });
}

export async function removeSectionUseCase(
  input: z.infer<typeof pageActionSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ pageId: string; sectionId: string; removed: boolean }, ValidationError | NotFoundError>> {
  const v = pageActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const s = await deps.sectionRepo.findById(d.tenantId, d.pageId);
  if (!s) return Err(new NotFoundError('Section not found'));
  await deps.sectionRepo.delete(d.tenantId, d.pageId);
  await deps.pageRepo.update(s.tenantId, s.pageId, { sectionIds: s.slotIds.filter(id => id !== d.pageId), updatedAt: now(deps) });
  await deps.eventBus.emit(envelope(deps, s.id, d.tenantId, d.correlationId, CMS_EVENTS.SECTION_REMOVED, CMS_EVENT_SCHEMAS['cms.section.removed'], { sectionId: s.id, pageId: s.pageId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'section_removed', {}, 'section', s.id);
  return Ok({ pageId: s.pageId, sectionId: s.id, removed: true });
}

// ═══════════════════════════════════════════
// CONTENT SLOT (3)
// ═══════════════════════════════════════════

export async function createContentSlotUseCase(
  input: z.infer<typeof createSlotSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ slotId: string }, ValidationError | NotFoundError>> {
  const v = createSlotSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const section = await deps.sectionRepo.findById(d.tenantId, d.sectionId);
  if (!section) return Err(new NotFoundError('Section not found'));
  if (d.contentId !== undefined && d.contentId !== null) {
    const c = await deps.contentRepo.findById(d.tenantId, d.contentId);
    if (!c) return Err(new NotFoundError('Content not found'));
  }
  const id = deps.idGenerator.generate(); const ts = now(deps);
  const slot: ContentSlot = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, sectionId: d.sectionId,
    slotName: d.slotName, contentId: d.contentId ?? null,
    required: d.required, fallbackContentId: d.fallbackContentId ?? null,
    attributes: {}, createdAt: ts, updatedAt: ts,
  };
  await deps.slotRepo.insert(slot);
  await deps.sectionRepo.update(d.tenantId, d.sectionId, { slotIds: [...section.slotIds, id], updatedAt: ts });
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, CMS_EVENTS.SLOT_CREATED, CMS_EVENT_SCHEMAS['cms.slot.created'], { slotId: id, sectionId: d.sectionId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'slot_created', { slotName: d.slotName }, 'slot', id);
  return Ok({ slotId: id });
}

export async function assignContentToSlotUseCase(
  input: z.infer<typeof assignSlotSchema>, deps: CMSUseCaseDeps,
): Promise<Result<{ slotId: string; assigned: boolean }, ValidationError | NotFoundError>> {
  const v = assignSlotSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const slot = await deps.slotRepo.findById(d.tenantId, d.slotId);
  if (!slot) return Err(new NotFoundError('Slot not found'));
  const content = await deps.contentRepo.findById(d.tenantId, d.contentId);
  if (!content) return Err(new NotFoundError('Content not found'));
  await deps.slotRepo.update(d.tenantId, d.slotId, { contentId: d.contentId, updatedAt: now(deps) });
  await deps.eventBus.emit(envelope(deps, d.slotId, d.tenantId, d.correlationId, CMS_EVENTS.SLOT_ASSIGNED, CMS_EVENT_SCHEMAS['cms.slot.assigned'], { slotId: d.slotId, contentId: d.contentId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'slot_assigned', { contentId: d.contentId }, 'slot', d.slotId);
  return Ok({ slotId: d.slotId, assigned: true });
}

export async function removeContentFromSlotUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; slotId: string }, deps: CMSUseCaseDeps,
): Promise<Result<{ slotId: string; unassigned: boolean }, ValidationError | NotFoundError>> {
  const slot = await deps.slotRepo.findById(input.tenantId, input.slotId);
  if (!slot) return Err(new NotFoundError('Slot not found'));
  await deps.slotRepo.update(input.tenantId, input.slotId, { contentId: null, updatedAt: now(deps) });
  await auditLog(deps, slot.organizationId, input.tenantId, input.actorId, input.correlationId, 'slot_unassigned', {}, 'slot', input.slotId);
  return Ok({ slotId: input.slotId, unassigned: true });
}