/**
 * Experience Component Engine — Public Interfaces
 *
 * Phase 6: Experience Component OS.
 *  - Experience Components (Search, Booking, Checkout, Dashboard, ...)
 *  - Atomic Components (Button, Card, Input, Modal, ...)
 *  - Composition, Variants, Presets, States, Interactions, Animations
 *  - Accessibility, Quality Scoring, Learning, Marketplace
 *  - Provider Plugin Architecture for rendering / a11y / analytics / learning
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Host Interfaces — Cross-Engine Adapters
// ═══════════════════════════════════════════

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface IPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<Result<Record<string, unknown>, Error>>;
  getMaxComponentsPerOrg(tenantId: string): Promise<number>;
}

// ── Experience Engine host adapter ──
export interface IExperienceProvider {
  getExperience(tenantId: string, experienceId: string): Promise<Result<ExperienceRef, Error>>;
  validateExperienceLayout(tenantId: string, layout: string[]): Promise<Result<boolean, Error>>;
}

export interface ExperienceRef {
  experienceId: string;
  name: string;
  slug: string;
}

// ── Theme Engine host adapter (RC1: read-only) ──
export interface IThemeProvider {
  getTheme(tenantId: string, themeId: string): Promise<Result<ThemeRef, Error>>;
  resolveToken(tenantId: string, themeId: string, tokenKey: string): Promise<Result<string, Error>>;
}

export interface ThemeRef {
  themeId: string;
  name: string;
  defaultMode: 'Light' | 'Dark';
}

// ═══════════════════════════════════════════
// RC2: ThemeManifest Consumer (single API surface, read-only)
// Sprint B 원칙 2: Component는 resolveThemeManifest()만 호출 가능
// ═══════════════════════════════════════════

export interface IThemeManifestConsumer {
  /**
   * Component가 호출할 수 있는 유일한 Theme API.
   * Theme 변경/저장/생성/이벤트 발행 절대 불가.
   * 결정적(deterministic): 동일 입력 → 항상 동일 resolvedTokens 반환.
   */
  resolveThemeManifest(tenantId: string, themeId: string): Promise<Result<ResolvedManifest, Error>>;
}

/** ResolvedManifest = ThemeManifest가 디자인 토큰으로 변환된 read-only 데이터 */
export interface ResolvedManifest {
  manifestId: string;
  themeId: string;
  brandId: string;
  version: string;
  /** brand-* prefix 디자인 토큰 (14+ 항목) */
  resolvedTokens: Record<string, string>;
  /** 결정적 해시 (테스트/캐시 검증용) */
  manifestHash: string;
}

export interface ThemeChangedEvent {
  tenantId: string;
  themeId: string;
  manifestId: string;
  brandId: string;
  version: string;
  /** 영향받는 Component 식별용 (manifestHash로 비교) */
  manifestHash: string;
  occurredAt: string;
}

// ── Creative Intelligence host adapter ──
export interface ICreativeIntelligenceProvider {
  getCreativeDirection(tenantId: string, style: string): Promise<Result<CreativeDirectionRef, Error>>;
}

export interface CreativeDirectionRef {
  directionId: string;
  style: string;
  premiumScore: number;
  professionalScore: number;
}

// ── Learning Engine host adapter ──
export interface ILearningProvider {
  getComponentOutcome(tenantId: string, componentId: string): Promise<Result<ComponentOutcomeRef, Error>>;
  recordOutcome(tenantId: string, componentId: string, outcome: ComponentOutcomeRef): Promise<Result<void, Error>>;
}

export interface ComponentOutcomeRef {
  componentId: string;
  conversionRate: number;
  userSatisfaction: number;
  usageCount: number;
}

// ── Search Engine host adapter ──
export interface ISearchProvider {
  searchComponents(tenantId: string, query: string): Promise<Result<ComponentSearchResult[], Error>>;
}

export interface ComponentSearchResult {
  componentId: string;
  name: string;
  score: number;
}

// ── AI Engine host adapter ──
export interface IAIProvider {
  recommendComponent(tenantId: string, context: ComponentRecommendationContext): Promise<Result<ComponentRecommendation, Error>>;
}

export interface ComponentRecommendationContext {
  industry: string;
  experience: string;
  style: string;
}

export interface ComponentRecommendation {
  componentId: string;
  confidence: number;
  reason: string;
}

// ── Runtime host adapter ──
export interface IRuntimeProvider {
  checkComponentHealth(tenantId: string, componentId: string): Promise<Result<ComponentHealth, Error>>;
}

export interface ComponentHealth {
  componentId: string;
  healthy: boolean;
  loadTime: number;
  errorRate: number;
}

// ═══════════════════════════════════════════
// Provider Plugin Interfaces
// ═══════════════════════════════════════════

export interface IComponentRendererProvider {
  render(manifest: ComponentRenderInput): Promise<Result<ComponentRenderOutput, Error>>;
}

export interface ComponentRenderInput {
  componentId: string;
  componentType: string;
  props: Record<string, unknown>;
  tokenReferences: Record<string, string>;
  format: 'json' | 'html-structure' | 'react-props' | 'vue-props';
}

export interface ComponentRenderOutput {
  rendered: string;
  format: string;
  nodeCount: number;
}

export interface IAnimationProvider {
  generate(spec: AnimationGenerationInput): Promise<Result<AnimationGenerationOutput, Error>>;
}

export interface AnimationGenerationInput {
  componentId: string;
  animationType: AnimationType;
  duration: string;
  easing: string;
}

export interface AnimationGenerationOutput {
  keyframes: string;
  cssClass: string;
}

export interface IAccessibilityProvider {
  audit(input: AccessibilityAuditInput): Promise<Result<AccessibilityAuditOutput, Error>>;
}

export interface AccessibilityAuditInput {
  componentId: string;
  manifest: Record<string, unknown>;
  level: 'A' | 'AA' | 'AAA';
}

export interface AccessibilityAuditOutput {
  score: number;
  violations: AccessibilityViolation[];
  passCount: number;
  failCount: number;
}

export interface AccessibilityViolation {
  rule: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
}

export interface IPreviewProvider {
  preview(input: PreviewInput): Promise<Result<PreviewOutput, Error>>;
}

export interface PreviewInput {
  componentId: string;
  device: ResponsiveDevice;
  themeMode: 'Light' | 'Dark';
  props: Record<string, unknown>;
}

export interface PreviewOutput {
  previewUri: string;
  device: string;
  ready: boolean;
}

export interface IAnalyticsProvider {
  track(event: AnalyticsEvent): Promise<Result<void, Error>>;
  getMetrics(componentId: string): Promise<Result<ComponentMetrics, Error>>;
}

export interface AnalyticsEvent {
  componentId: string;
  eventType: string;
  metadata: Record<string, unknown>;
}

export interface ComponentMetrics {
  componentId: string;
  views: number;
  interactions: number;
  conversionRate: number;
  avgLoadTime: number;
}

export interface ILearningPluginProvider {
  learn(input: LearningInput): Promise<Result<LearningOutput, Error>>;
}

export interface LearningInput {
  componentId: string;
  outcome: 'success' | 'failure';
  context: Record<string, unknown>;
}

export interface LearningOutput {
  patternId: string;
  confidence: number;
  recommendation: string;
}

// ═══════════════════════════════════════════
// Enums & Types
// ═══════════════════════════════════════════

export type ComponentStatus = 'Draft' | 'Active' | 'Published' | 'Archived' | 'Deprecated';
export type ComponentTier = 'Experience' | 'Atomic';
export type MarketplaceTier = 'Official' | 'Organization' | 'Marketplace' | 'Private';

export type ExperienceType =
  | 'Search' | 'Booking' | 'Checkout' | 'Pricing' | 'Review'
  | 'Dashboard' | 'Navigation' | 'Hero' | 'Feature' | 'Comparison'
  | 'Timeline' | 'Gallery' | 'FAQ' | 'Profile' | 'Analytics'
  | 'Notification' | 'Authentication' | 'Media' | 'Article' | 'CMS'
  | 'Workflow' | 'Approval' | 'Organization' | 'Catalog'
  | 'Payment' | 'Reservation' | 'Map' | 'Calendar';

export type AtomicType =
  | 'Button' | 'Card' | 'Input' | 'Select' | 'Checkbox' | 'Radio'
  | 'Avatar' | 'Badge' | 'Chip' | 'Tooltip' | 'Divider' | 'Icon'
  | 'Modal' | 'Drawer' | 'Tabs' | 'Accordion' | 'Carousel' | 'Table'
  | 'Grid' | 'Form' | 'DatePicker' | 'SearchBar' | 'Breadcrumb'
  | 'Pagination' | 'Toast';

export type ComponentStateName =
  | 'Default' | 'Hover' | 'Press' | 'Focus' | 'Disabled'
  | 'Loading' | 'Selected' | 'Expanded' | 'Collapsed'
  | 'Dragging' | 'Dropping' | 'Error' | 'Empty' | 'Success';

export type AnimationType =
  | 'Entrance' | 'Hover' | 'Focus' | 'Loading' | 'Success'
  | 'Error' | 'Empty' | 'Transition';

export type InteractionType =
  | 'Hover' | 'Press' | 'Focus' | 'Disabled' | 'Loading'
  | 'Selected' | 'Expanded' | 'Collapsed' | 'Dragging' | 'Dropping';

export type ResponsiveDevice = 'Desktop' | 'Tablet' | 'Mobile' | 'Watch' | 'TV';

export type ScoreDimension =
  | 'professional' | 'premium' | 'accessibility' | 'performance'
  | 'trust' | 'conversion' | 'emotion' | 'consistency' | 'responsive';

// ═══════════════════════════════════════════
// Core Entities
// ═══════════════════════════════════════════

export interface ExperienceComponent {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  tier: ComponentTier;
  componentType: string;          // ExperienceType or AtomicType
  status: ComponentStatus;
  variantIds: string[];
  presetIds: string[];
  slotIds: string[];
  tokenRefIds: string[];
  stateIds: string[];
  behaviorIds: string[];
  compositionIds: string[];
  patternIds: string[];
  scoreId: string | null;
  themeId: string | null;
  experienceId: string | null;
  industryAdapters: string[];     // which industries this component is adapted for
  defaultProps: Record<string, unknown>;
  attributes: Record<string, unknown>;
  marketplaceTier: MarketplaceTier;
  version: string;
  parentComponentId: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface ComponentVariant {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  name: string;
  label: string;
  propOverrides: Record<string, unknown>;
  tokenOverrides: Record<string, string>;
  isDefault: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentPreset {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  name: string;
  description: string;
  frozenProps: Record<string, unknown>;
  frozenTokens: Record<string, string>;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentComposition {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  parentComponentId: string;
  childComponentIds: string[];
  slotMapping: Record<string, string>;   // slotName → childComponentId
  experienceType: ExperienceType | null;
  status: ComponentStatus;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentSlot {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  name: string;
  description: string;
  acceptedTypes: string[];
  isRequired: boolean;
  defaultValue: Record<string, unknown> | null;
  assignedComponentId: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentTokenReference {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  themeId: string;
  tokenKey: string;
  tokenValue: string;
  resolvedValue: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentState {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  name: ComponentStateName;
  styleOverrides: Record<string, unknown>;
  tokenOverrides: Record<string, string>;
  isDefault: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentInteraction {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  type: InteractionType;
  trigger: string;
  action: string;
  targetState: ComponentStateName | null;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentAnimation {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  type: AnimationType;
  duration: string;
  easing: string;
  delay: string;
  keyframes: Record<string, unknown>;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentAccessibility {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  keyboardNavigable: boolean;
  screenReaderSupport: boolean;
  contrastRatio: number;
  motionPreferenceRespected: boolean;
  focusOrder: string[];
  touchTargetMin: number;
  violations: AccessibilityViolation[];
  score: number;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentScore {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  professional: number;
  premium: number;
  accessibility: number;
  performance: number;
  trust: number;
  conversion: number;
  emotion: number;
  consistency: number;
  responsive: number;
  overall: number;
  meetsThreshold: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentReview {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  reviewerId: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'ChangesRequested';
  scores: Partial<Record<ScoreDimension, number>>;
  feedback: string;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentPattern {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string;
  componentIds: string[];
  compositionTemplate: Record<string, unknown>;
  industryAdapters: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentBehavior {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  name: string;
  rule: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  priority: number;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentVersion {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  version: string;
  changelog: string;
  snapshot: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface MarketplaceEntry {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId: string;
  tier: MarketplaceTier;
  name: string;
  description: string;
  version: string;
  qualityScore: number;
  downloadCount: number;
  usageCount: number;
  compatibilityInfo: Record<string, unknown>;
  verified: boolean;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type ComponentAuditEventType =
  | 'component_created' | 'component_updated' | 'component_deleted'
  | 'component_published' | 'component_archived' | 'component_restored'
  | 'component_cloned' | 'component_composed' | 'component_reviewed'
  | 'component_scored' | 'component_learned'
  | 'variant_created' | 'preset_created'
  | 'accessibility_validated' | 'performance_evaluated'
  | 'analytics_updated' | 'marketplace_registered';

export interface ComponentAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  componentId?: string | undefined;
  actorId: string;
  correlationId: string;
  eventType: ComponentAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repository Contracts
// ═══════════════════════════════════════════

export interface IComponentRepository {
  insert(c: ExperienceComponent): Promise<void>;
  findById(tenantId: string, id: string): Promise<ExperienceComponent | null>;
  findBySlug(tenantId: string, slug: string): Promise<ExperienceComponent | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<ExperienceComponent[]>;
  findByType(tenantId: string, componentType: string): Promise<ExperienceComponent[]>;
  findByTier(tenantId: string, tier: ComponentTier): Promise<ExperienceComponent[]>;
  update(tenantId: string, id: string, patch: Partial<ExperienceComponent>): Promise<void>;
  findAll(tenantId: string): Promise<ExperienceComponent[]>;
  existsBySlug(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
  countByOrganization(tenantId: string, orgId: string): Promise<number>;
}

export interface IComponentSubEntityRepository<T> {
  insert(entity: T): Promise<void>;
  findById(tenantId: string, id: string): Promise<T | null>;
  findByComponent(tenantId: string, componentId: string): Promise<T[]>;
  findByOrganization(tenantId: string, orgId: string): Promise<T[]>;
  update(tenantId: string, id: string, patch: Partial<T>): Promise<void>;
  findAll(tenantId: string): Promise<T[]>;
}

export interface ICompositionRepository {
  insert(c: ComponentComposition): Promise<void>;
  findById(tenantId: string, id: string): Promise<ComponentComposition | null>;
  findBySlug(tenantId: string, slug: string): Promise<ComponentComposition | null>;
  findByComponent(tenantId: string, componentId: string): Promise<ComponentComposition[]>;
  findByOrganization(tenantId: string, orgId: string): Promise<ComponentComposition[]>;
  findByExperienceType(tenantId: string, type: ExperienceType): Promise<ComponentComposition[]>;
  update(tenantId: string, id: string, patch: Partial<ComponentComposition>): Promise<void>;
  existsBySlug(tenantId: string, slug: string): Promise<boolean>;
}

export interface IScoreRepository {
  insert(s: ComponentScore): Promise<void>;
  findById(tenantId: string, id: string): Promise<ComponentScore | null>;
  findByComponent(tenantId: string, componentId: string): Promise<ComponentScore | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<ComponentScore[]>;
  update(tenantId: string, id: string, patch: Partial<ComponentScore>): Promise<void>;
}

export interface IReviewRepository {
  insert(r: ComponentReview): Promise<void>;
  findById(tenantId: string, id: string): Promise<ComponentReview | null>;
  findByComponent(tenantId: string, componentId: string): Promise<ComponentReview[]>;
  findByOrganization(tenantId: string, orgId: string): Promise<ComponentReview[]>;
  findByReviewer(tenantId: string, reviewerId: string): Promise<ComponentReview[]>;
  update(tenantId: string, id: string, patch: Partial<ComponentReview>): Promise<void>;
}

export interface IPatternRepository {
  insert(p: ComponentPattern): Promise<void>;
  findById(tenantId: string, id: string): Promise<ComponentPattern | null>;
  findBySlug(tenantId: string, slug: string): Promise<ComponentPattern | null>;
  findByOrganization(tenantId: string, orgId: string): Promise<ComponentPattern[]>;
  update(tenantId: string, id: string, patch: Partial<ComponentPattern>): Promise<void>;
  existsBySlug(tenantId: string, slug: string): Promise<boolean>;
}

export interface IVersionRepository {
  insert(v: ComponentVersion): Promise<void>;
  findById(tenantId: string, id: string): Promise<ComponentVersion | null>;
  findByComponent(tenantId: string, componentId: string): Promise<ComponentVersion[]>;
  findActive(tenantId: string, componentId: string): Promise<ComponentVersion | null>;
  deactivateAll(tenantId: string, componentId: string): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<ComponentVersion>): Promise<void>;
}

export interface IMarketplaceRepository {
  insert(m: MarketplaceEntry): Promise<void>;
  findById(tenantId: string, id: string): Promise<MarketplaceEntry | null>;
  findByComponent(tenantId: string, componentId: string): Promise<MarketplaceEntry | null>;
  findByTier(tenantId: string, tier: MarketplaceTier): Promise<MarketplaceEntry[]>;
  findByOrganization(tenantId: string, orgId: string): Promise<MarketplaceEntry[]>;
  findAll(tenantId: string): Promise<MarketplaceEntry[]>;
  update(tenantId: string, id: string, patch: Partial<MarketplaceEntry>): Promise<void>;
}

export interface IComponentAuditRepository {
  insert(record: Omit<ComponentAuditRecord, 'id' | 'createdAt'>): Promise<ComponentAuditRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<ComponentAuditRecord[]>;
  findByOrganization(tenantId: string, orgId: string, limit?: number): Promise<ComponentAuditRecord[]>;
}

export { type Result, type EventEnvelope };
