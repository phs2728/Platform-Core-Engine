/** CMS Engine — Validation Schemas */
import { z } from '@platform/core-sdk';

const baseFields = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
};

// ── Content ──
export const createContentSchema = z.object({
  ...baseFields,
  type: z.enum(['Text', 'Image', 'Video', 'Audio', 'Document', 'Code', 'JSON', 'Markdown']),
  body: z.string().min(1),
  locale: z.string().min(2).max(10),
  parentContentId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateContentSchema = z.object({
  ...baseFields,
  contentId: z.string().min(1),
  body: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const contentActionSchema = z.object({
  ...baseFields,
  contentId: z.string().min(1),
});

// ── Page ──
export const createPageSchema = z.object({
  ...baseFields,
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-/]+$/),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  defaultLocale: z.string().min(2).max(10),
  themeRef: z.string().min(1),
  primaryComponentRefs: z.array(z.string().min(1)).optional(),
});

export const updatePageSchema = z.object({
  ...baseFields,
  pageId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  themeRef: z.string().min(1).optional(),
});

export const pageActionSchema = z.object({
  ...baseFields,
  pageId: z.string().min(1),
});

// ── Section ──
export const addSectionSchema = z.object({
  ...baseFields,
  pageId: z.string().min(1),
  name: z.string().min(1).max(200),
  order: z.number().min(0),
  componentRef: z.string().min(1),
  themeOverrideRef: z.string().nullable().optional(),
});

export const updateSectionSchema = z.object({
  ...baseFields,
  sectionId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  order: z.number().min(0).optional(),
});

// ── Slot ──
export const createSlotSchema = z.object({
  ...baseFields,
  sectionId: z.string().min(1),
  slotName: z.enum(['headline', 'subheadline', 'body', 'cta', 'image', 'video', 'icon', 'tag', 'metadata', 'custom']),
  contentId: z.string().nullable().optional(),
  required: z.boolean().default(false),
  fallbackContentId: z.string().nullable().optional(),
});

export const assignSlotSchema = z.object({
  ...baseFields,
  slotId: z.string().min(1),
  contentId: z.string().min(1),
});

// ── Locale Variant ──
export const createLocaleVariantSchema = z.object({
  ...baseFields,
  pageId: z.string().min(1),
  locale: z.string().min(2).max(10),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sectionOverrides: z.record(z.string(), z.unknown()).optional(),
});

// ── Render / Snapshot ──
export const renderPageSchema = z.object({
  tenantId: z.string().min(1),
  pageId: z.string().min(1),
  device: z.enum(['desktop', 'tablet', 'mobile', 'watch', 'tv']).default('desktop'),
  locale: z.string().min(2).max(10).optional(),
});

export const createLayoutSnapshotSchema = z.object({
  ...baseFields,
  pageId: z.string().min(1),
  device: z.enum(['desktop', 'tablet', 'mobile', 'watch', 'tv']),
});