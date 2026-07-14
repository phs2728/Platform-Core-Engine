/** Studio Engine — Validation Schemas */
import { z } from '@platform/core-sdk';

const baseFields = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
};

// ── Workspace ──
export const createWorkspaceSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  defaultThemeRef: z.string().nullable().optional(),
});

export const workspaceActionSchema = z.object({
  ...baseFields,
  workspaceId: z.string().min(1),
});

// ── BuildSession ──
export const startBuildSessionSchema = z.object({
  ...baseFields,
  workspaceId: z.string().min(1),
  themeRef: z.string().min(1),
  componentRefs: z.array(z.string().min(1)).default([]),
});

export const sessionActionSchema = z.object({
  ...baseFields,
  sessionId: z.string().min(1),
});

// ── PageDraft ──
export const createDraftSchema = z.object({
  ...baseFields,
  buildSessionId: z.string().min(1),
  workspaceId: z.string().min(1),
  pageSlug: z.string().min(1).max(200).regex(/^[a-z0-9-/]+$/),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  themeRef: z.string().min(1),
  defaultLocale: z.string().min(2).max(10),
});

export const updateDraftSchema = z.object({
  ...baseFields,
  draftId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

// ── ComponentBinding ──
export const addComponentBindingSchema = z.object({
  ...baseFields,
  draftId: z.string().min(1),
  componentRef: z.string().min(1),
  slotName: z.string().min(1).max(100),
  order: z.number().min(0),
  propOverrides: z.record(z.string(), z.unknown()).default({}),
  themeOverrideRef: z.string().nullable().optional(),
});

export const updateComponentBindingSchema = z.object({
  ...baseFields,
  bindingId: z.string().min(1),
  propOverrides: z.record(z.string(), z.unknown()).optional(),
  order: z.number().min(0).optional(),
});

// ── ContentBinding ──
export const addContentBindingSchema = z.object({
  ...baseFields,
  draftId: z.string().min(1),
  componentBindingId: z.string().min(1),
  contentRef: z.string().min(1),
  slotName: z.string().min(1).max(100),
  fallbackContentRef: z.string().nullable().optional(),
});

// ── Verification & Publish ──
export const verifyDraftSchema = z.object({
  tenantId: z.string().min(1),
  draftId: z.string().min(1),
});

export const previewDraftSchema = z.object({
  tenantId: z.string().min(1),
  draftId: z.string().min(1),
  device: z.enum(['desktop', 'tablet', 'mobile', 'watch', 'tv']).default('desktop'),
});

export const createPublishIntentSchema = z.object({
  ...baseFields,
  draftId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export const publishIntentActionSchema = z.object({
  ...baseFields,
  intentId: z.string().min(1),
});

// ── Asset ──
export const uploadAssetSchema = z.object({
  ...baseFields,
  workspaceId: z.string().min(1),
  type: z.enum(['Image', 'Video', 'Audio', 'Document']),
  url: z.string().min(1),
  altText: z.string().max(500).optional(),
});

// ── Library Query ──
export const searchComponentsSchema = z.object({
  tenantId: z.string().min(1),
  componentType: z.string().min(1),
});