/**
 * Component Engine — Core Use Cases
 *
 * Component CRUD + lifecycle, Variant, Preset, Clone, Publish, Version
 */
import { Ok, Err, type Result, ValidationError, ConflictError, NotFoundError, z } from '@platform/core-sdk';
import {
  createComponentSchema, updateComponentSchema, componentActionSchema,
  createVariantSchema, createPresetSchema, cloneComponentSchema,
  createVersionSchema, rollbackVersionSchema,
} from '../domain/validation.js';
import { COMPONENT_EVENTS, COMPONENT_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { ComponentUseCaseDeps } from './types.js';
import type {
  ExperienceComponent, ComponentVariant, ComponentPreset, ComponentVersion,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// COMPONENT LIFECYCLE (9)
// ═══════════════════════════════════════════

export async function createComponentUseCase(
  input: z.infer<typeof createComponentSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; createdAt: string }, ValidationError | ConflictError>> {
  const v = createComponentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  if (await deps.componentRepo.existsBySlug(d.tenantId, d.slug)) return Err(new ConflictError('slug already exists'));
  const maxComps = await deps.policyProvider.getMaxComponentsPerOrg(d.tenantId);
  const current = await deps.componentRepo.countByOrganization(d.tenantId, d.organizationId);
  if (current >= maxComps) return Err(new ConflictError(`Max components (${maxComps}) reached`));

  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const component: ExperienceComponent = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, name: d.name, slug: d.slug,
    description: d.description ?? '', tier: d.tier, componentType: d.componentType, status: 'Draft',
    variantIds: [], presetIds: [], slotIds: [], tokenRefIds: [], stateIds: [], behaviorIds: [],
    compositionIds: [], patternIds: [], scoreId: null,
    themeId: d.themeId ?? null, experienceId: d.experienceId ?? null,
    industryAdapters: [], defaultProps: {}, attributes: {}, marketplaceTier: 'Private',
    version: '1.0.0', parentComponentId: null,
    createdAt: now, createdBy: d.actorId, updatedAt: now,
  };
  await deps.componentRepo.insert(component);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, COMPONENT_EVENTS.COMPONENT_CREATED, COMPONENT_EVENT_SCHEMAS['component.created'], { componentId: id }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'component_created', { name: d.name }, id);
  return Ok({ componentId: id, createdAt: now });
}

export async function updateComponentUseCase(
  input: z.infer<typeof updateComponentSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string }, ValidationError | NotFoundError>> {
  const v = updateComponentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const comp = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!comp) return Err(new NotFoundError('Component not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<ExperienceComponent> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.description !== undefined) patch.description = d.description;
  await deps.componentRepo.update(d.tenantId, d.componentId, patch);
  await deps.eventBus.emit(envelope(deps, d.componentId, d.tenantId, d.correlationId, COMPONENT_EVENTS.COMPONENT_UPDATED, COMPONENT_EVENT_SCHEMAS['component.updated'], { componentId: d.componentId }));
  await auditLog(deps, comp.organizationId, d.tenantId, d.actorId, d.correlationId, 'component_updated', {}, d.componentId);
  return Ok({ componentId: d.componentId });
}

export async function getComponentUseCase(
  tenantId: string, componentId: string, deps: ComponentUseCaseDeps,
): Promise<Result<ExperienceComponent, NotFoundError>> {
  const c = await deps.componentRepo.findById(tenantId, componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  return Ok(c);
}

export async function listComponentsUseCase(
  tenantId: string, deps: ComponentUseCaseDeps,
): Promise<Result<ExperienceComponent[], NotFoundError>> {
  return Ok(await deps.componentRepo.findAll(tenantId));
}

export async function archiveComponentUseCase(
  input: z.infer<typeof componentActionSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; archived: boolean }, ValidationError | NotFoundError>> {
  const v = componentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  if (c.status === 'Archived') return Err(new ValidationError('Already archived'));
  await deps.componentRepo.update(d.tenantId, d.componentId, { status: 'Archived', updatedAt: deps.clock.now().toISOString() });
  await auditLog(deps, c.organizationId, d.tenantId, d.actorId, d.correlationId, 'component_archived', {}, d.componentId);
  return Ok({ componentId: d.componentId, archived: true });
}

export async function restoreComponentUseCase(
  input: z.infer<typeof componentActionSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; restored: boolean }, ValidationError | NotFoundError>> {
  const v = componentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  await deps.componentRepo.update(d.tenantId, d.componentId, { status: 'Draft', updatedAt: deps.clock.now().toISOString() });
  await auditLog(deps, c.organizationId, d.tenantId, d.actorId, d.correlationId, 'component_restored', {}, d.componentId);
  return Ok({ componentId: d.componentId, restored: true });
}

export async function deleteComponentUseCase(
  input: z.infer<typeof componentActionSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; deleted: boolean }, ValidationError | NotFoundError>> {
  const v = componentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  // soft delete — set status to Deprecated
  await deps.componentRepo.update(d.tenantId, d.componentId, { status: 'Deprecated', updatedAt: deps.clock.now().toISOString() });
  await auditLog(deps, c.organizationId, d.tenantId, d.actorId, d.correlationId, 'component_deleted', {}, d.componentId);
  return Ok({ componentId: d.componentId, deleted: true });
}

export async function publishComponentUseCase(
  input: z.infer<typeof componentActionSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; published: boolean }, ValidationError | NotFoundError>> {
  const v = componentActionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  if (c.status === 'Published') return Err(new ValidationError('Already published'));
  await deps.componentRepo.update(d.tenantId, d.componentId, { status: 'Published', updatedAt: deps.clock.now().toISOString() });
  await deps.eventBus.emit(envelope(deps, d.componentId, d.tenantId, d.correlationId, COMPONENT_EVENTS.COMPONENT_PUBLISHED, COMPONENT_EVENT_SCHEMAS['component.published'], { componentId: d.componentId }));
  await auditLog(deps, c.organizationId, d.tenantId, d.actorId, d.correlationId, 'component_published', {}, d.componentId);
  return Ok({ componentId: d.componentId, published: true });
}

export async function cloneComponentUseCase(
  input: z.infer<typeof cloneComponentSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; clonedFrom: string }, ValidationError | NotFoundError | ConflictError>> {
  const v = cloneComponentSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const source = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!source) return Err(new NotFoundError('Source component not found'));
  if (await deps.componentRepo.existsBySlug(d.tenantId, d.newSlug)) return Err(new ConflictError('slug already exists'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const cloned: ExperienceComponent = {
    ...source,
    id, name: d.newName, slug: d.newSlug, status: 'Draft', parentComponentId: source.id,
    variantIds: [], presetIds: [], slotIds: [], tokenRefIds: [], stateIds: [], behaviorIds: [],
    compositionIds: [], patternIds: [], scoreId: null, version: '1.0.0',
    createdAt: now, createdBy: d.actorId, updatedAt: now,
  };
  await deps.componentRepo.insert(cloned);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId, COMPONENT_EVENTS.COMPONENT_CREATED, COMPONENT_EVENT_SCHEMAS['component.created'], { componentId: id, clonedFrom: d.componentId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'component_cloned', { sourceId: d.componentId, newId: id }, id);
  return Ok({ componentId: id, clonedFrom: d.componentId });
}

// ═══════════════════════════════════════════
// VARIANT (4)
// ═══════════════════════════════════════════

export async function createVariantUseCase(
  input: z.infer<typeof createVariantSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ variantId: string }, ValidationError | NotFoundError>> {
  const v = createVariantSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const variant: ComponentVariant = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, componentId: d.componentId,
    name: d.name, label: d.label, propOverrides: d.propOverrides, tokenOverrides: d.tokenOverrides,
    isDefault: d.isDefault ?? false, attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.variantRepo.insert(variant);
  await deps.componentRepo.update(d.tenantId, d.componentId, { variantIds: [...c.variantIds, id], updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.componentId, d.tenantId, d.correlationId, COMPONENT_EVENTS.COMPONENT_VARIANT_CREATED, COMPONENT_EVENT_SCHEMAS['component.variant.created'], { variantId: id, componentId: d.componentId }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'variant_created', { name: d.name }, d.componentId);
  return Ok({ variantId: id });
}

export async function updateVariantUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; variantId: string; name?: string; label?: string; propOverrides?: Record<string, unknown>; tokenOverrides?: Record<string, string> },
  deps: ComponentUseCaseDeps,
): Promise<Result<{ variantId: string }, ValidationError | NotFoundError>> {
  const v = await deps.variantRepo.findById(input.tenantId, input.variantId);
  if (!v) return Err(new NotFoundError('Variant not found'));
  const patch: Partial<ComponentVariant> = { updatedAt: deps.clock.now().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.label !== undefined) patch.label = input.label;
  if (input.propOverrides !== undefined) patch.propOverrides = input.propOverrides;
  if (input.tokenOverrides !== undefined) patch.tokenOverrides = input.tokenOverrides;
  await deps.variantRepo.update(input.tenantId, input.variantId, patch);
  return Ok({ variantId: input.variantId });
}

export async function getVariantUseCase(
  tenantId: string, variantId: string, deps: ComponentUseCaseDeps,
): Promise<Result<ComponentVariant, NotFoundError>> {
  const v = await deps.variantRepo.findById(tenantId, variantId);
  if (!v) return Err(new NotFoundError('Variant not found'));
  return Ok(v);
}

export async function recommendVariantUseCase(
  tenantId: string, componentId: string, context: { industry: string; style: string },
  deps: ComponentUseCaseDeps,
): Promise<Result<ComponentVariant | null, NotFoundError>> {
  const variants = await deps.variantRepo.findByComponent(tenantId, componentId);
  if (variants.length === 0) return Ok(null);
  // AI-aware: style-based recommendation
  const styleLower = context.style.toLowerCase();
  const match = variants.find(v => v.name.toLowerCase().includes(styleLower));
  return Ok(match ?? variants.find(v => v.isDefault) ?? variants[0]!);
}

// ═══════════════════════════════════════════
// PRESET (2)
// ═══════════════════════════════════════════

export async function createPresetUseCase(
  input: z.infer<typeof createPresetSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ presetId: string }, ValidationError | NotFoundError>> {
  const v = createPresetSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  const preset: ComponentPreset = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, componentId: d.componentId,
    name: d.name, description: d.description ?? '', frozenProps: d.frozenProps, frozenTokens: d.frozenTokens,
    attributes: {}, createdAt: now, updatedAt: now,
  };
  await deps.presetRepo.insert(preset);
  await deps.componentRepo.update(d.tenantId, d.componentId, { presetIds: [...c.presetIds, id], updatedAt: now });
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'preset_created', { name: d.name }, d.componentId);
  return Ok({ presetId: id });
}

export async function applyPresetUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; componentId: string; presetId: string },
  deps: ComponentUseCaseDeps,
): Promise<Result<{ applied: boolean; frozenProps: Record<string, unknown> }, ValidationError | NotFoundError>> {
  const preset = await deps.presetRepo.findById(input.tenantId, input.presetId);
  if (!preset) return Err(new NotFoundError('Preset not found'));
  const c = await deps.componentRepo.findById(input.tenantId, input.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  await deps.componentRepo.update(input.tenantId, input.componentId, { defaultProps: { ...c.defaultProps, ...preset.frozenProps }, updatedAt: deps.clock.now().toISOString() });
  return Ok({ applied: true, frozenProps: preset.frozenProps });
}

// ═══════════════════════════════════════════
// VERSION (3)
// ═══════════════════════════════════════════

export async function createVersionUseCase(
  input: z.infer<typeof createVersionSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ versionId: string; version: string }, ValidationError | NotFoundError>> {
  const v = createVersionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  const id = deps.idGenerator.generate(); const now = deps.clock.now().toISOString();
  await deps.versionRepo.deactivateAll(d.tenantId, d.componentId);
  const version: ComponentVersion = {
    id, tenantId: d.tenantId, organizationId: d.organizationId, componentId: d.componentId,
    version: d.version, changelog: d.changelog, snapshot: { ...c } as unknown as Record<string, unknown>,
    isActive: true, createdAt: now, createdBy: d.actorId,
  };
  await deps.versionRepo.insert(version);
  await deps.componentRepo.update(d.tenantId, d.componentId, { version: d.version, updatedAt: now });
  return Ok({ versionId: id, version: d.version });
}

export async function getVersionHistoryUseCase(
  tenantId: string, componentId: string, deps: ComponentUseCaseDeps,
): Promise<Result<ComponentVersion[], NotFoundError>> {
  return Ok(await deps.versionRepo.findByComponent(tenantId, componentId));
}

export async function rollbackVersionUseCase(
  input: z.infer<typeof rollbackVersionSchema>, deps: ComponentUseCaseDeps,
): Promise<Result<{ componentId: string; rolledBackTo: string }, ValidationError | NotFoundError>> {
  const v = rollbackVersionSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const c = await deps.componentRepo.findById(d.tenantId, d.componentId);
  if (!c) return Err(new NotFoundError('Component not found'));
  const versions = await deps.versionRepo.findByComponent(d.tenantId, d.componentId);
  const target = versions.find(ver => ver.version === d.targetVersion);
  if (!target) return Err(new NotFoundError('Version not found'));
  await deps.versionRepo.deactivateAll(d.tenantId, d.componentId);
  await deps.versionRepo.update(d.tenantId, target.id, { isActive: true });
  const snapshot = target.snapshot as Record<string, unknown>;
  const restoredVersion = snapshot['version'] as string ?? d.targetVersion;
  await deps.componentRepo.update(d.tenantId, d.componentId, { version: restoredVersion, updatedAt: deps.clock.now().toISOString() });
  return Ok({ componentId: d.componentId, rolledBackTo: d.targetVersion });
}
