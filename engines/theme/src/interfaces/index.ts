/**
 * Theme Engine — Public Interfaces
 *
 * Phase 6: Design Token OS.
 *  - Themes, brands, token sets, typography, color, spacing, motion, elevation
 *  - Light/dark variants, white-label, responsive tokens
 *  - Provider Plugin: token compilation via IThemeCompilerProvider
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces — Provider Plugin Architecture
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface IPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getMaxThemesPerOrg(tenantId: string): Promise<number>;
}

export interface IThemeCompilerProvider {
  compile(tokens: ThemeCompilationInput): Promise<Result<ThemeCompilationOutput, Error>>;
}

export interface ThemeCompilationInput {
  themeId: string;
  themeName: string;
  tokens: Record<string, string>;
  format: 'css' | 'tailwind' | 'scss' | 'json';
}

export interface ThemeCompilationOutput {
  compiled: string;
  format: string;
  tokenCount: number;
}

// ═══════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════

export type ThemeStatus = 'Draft' | 'Active' | 'Archived';
export type ThemeMode = 'Light' | 'Dark';
export type TokenCategory = 'Typography' | 'Color' | 'Spacing' | 'Motion' | 'Elevation' | 'Radius' | 'ZIndex' | 'Breakpoint' | 'Semantic';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface Theme {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  status: ThemeStatus;
  brandId: string | null;
  tokenSetIds: string[];
  variantIds: string[];
  defaultMode: ThemeMode;
  isWhiteLabel: boolean;
  parentThemeId: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  personality: string[];
  voice: string;
  logoRef: string | null;
  faviconRef: string | null;
  primaryColor: string;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TokenSet {
  id: string;
  tenantId: string;
  organizationId: string;
  themeId: string;
  category: TokenCategory;
  name: string;
  tokens: TokenEntry[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TokenEntry {
  key: string;
  value: string;
  description: string;
}

export interface TypographyScale {
  id: string;
  tenantId: string;
  organizationId: string;
  themeId: string;
  fontFamilies: { name: string; stack: string[] }[];
  sizes: { name: string; size: string; lineHeight: string; weight: string }[];
  baseSize: string;
  scaleRatio: string;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ColorPalette {
  id: string;
  tenantId: string;
  organizationId: string;
  themeId: string;
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  background: string;
  foreground: string;
  shades: Record<string, string>;
  semantic: { success: string; warning: string; error: string; info: string };
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SpacingSystem {
  id: string;
  tenantId: string;
  organizationId: string;
  themeId: string;
  baseUnit: string;
  scale: { name: string; value: string }[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MotionSpec {
  id: string;
  tenantId: string;
  organizationId: string;
  themeId: string;
  durations: { name: string; value: string }[];
  easings: { name: string; value: string }[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ElevationSystem {
  id: string;
  tenantId: string;
  organizationId: string;
  themeId: string;
  levels: { name: string; zIndex: number; shadow: string }[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeVariant {
  id: string;
  tenantId: string;
  organizationId: string;
  themeId: string;
  mode: ThemeMode;
  tokenOverrides: Record<string, string>;
  isDefault: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResponsiveTokens {
  id: string;
  tenantId: string;
  organizationId: string;
  themeId: string;
  breakpoint: string;
  tokenOverrides: Record<string, string>;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteLabelTheme {
  id: string;
  tenantId: string;
  organizationId: string;
  baseThemeId: string;
  overrides: Record<string, unknown>;
  isActive: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type ThemeAuditEventType =
  | 'theme_created' | 'theme_updated' | 'theme_activated' | 'theme_archived'
  | 'brand_created' | 'brand_updated'
  | 'tokenset_created' | 'tokenset_updated'
  | 'variant_created' | 'variant_updated'
  | 'theme_compiled' | 'theme_exported' | 'theme_imported'
  | 'theme_validated' | 'theme_scored';

export interface ThemeAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  themeId?: string | undefined;
  actorId: string;
  correlationId: string;
  eventType: ThemeAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repository Contracts
// ═══════════════════════════════════════════

export interface IThemeRepository {
  insert(theme: Theme): Promise<void>;
  findById(tenantId: string, id: string): Promise<Theme | null>;
  findBySlug(tenantId: string, slug: string): Promise<Theme | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<Theme[]>;
  update(tenantId: string, id: string, patch: Partial<Theme>): Promise<void>;
  findAll(tenantId: string): Promise<Theme[]>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
  countByOrganization(tenantId: string, orgId: string): Promise<number>;
}

export interface IBrandRepository {
  insert(brand: Brand): Promise<void>;
  findById(tenantId: string, id: string): Promise<Brand | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<Brand[]>;
  update(tenantId: string, id: string, patch: Partial<Brand>): Promise<void>;
}

export interface ITokenSetRepository {
  insert(ts: TokenSet): Promise<void>;
  findById(tenantId: string, id: string): Promise<TokenSet | null>;
  findByTheme(tenantId: string, themeId: string): Promise<TokenSet[]>;
  findByOrganization(tenantId: string, orgId: string): Promise<TokenSet[]>;
  update(tenantId: string, id: string, patch: Partial<TokenSet>): Promise<void>;
}

export interface ITokenSystemRepository<T> {
  insert(entity: T): Promise<void>;
  findById(tenantId: string, id: string): Promise<T | null>;
  findByTheme(tenantId: string, themeId: string): Promise<T | null>;
  update(tenantId: string, id: string, patch: Partial<T>): Promise<void>;
}

export interface IThemeVariantRepository {
  insert(v: ThemeVariant): Promise<void>;
  findById(tenantId: string, id: string): Promise<ThemeVariant | null>;
  findByTheme(tenantId: string, themeId: string): Promise<ThemeVariant[]>;
  findByMode(tenantId: string, themeId: string, mode: ThemeMode): Promise<ThemeVariant | null>;
  update(tenantId: string, id: string, patch: Partial<ThemeVariant>): Promise<void>;
}

export interface IResponsiveTokensRepository {
  insert(rt: ResponsiveTokens): Promise<void>;
  findById(tenantId: string, id: string): Promise<ResponsiveTokens | null>;
  findByTheme(tenantId: string, themeId: string): Promise<ResponsiveTokens[]>;
  update(tenantId: string, id: string, patch: Partial<ResponsiveTokens>): Promise<void>;
}

export interface IWhiteLabelRepository {
  insert(wl: WhiteLabelTheme): Promise<void>;
  findById(tenantId: string, id: string): Promise<WhiteLabelTheme | null>;
  findByBaseTheme(tenantId: string, baseThemeId: string): Promise<WhiteLabelTheme[]>;
  findByOrganization(tenantId: string, orgId: string): Promise<WhiteLabelTheme[]>;
  update(tenantId: string, id: string, patch: Partial<WhiteLabelTheme>): Promise<void>;
}

export interface IThemeAuditRepository {
  insert(record: Omit<ThemeAuditRecord, 'id' | 'createdAt'>): Promise<ThemeAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<ThemeAuditRecord[]>;
  findByOrganization(tenantId: string, orgId: string, limit?: number): Promise<ThemeAuditRecord[]>;
}

export { type Result, type EventEnvelope };
