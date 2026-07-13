/**
 * Component Engine — Validation Schemas (Zod)
 */
import { z } from '@platform/core-sdk';

const optionalStr = z.string().max(2000).optional();
const baseFields = {
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
};

// ── Enums (inline to match interfaces/index.ts union types) ──
const tierZ = z.enum(['Experience', 'Atomic']);
const experienceTypeZ = z.enum([
  'Search', 'Booking', 'Checkout', 'Pricing', 'Review',
  'Dashboard', 'Navigation', 'Hero', 'Feature', 'Comparison',
  'Timeline', 'Gallery', 'FAQ', 'Profile', 'Analytics',
  'Notification', 'Authentication', 'Media', 'Article', 'CMS',
  'Workflow', 'Approval', 'Organization', 'Catalog',
  'Payment', 'Reservation', 'Map', 'Calendar',
]);
const stateNameZ = z.enum([
  'Default', 'Hover', 'Press', 'Focus', 'Disabled',
  'Loading', 'Selected', 'Expanded', 'Collapsed',
  'Dragging', 'Dropping', 'Error', 'Empty', 'Success',
]);
const animationTypeZ = z.enum([
  'Entrance', 'Hover', 'Focus', 'Loading', 'Success',
  'Error', 'Empty', 'Transition',
]);
const responsiveDeviceZ = z.enum(['Desktop', 'Tablet', 'Mobile', 'Watch', 'TV']);
const marketplaceTierZ = z.enum(['Official', 'Organization', 'Marketplace', 'Private']);
const wcagLevelZ = z.enum(['A', 'AA', 'AAA']);
const outcomeZ = z.enum(['success', 'failure']);

// ── Component CRUD ──
export const createComponentSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: optionalStr,
  tier: tierZ,
  componentType: z.string().min(1),
  themeId: z.string().optional(),
  experienceId: z.string().optional(),
});

export const updateComponentSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  componentId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  description: optionalStr,
});

export const componentActionSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  componentId: z.string().min(1),
});

// ── Variant ──
export const createVariantSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  propOverrides: z.record(z.string(), z.unknown()),
  tokenOverrides: z.record(z.string(), z.string()),
  isDefault: z.boolean().optional(),
});

// ── Preset ──
export const createPresetSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: optionalStr,
  frozenProps: z.record(z.string(), z.unknown()),
  frozenTokens: z.record(z.string(), z.string()),
});

// ── Composition ──
export const composeExperienceSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  parentComponentId: z.string().min(1),
  childComponentIds: z.array(z.string().min(1)).min(1),
  slotMapping: z.record(z.string(), z.string()),
  experienceType: experienceTypeZ,
  description: optionalStr,
});

// ── Review ──
export const reviewComponentSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  reviewerId: z.string().min(1),
  feedback: z.string(),
  scores: z.record(z.string(), z.number()),
});

// ── Slot ──
export const createSlotSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: optionalStr,
  acceptedTypes: z.array(z.string()),
  isRequired: z.boolean(),
  defaultValue: z.record(z.string(), z.unknown()).optional(),
});

export const assignSlotSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  slotId: z.string().min(1),
  componentId: z.string().min(1),
});

// ── Token Reference ──
export const createTokenRefSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  themeId: z.string().min(1),
  tokenKey: z.string().min(1),
  tokenValue: z.string().min(1),
});

// ── State ──
export const registerStateSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  name: stateNameZ,
  styleOverrides: z.record(z.string(), z.unknown()),
  tokenOverrides: z.record(z.string(), z.string()),
  isDefault: z.boolean().optional(),
});

export const transitionStateSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  componentId: z.string().min(1),
  targetState: stateNameZ,
});

// ── Behavior ──
export const createBehaviorSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  name: z.string().min(1).max(100),
  rule: z.string().min(1),
  condition: z.record(z.string(), z.unknown()),
  action: z.record(z.string(), z.unknown()),
  priority: z.number(),
});

export const assignBehaviorSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  componentId: z.string().min(1),
  behaviorId: z.string().min(1),
});

// ── Animation ──
export const createAnimationSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  type: animationTypeZ,
  duration: z.string().min(1),
  easing: z.string().min(1),
  delay: z.string().optional(),
  keyframes: z.record(z.string(), z.unknown()),
});

// ── Responsive ──
export const createResponsiveSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  device: responsiveDeviceZ,
  rules: z.record(z.string(), z.unknown()),
});

// ── Versioning ──
export const createVersionSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  version: z.string().min(1).regex(/^\d+\.\d+\.\d+/),
  changelog: z.string(),
});

export const rollbackVersionSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  targetVersion: z.string().min(1),
});

// ── Marketplace ──
export const registerMarketplaceSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  tier: marketplaceTierZ,
  name: z.string().min(1).max(200),
  description: z.string(),
  compatibilityInfo: z.record(z.string(), z.unknown()),
});

export const installMarketplaceSchema = z.object({
  ...baseFields,
  marketplaceId: z.string().min(1),
});

// ── Clone ──
export const cloneComponentSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  newName: z.string().min(1).max(200),
  newSlug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
});

// ── Pattern ──
export const createPatternSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: optionalStr,
  componentIds: z.array(z.string()),
  compositionTemplate: z.record(z.string(), z.unknown()),
  industryAdapters: z.array(z.string()),
});

// ── Accessibility ──
export const accessibilityValidateSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  level: wcagLevelZ.optional(),
});

// ── Improve / Learning ──
export const improveComponentSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  targetScore: z.number().min(0).max(100).optional(),
});

export const recordOutcomeSchema = z.object({
  ...baseFields,
  componentId: z.string().min(1),
  outcome: outcomeZ,
  context: z.record(z.string(), z.unknown()),
});
