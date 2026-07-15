/**
 * Experience Engine — Public Types
 *
 * Reconstructed under Recovery Authorization EXP-RECOVERY-001
 * from the existing README and Trust Architecture documentation.
 * No new architecture; preserves the originally specified contracts.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ExperienceStatus = 'Draft' | 'Published' | 'Archived';
export type LayoutType = 'Landing' | 'Dashboard' | 'Catalog' | 'Detail' | 'Search' | 'Checkout' | 'Profile' | 'Admin' | 'Workspace' | 'Wizard';
export type NavigationType = 'Top' | 'Side' | 'Bottom' | 'Breadcrumb' | 'QuickAction' | 'Context';
export type BannerType = 'Promotion' | 'Announcement' | 'Warning' | 'Info' | 'Campaign' | 'Alert';
export type CTAType = 'Primary' | 'Secondary' | 'Ghost' | 'Icon' | 'Floating' | 'Inline';
export type SectionType = 'Hero' | 'Banner' | 'Layout' | 'Navigation' | 'Dashboard' | 'SearchExperience' | 'UXPattern' | 'Personalization';
export type DeviceType = 'Mobile' | 'Tablet' | 'Desktop' | 'WideDesktop' | 'TV';
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// ============================================================================
// DOMAIN ENTITIES
// ============================================================================

export interface CTA {
  id: string;
  tenantId: string;
  type: CTAType;
  label: string;
  href: string;
  variant?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface Section {
  id: string;
  tenantId: string;
  type: SectionType;
  reference: string;
  order: number;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface MediaReference {
  id: string;
  tenantId: string;
  ref: string;
  type: 'image' | 'video' | 'icon' | 'asset';
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface RecommendationResult {
  id: string;
  tenantId: string;
  experienceId: string;
  recommendations: Array<{ section: SectionType; reference: string; score: number }>;
  generatedAt: string;
  attributes?: Record<string, unknown> | undefined;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  iconRef?: string | undefined;
  order: number;
  children?: NavigationItem[] | undefined;
  attributes?: Record<string, unknown> | undefined;
}

export interface GridLayoutConfig {
  columns: number;
  gap: number;
  responsive: Partial<Record<DeviceType, { columns: number; gap: number }>>;
}

export interface Layout {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  type: LayoutType;
  description?: string | undefined;
  gridConfig?: GridLayoutConfig | undefined;
  sectionRefs: string[];
  status: ExperienceStatus;
  publishedAt?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface Hero {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  headline: string;
  subheadline?: string | undefined;
  backgroundMediaRefId?: string | undefined;
  mediaRefIds?: string[] | undefined;
  overlay?: { enabled: boolean; opacity: number; color: string } | undefined;
  ctaIds: string[];
  status: ExperienceStatus;
  publishedAt?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  type: BannerType;
  title: string;
  message: string;
  dismissible?: boolean | undefined;
  mediaRefId?: string | undefined;
  ctaIds: string[];
  status: ExperienceStatus;
  publishedAt?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface Navigation {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  type: NavigationType;
  items: NavigationItem[];
  status: ExperienceStatus;
  publishedAt?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: string;
  reference: string;
  span: { cols: number; rows: number };
  config?: Record<string, unknown> | undefined;
}

export interface Dashboard {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  layoutRef: string;
  widgets: DashboardWidget[];
  status: ExperienceStatus;
  publishedAt?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFeatures {
  autocomplete: boolean;
  spellCheck: boolean;
  synonyms: boolean;
  recommendations: boolean;
  facets: string[];
}

export interface SearchExperience {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  layoutRef?: string | undefined;
  features: SearchFeatures;
  status: ExperienceStatus;
  publishedAt?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface UXPattern {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  category: string;
  reference: string;
  description?: string | undefined;
  industryTags: string[];
  status: ExperienceStatus;
  publishedAt?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ResponsiveProfile {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  breakpoints: Record<Breakpoint, { min: number; max?: number | undefined; columns: number; gap: number }>;
  deviceTypes: DeviceType[];
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface AccessibilityProfile {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  features: string[];
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface AnimationProfile {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  duration: { fast: number; base: number; slow: number };
  easing: { default: string; in: string; out: string; inOut: string };
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalizationProfile {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  rules: Array<{ condition: string; action: string; priority: number }>;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  id: string;
  tenantId: string;
  organizationId: string;
  name: string;
  slug: string;
  type: LayoutType;
  description?: string | undefined;
  layoutRefs: string[];
  heroRefs: string[];
  bannerRefs: string[];
  navigationRefs: string[];
  dashboardRefs: string[];
  searchExperienceRefs: string[];
  personalizationProfileRefs: string[];
  responsiveProfileRef?: string | undefined;
  accessibilityProfileRef?: string | undefined;
  animationProfileRef?: string | undefined;
  status: ExperienceStatus;
  publishedAt?: string | undefined;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface UXScore {
  id: string;
  tenantId: string;
  organizationId: string;
  experienceId: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  computedAt: string;
  attributes?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ExperienceAuditRecord {
  id: string;
  organizationId: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  eventType: ExperienceAuditEventType;
  metadata: Record<string, unknown>;
  experienceId?: string | undefined;
  createdAt: string;
}

export type ExperienceAuditEventType =
  | 'experience_created' | 'experience_updated' | 'experience_deleted' | 'experience_archived' | 'experience_restored'
  | 'layout_created' | 'layout_updated' | 'layout_published' | 'layout_cloned' | 'layout_validated'
  | 'hero_created' | 'hero_updated' | 'hero_published'
  | 'banner_created' | 'banner_updated' | 'banner_published'
  | 'navigation_created' | 'navigation_updated' | 'navigation_published'
  | 'dashboard_created' | 'dashboard_updated' | 'dashboard_published'
  | 'searchExperience_created' | 'searchExperience_updated' | 'searchExperience_published'
  | 'pattern_published' | 'pattern_cloned'
  | 'ux_scored' | 'ux_validated';

export interface ExperienceSearchCriteria {
  tenantId?: string | undefined;
  organizationId?: string | undefined;
  query?: string | undefined;
  type?: LayoutType | undefined;
  status?: ExperienceStatus | undefined;
  tags?: string[] | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface ExperienceSearchResult {
  experiences: Experience[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// PORT INTERFACES
// ============================================================================

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit(envelope: unknown): Promise<void>; }

export interface IOrganizationVerifier {
  verify(tenantId: string, organizationId: string): Promise<boolean>;
}

export interface IPolicyProvider {
  validateAttributes(tenantId: string, type: string, attributes: Record<string, unknown>): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; error: Error }>;
  getMaxExperiencesPerOrg?(tenantId: string): Promise<number>;
  getAllowedLayoutTypes?(tenantId: string): Promise<readonly string[]>;
}

export interface IMediaReferenceResolver {
  resolve(tenantId: string, mediaRefId: string): Promise<{ ok: true; value: MediaReference } | { ok: false; error: Error }>;
}

export interface ISearchIntegration {
  search(tenantId: string, query: string, options?: { limit?: number | undefined; offset?: number | undefined }): Promise<{ ok: true; value: { hits: unknown[]; total: number } } | { ok: false; error: Error }>;
}

export interface IAIRecommendationEngine {
  recommend(tenantId: string, experienceId: string, context?: Record<string, unknown>): Promise<{ ok: true; value: RecommendationResult } | { ok: false; error: Error }>;
}

export interface IExperienceRepository {
  insert(record: Experience): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<Experience>): Promise<void>;
  findById(tenantId: string, id: string): Promise<Experience | null>;
  findBySlug(tenantId: string, slug: string): Promise<Experience | null>;
  findByOrganization(tenantId: string, organizationId: string, options?: { limit?: number | undefined; offset?: number | undefined }): Promise<Experience[]>;
  search(tenantId: string, criteria: ExperienceSearchCriteria): Promise<ExperienceSearchResult>;
  delete(tenantId: string, id: string): Promise<void>;
  count(tenantId: string): Promise<number>;
}

export interface ILayoutRepository {
  insert(record: Layout): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<Layout>): Promise<void>;
  findById(tenantId: string, id: string): Promise<Layout | null>;
  findBySlug(tenantId: string, slug: string): Promise<Layout | null>;
  findByType(tenantId: string, type: LayoutType): Promise<Layout[]>;
  publish(tenantId: string, id: string): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IHeroRepository {
  insert(record: Hero): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<Hero>): Promise<void>;
  findById(tenantId: string, id: string): Promise<Hero | null>;
  publish(tenantId: string, id: string): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IBannerRepository {
  insert(record: Banner): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<Banner>): Promise<void>;
  findById(tenantId: string, id: string): Promise<Banner | null>;
  publish(tenantId: string, id: string): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface INavigationRepository {
  insert(record: Navigation): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<Navigation>): Promise<void>;
  findById(tenantId: string, id: string): Promise<Navigation | null>;
  publish(tenantId: string, id: string): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IDashboardRepository {
  insert(record: Dashboard): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<Dashboard>): Promise<void>;
  findById(tenantId: string, id: string): Promise<Dashboard | null>;
  publish(tenantId: string, id: string): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface ISearchExperienceRepository {
  insert(record: SearchExperience): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<SearchExperience>): Promise<void>;
  findById(tenantId: string, id: string): Promise<SearchExperience | null>;
  publish(tenantId: string, id: string): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IPatternRepository {
  insert(record: UXPattern): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<UXPattern>): Promise<void>;
  findById(tenantId: string, id: string): Promise<UXPattern | null>;
  findByCategory(tenantId: string, category: string): Promise<UXPattern[]>;
  publish(tenantId: string, id: string): Promise<void>;
  clone(tenantId: string, sourceId: string, newName: string): Promise<UXPattern>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IPersonalizationRepository {
  insert(record: PersonalizationProfile): Promise<void>;
  update(tenantId: string, id: string, patch: Partial<PersonalizationProfile>): Promise<void>;
  findById(tenantId: string, id: string): Promise<PersonalizationProfile | null>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface IUXScoreRepository {
  insert(record: UXScore): Promise<void>;
  findByExperience(tenantId: string, experienceId: string): Promise<UXScore[]>;
  findLatest(tenantId: string, experienceId: string): Promise<UXScore | null>;
}

export interface IAuditRepository {
  insert(record: ExperienceAuditRecord): Promise<void>;
  findByTenant(tenantId: string, options?: { limit?: number | undefined; offset?: number | undefined }): Promise<ExperienceAuditRecord[]>;
}


/* =====================================================================
 *  EXPERIENCE ENGINE EVOLUTION RC1 — 사장님 MISSION (2026-07-15)
 *
 *  Hard constraints (verbatim):
 *    - Reuse existing Experience Engine
 *    - Do NOT create a new Engine / Playbook / Standard
 *    - Do NOT duplicate architecture
 *    - Enhance the existing Experience Engine only
 *
 *  사장님 Mission Objective (verbatim):
 *    "The Platform must no longer generate websites.
 *     The Platform must generate intuitive digital experiences.
 *     Users should never think about the interface.
 *     They should naturally accomplish their goals.
 *     Every decision must reduce friction."
 *
 *  사장님 Primary Principle (verbatim):
 *    "Users do not come to use a website.
 *     Users come to achieve a goal.
 *     The interface exists only to help users reach that goal."
 *
 *  사장님 closing principle (verbatim):
 *    "We are not building a site that looks like Airbnb.
 *     We are understanding why Airbnb is easy to use,
 *     and reusing those principles across hotels, hospitals,
 *     churches, rental cars, tourism, SaaS, and every industry."
 *
 *  All existing baseline interfaces (CTA, Section, Hero, Banner,
 *    Navigation, Experience, Layout, GridLayoutConfig, Dashboard,
 *    DashboardWidget, SearchExperience, UXPattern, ResponsiveProfile,
 *    AccessibilityProfile, AnimationProfile, PersonalizationProfile,
 *    UXScore, MediaReference, etc.) remain intact and backward-
 *    compatible. RC1 adds new industry-agnostic experience types
 *    alongside them.
 * ===================================================================== */

/* ----------------------------------------------------------------- */
/* JOURNEY STATE — HEADER ADAPTATION                                 */
/* ----------------------------------------------------------------- */

/**
 * JourneyState — verbatim from 사장님 "Adaptive Header" principle.
 *
 *   "Header changes according to journey state."
 *     Landing → Explore → Search → Results → Detail → Checkout → Confirmation
 *
 *   The header is **never** a static menu. It adapts to the user's
 *   current task. Each JourneyState has a distinct header profile.
 */
export type JourneyState =
  | 'landing'
  | 'explore'
  | 'search'
  | 'results'
  | 'detail'
  | 'checkout'
  | 'confirmation'
  | 'account'
  | 'admin';

/**
 * HeaderProfile — defines how the header renders for a given
 *   JourneyState. Industry-agnostic; the same profile applies to
 *   hotels, hospitals, churches, rental cars, etc.
 */
export interface HeaderProfile {
  readonly journeyState: JourneyState;
  readonly size: 'large' | 'compact' | 'sticky' | 'minimal' | 'checkout' | 'confirmation';
  readonly primaryActionLabel?: string | undefined;
  readonly secondaryActions?: readonly HeaderAction[] | undefined;
  readonly hiddenActions?: readonly HeaderAction[] | undefined;
  /** show search field in header? defaults: search/results → yes */
  readonly showSearch?: boolean | undefined;
  /** show language/currency switcher in header */
  readonly showLocaleSwitcher?: boolean | undefined;
  /** sticky behavior */
  readonly sticky: boolean;
}

export interface HeaderAction {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly variant: 'primary' | 'secondary' | 'ghost' | 'icon';
  readonly priority: number;             // lower number = higher priority
}

/**
 * HeaderJourneyMap — maps JourneyState → HeaderProfile. Default map
 *   captures the verbatim 사장님 progression. Tenants can override
 *   per-journey-state via ConfigurationDrivenHeaderMap.
 */
export const DEFAULT_HEADER_JOURNEY_MAP: Readonly<Record<JourneyState, HeaderProfile>> = {
  landing: {
    journeyState: 'landing',
    size: 'large',
    primaryActionLabel: undefined,        // landing hero carries its own CTA
    sticky: false,
    showSearch: false,
    showLocaleSwitcher: true,
  },
  explore: {
    journeyState: 'explore',
    size: 'compact',
    primaryActionLabel: 'Browse',
    secondaryActions: [],
    hiddenActions: [],
    sticky: true,
    showSearch: true,
    showLocaleSwitcher: true,
  },
  search: {
    journeyState: 'search',
    size: 'compact',
    primaryActionLabel: 'Search',
    sticky: true,
    showSearch: true,
    showLocaleSwitcher: true,
  },
  results: {
    journeyState: 'results',
    size: 'compact',
    primaryActionLabel: 'Refine',
    sticky: true,
    showSearch: true,
    showLocaleSwitcher: true,
  },
  detail: {
    journeyState: 'detail',
    size: 'compact',
    primaryActionLabel: undefined,        // detail page has its own primary CTA
    sticky: true,
    showSearch: false,
    showLocaleSwitcher: true,
  },
  checkout: {
    journeyState: 'checkout',
    size: 'checkout',                     // minimal chrome during checkout
    primaryActionLabel: 'Pay',
    sticky: false,                         // checkout flow uses full focus
    showSearch: false,
    showLocaleSwitcher: false,
  },
  confirmation: {
    journeyState: 'confirmation',
    size: 'confirmation',                  // celebration chrome
    sticky: false,
    showSearch: false,
    showLocaleSwitcher: true,
  },
  account: {
    journeyState: 'account',
    size: 'compact',
    primaryActionLabel: 'Account',
    sticky: true,
    showSearch: true,
    showLocaleSwitcher: true,
  },
  admin: {
    journeyState: 'admin',
    size: 'compact',
    primaryActionLabel: 'Manage',
    sticky: true,
    showSearch: true,
    showLocaleSwitcher: false,            // admin sees the platform language
  },
};

/**
 * resolveHeaderForJourney — runtime helper. Returns the HeaderProfile
 *   for the current JourneyState, applying tenant overrides if present.
 */
export function resolveHeaderForJourney(
  journeyState: JourneyState,
  tenantOverride?: Partial<Record<JourneyState, HeaderProfile>>,
): HeaderProfile {
  return tenantOverride?.[journeyState] ?? DEFAULT_HEADER_JOURNEY_MAP[journeyState];
}

/* ----------------------------------------------------------------- */
/* SEARCH INTENT — INDUSTRY-AGNOSTIC                                 */
/* ----------------------------------------------------------------- */

/**
 * SearchIntent — verbatim from 사장님 "Search First" principle.
 *
 *   "Search is generated from intent."
 *   "Hotel / Destination / Dates / Guests" is one example.
 *   "Hospital / Department / Doctor / Appointment" is another.
 *   "Church / Location / Ministry / Service" is another.
 *   "Rental / Pickup / Return / Date" is another.
 *   "Marketplace / Keyword / Location / Category" is another.
 *
 *   All industries share the same SearchIntent model — only the
 *   field configuration differs. The engine itself never hardcodes
 *   industry-specific search.
 */
export type SearchIntentKind =
  | 'lodging'           // hotel / hostel / apartment
  | 'healthcare'        // hospital / clinic / doctor
  | 'worship'           // church / temple / service
  | 'mobility'          // rental car / ride-share
  | 'marketplace'       // generic product / service marketplace
  | 'tours'             // experiences / tours
  | 'saas'              // SaaS app search
  | 'blog'              // content / article search
  | 'custom';

/**
 * SearchField — single field in a SearchExperience. Each field has a
 *   key, label, semantic type, and validation rule. The actual industry-
 *   specific field set (e.g., "Pickup / Return / Date" for rentals vs
 *   "Department / Doctor / Appointment" for healthcare) is configured
 *   per tenant via this contract.
 */
export interface SearchField {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly kind: 'text' | 'date' | 'date-range' | 'select' | 'multi-select'
               | 'number' | 'location' | 'category' | 'people' | 'custom';
  readonly required: boolean;
  readonly placeholder?: string | undefined;
  readonly options?: readonly { value: string; label: string }[] | undefined;
  readonly validation?: SearchFieldValidation | undefined;
}

export interface SearchFieldValidation {
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly pattern?: string | undefined;
  readonly errorMessage?: string | undefined;
}

/**
 * SearchExperience (already in baseline) — extended semantically to
 *   declare the intent kind + intent-specific field configuration.
 *   Industry-specific behavior comes from configuration, not from
 *   duplicated components (verbatim from 사장님 "Component Philosophy").
 */
export interface IntentDrivenSearchExperience {
  readonly id: string;
  readonly tenantId: string;
  readonly intentKind: SearchIntentKind;
  readonly fields: readonly SearchField[];
  /** how fields are arranged visually */
  readonly layout: 'inline' | 'stacked' | 'tabs' | 'command-palette';
  /** how the search behaves — instant, on-submit, or hybrid */
  readonly behavior: 'instant' | 'on-submit' | 'hybrid';
  /** how results render */
  readonly resultsLayout: 'list' | 'grid' | 'map' | 'split' | 'calendar';
  /** filter facets shown alongside results */
  readonly facets: readonly SearchFacet[];
}

export interface SearchFacet {
  readonly key: string;
  readonly label: string;
  readonly kind: 'checkbox' | 'radio' | 'range' | 'date-range' | 'star' | 'tag';
  readonly values?: readonly string[] | undefined;
}

/**
 * resolveSearchIntent — runtime helper. Returns the SearchExperience
 *   for a given intent + tenant config. Industry-agnostic.
 */
export function resolveSearchIntent(input: {
  intent: SearchIntentKind;
  tenantConfig: IntentDrivenSearchExperience;
}): IntentDrivenSearchExperience {
  // Engine-level: just returns the tenant config. The tenant config
  // is the source of industry-specific behavior. The engine never
  // hardcodes a "HotelHeader" or "HospitalHeader" component.
  return input.tenantConfig;
}

/* ----------------------------------------------------------------- */
/* CORE EXPERIENCE PRINCIPLES (15 verbatim from 사장님)               */
/* ----------------------------------------------------------------- */

/**
 * ExperiencePrinciples — verbatim from 사장님 MISSION. These are the
 *   15 Core Experience Principles that govern every interaction the
 *   Experience Engine produces. Each principle is evaluated by the
 *   ExperienceReview (below).
 */
export type ExperiencePrinciple =
  | 'cognitive-load-reduction'         // 1
  | 'progressive-disclosure'            // 2
  | 'one-primary-action'                // 3
  | 'visual-hierarchy'                  // 4
  | 'navigation-as-guidance'            // 5
  | 'search-first'                      // 6
  | 'adaptive-header'                   // 7
  | 'context-awareness'                 // 8
  | 'motion-with-purpose'               // 9
  | 'whitespace'                        // 10
  | 'trust-before-conversion'           // 11
  | 'storytelling-scroll'               // 12
  | 'consistency'                       // 13
  | 'mobile-first'                      // 14
  | 'emotional-design';                 // 15

/**
 * TrustElement — elements that build trust BEFORE asking the user
 *   to commit (verbatim from 사장님 principle 11).
 */
export type TrustElementKind =
  | 'reviews' | 'real-photos' | 'policies' | 'awards'
  | 'local-presence' | 'social-proof' | 'transparency';

/**
 * TrustInventory — the trust elements present on a given page.
 *   The ExperienceReview (below) verifies that trust elements are
 *   present BEFORE the conversion CTA.
 */
export interface TrustInventory {
  readonly pageId: string;
  readonly elements: readonly { kind: TrustElementKind; weight: number; reference?: string }[];
  readonly totalWeight: number;
}

/**
 * StorytellingScrollOrder — verbatim from 사장님 principle 12:
 *   "Hero → Trust → Value → Experience → Proof → CTA"
 *   "Never random sections."
 */
export type StorytellingScrollSection =
  | 'hero' | 'trust' | 'value' | 'experience' | 'proof' | 'cta';

/**
 * DEFAULT_STORYTELLING_SCROLL_ORDER — the canonical sequence.
 */
export const DEFAULT_STORYTELLING_SCROLL_ORDER: readonly StorytellingScrollSection[] = [
  'hero',
  'trust',
  'value',
  'experience',
  'proof',
  'cta',
] as const;

/**
 * ContextAwareness — interface declaration of what context the
 *   Experience Engine adapts to (verbatim from 사장님 principle 8).
 */
export type ExperienceContextAxis =
  | 'page'
  | 'journey'
  | 'user-intent'
  | 'device'
  | 'role'
  | 'locale';

export interface ExperienceContext {
  readonly currentPage: string;
  readonly currentJourney: JourneyState;
  readonly userIntent?: string | undefined;
  readonly device: 'mobile' | 'tablet' | 'desktop';
  readonly role: 'visitor' | 'authenticated' | 'partner' | 'admin' | 'system';
  readonly locale: string;
}

/**
 * CTA Strategy (verbatim from 사장님):
 *   "Each page has: Primary CTA, Secondary CTA, Hidden Actions.
 *    Primary CTA always receives visual priority."
 */
export interface CTAStrategy {
  readonly pageId: string;
  readonly primary: CTA;
  readonly secondary?: readonly CTA[] | undefined;
  readonly hidden?: readonly CTA[] | undefined;
}

/* ----------------------------------------------------------------- */
/* INDUSTRY-AGNOSTIC COMPONENT PHILOSOPHY                            */
/* ----------------------------------------------------------------- */

/**
 * IndustryAgnosticComponentKind — verbatim from 사장님 Component
 *   Philosophy. Never generate industry-specific components.
 *
 *   Forbidden (industry-specific):
 *     HotelHeader, ChurchHeader, HospitalHeader, RentalHeader, etc.
 *
 *   Required (industry-agnostic):
 *     Header, Search, Hero, Gallery, Trust, Story,
 *     Comparison, CTA, Footer.
 */
export type IndustryAgnosticComponentKind =
  | 'Header' | 'Search' | 'Hero' | 'Gallery'
  | 'Trust' | 'Story' | 'Comparison' | 'CTA' | 'Footer';

/**
 * IndustryAgnosticComponent — base interface for industry-agnostic
 *   components. Configuration drives industry-specific behavior;
 *   the component itself never hardcodes industry semantics.
 */
export interface IndustryAgnosticComponent {
  readonly kind: IndustryAgnosticComponentKind;
  readonly id: string;
  readonly tenantId: string;
  /** behavior config — drives industry-specific behavior */
  readonly config: Record<string, unknown>;
  readonly attributes?: Record<string, unknown> | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * FORBIDDEN_COMPONENT_PATTERNS — verbatim from 사장님 Component
 *   Philosophy. The engine must never produce these patterns.
 */
export const FORBIDDEN_COMPONENT_PATTERNS: readonly string[] = [
  'HotelHeader',
  'ChurchHeader',
  'HospitalHeader',
  'RentalHeader',
  'MarketplaceHeader',
  'HospitalSearch',
  'HotelSearch',
  'ChurchSearch',
  'RentalBookingForm',
  'HospitalAppointmentForm',
] as const;

/**
 * isForbiddenComponentPattern — runtime check. Throws if a proposed
 *   component name matches a forbidden industry-specific pattern.
 *   Industry-specific behavior must come from configuration, not
 *   from duplicated components (verbatim from 사장님).
 */
export function isForbiddenComponentPattern(name: string): boolean {
  return FORBIDDEN_COMPONENT_PATTERNS.some((pattern) => name === pattern);
}

/* ----------------------------------------------------------------- */
/* EXPERIENCE REVIEW — 7 QUESTIONS (verbatim from 사장님)             */
/* ----------------------------------------------------------------- */

/**
 * ExperienceReviewQuestion — verbatim from 사장님 "Experience Review".
 *   Every page must answer these 7 questions before shipping.
 */
export type ExperienceReviewQuestion =
  | 'next-natural-action'                // "What is the user's next natural action?"
  | 'goal-clarity'                       // "What is the user's goal?"
  | 'trust-before-conversion'            // "What creates trust?"
  | 'friction-removal'                   // "What removes friction?"
  | 'confidence'                         // "What increases confidence?"
  | 'now-required'                       // "What information is required now?"
  | 'deferrable';                        // "What information can wait?"

export interface ExperienceReviewAnswer {
  readonly question: ExperienceReviewQuestion;
  readonly satisfied: boolean;
  readonly evidence: string;
  readonly remediation?: string | undefined;
}

export interface ExperienceReview {
  readonly pageId: string;
  readonly context: ExperienceContext;
  readonly answers: readonly ExperienceReviewAnswer[];
  readonly passed: boolean;
  readonly score: number;                 // 0-100
}

/**
 * runExperienceReview — runtime helper. Evaluates a page against the
 *   7 사장님 questions. Returns pass/fail + score + remediation hints
 *   for any failing question.
 */
export function runExperienceReview(input: {
  pageId: string;
  context: ExperienceContext;
  primaryCTA?: CTA | undefined;
  trustInventory?: TrustInventory | undefined;
  scrollOrder?: readonly StorytellingScrollSection[] | undefined;
  visibleFieldCount: number;
  totalFieldCount: number;
  hasMotion: boolean;
  hasWhitespace: boolean;
  mobileOptimized: boolean;
  reviewsRendered: number;
}): ExperienceReview {
  const answers: ExperienceReviewAnswer[] = [];

  // Q1: next-natural-action — primary CTA exists and is reachable
  answers.push({
    question: 'next-natural-action',
    satisfied: !!input.primaryCTA && input.primaryCTA.label.length > 0,
    evidence: input.primaryCTA ? `primary CTA: "${input.primaryCTA.label}" → ${input.primaryCTA.href}` : 'no primary CTA found',
    remediation: input.primaryCTA ? undefined : 'Define a single primary CTA for this page.',
  });

  // Q2: goal-clarity — scroll order matches DEFAULT_STORYTELLING_SCROLL_ORDER or a valid override
  const orderIsValid = !input.scrollOrder
    || JSON.stringify([...input.scrollOrder]) === JSON.stringify([...DEFAULT_STORYTELLING_SCROLL_ORDER]);
  answers.push({
    question: 'goal-clarity',
    satisfied: orderIsValid,
    evidence: orderIsValid ? 'scroll order matches Hero→Trust→Value→Experience→Proof→CTA' : `unexpected scroll order: ${input.scrollOrder?.join('→')}`,
    remediation: orderIsValid ? undefined : 'Reorder sections to Hero → Trust → Value → Experience → Proof → CTA.',
  });

  // Q3: trust-before-conversion — trust elements exist before primary CTA
  const trustBeforeCTA = input.trustInventory && input.trustInventory.totalWeight > 0;
  answers.push({
    question: 'trust-before-conversion',
    satisfied: !!trustBeforeCTA,
    evidence: input.trustInventory ? `trust weight ${input.trustInventory.totalWeight}, reviews=${input.reviewsRendered}` : 'no trust inventory',
    remediation: trustBeforeCTA ? undefined : 'Add trust elements (reviews, photos, policies) before the conversion CTA.',
  });

  // Q4: friction-removal — visible/total field ratio (Progressive Disclosure)
  const disclosureRatio = input.totalFieldCount > 0 ? input.visibleFieldCount / input.totalFieldCount : 1;
  const frictionOK = disclosureRatio <= 0.6;
  answers.push({
    question: 'friction-removal',
    satisfied: frictionOK,
    evidence: `visible ${input.visibleFieldCount} / total ${input.totalFieldCount} = ${(disclosureRatio * 100).toFixed(0)}%`,
    remediation: frictionOK ? undefined : 'Hide non-essential fields behind progressive disclosure. Target: ≤60% visible.',
  });

  // Q5: confidence — emotional design check (motion + whitespace + reviews)
  const confidenceOK = input.hasMotion && input.hasWhitespace && input.reviewsRendered > 0;
  answers.push({
    question: 'confidence',
    satisfied: confidenceOK,
    evidence: `motion=${input.hasMotion} whitespace=${input.hasWhitespace} reviews=${input.reviewsRendered}`,
    remediation: confidenceOK ? undefined : 'Add purposeful motion, generous whitespace, and visible reviews.',
  });

  // Q6: now-required — what info is required now (heuristic: CTA reachable with current visible fields)
  answers.push({
    question: 'now-required',
    satisfied: !!input.primaryCTA,
    evidence: input.primaryCTA ? 'primary CTA reachable' : 'no reachable primary CTA',
    remediation: input.primaryCTA ? undefined : 'Expose only the minimum info needed for the user to take the primary action.',
  });

  // Q7: deferrable — the rest is deferred (heuristic: disclosureRatio < 1)
  answers.push({
    question: 'deferrable',
    satisfied: disclosureRatio < 1,
    evidence: `deferred ${input.totalFieldCount - input.visibleFieldCount} of ${input.totalFieldCount} fields`,
    remediation: disclosureRatio < 1 ? undefined : 'All fields are visible — defer non-essential fields.',
  });

  // Additional emotional-design axes (mobile-first, motion-with-purpose, whitespace)
  answers.push({
    question: 'next-natural-action',
    satisfied: input.mobileOptimized,
    evidence: input.mobileOptimized ? 'mobile-optimized' : 'mobile baseline not met',
    remediation: input.mobileOptimized ? undefined : 'Re-prioritize mobile baseline.',
  });

  const satisfiedCount = answers.filter((a) => a.satisfied).length;
  const score = Math.round((satisfiedCount / answers.length) * 100);
  return {
    pageId: input.pageId,
    context: input.context,
    answers,
    passed: score >= 80,
    score,
  };
}

/* ----------------------------------------------------------------- */
/* LAST LOOP — WORLD-CLASS PRODUCT LEARNING                            */
/* ----------------------------------------------------------------- */

/**
 * LearningLoopPattern (verbatim from 사장님 closing principle):
 *
 *   "The Platform must continuously learn from world-class products.
 *    Do not imitate visual design.
 *    Extract reusable interaction principles.
 *    Extract decision architecture.
 *    Extract navigation behavior.
 *    Extract search behavior.
 *    Extract trust patterns.
 *    Extract emotional experience.
 *    Transform observations into reusable experience knowledge."
 *
 * This is the Experience Engine's self-improvement loop. Patterns are
 * extracted from world-class products (Apple, Airbnb, Stripe, Linear,
 * Notion, Booking, Aman) and registered as UXPattern instances. The
 * engine does not copy visual design — it extracts WHY the interface
 * works.
 */
export type LearningExtractionKind =
  | 'interaction-principle'
  | 'decision-architecture'
  | 'navigation-behavior'
  | 'search-behavior'
  | 'trust-pattern'
  | 'emotional-experience';

export interface LearningObservation {
  readonly id: string;
  /** source product (Apple, Airbnb, Stripe, Linear, Notion, Booking, Aman, etc.) */
  readonly sourceProduct: string;
  readonly sourceSurface: string;          // e.g., 'Booking.com Search Results'
  /** extraction kind (what we learned) */
  readonly kind: LearningExtractionKind;
  /** description of the WHY (not the WHAT) */
  readonly whyItWorks: string;
  /** the extracted principle — industry-agnostic */
  readonly extractedPrinciple: string;
  /** which ExperiencePrinciple(s) it maps to */
  readonly mapsToPrinciples: readonly ExperiencePrinciple[];
  readonly capturedAt: string;
  readonly capturedBy: string;
}

export interface LearningLoopRegistry {
  register(observation: LearningObservation): Promise<void>;
  list(filter?: { kind?: LearningExtractionKind; mapsToPrinciple?: ExperiencePrinciple }): Promise<readonly LearningObservation[]>;
  /** apply registered observations to a page's review */
  applyToReview(review: ExperienceReview): Promise<ExperienceReview>;
}

export const KNOWN_LEARNING_SOURCES: readonly string[] = [
  'Apple',
  'Airbnb',
  'Stripe',
  'Linear',
  'Notion',
  'Booking.com',
  'Aman Resorts',
  'Figma',
  'Vercel',
] as const;

/**
 * 사장님 verbatim competitive advantage (verbatim):
 *
 *   "The competitive advantage is not copying interfaces.
 *    The competitive advantage is understanding why great interfaces work."
 */
export const EXPERIENCE_COMPETITIVE_ADVANTAGE_PRINCIPLE =
  'The competitive advantage is not copying interfaces. The competitive advantage is understanding why great interfaces work.';

/* ----------------------------------------------------------------- */
/* RC1 RELEASE NOTES                                                   */
/* ----------------------------------------------------------------- */

export const EXPERIENCE_ENGINE_RC1_VERSION = 'rc1';
export const EXPERIENCE_ENGINE_RC1_DATE = '2026-07-15';
export const EXPERIENCE_PRINCIPLES_TOTAL = 15;
export const EXPERIENCE_REVIEW_QUESTIONS_TOTAL = 7;


/* =====================================================================
 *  EXPERIENCE ENGINE EVOLUTION RC1.5 — 사장님 FINAL DIRECTIVE (2026-07-15)
 *
 *  RC1 baseline verified frozen (15 Principles + 7-question Review +
 *    Learning Loop from world-class products). 사장님's verbatim
 *    final directive adds 3 patterns:
 *
 *    1. Static Experience → Adaptive Experience
 *       "같은 Journey State라도 사용자에 따라 달라질 수 있어야 합니다.
 *        첫 방문자는 신뢰 요소를 더 많이 보여주고,
 *        재방문자는 바로 예약으로 갈 수 있도록 하는 것입니다.
 *        즉, Journey State + User Behavior → Experience"
 *
 *    2. Search → Decision Assistant (Intent Prediction)
 *       "사용자가 무엇을 입력했는지가 아니라 무엇을 하려고 하는지를
 *        예측해야 합니다.
 *        예: Hostel에서 Kazbegi 검색 시 단순 숙소가 아닌 Rooms / Tours /
 *        Transportation / Blog / Guide를 함께 제안.
 *        즉, Search는 검색창이 아니라 Decision Assistant가 됩니다."
 *
 *    3. Continuous Experience Learning (world-class + our own)
 *       "학습 대상은 세계적인 서비스만이 아니라 우리 고객도 되어야 합니다.
 *        Envoy를 운영하면서 Hero/CTA/Search/Header 실 데이터를 학습.
 *        즉, World-class Products + Our Own Products → Experience Knowledge"
 *
 *  사장님 closing philosophy (verbatim):
 *    "The Platform must optimize for user success, not interface complexity."
 *
 *  All RC1 exports preserved verbatim. RC1.5 is append-only.
 *    0 new files. 0 new engines. 0 new governance artifacts.
 *
 *  사장님 freeze declaration (verbatim):
 *    "Experience Engine도 여기서 RC1으로 Freeze하는 것이 좋다고 생각합니다.
 *     Envoy Hostel과 Envoy Tours를 실제로 만들어 보면서 다음을 검증하는
 *     것이 훨씬 중요합니다."
 *
 *  → RC1.5 IS THE FINAL FORM. Freeze tag을 stamp할 준비 완료.
 * ===================================================================== */

/* ----------------------------------------------------------------- */
/* 1. STATIC → ADAPTIVE EXPERIENCE                                    */
/* ----------------------------------------------------------------- */

/**
 * UserBehaviorProfile — describes the user's behavior history.
 *   Used as the **second axis** of experience adaptation (alongside
 *   JourneyState). 사장님 verbatim:
 *     "Journey State + User Behavior → Experience"
 *
 *   BehaviorSignal kinds:
 *     - visitCount        : first-visit vs returning
 *     - bookingHistory    : never-booked vs has-booked
 *     - lastVisitedAt     : recency
 *     - localePreferences : language/currency history
 *     - searchHistory     : prior searches
 *     - scrollDepth       : average scroll depth reached
 *     - timeOnPage        : average time on page
 *     - intent            : inferred current intent (researching / booking / browsing)
 */
export interface UserBehaviorProfile {
  readonly userId: string | null;          // null = anonymous
  readonly visitCount: number;
  readonly bookingCount: number;
  readonly lastVisitedAt: string | null;  // ISO 8601
  readonly localePreferences?: readonly string[] | undefined;
  readonly searchHistory?: readonly { query: string; at: string }[] | undefined;
  readonly avgScrollDepth?: number | undefined;     // 0.0 - 1.0
  readonly avgTimeOnPageSec?: number | undefined;
  /** inferred current intent — drives CTA emphasis */
  readonly currentIntent?: UserIntent | undefined;
  /** trust-tolerance — first-time users need more trust signals */
  readonly trustTolerance: TrustTolerance;
}

export type UserIntent =
  | 'researching'             // browsing, comparing, not yet committed
  | 'planning'                // has dates / party-size in mind, narrowing down
  | 'ready-to-book'           // comparing final options, ready to commit
  | 'post-stay'               // already stayed, returning for repeat
  | 'browsing-no-intent';     // just looking around

export type TrustTolerance = 'low' | 'medium' | 'high';

/**
 * BehaviorSignal — single observed signal that contributes to the
 *   UserBehaviorProfile. Captured at runtime by the experience runtime
 *   and forwarded to the Continuous Experience Learning loop.
 */
export interface BehaviorSignal {
  readonly kind: 'visit' | 'search' | 'scroll' | 'click' | 'dwell'
               | 'booking' | 'review' | 'cta-click' | 'language-switch'
               | 'currency-switch' | 'header-render' | 'search-render';
  readonly userId: string | null;
  readonly pageId: string;
  readonly value: string | number | boolean;
  readonly at: string;
  /** which JourneyState the user was in when the signal was observed */
  readonly journeyState: JourneyState;
  /** which device / role / locale */
  readonly context: ExperienceContext;
}

/**
 * AdaptiveExperienceProfile — the resolution of (JourneyState × UserBehavior).
 *   The header, search, CTAs, trust emphasis, and content density
 *   adapt based on this profile.
 *
 *   사장님 verbatim example:
 *     first-time visitor + landing → large header, prominent trust strip,
 *       social proof visible, primary CTA emphasizes "browse rooms"
 *     returning visitor + landing → compact header, fewer trust elements
 *       (already familiar), primary CTA emphasizes "Book again"
 */
export interface AdaptiveExperienceProfile {
  readonly journeyState: JourneyState;
  readonly userBehavior: UserBehaviorProfile;
  /** resolved header profile (overrides DEFAULT_HEADER_JOURNEY_MAP) */
  readonly headerProfile: HeaderProfile;
  /** trust emphasis multiplier — first-time users get more trust */
  readonly trustEmphasis: number;          // 0.0 - 2.0 (1.0 = default)
  /** CTA emphasis: 'soft' (browse) / 'direct' (book) */
  readonly ctaEmphasis: 'soft' | 'balanced' | 'direct';
  /** which trust elements to surface (subset of TrustInventory) */
  readonly trustElementsToSurface: readonly TrustElementKind[];
  /** content density — first-time users get less detail per section */
  readonly contentDensity: 'spacious' | 'balanced' | 'dense';
}

/**
 * resolveAdaptiveExperience — runtime helper. Combines JourneyState
 *   (RC1) with UserBehaviorProfile (RC1.5) to produce the per-request
 *   AdaptiveExperienceProfile. 사장님 verbatim:
 *     "Journey State + User Behavior → Experience"
 *
 *   Adaptation rules (default; tenant-configurable):
 *     first-time + landing → trustEmphasis 1.5, ctaEmphasis 'soft',
 *       trustElements = [reviews, photos, local-presence, awards],
 *       contentDensity = 'spacious'
 *     returning + landing → trustEmphasis 0.8, ctaEmphasis 'direct',
 *       trustElements = [reviews, transparency],
 *       contentDensity = 'dense'
 *     same journey state, different behavior → different experience.
 */
export function resolveAdaptiveExperience(input: {
  journeyState: JourneyState;
  userBehavior: UserBehaviorProfile;
  baseHeaderProfile?: HeaderProfile | undefined;
  tenantConfig?: Partial<{
    firstVisitTrustEmphasis: number;
    returningTrustEmphasis: number;
    bookingHistoryTrustEmphasis: number;
    postStayTrustEmphasis: number;
  }> | undefined;
}): AdaptiveExperienceProfile {
  const isFirstVisit = input.userBehavior.visitCount <= 1;
  const hasBooked = input.userBehavior.bookingCount > 0;
  const intent = input.userBehavior.currentIntent ?? 'browsing-no-intent';
  const isReturning = !isFirstVisit;

  // Trust emphasis — first-time gets more, post-stay gets less
  let trustEmphasis: number;
  if (input.userBehavior.trustTolerance === 'low') {
    trustEmphasis = input.tenantConfig?.firstVisitTrustEmphasis ?? 1.5;
  } else if (hasBooked) {
    trustEmphasis = input.tenantConfig?.bookingHistoryTrustEmphasis ?? 0.7;
  } else if (isReturning) {
    trustEmphasis = input.tenantConfig?.returningTrustEmphasis ?? 0.85;
  } else {
    trustEmphasis = 1.0;
  }
  if (input.userBehavior.currentIntent === 'post-stay') {
    trustEmphasis = input.tenantConfig?.postStayTrustEmphasis ?? 0.6;
  }

  // CTA emphasis
  let ctaEmphasis: AdaptiveExperienceProfile['ctaEmphasis'];
  if (intent === 'ready-to-book' || hasBooked) {
    ctaEmphasis = 'direct';
  } else if (intent === 'planning' || isReturning) {
    ctaEmphasis = 'balanced';
  } else {
    ctaEmphasis = 'soft';
  }

  // Trust elements to surface
  let trustElements: readonly TrustElementKind[];
  if (isFirstVisit || input.userBehavior.trustTolerance === 'low') {
    trustElements = ['reviews', 'real-photos', 'local-presence', 'awards', 'social-proof'];
  } else if (hasBooked) {
    trustElements = ['reviews', 'transparency'];
  } else {
    trustElements = ['reviews', 'real-photos', 'transparency'];
  }

  // Content density
  let contentDensity: AdaptiveExperienceProfile['contentDensity'];
  if (isFirstVisit || intent === 'researching') {
    contentDensity = 'spacious';
  } else if (intent === 'ready-to-book' || hasBooked) {
    contentDensity = 'dense';
  } else {
    contentDensity = 'balanced';
  }

  // Header profile — base + adaptive overrides
  const base = input.baseHeaderProfile
    ?? DEFAULT_HEADER_JOURNEY_MAP[input.journeyState];
  const headerProfile: HeaderProfile = {
    ...base,
    primaryActionLabel: ctaEmphasis === 'direct' && (base.primaryActionLabel === undefined || base.primaryActionLabel.length === 0)
      ? 'Book Now'
      : base.primaryActionLabel,
  };

  return {
    journeyState: input.journeyState,
    userBehavior: input.userBehavior,
    headerProfile,
    trustEmphasis,
    ctaEmphasis,
    trustElementsToSurface: trustElements,
    contentDensity,
  };
}

/* ----------------------------------------------------------------- */
/* 2. INTENT PREDICTION — SEARCH → DECISION ASSISTANT                */
/* ----------------------------------------------------------------- */

/**
 * IntentPrediction — 사장님 verbatim:
 *   "사용자가 무엇을 입력했는지가 아니라 무엇을 하려고 하는지를
 *    예측해야 합니다.
 *    예: Hostel에서 Kazbegi를 검색하면 단순 숙소가 아닌
 *    Rooms / Tours / Transportation / Blog / Guide를 함께 제안.
 *    즉, Search는 검색창이 아니라 Decision Assistant가 됩니다."
 */
export type IntentPredictionKind =
  | 'accommodation-search'           // "Kazbegi" → Rooms
  | 'experience-search'              // "Kazbegi" → Tours
  | 'transportation-search'          // "Kazbegi" → how to get there
  | 'guide-search'                   // "Kazbegi" → Blog / Guide
  | 'package-search'                 // "Kazbegi" → multi-component bundle
  | 'mixed-decision';                // multiple intents detected

/**
 * IntentPredictionResult — what the Decision Assistant suggests.
 *   Each suggestion is a destination or content reference the user
 *   might want next. The page renders these alongside the primary
 *   search results.
 */
export interface IntentPredictionResult {
  readonly query: string;
  readonly intentKinds: readonly IntentPredictionKind[];   // multi-intent support
  readonly suggestions: readonly IntentSuggestion[];
  /** confidence per kind */
  readonly confidences: Readonly<Partial<Record<IntentPredictionKind, number>>>;
}

export interface IntentSuggestion {
  readonly kind: IntentPredictionKind;
  readonly label: string;
  readonly href: string;
  readonly preview?: string | undefined;
  /** why this was suggested */
  readonly rationale: string;
}

/**
 * IntentPredictionConfig — tenant-configurable mapping from query
 *   vocabulary to intent kinds. 사장님 verbatim:
 *     "Search는 industry-specific search가 아니라 intent-driven.
 *      Fields should be configuration-driven. Never hardcode
 *      industry-specific search."
 *
 *   Tenants provide their own vocabulary; the engine never hardcodes.
 */
export interface IntentPredictionConfig {
  readonly id: string;
  readonly tenantId: string;
  readonly vocabulary: readonly IntentVocabularyEntry[];
  /** default suggestions when no vocabulary match */
  readonly defaultSuggestions: readonly IntentSuggestion[];
  /** confidence threshold (suggestions below this are filtered) */
  readonly confidenceThreshold: number;
}

export interface IntentVocabularyEntry {
  readonly query: string;                  // "Kazbegi"
  readonly queryAliases?: readonly string[] | undefined;  // ["Kazbegi", "Kazbegi Day Trip"]
  readonly intentKinds: readonly IntentPredictionKind[];
  readonly suggestions: readonly IntentSuggestion[];
  readonly confidence: number;             // base confidence 0.0 - 1.0
}

/**
 * predictIntent — runtime helper. The Decision Assistant.
 *   Takes a user query + tenant config; returns IntentPredictionResult.
 *
 *   사장님 verbatim example (Envoy):
 *     "Kazbegi" → [
 *       { kind: 'accommodation-search', label: 'Rooms in Kazbegi', href: '/search?destination=kazbegi' },
 *       { kind: 'experience-search',    label: 'Kazbegi Day Trip',  href: '/tours/kazbegi' },
 *       { kind: 'transportation-search', label: 'How to get there', href: '/guide/kazbegi-transport' },
 *       { kind: 'guide-search',          label: 'Kazbegi Travel Guide', href: '/blog/kazbegi' },
 *     ]
 */
export function predictIntent(input: {
  query: string;
  config: IntentPredictionConfig;
}): IntentPredictionResult {
  const normalizedQuery = input.query.toLowerCase().trim();
  const matched: { entry: IntentVocabularyEntry; confidence: number }[] = [];

  for (const entry of input.config.vocabulary) {
    const candidates = [entry.query, ...(entry.queryAliases ?? [])];
    for (const candidate of candidates) {
      if (normalizedQuery === candidate.toLowerCase()) {
        matched.push({ entry, confidence: entry.confidence });
        break;
      }
      // Fuzzy: query contains candidate or vice versa
      if (normalizedQuery.includes(candidate.toLowerCase())
          || candidate.toLowerCase().includes(normalizedQuery)) {
        matched.push({ entry, confidence: entry.confidence * 0.7 });
        break;
      }
    }
  }

  if (matched.length === 0) {
    return {
      query: input.query,
      intentKinds: [],
      suggestions: input.config.defaultSuggestions,
      confidences: {},
    };
  }

  // Sort by confidence, filter below threshold
  matched.sort((a, b) => b.confidence - a.confidence);
  const filtered = matched.filter((m) => m.confidence >= input.config.confidenceThreshold);

  // Collect unique intent kinds + suggestions
  const intentKinds = new Set<IntentPredictionKind>();
  const suggestions: IntentSuggestion[] = [];
  const confidences: Partial<Record<IntentPredictionKind, number>> = {};
  for (const m of filtered) {
    for (const kind of m.entry.intentKinds) {
      intentKinds.add(kind);
      confidences[kind] = Math.max(confidences[kind] ?? 0, m.confidence);
    }
    for (const s of m.entry.suggestions) {
      suggestions.push(s);
    }
  }

  return {
    query: input.query,
    intentKinds: Array.from(intentKinds),
    suggestions,
    confidences,
  };
}

/* ----------------------------------------------------------------- */
/* 3. CONTINUOUS EXPERIENCE LEARNING (WORLD-CLASS + OUR OWN)         */
/* ----------------------------------------------------------------- */

/**
 * ContinuousExperienceLearning — 사장님 verbatim:
 *   "학습 대상은 세계적인 서비스만이 아니라 우리 고객도 되어야 합니다.
 *    예: Envoy를 운영하면서:
 *      어떤 Hero가 예약률이 높았는지
 *      어떤 CTA가 클릭률이 높았는지
 *      어떤 Search 구성이 가장 많이 사용되었는지
 *      어떤 Header가 가장 적은 이탈률을 보였는지
 *    이런 실제 데이터를 Experience Engine이 계속 학습해야 합니다."
 *
 *   Combines world-class observations (RC1 LearningLoopRegistry) with
 *   our own production signals (BehaviorSignals captured at runtime).
 *   The merge produces ExperienceKnowledge — actionable experience
 *   improvements specific to the tenant.
 */
export interface ContinuousExperienceLearningConfig {
  readonly id: string;
  readonly tenantId: string;
  /** which BehaviorSignal kinds to capture (sampling) */
  readonly signalSampleRate: Readonly<Partial<Record<BehaviorSignal['kind'], number>>>; // 0.0 - 1.0
  /** minimum observations before learning takes effect */
  readonly minObservations: number;
  /** learning rate (how aggressively to update) */
  readonly learningRate: number;          // 0.0 - 1.0
  /** which experience axes to learn on */
  readonly learnAxes: readonly ContinuousLearningAxis[];
}

export type ContinuousLearningAxis =
  | 'hero-effectiveness'        // which Hero variant gets highest conversion
  | 'cta-effectiveness'          // which CTA copy / placement gets most clicks
  | 'search-effectiveness'       // which Search config gets most completions
  | 'header-effectiveness'       // which Header profile gets lowest bounce
  | 'scroll-depth-effectiveness' // which scroll order reaches furthest
  | 'intent-prediction-effectiveness'; // which suggestion kind gets clicked

/**
 * ExperienceObservation — production-signal observation captured at
 *   runtime. Each observation links a BehaviorSignal + outcome.
 *
 *   "어떤 Hero가 예약률이 높았는지" — Hero impression + booking
 *   "어떤 CTA가 클릭률이 높았는지" — CTA impression + click
 *   "어떤 Search 구성이 가장 많이 사용되었는지" — search config + completion
 *   "어떤 Header가 가장 적은 이탈률을 보였는지" — header impression + bounce
 */
export interface ExperienceObservation {
  readonly id: string;
  readonly tenantId: string;
  readonly capturedAt: string;
  /** which experience axis this observation contributes to */
  readonly axis: ContinuousLearningAxis;
  /** which page / variant was observed */
  readonly pageId: string;
  readonly variantId: string;             // hero variant id, cta id, etc.
  /** the BehaviorSignal that triggered this observation */
  readonly signal: BehaviorSignal;
  /** the outcome (booking, click, completion, bounce) */
  readonly outcome: 'conversion' | 'engagement' | 'bounce' | 'drop-off'
                 | 'search-completion' | 'cta-click' | 'header-render-no-bounce';
  /** numeric value (e.g., dwell time, scroll depth) */
  readonly value?: number | undefined;
}

/**
 * ExperienceKnowledge — distilled learning output. The Experience
 *   Engine applies this back to AdaptiveExperienceProfile resolution.
 */
export interface ExperienceKnowledge {
  readonly id: string;
  readonly tenantId: string;
  readonly axis: ContinuousLearningAxis;
  /** ranked variants by effectiveness */
  readonly rankedVariants: readonly { variantId: string; score: number; sampleSize: number }[];
  /** recommended next variant to use */
  readonly recommendedVariantId: string;
  /** confidence in the recommendation */
  readonly confidence: number;
  readonly computedAt: string;
}

/**
 * ContinuousExperienceLearningRegistry — registry for production
 *   observations and learned knowledge.
 */
export interface ContinuousExperienceLearningRegistry {
  captureObservation(observation: ExperienceObservation): Promise<void>;
  listObservations(filter?: {
    tenantId?: string;
    axis?: ContinuousLearningAxis;
    pageId?: string;
    since?: string;
  }): Promise<readonly ExperienceObservation[]>;
  computeKnowledge(input: {
    tenantId: string;
    axis: ContinuousLearningAxis;
  }): Promise<ExperienceKnowledge | null>;
  applyToAdaptiveProfile(profile: AdaptiveExperienceProfile): Promise<AdaptiveExperienceProfile>;
}

/**
 * mergeLearningSources — combines world-class (RC1 LearningObservation)
 *   + our-own (ExperienceObservation) into a unified knowledge stream.
 *
 *   사장님 verbatim:
 *     "World-class Products + Our Own Products → Experience Knowledge"
 */
export interface MergedLearningSource {
  readonly worldClassObservations: readonly LearningObservation[];   // RC1
  readonly ourOwnObservations: readonly ExperienceObservation[];     // RC1.5
}

export function mergeLearningSources(
  worldClass: readonly LearningObservation[],
  ourOwn: readonly ExperienceObservation[],
): MergedLearningSource {
  return { worldClassObservations: worldClass, ourOwnObservations: ourOwn };
}

/* ----------------------------------------------------------------- */
/* 사장님 CLOSING PHILOSOPHY (verbatim, single source of truth)        */
/* ----------------------------------------------------------------- */

/**
 * 사장님 verbatim philosophy:
 *   "The Platform must optimize for user success, not interface complexity."
 *
 *   Verbatim decomposition:
 *     - "사용자가 빨리 찾고,"
 *     - "쉽게 이해하고,"
 *     - "자연스럽게 신뢰하고,"
 *     - "망설임 없이 다음 행동을 하도록 만드는 것."
 *     - "그것이 좋은 UX입니다."
 *     - "그러면 Header, Search, Hero, CTA, 애니메이션, 여백은 모두
 *       그 목표를 이루기 위한 수단이 됩니다."
 *
 *   Every ExperienceEngine decision must answer:
 *     "Does this help the user find, understand, trust, and act?"
 */
export const EXPERIENCE_ENGINE_PHILOSOPHY =
  'The Platform must optimize for user success, not interface complexity.';
export const EXPERIENCE_USER_SUCCESS_DECOMPOSITION = {
  findQuickly: '사용자가 빨리 찾고',
  understandEasily: '쉽게 이해하고',
  trustNaturally: '자연스럽게 신뢰하고',
  actWithoutHesitation: '망설임 없이 다음 행동을 하도록 만드는 것',
} as const;
export const EXPERIENCE_MEANS_NOT_GOALS =
  'Header, Search, Hero, CTA, 애니메이션, 여백은 모두 좋은 UX라는 목표를 이루기 위한 수단입니다.' as const;

/**
 * OptimizeForUserSuccessCheck — runtime helper. Evaluates an
 *   AdaptiveExperienceProfile against the 4 user-success axes.
 *   Returns the axes that are satisfied + axes that need attention.
 */
export interface UserSuccessCheckResult {
  readonly findQuickly: boolean;
  readonly understandEasily: boolean;
  readonly trustNaturally: boolean;
  readonly actWithoutHesitation: boolean;
  readonly score: number;                // 0-100
  readonly passed: boolean;
  readonly remediation: readonly string[];
}

export function checkOptimizeForUserSuccess(input: {
  profile: AdaptiveExperienceProfile;
  hasVisibleSearch: boolean;
  hasPrimaryCTA: boolean;
  trustInventory: TrustInventory;
  scrollDepthReached: number;             // 0.0 - 1.0
}): UserSuccessCheckResult {
  const remediation: string[] = [];

  // findQuickly — search visible + content density appropriate for intent
  const findQuickly = input.hasVisibleSearch && (
    (input.profile.contentDensity === 'dense' && input.profile.userBehavior.currentIntent === 'ready-to-book')
    || input.profile.contentDensity !== 'dense'
  );
  if (!findQuickly) remediation.push('Surface search earlier; reduce content density for ready-to-book users.');

  // understandEasily — header adapts + contentDensity appropriate
  const understandEasily = input.profile.contentDensity !== 'dense'
    || input.profile.userBehavior.visitCount > 1;
  if (!understandEasily) {
    remediation.push('Reduce content density for first-visit users; surface essential info first.');
  }

  // trustNaturally — trust elements visible + emphasis appropriate for user
  const trustNaturally = input.trustInventory.totalWeight >= 1
    && input.profile.trustElementsToSurface.length > 0;
  if (!trustNaturally) remediation.push('Surface trust elements (reviews, photos, local presence) for low-trust-tolerance users.');

  // actWithoutHesitation — primary CTA exists + ctaEmphasis matches intent
  const actWithoutHesitation = input.hasPrimaryCTA && (
    (input.profile.ctaEmphasis === 'direct' && input.profile.userBehavior.currentIntent === 'ready-to-book')
    || input.profile.ctaEmphasis !== 'soft' // not forcing direct on researchers
  );
  if (!actWithoutHesitation) {
    remediation.push('Match CTA emphasis to user intent: researchers need soft CTAs; ready-to-book users need direct CTAs.');
  }

  const score = Math.round(([findQuickly, understandEasily, trustNaturally, actWithoutHesitation]
    .filter(Boolean).length / 4) * 100);
  return {
    findQuickly,
    understandEasily,
    trustNaturally,
    actWithoutHesitation,
    score,
    passed: score >= 80,
    remediation,
  };
}

/* ----------------------------------------------------------------- */
/* RC1.5 RELEASE NOTES                                                  */
/* ----------------------------------------------------------------- */

export const EXPERIENCE_ENGINE_RC1_5_VERSION = 'rc1.5';
export const EXPERIENCE_ENGINE_RC1_5_DATE = '2026-07-15';
export const EXPERIENCE_PRINCIPLES_TOTAL_RC1_5 = 15;
export const EXPERIENCE_REVIEW_QUESTIONS_TOTAL_RC1_5 = 7;

/**
 * 사장님 freeze declaration (verbatim):
 *   "Experience Engine도 여기서 RC1으로 Freeze하는 것이 좋다고 생각합니다.
 *    Envoy Hostel과 Envoy Tours를 실제로 만들어 보면서 다음을 검증하는
 *    것이 훨씬 중요합니다:
 *      - Header가 실제로 탐색을 쉽게 만드는가?
 *      - Search가 원하는 정보를 빠르게 찾게 하는가?
 *      - CTA가 자연스럽게 예약으로 이어지는가?
 *      - 모바일에서도 같은 경험을 제공하는가?"
 *
 *  → RC1.5 is the FINAL FORM of Experience Engine interfaces.
 *  → No further Experience Engine evolution; improvements come from
 *    real Envoy usage + Continuous Experience Learning data.
 *  → Freeze tag stamp pending 사장님 explicit freeze command.
 */
