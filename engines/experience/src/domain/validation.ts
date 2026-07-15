/**
 * Experience Engine — Validation Schemas (Zod)
 *
 * Reconstructed under Recovery Authorization EXP-RECOVERY-001.
 * Mirrors the structure of Theme/Component/CMS/Studio engines and
 * the original public contracts described in the README and
 * Trust Architecture documentation.
 */
import { z } from '@platform/core-sdk';
import type { NavigationItem } from '../interfaces/index.js';

const baseFields = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
};

// ── Experience ──
export const createExperienceSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  type: z.enum(['Landing', 'Dashboard', 'Catalog', 'Detail', 'Search', 'Checkout', 'Profile', 'Admin', 'Workspace', 'Wizard']),
  description: z.string().max(2000).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateExperienceSchema = z.object({
  ...baseFields,
  experienceId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const archiveExperienceSchema = z.object({
  ...baseFields,
  experienceId: z.string().min(1),
});

export const restoreExperienceSchema = archiveExperienceSchema;

export const deleteExperienceSchema = archiveExperienceSchema;

export const getExperienceSchema = z.object({
  tenantId: z.string().min(1),
  experienceId: z.string().min(1),
});

export const searchExperiencesSchema = z.object({
  tenantId: z.string().min(1).optional(),
  organizationId: z.string().optional(),
  query: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

// ── Layout ──
const gridConfigSchema = z.object({
  columns: z.number().int().min(1).max(24),
  gap: z.number().min(0),
  responsive: z.record(z.enum(['Mobile', 'Tablet', 'Desktop', 'WideDesktop', 'TV']),
    z.object({ columns: z.number().int().min(1), gap: z.number().min(0) })),
});

export const createLayoutSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  type: z.enum(['Landing', 'Dashboard', 'Catalog', 'Detail', 'Search', 'Checkout', 'Profile', 'Admin', 'Workspace', 'Wizard']),
  description: z.string().max(2000).optional(),
  gridConfig: gridConfigSchema.optional(),
  sectionRefs: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateLayoutSchema = z.object({
  ...baseFields,
  layoutId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  gridConfig: gridConfigSchema.optional(),
  sectionRefs: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const publishLayoutSchema = z.object({
  ...baseFields,
  layoutId: z.string().min(1),
});

export const cloneLayoutSchema = z.object({
  ...baseFields,
  sourceLayoutId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
});

export const validateLayoutSchema = publishLayoutSchema;

// ── Hero ──
export const createHeroSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  headline: z.string().min(1).max(500),
  subheadline: z.string().max(500).optional(),
  backgroundMediaRefId: z.string().optional(),
  mediaRefIds: z.array(z.string()).optional(),
  overlay: z.object({ enabled: z.boolean(), opacity: z.number().min(0).max(1), color: z.string() }).optional(),
  ctaIds: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateHeroSchema = z.object({
  ...baseFields,
  heroId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  headline: z.string().min(1).max(500).optional(),
  subheadline: z.string().max(500).optional(),
  backgroundMediaRefId: z.string().optional(),
  mediaRefIds: z.array(z.string()).optional(),
  overlay: z.object({ enabled: z.boolean(), opacity: z.number().min(0).max(1), color: z.string() }).optional(),
  ctaIds: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const publishHeroSchema = z.object({ ...baseFields, heroId: z.string().min(1) });

// ── Banner ──
export const createBannerSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  type: z.enum(['Promotion', 'Announcement', 'Warning', 'Info', 'Campaign', 'Alert']),
  title: z.string().min(1).max(500),
  message: z.string().max(2000),
  dismissible: z.boolean().optional(),
  mediaRefId: z.string().optional(),
  ctaIds: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateBannerSchema = z.object({
  ...baseFields,
  bannerId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['Promotion', 'Announcement', 'Warning', 'Info', 'Campaign', 'Alert']).optional(),
  title: z.string().min(1).max(500).optional(),
  message: z.string().max(2000).optional(),
  dismissible: z.boolean().optional(),
  mediaRefId: z.string().optional(),
  ctaIds: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const publishBannerSchema = z.object({ ...baseFields, bannerId: z.string().min(1) });

// ── Navigation ──
const navItemSchema: z.ZodType<NavigationItem> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
  iconRef: z.string().optional(),
  order: z.number().int(),
  children: z.lazy(() => z.array(navItemSchema)).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const createNavigationSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  type: z.enum(['Top', 'Side', 'Bottom', 'Breadcrumb', 'QuickAction', 'Context']),
  items: z.array(navItemSchema).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateNavigationSchema = z.object({
  ...baseFields,
  navigationId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['Top', 'Side', 'Bottom', 'Breadcrumb', 'QuickAction', 'Context']).optional(),
  items: z.array(navItemSchema).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const publishNavigationSchema = z.object({ ...baseFields, navigationId: z.string().min(1) });

// ── Dashboard ──
export const createDashboardSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  layoutRef: z.string().optional(),
  widgets: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    reference: z.string().min(1),
    span: z.object({ cols: z.number().int().min(1), rows: z.number().int().min(1) }),
    config: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateDashboardSchema = z.object({
  ...baseFields,
  dashboardId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  layoutRef: z.string().optional(),
  widgets: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    reference: z.string().min(1),
    span: z.object({ cols: z.number().int().min(1), rows: z.number().int().min(1) }),
    config: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const publishDashboardSchema = z.object({ ...baseFields, dashboardId: z.string().min(1) });

// ── SearchExperience ──
export const createSearchExperienceSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  layoutRef: z.string().optional(),
  features: z.object({
    autocomplete: z.boolean(),
    spellCheck: z.boolean(),
    synonyms: z.boolean(),
    recommendations: z.boolean(),
    facets: z.array(z.string()),
  }),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSearchExperienceSchema = z.object({
  ...baseFields,
  searchExperienceId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  layoutRef: z.string().optional(),
  features: z.object({
    autocomplete: z.boolean(),
    spellCheck: z.boolean(),
    synonyms: z.boolean(),
    recommendations: z.boolean(),
    facets: z.array(z.string()),
  }).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const publishSearchExperienceSchema = z.object({ ...baseFields, searchExperienceId: z.string().min(1) });

// ── Personalization ──
export const createPersonalizationSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  rules: z.array(z.object({
    condition: z.string().min(1),
    action: z.string().min(1),
    priority: z.number().int(),
  })),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updatePersonalizationSchema = z.object({
  ...baseFields,
  personalizationId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  rules: z.array(z.object({
    condition: z.string().min(1),
    action: z.string().min(1),
    priority: z.number().int(),
  })).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Patterns ──
export const registerPatternSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  reference: z.string().min(1),
  description: z.string().max(2000).optional(),
  industryTags: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const publishPatternSchema = z.object({ ...baseFields, patternId: z.string().min(1) });

export const clonePatternSchema = z.object({
  ...baseFields,
  sourcePatternId: z.string().min(1),
  newName: z.string().min(1).max(200),
});

// ── Validate / Score / Recommend ──
export const validateExperienceUseCaseSchema = z.object({ ...baseFields, experienceId: z.string().min(1) });
export const calculateUXScoreUseCaseSchema = z.object({ ...baseFields, experienceId: z.string().min(1) });
export const recommendExperienceUseCaseSchema = z.object({ ...baseFields, experienceId: z.string().min(1) });
