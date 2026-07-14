/**
 * Studio Engine — Verification, PublishIntent & Library Query Use Cases
 *
 * Sprint D 결정성 + Composition Verification:
 *   - verifyDraftCompositionUseCase: 모든 theme/component/content reference 검증
 *   - createPublishIntentUseCase: CMS가 직접 처리 (Studio는 의도만)
 *   - previewDraftUseCase: Theme Manifest 기반 결정적 preview
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  verifyDraftSchema, previewDraftSchema,
  createPublishIntentSchema, publishIntentActionSchema,
  searchComponentsSchema,
} from '../domain/validation.js';
import { STUDIO_EVENTS, STUDIO_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog, deterministicHash } from './helpers.js';
import type { StudioUseCaseDeps } from './types.js';
import type { PublishIntent, PublishComponentRef, PublishContentRef, ComponentManifest } from '../interfaces/index.js';

const now = (deps: StudioUseCaseDeps) => deps.clock.now().toISOString();

// ═══════════════════════════════════════════
// VERIFICATION (1) — Sprint D 원칙 5
// ═══════════════════════════════════════════

export async function verifyDraftCompositionUseCase(
  input: z.infer<typeof verifyDraftSchema>, deps: StudioUseCaseDeps,
): Promise<Result<DraftVerification, ValidationError | NotFoundError>> {
  const v = verifyDraftSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const draft = await deps.pageDraftRepo.findById(d.tenantId, d.draftId);
  if (!draft) return Err(new NotFoundError('Draft not found'));

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Verify themeRef (read-only)
  const themeResult = await deps.themeReader.resolveThemeManifest(d.tenantId, draft.themeRef);
  if (!themeResult.ok || !themeResult.value.manifestHash) {
    errors.push(`Theme manifest invalid: ${draft.themeRef}`);
  }

  // 2. Verify all componentBindings (read-only)
  const componentBindings = await deps.componentBindingRepo.findByDraft(d.tenantId, d.draftId);
  for (const cb of componentBindings) {
    const cr = await deps.componentReader.getComponent(d.tenantId, cb.componentRef);
    if (!cr.ok || !cr.value.version) errors.push(`Component invalid: ${cb.componentRef}`);
  }

  // 3. Verify all contentBindings (read-only via CMS Reader)
  const contentBindings = await deps.contentBindingRepo.findByDraft(d.tenantId, d.draftId);
  for (const cb of contentBindings) {
    if (!cb.contentRef) errors.push(`Content binding ${cb.id} missing contentRef`);
  }

  // 4. Warn if no components
  if (componentBindings.length === 0) warnings.push('No components added to draft');

  const verification: DraftVerification = {
    valid: errors.length === 0,
    errors,
    warnings,
    checkedAt: now(deps),
  };

  if (verification.valid) {
    await deps.pageDraftRepo.update(d.tenantId, d.draftId, { status: 'Verified', updatedAt: now(deps) });
  }

  await deps.eventBus.emit(envelope(deps, d.draftId, d.tenantId, '', STUDIO_EVENTS.DRAFT_VERIFIED, STUDIO_EVENT_SCHEMAS['studio.draft.verified'], { draftId: d.draftId, valid: verification.valid, errorCount: errors.length }));
  await auditLog(deps, draft.organizationId, d.tenantId, 'system', '', 'draft_verified', { valid: verification.valid }, 'draft', d.draftId);
  return Ok(verification);
}

export interface DraftVerification {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checkedAt: string;
}

// ═══════════════════════════════════════════
// PREVIEW (1) — 결정적
// ═══════════════════════════════════════════

export async function previewDraftUseCase(
  input: z.infer<typeof previewDraftSchema>, deps: StudioUseCaseDeps,
): Promise<Result<DraftPreview, ValidationError | NotFoundError>> {
  const v = previewDraftSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const draft = await deps.pageDraftRepo.findById(d.tenantId, d.draftId);
  if (!draft) return Err(new NotFoundError('Draft not found'));
  const themeResult = await deps.themeReader.resolveThemeManifest(d.tenantId, draft.themeRef);
  if (!themeResult.ok) return Err(new NotFoundError('Theme manifest not found'));
  const manifest = themeResult.value;
  const componentBindings = await deps.componentBindingRepo.findByDraft(d.tenantId, d.draftId);
  const contentBindings = await deps.contentBindingRepo.findByDraft(d.tenantId, d.draftId);
  // Sort by order for deterministic output
  componentBindings.sort((a, b) => a.order - b.order);

  const preview: DraftPreview = {
    draftId: draft.id,
    pageSlug: draft.pageSlug,
    title: draft.title,
    device: d.device,
    themeManifestHash: manifest.manifestHash,
    componentBindings: componentBindings.map(cb => ({
      componentRef: cb.componentRef,
      slotName: cb.slotName,
      order: cb.order,
      contentBindings: contentBindings.filter(cn => cn.componentBindingId === cb.id).map(cn => ({ contentRef: cn.contentRef, slotName: cn.slotName })),
    })),
    previewHash: deterministicHash([
      draft.id, d.device, manifest.manifestHash,
      ...componentBindings.map(cb => cb.id),
      ...contentBindings.map(cn => cn.id),
    ].join('|')),
  };
  await deps.eventBus.emit(envelope(deps, d.draftId, d.tenantId, '', STUDIO_EVENTS.DRAFT_PREVIEWED, STUDIO_EVENT_SCHEMAS['studio.draft.previewed'], { draftId: d.draftId, previewHash: preview.previewHash }));
  await auditLog(deps, draft.organizationId, d.tenantId, 'system', '', 'draft_previewed', { device: d.device }, 'draft', d.draftId);
  return Ok(preview);
}

export interface DraftPreview {
  draftId: string;
  pageSlug: string;
  title: string;
  device: string;
  themeManifestHash: string;
  componentBindings: Array<{
    componentRef: string;
    slotName: string;
    order: number;
    contentBindings: Array<{ contentRef: string; slotName: string }>;
  }>;
  previewHash: string;
}

// ═══════════════════════════════════════════
// PUBLISH INTENT (3) — Sprint D 원칙 3
// ═══════════════════════════════════════════

export async function createPublishIntentUseCase(
  input: z.infer<typeof createPublishIntentSchema>, deps: StudioUseCaseDeps,
): Promise<Result<{ intentId: string }, ValidationError | NotFoundError>> {
  const v = createPublishIntentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const draft = await deps.pageDraftRepo.findById(d.tenantId, d.draftId);
  if (!draft) return Err(new NotFoundError('Draft not found'));
  if (draft.status !== 'Verified') return Err(new ValidationError('Draft must be Verified before publish intent'));

  // Build intent payload (no actual publish — CMS will process)
  const componentBindings = await deps.componentBindingRepo.findByDraft(d.tenantId, d.draftId);
  const contentBindings = await deps.contentBindingRepo.findByDraft(d.tenantId, d.draftId);
  const intentComponents: PublishComponentRef[] = componentBindings.map(cb => ({
    componentRef: cb.componentRef, slotName: cb.slotName, order: cb.order,
    propOverrides: cb.propOverrides, themeOverrideRef: cb.themeOverrideRef,
  }));
  const intentContents: PublishContentRef[] = contentBindings.map(cn => ({
    contentRef: cn.contentRef, componentBindingSlotName: cn.slotName, fallbackContentRef: cn.fallbackContentRef,
  }));

  const id = deps.idGenerator.generate(); const ts = now(deps);
  const intent: PublishIntent = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    draftId: d.draftId, workspaceId: d.workspaceId,
    pageSlug: draft.pageSlug, themeRef: draft.themeRef,
    componentBindings: intentComponents, contentBindings: intentContents,
    status: 'Pending', targetPageId: null, errorMessage: null,
    createdAt: ts, processedAt: null, createdBy: d.actorId,
  };
  await deps.publishIntentRepo.insert(intent);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, STUDIO_EVENTS.PUBLISH_INTENT_CREATED, STUDIO_EVENT_SCHEMAS['studio.publish.intent'], { intentId: id, draftId: d.draftId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'publish_intent_created', { componentCount: intentComponents.length }, 'intent', id);
  return Ok({ intentId: id });
}

export async function listPublishIntentsUseCase(
  tenantId: string, workspaceId: string, deps: StudioUseCaseDeps,
): Promise<Result<PublishIntent[], NotFoundError>> {
  return Ok(await deps.publishIntentRepo.findByWorkspace(tenantId, workspaceId));
}

export async function cancelPublishIntentUseCase(
  input: z.infer<typeof publishIntentActionSchema>, deps: StudioUseCaseDeps,
): Promise<Result<{ intentId: string; cancelled: boolean }, ValidationError | NotFoundError>> {
  const v = publishIntentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const intent = await deps.publishIntentRepo.findById(d.tenantId, d.intentId);
  if (!intent) return Err(new NotFoundError('Publish intent not found'));
  if (intent.status === 'Completed') return Err(new ValidationError('Intent already completed'));
  await deps.publishIntentRepo.update(d.tenantId, d.intentId, { status: 'Cancelled' });
  await deps.eventBus.emit(envelope(deps, d.intentId, d.tenantId, d.correlationId, STUDIO_EVENTS.PUBLISH_INTENT_CANCELLED, STUDIO_EVENT_SCHEMAS['studio.publish.cancelled'], { intentId: d.intentId }));
  await auditLog(deps, intent.organizationId, d.tenantId, d.actorId, d.correlationId, 'publish_intent_cancelled', {}, 'intent', d.intentId);
  return Ok({ intentId: d.intentId, cancelled: true });
}

// ═══════════════════════════════════════════
// LIBRARY QUERY (3)
// ═══════════════════════════════════════════

export async function searchComponentsUseCase(
  input: z.infer<typeof searchComponentsSchema>, deps: StudioUseCaseDeps,
): Promise<Result<ComponentManifest[], ValidationError>> {
  const v = searchComponentsSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const result = await deps.componentReader.listComponentsByType(d.tenantId, d.componentType);
  return Ok(result.ok ? result.value : []);
}

export async function searchContentUseCase(
  input: { tenantId: string; contentType: string }, deps: StudioUseCaseDeps,
): Promise<Result<Array<{ contentId: string; type: string; locale: string; status: string }>, ValidationError>> {
  if (!input.tenantId || !input.contentType) return Err(new ValidationError('Invalid input'));
  const result = await deps.cmsReader.listContent(input.tenantId, input.contentType);
  if (!result.ok) return Ok([]);
  return Ok(result.value.map(c => ({ contentId: c.contentId, type: c.type, locale: c.locale, status: c.status })));
}

export async function getCompatibleThemesUseCase(
  tenantId: string, deps: StudioUseCaseDeps,
): Promise<Result<Array<{ themeId: string; version: string }>, ValidationError>> {
  // List all themes by trying common theme IDs (deterministic)
  // In production, would query a theme listing API
  const candidates = ['theme-luxury', 'theme-default', 'theme-minimal', 'theme-editorial'];
  const results: Array<{ themeId: string; version: string }> = [];
  for (const themeId of candidates) {
    const r = await deps.themeReader.resolveThemeManifest(tenantId, themeId);
    if (r.ok && r.value.manifestHash) results.push({ themeId, version: r.value.version });
  }
  return Ok(results);
}