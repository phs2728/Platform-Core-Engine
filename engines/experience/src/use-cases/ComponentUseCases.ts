/**
 * Experience Engine — Component Use Cases (Layout, Hero, Banner, Navigation, Dashboard)
 *
 * 17 use cases covering the layout, hero, banner, navigation, and
 * dashboard lifecycles. Reconstructed under Recovery Authorization
 * EXP-RECOVERY-001.
 */
import { Ok, Err, type Result, ValidationError, NotFoundError, z } from '@platform/core-sdk';
import {
  createLayoutSchema, updateLayoutSchema, publishLayoutSchema, cloneLayoutSchema, validateLayoutSchema,
  createHeroSchema, updateHeroSchema, publishHeroSchema,
  createBannerSchema, updateBannerSchema, publishBannerSchema,
  createNavigationSchema, updateNavigationSchema, publishNavigationSchema,
  createDashboardSchema, updateDashboardSchema, publishDashboardSchema,
} from '../domain/validation.js';
import { EXPERIENCE_EVENTS, EXPERIENCE_EVENT_SCHEMAS } from '../domain/events.js';
import { envelope, auditLog } from './helpers.js';
import type { ExperienceUseCaseDeps } from './types.js';
import type { Layout, Hero, Banner, Navigation, Dashboard } from '../interfaces/index.js';

// ── LAYOUT ──
export async function createLayoutUseCase(
  input: z.infer<typeof createLayoutSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ layoutId: string; createdAt: string }, ValidationError>> {
  const v = createLayoutSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;
  const orgOk = await deps.organizationVerifier.verify(d.tenantId, d.organizationId);
  if (!orgOk) return Err(new ValidationError('Organization not found'));
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const layout: Layout = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, slug: d.slug, type: d.type, description: d.description,
    gridConfig: d.gridConfig, sectionRefs: d.sectionRefs ?? [],
    status: 'Draft', attributes: d.attributes, metadata: d.metadata,
    createdAt: now, updatedAt: now,
  };
  await deps.layoutRepo.insert(layout);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.LAYOUT_CREATED, EXPERIENCE_EVENT_SCHEMAS['layout.created'], { layoutId: id, type: d.type }));
  await auditLog(deps, d.organizationId, d.tenantId, d.actorId, d.correlationId, 'layout_created', { type: d.type });
  return Ok({ layoutId: id, createdAt: now });
}

export async function updateLayoutUseCase(
  input: z.infer<typeof updateLayoutSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ layoutId: string; updatedAt: string }, ValidationError | NotFoundError>> {
  const v = updateLayoutSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const layout = await deps.layoutRepo.findById(d.tenantId, d.layoutId);
  if (!layout) return Err(new NotFoundError('Layout not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<Layout> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.description !== undefined) patch.description = d.description;
  if (d.gridConfig !== undefined) patch.gridConfig = d.gridConfig;
  if (d.sectionRefs !== undefined) patch.sectionRefs = d.sectionRefs;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  if (d.metadata !== undefined) patch.metadata = d.metadata;
  await deps.layoutRepo.update(d.tenantId, d.layoutId, patch);
  await deps.eventBus.emit(envelope(deps, d.layoutId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.LAYOUT_UPDATED, EXPERIENCE_EVENT_SCHEMAS['layout.updated'], { layoutId: d.layoutId }));
  await auditLog(deps, layout.organizationId, d.tenantId, d.actorId, d.correlationId, 'layout_updated', { layoutId: d.layoutId });
  return Ok({ layoutId: d.layoutId, updatedAt: now });
}

export async function publishLayoutUseCase(
  input: z.infer<typeof publishLayoutSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ layoutId: string; publishedAt: string }, ValidationError | NotFoundError>> {
  const v = publishLayoutSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const layout = await deps.layoutRepo.findById(d.tenantId, d.layoutId);
  if (!layout) return Err(new NotFoundError('Layout not found'));
  const now = deps.clock.now().toISOString();
  await deps.layoutRepo.publish(d.tenantId, d.layoutId);
  await deps.layoutRepo.update(d.tenantId, d.layoutId, { status: 'Published', publishedAt: now, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.layoutId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.LAYOUT_PUBLISHED, EXPERIENCE_EVENT_SCHEMAS['layout.published'], { layoutId: d.layoutId }));
  await auditLog(deps, layout.organizationId, d.tenantId, d.actorId, d.correlationId, 'layout_published', { layoutId: d.layoutId });
  return Ok({ layoutId: d.layoutId, publishedAt: now });
}

export async function cloneLayoutUseCase(
  input: z.infer<typeof cloneLayoutSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ layoutId: string; createdAt: string }, ValidationError | NotFoundError>> {
  const v = cloneLayoutSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const src = await deps.layoutRepo.findById(d.tenantId, d.sourceLayoutId);
  if (!src) return Err(new NotFoundError('Source layout not found'));
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const cloned: Layout = { ...src, id, name: d.name, slug: d.slug, status: 'Draft', publishedAt: undefined, createdAt: now, updatedAt: now };
  await deps.layoutRepo.insert(cloned);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.LAYOUT_CLONED, EXPERIENCE_EVENT_SCHEMAS['layout.cloned'],
    { layoutId: id, sourceLayoutId: d.sourceLayoutId }));
  return Ok({ layoutId: id, createdAt: now });
}

export async function validateLayoutUseCase(
  input: z.infer<typeof validateLayoutSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ valid: boolean; errors: string[] }, ValidationError>> {
  const v = validateLayoutSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const layout = await deps.layoutRepo.findById(d.tenantId, d.layoutId);
  if (!layout) return Err(new ValidationError('Layout not found'));
  const errors: string[] = [];
  if (!layout.name) errors.push('name is required');
  if (!layout.slug || !/^[a-z0-9-]+$/.test(layout.slug)) errors.push('slug is invalid');
  if (!layout.gridConfig) errors.push('gridConfig is missing');
  await deps.eventBus.emit(envelope(deps, d.layoutId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.LAYOUT_VALIDATED, EXPERIENCE_EVENT_SCHEMAS['layout.validated'],
    { layoutId: d.layoutId, valid: errors.length === 0 }));
  return Ok({ valid: errors.length === 0, errors });
}

// ── HERO ──
export async function createHeroUseCase(
  input: z.infer<typeof createHeroSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ heroId: string; createdAt: string }, ValidationError>> {
  const v = createHeroSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const hero: Hero = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, headline: d.headline, subheadline: d.subheadline,
    backgroundMediaRefId: d.backgroundMediaRefId, mediaRefIds: d.mediaRefIds,
    overlay: d.overlay, ctaIds: d.ctaIds ?? [],
    status: 'Draft', attributes: d.attributes, metadata: d.metadata,
    createdAt: now, updatedAt: now,
  };
  await deps.heroRepo.insert(hero);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.HERO_CREATED, EXPERIENCE_EVENT_SCHEMAS['hero.created'], { heroId: id }));
  return Ok({ heroId: id, createdAt: now });
}

export async function updateHeroUseCase(
  input: z.infer<typeof updateHeroSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ heroId: string; updatedAt: string }, ValidationError | NotFoundError>> {
  const v = updateHeroSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const hero = await deps.heroRepo.findById(d.tenantId, d.heroId);
  if (!hero) return Err(new NotFoundError('Hero not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<Hero> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.headline !== undefined) patch.headline = d.headline;
  if (d.subheadline !== undefined) patch.subheadline = d.subheadline;
  if (d.backgroundMediaRefId !== undefined) patch.backgroundMediaRefId = d.backgroundMediaRefId;
  if (d.mediaRefIds !== undefined) patch.mediaRefIds = d.mediaRefIds;
  if (d.overlay !== undefined) patch.overlay = d.overlay;
  if (d.ctaIds !== undefined) patch.ctaIds = d.ctaIds;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  if (d.metadata !== undefined) patch.metadata = d.metadata;
  await deps.heroRepo.update(d.tenantId, d.heroId, patch);
  await deps.eventBus.emit(envelope(deps, d.heroId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.HERO_UPDATED, EXPERIENCE_EVENT_SCHEMAS['hero.updated'], { heroId: d.heroId }));
  return Ok({ heroId: d.heroId, updatedAt: now });
}

export async function publishHeroUseCase(
  input: z.infer<typeof publishHeroSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ heroId: string; publishedAt: string }, ValidationError | NotFoundError>> {
  const v = publishHeroSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const hero = await deps.heroRepo.findById(d.tenantId, d.heroId);
  if (!hero) return Err(new NotFoundError('Hero not found'));
  const now = deps.clock.now().toISOString();
  await deps.heroRepo.publish(d.tenantId, d.heroId);
  await deps.heroRepo.update(d.tenantId, d.heroId, { status: 'Published', publishedAt: now, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.heroId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.HERO_PUBLISHED, EXPERIENCE_EVENT_SCHEMAS['hero.published'], { heroId: d.heroId }));
  return Ok({ heroId: d.heroId, publishedAt: now });
}

// ── BANNER ──
export async function createBannerUseCase(
  input: z.infer<typeof createBannerSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ bannerId: string; createdAt: string }, ValidationError>> {
  const v = createBannerSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const banner: Banner = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, type: d.type, title: d.title, message: d.message,
    dismissible: d.dismissible, mediaRefId: d.mediaRefId,
    ctaIds: d.ctaIds ?? [], status: 'Draft', attributes: d.attributes, metadata: d.metadata,
    createdAt: now, updatedAt: now,
  };
  await deps.bannerRepo.insert(banner);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.BANNER_CREATED, EXPERIENCE_EVENT_SCHEMAS['banner.created'], { bannerId: id }));
  return Ok({ bannerId: id, createdAt: now });
}

export async function updateBannerUseCase(
  input: z.infer<typeof updateBannerSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ bannerId: string; updatedAt: string }, ValidationError | NotFoundError>> {
  const v = updateBannerSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const banner = await deps.bannerRepo.findById(d.tenantId, d.bannerId);
  if (!banner) return Err(new NotFoundError('Banner not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<Banner> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.type !== undefined) patch.type = d.type;
  if (d.title !== undefined) patch.title = d.title;
  if (d.message !== undefined) patch.message = d.message;
  if (d.dismissible !== undefined) patch.dismissible = d.dismissible;
  if (d.mediaRefId !== undefined) patch.mediaRefId = d.mediaRefId;
  if (d.ctaIds !== undefined) patch.ctaIds = d.ctaIds;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  if (d.metadata !== undefined) patch.metadata = d.metadata;
  await deps.bannerRepo.update(d.tenantId, d.bannerId, patch);
  await deps.eventBus.emit(envelope(deps, d.bannerId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.BANNER_UPDATED, EXPERIENCE_EVENT_SCHEMAS['banner.updated'], { bannerId: d.bannerId }));
  return Ok({ bannerId: d.bannerId, updatedAt: now });
}

export async function publishBannerUseCase(
  input: z.infer<typeof publishBannerSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ bannerId: string; publishedAt: string }, ValidationError | NotFoundError>> {
  const v = publishBannerSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const banner = await deps.bannerRepo.findById(d.tenantId, d.bannerId);
  if (!banner) return Err(new NotFoundError('Banner not found'));
  const now = deps.clock.now().toISOString();
  await deps.bannerRepo.publish(d.tenantId, d.bannerId);
  await deps.bannerRepo.update(d.tenantId, d.bannerId, { status: 'Published', publishedAt: now, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.bannerId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.BANNER_PUBLISHED, EXPERIENCE_EVENT_SCHEMAS['banner.published'], { bannerId: d.bannerId }));
  return Ok({ bannerId: d.bannerId, publishedAt: now });
}

// ── NAVIGATION ──
export async function createNavigationUseCase(
  input: z.infer<typeof createNavigationSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ navigationId: string; createdAt: string }, ValidationError>> {
  const v = createNavigationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const nav: Navigation = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, type: d.type, items: d.items ?? [],
    status: 'Draft', attributes: d.attributes, metadata: d.metadata,
    createdAt: now, updatedAt: now,
  };
  await deps.navigationRepo.insert(nav);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.NAVIGATION_CREATED, EXPERIENCE_EVENT_SCHEMAS['navigation.created'], { navigationId: id, type: d.type }));
  return Ok({ navigationId: id, createdAt: now });
}

export async function updateNavigationUseCase(
  input: z.infer<typeof updateNavigationSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ navigationId: string; updatedAt: string }, ValidationError | NotFoundError>> {
  const v = updateNavigationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const nav = await deps.navigationRepo.findById(d.tenantId, d.navigationId);
  if (!nav) return Err(new NotFoundError('Navigation not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<Navigation> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.type !== undefined) patch.type = d.type;
  if (d.items !== undefined) patch.items = d.items;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  if (d.metadata !== undefined) patch.metadata = d.metadata;
  await deps.navigationRepo.update(d.tenantId, d.navigationId, patch);
  await deps.eventBus.emit(envelope(deps, d.navigationId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.NAVIGATION_UPDATED, EXPERIENCE_EVENT_SCHEMAS['navigation.updated'], { navigationId: d.navigationId }));
  return Ok({ navigationId: d.navigationId, updatedAt: now });
}

export async function publishNavigationUseCase(
  input: z.infer<typeof publishNavigationSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ navigationId: string; publishedAt: string }, ValidationError | NotFoundError>> {
  const v = publishNavigationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const nav = await deps.navigationRepo.findById(d.tenantId, d.navigationId);
  if (!nav) return Err(new NotFoundError('Navigation not found'));
  const now = deps.clock.now().toISOString();
  await deps.navigationRepo.publish(d.tenantId, d.navigationId);
  await deps.navigationRepo.update(d.tenantId, d.navigationId, { status: 'Published', publishedAt: now, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.navigationId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.NAVIGATION_PUBLISHED, EXPERIENCE_EVENT_SCHEMAS['navigation.published'], { navigationId: d.navigationId }));
  return Ok({ navigationId: d.navigationId, publishedAt: now });
}

// ── DASHBOARD ──
export async function createDashboardUseCase(
  input: z.infer<typeof createDashboardSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ dashboardId: string; createdAt: string }, ValidationError>> {
  const v = createDashboardSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const dash: Dashboard = {
    id, tenantId: d.tenantId, organizationId: d.organizationId,
    name: d.name, slug: d.slug, layoutRef: d.layoutRef ?? '', widgets: d.widgets ?? [],
    status: 'Draft', attributes: d.attributes, metadata: d.metadata,
    createdAt: now, updatedAt: now,
  };
  await deps.dashboardRepo.insert(dash);
  await deps.eventBus.emit(envelope(deps, id, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.DASHBOARD_CREATED, EXPERIENCE_EVENT_SCHEMAS['dashboard.created'], { dashboardId: id }));
  return Ok({ dashboardId: id, createdAt: now });
}

export async function updateDashboardUseCase(
  input: z.infer<typeof updateDashboardSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ dashboardId: string; updatedAt: string }, ValidationError | NotFoundError>> {
  const v = updateDashboardSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const dash = await deps.dashboardRepo.findById(d.tenantId, d.dashboardId);
  if (!dash) return Err(new NotFoundError('Dashboard not found'));
  const now = deps.clock.now().toISOString();
  const patch: Partial<Dashboard> = { updatedAt: now };
  if (d.name !== undefined) patch.name = d.name;
  if (d.layoutRef !== undefined) patch.layoutRef = d.layoutRef;
  if (d.widgets !== undefined) patch.widgets = d.widgets;
  if (d.attributes !== undefined) patch.attributes = d.attributes;
  if (d.metadata !== undefined) patch.metadata = d.metadata;
  await deps.dashboardRepo.update(d.tenantId, d.dashboardId, patch);
  await deps.eventBus.emit(envelope(deps, d.dashboardId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.DASHBOARD_UPDATED, EXPERIENCE_EVENT_SCHEMAS['dashboard.updated'], { dashboardId: d.dashboardId }));
  return Ok({ dashboardId: d.dashboardId, updatedAt: now });
}

export async function publishDashboardUseCase(
  input: z.infer<typeof publishDashboardSchema>, deps: ExperienceUseCaseDeps,
): Promise<Result<{ dashboardId: string; publishedAt: string }, ValidationError | NotFoundError>> {
  const v = publishDashboardSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input'));
  const d = v.data;
  const dash = await deps.dashboardRepo.findById(d.tenantId, d.dashboardId);
  if (!dash) return Err(new NotFoundError('Dashboard not found'));
  const now = deps.clock.now().toISOString();
  await deps.dashboardRepo.publish(d.tenantId, d.dashboardId);
  await deps.dashboardRepo.update(d.tenantId, d.dashboardId, { status: 'Published', publishedAt: now, updatedAt: now });
  await deps.eventBus.emit(envelope(deps, d.dashboardId, d.tenantId, d.correlationId,
    EXPERIENCE_EVENTS.DASHBOARD_PUBLISHED, EXPERIENCE_EVENT_SCHEMAS['dashboard.published'], { dashboardId: d.dashboardId }));
  return Ok({ dashboardId: d.dashboardId, publishedAt: now });
}
