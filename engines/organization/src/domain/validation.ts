/**
 * Organization Engine — Validation Schemas (zod)
 *
 * 사장님 spec §Profile / §Organization Type / §Status / §Membership / §Department / §Branch / §Team
 * 모든 Input은 Use Case 진입 시 본 schema를 통과한다.
 *
 * `exactOptionalPropertyTypes: true`를 지키기 위해
 * optional field는 conditional spread 패턴을 따른다.
 */

import { z } from '@platform/core-sdk';
import {
  SUPPORTED_MEMBERSHIP_TYPES,
  SUPPORTED_ORGANIZATION_TYPES,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Organization Schemas
// ═══════════════════════════════════════════

export const organizationTypeSchema = z.enum([
  'Commercial',
  'NonProfit',
  'Government',
  'Religious',
  'Educational',
  'Healthcare',
  'Marketplace',
  'Hospitality',
  'Logistics',
  'Technology',
  'Other',
] as const);

export const organizationStatusSchema = z.enum([
  'Pending',
  'Active',
  'Suspended',
  'Archived',
  'Deleted',
] as const);

export const membershipTypeSchema = z.enum([
  'Owner',
  'Administrator',
  'Manager',
  'Employee',
  'Contractor',
  'Member',
  'Guest',
] as const);

export const organizationProfileSchema = z.object({
  displayName: z.string().min(1).max(200),
  legalName: z.string().max(200).optional(),
  businessNumber: z.string().max(64).optional(),
  taxNumber: z.string().max(64).optional(),
  registrationNumber: z.string().max(64).optional(),
  website: z.string().url().max(2048).optional(),
  logo: z.string().url().max(2048).optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'brandColor must be #RRGGBB HEX').optional(),
  industry: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  country: z.string().length(2).regex(/^[A-Z]{2}$/, 'country must be ISO 3166-1 alpha-2').optional(),
  primaryAddressId: z.string().max(128).optional(),
  primaryEmail: z.string().email().optional(),
  primaryPhone: z.string().max(30).optional(),
});

export const createOrganizationSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  displayName: z.string().min(1).max(200),
  legalName: z.string().max(200).optional(),
  businessNumber: z.string().max(64).optional(),
  taxNumber: z.string().max(64).optional(),
  registrationNumber: z.string().max(64).optional(),
  website: z.string().url().max(2048).optional(),
  logo: z.string().url().max(2048).optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'brandColor must be #RRGGBB HEX').optional(),
  industry: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  country: z.string().length(2).regex(/^[A-Z]{2}$/, 'country must be ISO 3166-1 alpha-2').optional(),
  primaryAddressId: z.string().max(128).optional(),
  primaryEmail: z.string().email().optional(),
  primaryPhone: z.string().max(30).optional(),
  type: organizationTypeSchema,
  initialStatus: organizationStatusSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateOrganizationSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  displayName: z.string().min(1).max(200).optional(),
  legalName: z.string().max(200).optional(),
  businessNumber: z.string().max(64).optional(),
  taxNumber: z.string().max(64).optional(),
  registrationNumber: z.string().max(64).optional(),
  website: z.string().url().max(2048).optional(),
  logo: z.string().url().max(2048).optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'brandColor must be #RRGGBB HEX').optional(),
  industry: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  country: z.string().length(2).regex(/^[A-Z]{2}$/, 'country must be ISO 3166-1 alpha-2').optional(),
  primaryAddressId: z.string().max(128).optional(),
  primaryEmail: z.string().email().optional(),
  primaryPhone: z.string().max(30).optional(),
});

export const updateOrganizationProfileSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  profile: organizationProfileSchema,
});

export const changeOrganizationStatusSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  newStatus: organizationStatusSchema,
  reason: z.string().max(500).optional(),
});

export const changeOrganizationTypeSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  newType: organizationTypeSchema,
});

export const archiveOrganizationSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export const restoreOrganizationSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
});

export const deleteOrganizationSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
});

export const getOrganizationSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().min(1),
});

export const listOrganizationsSchema = z.object({
  tenantId: z.string().min(1),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

export const searchOrganizationsSchema = z.object({
  tenantId: z.string().min(1),
  query: z.string().max(200).optional(),
  type: organizationTypeSchema.optional(),
  status: organizationStatusSchema.optional(),
  industry: z.string().max(100).optional(),
  country: z.string().length(2).optional(),
  businessNumber: z.string().max(64).optional(),
  taxNumber: z.string().max(64).optional(),
  memberUserId: z.string().max(128).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  sortBy: z.enum(['displayName', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ═══════════════════════════════════════════
// Membership Schemas
// ═══════════════════════════════════════════

export const addMemberSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  membershipType: membershipTypeSchema,
  departmentId: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  title: z.string().max(100).optional(),
});

export const removeMemberSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  userId: z.string().min(1),
});

export const changeMembershipSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  newMembershipType: membershipTypeSchema,
  title: z.string().max(100).optional(),
});

export const listMembersSchema = z.object({
  tenantId: z.string().min(1),
  organizationId: z.string().min(1),
  membershipType: membershipTypeSchema.optional(),
  status: z.enum(['active', 'suspended', 'left']).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

// ═══════════════════════════════════════════
// Hierarchy Schemas
// ═══════════════════════════════════════════

const hierarchyNodeTypeSchema = z.enum([
  'organization',
  'branch',
  'department',
  'team',
] as const);

export const createBranchSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  parentType: hierarchyNodeTypeSchema.optional(),
  parentId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  primaryAddressId: z.string().max(128).optional(),
});

export const createDepartmentSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  parentType: hierarchyNodeTypeSchema.optional(),
  parentId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const createTeamSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  parentType: hierarchyNodeTypeSchema.optional(),
  parentId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const moveDepartmentSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  departmentId: z.string().min(1),
  newParentType: hierarchyNodeTypeSchema,
  newParentId: z.string().min(1),
});

export const moveTeamSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  organizationId: z.string().min(1),
  teamId: z.string().min(1),
  newParentType: hierarchyNodeTypeSchema,
  newParentId: z.string().min(1),
});

// ═══════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════

export const SUPPORTED_TYPES = SUPPORTED_ORGANIZATION_TYPES;
export const SUPPORTED_MEMBERSHIPS = SUPPORTED_MEMBERSHIP_TYPES;
