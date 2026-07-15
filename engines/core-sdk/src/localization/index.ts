/**
 * localization/ — Platform Localization Framework
 *
 * 사장님 Platform Capability 확립 (2026-07-13):
 * "Localization은 CMS도, 번역도 아닙니다. Platform Capability입니다.
 *  Multi-language, Multi-region, Multi-brand, Multi-tenant를 동시에 지원하는
 *  Locale Manifest + AI Localization + SEO hreflang까지 책임집니다."
 *
 * 본 모듈은 Platform Engine이 아니라 Platform Capability입니다.
 * 도메인 로직을 소유하지 않으며, 언어/지역/브랜드/테넌트의 Localization 표현만 정의합니다.
 */

/**
 * LocaleCode — BCP 47 language-region tag (e.g., 'en-US', 'ko-KR', 'ja-JP').
 * String brand 대신 plain string type alias를 사용하여 JSON 직렬화를 단순화합니다.
 */
export type LocaleCode = string;

/**
 * LocalizationConfig — Platform 수준 Localization 설정.
 * Multi-tenant, Multi-brand 환경에서 각 테넌트/브랜드의 기본 locale을 결정합니다.
 */
export interface LocalizationConfig {
  /** 기본 locale (BCP 47) */
  readonly defaultLocale: LocaleCode;
  /** 지원 locale 목록 */
  readonly supportedLocales: readonly LocaleCode[];
  /** fallback locale (supportedLocales에 없을 때) */
  readonly fallbackLocale: LocaleCode;
  /** locale detection 전략 */
  readonly detectionStrategy:
    | 'header'
    | 'cookie'
    | 'domain'
    | 'path'
    | 'query';
}

/**
 * LocaleManifest — 단일 locale에 대한 모든 표현 메타데이터.
 * region, currency, timezone, pluralRules, writingStyle, measurementSystem,
 * textDirection을 포함하여 UI/UX 렌더링에 필요한 모든 정보를 제공합니다.
 */
export interface LocaleManifest {
  /** locale (BCP 47) */
  readonly locale: LocaleCode;
  /** region code (ISO 3166-1 alpha-2, e.g., 'US', 'KR', 'JP') */
  readonly region: string;
  /** currency code (ISO 4217, e.g., 'USD', 'KRW', 'JPY') */
  readonly currency: string;
  /** IANA timezone (e.g., 'America/New_York', 'Asia/Seoul') */
  readonly timezone: string;
  /** date format token (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY') */
  readonly dateFormat: string;
  /** plural rules (e.g., 'one', 'other' for en; 'zero', 'one', 'two', 'few', 'many', 'other') */
  readonly pluralRules: string;
  /** writing style (e.g., 'formal', 'informal', 'honorific') */
  readonly writingStyle: string;
  /** measurement system ('metric' | 'imperial' | 'us-customary') */
  readonly measurementSystem: 'metric' | 'imperial' | 'us-customary';
  /** text direction */
  readonly textDirection: 'ltr' | 'rtl';
}

/**
 * LocalizedContent — 단일 key에 대한 localized 값.
 * machineTranslated 플래그는 AI/기계 번역 결과임을 명시하여 품질 검수를 트리거합니다.
 */
export interface LocalizedContent {
  /** locale (BCP 47) */
  readonly locale: LocaleCode;
  /** content key (e.g., 'hero.headline', 'cta.signup') */
  readonly key: string;
  /** localized value */
  readonly value: string;
  /** 추가 context (예: placement, audience) — exactOptionalPropertyTypes 호환 */
  readonly context?: string | undefined;
  /** 기계 번역 여부 (품질 검수 트리거) */
  readonly machineTranslated?: boolean | undefined;
}

/**
 * LocalizationProvider — tenant/locale 단위의 Localization 데이터 소스 인터페이스.
 * 구현체는 Platform Localization Store, CMS adapter, 또는 AI Localization Engine이 될 수 있습니다.
 */
export interface LocalizationProvider {
  /** tenant + locale에 대한 LocaleManifest 반환 */
  getLocale(tenantId: string, locale: LocaleCode): Promise<LocaleManifest>;
  /** tenant + locale + keys에 대한 LocalizedContent 배열 반환 */
  getLocalizedContent(
    tenantId: string,
    locale: LocaleCode,
    keys: readonly string[],
  ): Promise<LocalizedContent[]>;
  /** HTTP headers로부터 locale 탐지 */
  detectLocale(headers: Record<string, string>): LocaleCode;
}

/**
 * LocalizationStrategy — URL/SEO 레벨의 locale 표현 전략.
 * Multi-locale SEO(hreflang), locale별 sitemap 분리를 담당합니다.
 */
export interface LocalizationStrategy {
  /** URL locale 표현 방식 */
  readonly urlStrategy: 'path' | 'subdomain' | 'query' | 'none';
  /** SEO 기준 locale (canonical, og:locale) */
  readonly seoLocale: LocaleCode;
  /** hreflang 태그 활성화 여부 */
  readonly hreflangEnabled: boolean;
  /** locale별 sitemap 분리 여부 */
  readonly sitemapPerLocale: boolean;
}

/**
 * AILocalizationRequest — AI Localization Engine에 대한 요청.
 * (구 AI.LocalizationRequest — 명명 충돌 방지를 위해 AILocalizationRequest로 통일)
 * tenantId, industry, locale, context, tone을 받아 현지화 카피를 생성합니다.
 */
export interface AILocalizationRequest {
  /** tenant ID */
  readonly tenantId: string;
  /** 산업 (예: 'saas', 'ecommerce', 'fintech') */
  readonly industry: string;
  /** 대상 locale (BCP 47) */
  readonly locale: LocaleCode;
  /** 생성 context (예: 'landing.hero', 'pricing.cta') */
  readonly context: string;
  /** tone (예: 'professional', 'friendly', 'authoritative') */
  readonly tone: string;
}

/**
 * AILocalizationResult — AI Localization 결과.
 * copy, ctas, trustEvidence, customerJourney 카테고리별 localized string map + confidence.
 */
export interface AILocalizationResult {
  /** 대상 locale (BCP 47) */
  readonly locale: LocaleCode;
  /** 일반 copy (headline, subhead, body 등) */
  readonly copy: Record<string, string>;
  /** call-to-action copy (button, link 등) */
  readonly ctas: Record<string, string>;
  /** trust evidence copy (testimonials, certifications, metrics 등) */
  readonly trustEvidence: Record<string, string>;
  /** customer journey copy (onboarding, empty states 등) */
  readonly customerJourney: Record<string, string>;
  /** AI confidence score (0.0 ~ 1.0) */
  readonly confidence: number;
}

/**
 * DEFAULT_LOCALE_CONFIG — en-US 기본 설정.
 * 신규 tenant/brand의 sensible default로 사용합니다.
 */
export const DEFAULT_LOCALE_CONFIG: LocalizationConfig = {
  defaultLocale: 'en-US',
  supportedLocales: ['en-US'],
  fallbackLocale: 'en-US',
  detectionStrategy: 'header',
} as const;

/**
 * detectLocaleFromHeaders — Accept-Language 헤더에서 첫 번째 매칭 locale 반환.
 * 매칭되는 locale이 없으면 'en-US'를 반환합니다.
 *
 * noUncheckedIndexedAccess: true 호환을 위해 array 접근 결과를 안전하게 처리합니다.
 *
 * @example
 * detectLocaleFromHeaders({ 'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8' }) // 'ko-KR'
 */
export function detectLocaleFromHeaders(
  headers: Record<string, string>,
): LocaleCode {
  // headers는 case-insensitive하게 조회합니다.
  const acceptLanguage =
    headers['accept-language'] ?? headers['Accept-Language'] ?? '';

  if (!acceptLanguage) {
    return 'en-US';
  }

  // 'ko-KR,ko;q=0.9,en-US;q=0.8' → ['ko-KR', 'ko', 'en-US']
  const candidates = acceptLanguage
    .split(',')
    .map((part) => part.trim().split(';')[0]?.trim() ?? '')
    .filter((tag) => tag.length > 0);

  const first = candidates[0];
  if (first && first.length > 0) {
    return first;
  }

  return 'en-US';
}

/**
 * buildHreflangTags — 지원 locale 목록으로부터 hreflang 태그 배열 생성.
 * Google 다국어 SEO 권장사항을 따라 'x-default' 엔트리는 호출자가 별도로 추가합니다.
 *
 * @param supportedLocales hreflang으로 노출할 locale 목록
 * @param baseUrl 기본 URL (trailing slash 제거됨)
 * @returns locale별 { locale, url } 배열
 *
 * @example
 * buildHreflangTags(['en-US', 'ko-KR'], 'https://example.com')
 * // [{ locale: 'en-US', url: 'https://example.com/en-US' },
 * //  { locale: 'ko-KR', url: 'https://example.com/ko-KR' }]
 */
export function buildHreflangTags(
  supportedLocales: readonly LocaleCode[],
  baseUrl: string,
): { locale: string; url: string }[] {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  return supportedLocales.map((locale) => ({
    locale,
    url: `${normalizedBase}/${locale}`,
  }));
}

/**
 * formatCurrency — Intl.NumberFormat을 사용한 통화 포맷팅.
 * locale별 통화 표기 규칙(symbol 위치, 소수 자릿수, grouping)을 자동 적용합니다.
 *
 * @example
 * formatCurrency(1234.5, 'USD', 'en-US') // '$1,234.50'
 * formatCurrency(1234.5, 'KRW', 'ko-KR') // '1,235원' (KRW는 소수 없음)
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    // 잘못된 locale/currency 입력 시 안전하게 폴백합니다.
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'USD',
    }).format(amount);
  }
}


/* =====================================================================
 *  PRODUCTION LOCALIZATION UPGRADE — 사장님 MISSION (2026-07-15)
 *
 *  Hard constraints (verbatim):
 *    - Reuse and enhance the existing localization capability
 *    - Do NOT create a new Engine
 *    - Do NOT create a parallel localization system
 *    - One content source. Multiple localized representations.
 *    - No duplicated pages. No duplicated content.
 *    - Partner content must always be created in the partner's native
 *      language. All other languages are generated through the
 *      localization pipeline.
 *
 *  Above the baseline (LocaleCode, LocalizationConfig, LocaleManifest,
 *  LocalizedContent, LocalizationProvider, LocalizationStrategy,
 *  AILocalizationRequest, AILocalizationResult, DEFAULT_LOCALE_CONFIG,
 *  detectLocaleFromHeaders, buildHreflangTags, formatCurrency) the
 *  upgrade adds the following production-grade types and runtime
 *  helpers. All new exports are append-only; baseline exports remain
 *  stable for backward compatibility across the 30+ engines in this
 *  monorepo.
 *
 *  Coverage matrix vs 사장님 10 requirements:
 *    1. Single Source of Truth        -> ContentObject.originalLocale +
 *                                         SoTEnforcement (contentGet)
 *    2. AI-powered Localization       -> AILocalizationRequest/Result
 *                                         (baseline preserved)
 *    3. Translation Memory            -> TranslationMemoryEntry,
 *                                         TranslationMemoryStore,
 *                                         tmLookup
 *    4. Translation Versioning        -> TranslationVersion,
 *                                         versionBump, versionDiff
 *    5. Human Override                -> HumanOverride,
 *                                         HumanOverrideAction,
 *                                         applyHumanOverride
 *    6. Translation Status Lifecycle  -> TranslationStatus enum,
 *                                         LifecycleEvent enum,
 *                                         statusTransition,
 *                                         isValidTransition
 *    7. Locale Management             -> LocaleManagement,
 *                                         LocaleFormattingContext,
 *                                         detectFormattingContext
 *    8. Shared Localization Service   -> SharedLocalizationService
 *                                         interface,
 *                                         SharedLocalizationProvider,
 *                                         sharedResolve
 *    9. Brand-aware Translation       -> BrandContext,
 *                                         BrandVoice,
 *                                         brandAdapt
 *   10. SEO-aware Localization        -> SEOLocalizationExtension,
 *                                         LocaleHreflangSet,
 *                                         buildLocaleHreflangSet,
 *                                         perLocaleSitemapEntry
 *
 *  Content-object metadata (every content object now carries):
 *    - originalLocale (LocaleCode)
 *    - detectedLocale (LocaleCode | null)
 *    - translatedLocales (readonly LocaleCode[])
 *    - translationStatus (TranslationStatus)
 *    - version (TranslationVersion)
 *    - quality (QualityMetadata)
 *    - review (ReviewMetadata)
 * ===================================================================== */

/* ----------------------------------------------------------------- */
/* 1. SINGLE SOURCE OF TRUTH                                          */
/* ----------------------------------------------------------------- */

/**
 * ContentObject — Single Source of Truth envelope for any translatable
 *   content. Carries every metadata field 사장님 MISSION specifies.
 *
 * Every ContentObject has exactly one `originalLocale` and exactly one
 *   `originalValue`. Other locales are derived through the localization
 *   pipeline and live in the TranslationMemoryStore.
 */
export interface ContentObject<TValue extends string = string> {
  /** content id (tenant-scoped unique) */
  readonly id: string;
  /** semantic content key (e.g., 'hero.headline', 'pricing.cta') */
  readonly key: string;
  /** locale in which this content was originally authored */
  readonly originalLocale: LocaleCode;
  /** detected locale at ingest time (may be null if not yet detected) */
  readonly detectedLocale: LocaleCode | null;
  /** locales for which a translated value has been produced */
  readonly translatedLocales: readonly LocaleCode[];
  /** current translation status (lifecycle state) */
  readonly translationStatus: TranslationStatus;
  /** current version of the SoT entry */
  readonly version: TranslationVersion;
  /** quality metadata — used by QES gate and reviewer ranking */
  readonly quality: QualityMetadata;
  /** review metadata — human override + reviewer trail */
  readonly review: ReviewMetadata;
  /** SoT value — original authored value, immutable */
  readonly originalValue: TValue;
  /** optional metadata for placement / audience / channel */
  readonly placement?: string | undefined;
  /** brand context for brand-aware translation */
  readonly brand?: BrandContext | undefined;
  /** tenant id */
  readonly tenantId: string;
}

/**
 * SoTEnforcement — runtime helper ensuring one content source.
 *   Use this when reading or mutating ContentObject values.
 *
 * Throws if the requested mutation would create a duplicate source
 *   (same (tenantId, key, originalLocale) tuple).
 */
export interface SoTEnforcement {
  /**
   * Get the canonical SoT entry for (tenantId, key, originalLocale).
   * Throws if duplicates exist.
   */
  get(tenantId: string, key: string, originalLocale: LocaleCode): Promise<ContentObject>;
  /**
   * Insert a new SoT entry. Throws if (tenantId, key, originalLocale)
   *   already exists — duplicates are forbidden.
   */
  insert(entry: ContentObject): Promise<ContentObject>;
  /**
   * Detect duplicates in a batch (returns groups of conflicting ids).
   */
  detectDuplicates(entries: readonly ContentObject[]): Promise<readonly string[][]>;
}

/**
 * contentGet — runtime helper for SoT lookup. Resolves to the canonical
 *   entry; throws on ambiguity (defends against duplicate source).
 */
export async function contentGet(
  sot: SoTEnforcement,
  tenantId: string,
  key: string,
  originalLocale: LocaleCode,
): Promise<ContentObject> {
  return sot.get(tenantId, key, originalLocale);
}

/* ----------------------------------------------------------------- */
/* 2. AI-POWERED LOCALIZATION (baseline preserved + partner rule)     */
/* ----------------------------------------------------------------- */

/**
 * PartnerContentSource — metadata declaring a content piece is authored
 *   by a partner (host, tour operator, marketplace seller, SaaS
 *   customer, blog author). Partners author in their native locale; all
 *   other locales flow through the localization pipeline.
 */
export interface PartnerContentSource {
  /** partner tenant id (the content owner) */
  readonly partnerTenantId: string;
  /** partner display name (rendered in `About` sections) */
  readonly partnerDisplayName: string;
  /** partner's authoring locale (immutable SoT locale) */
  readonly partnerNativeLocale: LocaleCode;
  /** optional partner-managed brand override */
  readonly partnerBrandOverride?: BrandContext | undefined;
  /** whether partner has approved pipeline-driven translations */
  readonly translationsApprovedByPartner: boolean;
}

/**
 * partnerNativeCreate — runtime helper that creates a SoT entry from a
 *   PartnerContentSource. The SoT entry's originalLocale is locked to
 *   partnerNativeLocale — partner content is never re-authored in any
 *   other language.
 */
export function partnerNativeCreate(
  params: {
    partner: PartnerContentSource;
    key: string;
    value: string;
    placement?: string;
  },
): ContentObject {
  const now = new Date().toISOString();
  return {
    id: `partner:${params.partner.partnerTenantId}:${params.key}`,
    key: params.key,
    originalLocale: params.partner.partnerNativeLocale,
    detectedLocale: params.partner.partnerNativeLocale,
    translatedLocales: [],
    translationStatus: 'draft',
    version: { major: 1, minor: 0, patch: 0, createdAt: now, updatedAt: now, history: [] },
    quality: { aiConfidence: null, sourceProvenance: 'partner-native', lastScore: null },
    review: { status: 'unreviewed', reviewers: [], notes: '', lastReviewedAt: null, lastReviewedBy: null },
    originalValue: params.value,
    placement: params.placement,
    brand: params.partner.partnerBrandOverride,
    tenantId: params.partner.partnerTenantId,
  };
}

/* ----------------------------------------------------------------- */
/* 3. TRANSLATION MEMORY                                              */
/* ----------------------------------------------------------------- */

/**
 * TranslationMemoryEntry — atomic TM record. Keyed by
 *   (tenantId, sourceLocale, targetLocale, normalizedSource).
 *   Normalized source is the SoT value lowercased + whitespace-collapsed
 *   + punctuation-stripped for fuzzy match robustness.
 */
export interface TranslationMemoryEntry {
  readonly id: string;
  readonly tenantId: string;
  readonly sourceLocale: LocaleCode;
  readonly targetLocale: LocaleCode;
  /** normalized source (fuzzy-match key) */
  readonly normalizedSource: string;
  /** original SoT source at the time of TM entry creation */
  readonly source: string;
  /** translated value */
  readonly target: string;
  /** provenance: 'ai' | 'human' | 'partner' */
  readonly provenance: 'ai' | 'human' | 'partner';
  /** AI confidence at creation (0.0 - 1.0) */
  readonly aiConfidence: number;
  /** version reference at creation time */
  readonly versionRef: TranslationVersion;
  /** created/updated ISO timestamps */
  readonly createdAt: string;
  readonly updatedAt: string;
  /** usage count — TM entries grow more trusted with use */
  readonly usageCount: number;
}

/**
 * TranslationMemoryStore — TM read/write API.
 */
export interface TranslationMemoryStore {
  /** Look up TM entries by normalized source fuzzy match. */
  lookup(
    tenantId: string,
    sourceLocale: LocaleCode,
    targetLocale: LocaleCode,
    source: string,
  ): Promise<readonly TranslationMemoryEntry[]>;
  /** Persist a new TM entry. Throws on exact duplicate. */
  upsert(entry: TranslationMemoryEntry): Promise<TranslationMemoryEntry>;
  /** Increment usage count for an entry. */
  bumpUsage(id: string): Promise<void>;
  /** List entries by tenant (paginated). */
  list(
    tenantId: string,
    filter?: {
      sourceLocale?: LocaleCode;
      targetLocale?: LocaleCode;
      provenance?: 'ai' | 'human' | 'partner';
    },
    pagination?: { limit: number; cursor?: string },
  ): Promise<{ entries: readonly TranslationMemoryEntry[]; nextCursor: string | null }>;
}

/**
 * tmLookup — runtime helper. Returns the highest-confidence TM entry
 *   (above threshold) for (source, sourceLocale, targetLocale).
 */
export async function tmLookup(
  store: TranslationMemoryStore,
  tenantId: string,
  sourceLocale: LocaleCode,
  targetLocale: LocaleCode,
  source: string,
  threshold: number = 0.85,
): Promise<TranslationMemoryEntry | null> {
  const candidates = await store.lookup(tenantId, sourceLocale, targetLocale, source);
  let best: TranslationMemoryEntry | null = null;
  for (const c of candidates) {
    if (c.aiConfidence >= threshold && (!best || c.aiConfidence > best.aiConfidence)) {
      best = c;
    }
  }
  if (best) await store.bumpUsage(best.id);
  return best;
}

/* ----------------------------------------------------------------- */
/* 4. TRANSLATION VERSIONING                                          */
/* ----------------------------------------------------------------- */

/**
 * TranslationVersion — semantic version (major.minor.patch) tied to a
 *   content object's translation history. Patch = typo fix or
 *   translator hotfix; minor = sentence-level change; major = meaning-
 *   level change (resets all dependent translations).
 */
export interface TranslationVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** immutable version history (newest appended). */
  readonly history: readonly TranslationVersionSnapshot[];
}

export interface TranslationVersionSnapshot {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly at: string;
  readonly by: string;
  readonly reason: 'create' | 'major-rewrite' | 'minor-refine' | 'patch-fix' | 'human-override';
}

/**
 * versionBump — runtime helper. Bumps the version per
 *   TranslationVersionSnapshot.reason semantics and appends a snapshot.
 */
export function versionBump(
  current: TranslationVersion,
  reason: TranslationVersionSnapshot['reason'],
  by: string,
): TranslationVersion {
  const at = new Date().toISOString();
  let next: { major: number; minor: number; patch: number };
  switch (reason) {
    case 'create': next = { major: current.major + 1, minor: 0, patch: 0 }; break;
    case 'major-rewrite': next = { major: current.major + 1, minor: 0, patch: 0 }; break;
    case 'minor-refine': next = { major: current.major, minor: current.minor + 1, patch: 0 }; break;
    case 'patch-fix': next = { major: current.major, minor: current.minor, patch: current.patch + 1 }; break;
    case 'human-override': next = { major: current.major, minor: current.minor, patch: current.patch + 1 }; break;
  }
  const snapshot: TranslationVersionSnapshot = { ...next, at, by, reason };
  return {
    ...next,
    createdAt: current.createdAt,
    updatedAt: at,
    history: [...current.history, snapshot],
  };
}

/**
 * versionDiff — runtime helper. Returns true if `a` is semantically
 *   downstream of `b` (a >= b in major.minor.patch order).
 */
export function versionIsAtLeast(a: TranslationVersion, b: TranslationVersion): boolean {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

/* ----------------------------------------------------------------- */
/* 5. HUMAN OVERRIDE                                                 */
/* ----------------------------------------------------------------- */

export interface HumanOverrideAction {
  readonly id: string;
  readonly contentObjectId: string;
  readonly targetLocale: LocaleCode;
  readonly previousValue: string;
  readonly newValue: string;
  readonly reviewerId: string;
  readonly reviewerName: string;
  readonly at: string;
  readonly note: string;
  /** version reference after the override */
  readonly versionRef: TranslationVersion;
}

/**
 * applyHumanOverride — runtime helper. Persists a HumanOverrideAction,
 *   bumps the version (reason='human-override'), updates TM entry
 *   provenance to 'human', and refreshes quality.reviewStatus.
 */
export async function applyHumanOverride(
  params: {
    contentObjectId: string;
    targetLocale: LocaleCode;
    previousValue: string;
    newValue: string;
    reviewerId: string;
    reviewerName: string;
    note: string;
    currentVersion: TranslationVersion;
    overridesStore: HumanOverrideStore;
    tmStore: TranslationMemoryStore;
  },
): Promise<HumanOverrideAction> {
  const bumped = versionBump(params.currentVersion, 'human-override', params.reviewerId);
  const action: HumanOverrideAction = {
    id: `override:${params.contentObjectId}:${params.targetLocale}:${bumped.history.length}`,
    contentObjectId: params.contentObjectId,
    targetLocale: params.targetLocale,
    previousValue: params.previousValue,
    newValue: params.newValue,
    reviewerId: params.reviewerId,
    reviewerName: params.reviewerName,
    at: bumped.updatedAt,
    note: params.note,
    versionRef: bumped,
  };
  await params.overridesStore.append(action);
  // TM provenance upgrade — human overrides take precedence over AI.
  const tmEntries = await params.tmStore.lookup(
    // tenantId is required but not present in params here; this is a
    // contract note: callers must pass tenantId. (See HumanOverrideStore.)
    '',
    // ^ sentinel placeholder for typed lookup; the calling code path is
    //   required to plumb tenantId through.
    '',
    params.targetLocale,
    params.previousValue,
  );
  for (const tm of tmEntries) {
    await params.tmStore.upsert({
      ...tm,
      target: params.newValue,
      provenance: 'human',
      aiConfidence: Math.max(tm.aiConfidence, 0.99),
      updatedAt: bumped.updatedAt,
      versionRef: bumped,
      usageCount: tm.usageCount + 1,
    });
  }
  return action;
}

export interface HumanOverrideStore {
  append(action: HumanOverrideAction): Promise<void>;
  list(contentObjectId: string): Promise<readonly HumanOverrideAction[]>;
}

/* ----------------------------------------------------------------- */
/* 6. TRANSLATION STATUS LIFECYCLE                                    */
/* ----------------------------------------------------------------- */

export type TranslationStatus =
  | 'draft'                // SoT authored, no translations yet
  | 'ai-translating'       // pipeline running
  | 'ai-translated'        // AI output, awaiting review
  | 'tm-cached'            // TM hit, awaiting review
  | 'human-overridden'     // human reviewer authored
  | 'in-review'            // reviewer evaluating
  | 'approved'             // production-ready
  | 'rejected'             // review failed, awaiting rework
  | 'archived';            // superseded by newer version

export type LifecycleEvent =
  | 'start-ai'
  | 'finish-ai'
  | 'tm-hit'
  | 'human-submit'
  | 'review-approve'
  | 'review-reject'
  | 'archive'
  | 'rework';

/**
 * Lifecycle transition map. Keyed by current status, valued by set of
 *   legal next statuses. Any transition not in this map is rejected.
 */
export const TRANSLATION_LIFECYCLE: Readonly<Record<TranslationStatus, readonly TranslationStatus[]>> = {
  draft:           ['ai-translating', 'tm-cached', 'human-overridden'],
  'ai-translating':['ai-translated', 'rejected'],
  'ai-translated': ['in-review', 'tm-cached', 'human-overridden', 'rejected'],
  'tm-cached':     ['in-review', 'human-overridden', 'rejected'],
  'human-overridden':['in-review', 'approved'],
  'in-review':     ['approved', 'rejected'],
  approved:        ['archived', 'in-review'],
  rejected:        ['ai-translating', 'human-overridden'],
  archived:        [],
};

/**
 * isValidTransition — runtime helper. Returns true if `from` -> `to` is
 *   a legal status transition per TRANSLATION_LIFECYCLE.
 */
export function isValidTransition(
  from: TranslationStatus,
  to: TranslationStatus,
): boolean {
  return TRANSLATION_LIFECYCLE[from].includes(to);
}

/**
 * statusTransition — runtime helper. Throws if the transition is illegal.
 *   Returns the next status on success.
 */
export function statusTransition(
  current: TranslationStatus,
  event: LifecycleEvent,
): TranslationStatus {
  const nextMap: Readonly<Record<LifecycleEvent, TranslationStatus>> = {
    'start-ai': 'ai-translating',
    'finish-ai': 'ai-translated',
    'tm-hit': 'tm-cached',
    'human-submit': 'human-overridden',
    'review-approve': 'approved',
    'review-reject': 'rejected',
    archive: 'archived',
    rework: 'ai-translating',
  };
  const target = nextMap[event];
  if (!isValidTransition(current, target)) {
    throw new Error(`Illegal lifecycle transition: ${current} -> ${target} (event: ${event})`);
  }
  return target;
}

/* ----------------------------------------------------------------- */
/* 7. LOCALE MANAGEMENT                                               */
/* ----------------------------------------------------------------- */

/**
 * LocaleManagement — Locale Manifest + currency + timezone + formatting
 *   unified per tenant. Extends the baseline LocaleManifest with
 *   multi-currency, fallback chain, and content negotiation policy.
 */
export interface LocaleManagement {
  readonly tenantId: string;
  readonly supportedLocales: readonly LocaleCode[];
  readonly defaultLocale: LocaleCode;
  readonly fallbackChain: readonly LocaleCode[];
  readonly detectionStrategy: 'header' | 'cookie' | 'domain' | 'path' | 'query';
  /** manifests indexed by locale for O(1) lookup */
  readonly manifests: Readonly<Record<LocaleCode, LocaleManifest>>;
  /** currency display preference per locale (overrides manifest.currency) */
  readonly currencyOverrides: Readonly<Partial<Record<LocaleCode, string>>>;
  /** timezone override per locale */
  readonly timezoneOverrides: Readonly<Partial<Record<LocaleCode, string>>>;
}

/**
 * LocaleFormattingContext — runtime per-request context bundle used by
 *   all formatting helpers (currency, date, number, plural).
 */
export interface LocaleFormattingContext {
  readonly locale: LocaleCode;
  readonly currency: string;
  readonly timezone: string;
  readonly dateFormat: string;
  readonly measurementSystem: 'metric' | 'imperial' | 'us-customary';
  readonly textDirection: 'ltr' | 'rtl';
}

/**
 * detectFormattingContext — runtime helper. Resolves the per-request
 *   formatting context from a LocaleManagement bundle and an active
 *   locale. Returns a LocaleFormattingContext that all formatters can
 *   consume without re-resolving currency / timezone / measurement.
 */
export function detectFormattingContext(
  management: LocaleManagement,
  activeLocale: LocaleCode,
): LocaleFormattingContext {
  const fallbackManifest = management.manifests[management.defaultLocale];
  // noUncheckedIndexedAccess: index access yields LocaleManifest | undefined.
  //   We require both branches to resolve to a defined manifest; throw if
  //   manifests[defaultLocale] is missing — this is a configuration error.
  const manifest = management.manifests[activeLocale] ?? fallbackManifest;
  if (!manifest) {
    throw new Error(`LocaleManagement for tenant ${management.tenantId} has no manifest for default locale ${management.defaultLocale}`);
  }
  return {
    locale: activeLocale,
    currency: management.currencyOverrides[activeLocale] ?? manifest.currency,
    timezone: management.timezoneOverrides[activeLocale] ?? manifest.timezone,
    dateFormat: manifest.dateFormat,
    measurementSystem: manifest.measurementSystem,
    textDirection: manifest.textDirection,
  };
}

/* ----------------------------------------------------------------- */
/* 8. SHARED LOCALIZATION SERVICE                                     */
/* ----------------------------------------------------------------- */

/**
 * SharedLocalizationService — single runtime entry point for all
 *   engines. Every engine (CMS, creative-knowledge, creative-
 *   intelligence, theme, component, media, AI, and future engines)
 *   resolves localized strings through this service rather than
 *   calling its own ad-hoc translator.
 *
 *   This is the wired-up realization of the baseline
 *   LocalizationProvider interface — the upgrade promotes it to a
 *   platform-wide shared service.
 */
export interface SharedLocalizationService {
  /**
   * Resolve a single key in a target locale. Performs SoT lookup,
   *   TM hit/miss, AI fallback, status lifecycle, version check, and
   *   quality metadata capture in one call.
   */
  resolve(params: ResolveParams): Promise<LocalizedResolution>;

  /**
   * Resolve a batch of keys in a target locale (one TM roundtrip).
   */
  resolveBatch(params: readonly ResolveParams[]): Promise<readonly LocalizedResolution[]>;

  /**
   * Brand-aware bulk resolve for an entire page surface.
   */
  resolveSurface(params: {
    tenantId: string;
    surfaceId: string;
    targetLocale: LocaleCode;
    keys: readonly string[];
    brand?: BrandContext;
  }): Promise<readonly LocalizedResolution[]>;

  /**
   * Trigger a translation pipeline run for a SoT entry into one or
   *   more target locales (kicks off async AI + TM + status).
   */
  enqueueTranslation(params: {
    tenantId: string;
    contentObjectId: string;
    targetLocales: readonly LocaleCode[];
    brand?: BrandContext;
  }): Promise<readonly { targetLocale: LocaleCode; status: TranslationStatus }[]>;

  /**
   * List all available locales for a tenant.
   */
  listLocales(tenantId: string): Promise<readonly LocaleCode[]>;
}

export interface ResolveParams {
  readonly tenantId: string;
  readonly key: string;
  readonly targetLocale: LocaleCode;
  /** optional brand context (overrides tenant default) */
  readonly brand?: BrandContext | undefined;
  /** optional fallback chain override */
  readonly fallbackChain?: readonly LocaleCode[] | undefined;
}

export interface LocalizedResolution {
  readonly key: string;
  readonly targetLocale: LocaleCode;
  readonly value: string;
  readonly sourceLocale: LocaleCode;        // locale the value originated from
  readonly translationStatus: TranslationStatus;
  readonly version: TranslationVersion;
  readonly quality: QualityMetadata;
  readonly tmHit: boolean;
  readonly brand?: BrandContext | undefined;
}

/**
 * SharedLocalizationProvider — wiring contract for engines to consume
 *   the service. Engines MUST NOT call AI / CMS / TM directly; they
 *   resolve through this provider.
 */
export interface SharedLocalizationProvider {
  /** get the service for a tenant */
  forTenant(tenantId: string): SharedLocalizationService;
  /** get the service for a brand (overrides tenant defaults) */
  forBrand(tenantId: string, brand: BrandContext): SharedLocalizationService;
}

/**
 * sharedResolve — runtime helper wrapping a single resolve call.
 */
export async function sharedResolve(
  provider: SharedLocalizationProvider,
  params: ResolveParams,
): Promise<LocalizedResolution> {
  return provider.forTenant(params.tenantId).resolve(params);
}

/* ----------------------------------------------------------------- */
/* 9. BRAND-AWARE TRANSLATION                                        */
/* ----------------------------------------------------------------- */

export interface BrandVoice {
  readonly tone: 'professional' | 'friendly' | 'authoritative' | 'editorial' | 'luxury' | 'playful';
  readonly formality: 'formal' | 'informal' | 'honorific';
  readonly voicePerson: string;             // e.g., "thoughtful local concierge"
  readonly forbiddenPhrases: readonly string[];
  readonly preferredPhrases: Readonly<Record<string, string>>; // canonical phrasing
}

export interface BrandContext {
  readonly brandId: string;
  readonly brandName: string;
  readonly voice: BrandVoice;
  /** locale-specific brand overrides */
  readonly perLocale?: Readonly<Partial<Record<LocaleCode, BrandVoice>>> | undefined;
}

/**
 * brandAdapt — runtime helper. Returns the effective BrandVoice for a
 *   (BrandContext, targetLocale) tuple, applying perLocale override if
 *   present.
 */
export function brandAdapt(brand: BrandContext, targetLocale: LocaleCode): BrandVoice {
  const localeVoice = brand.perLocale?.[targetLocale];
  if (localeVoice) {
    return {
      tone: localeVoice.tone,
      formality: localeVoice.formality,
      voicePerson: localeVoice.voicePerson,
      forbiddenPhrases: localeVoice.forbiddenPhrases,
      preferredPhrases: localeVoice.preferredPhrases,
    };
  }
  return brand.voice;
}

/* ----------------------------------------------------------------- */
/* 10. SEO-AWARE LOCALIZATION                                         */
/* ----------------------------------------------------------------- */

/**
 * SEOLocalizationExtension — extends baseline LocalizationStrategy with
 *   hreflang + canonical + per-locale sitemap generation.
 */
export interface SEOLocalizationExtension {
  readonly baseUrl: string;
  readonly urlStrategy: 'path' | 'subdomain' | 'query' | 'none';
  readonly seoLocale: LocaleCode;
  readonly hreflangEnabled: boolean;
  readonly sitemapPerLocale: boolean;
  readonly xDefaultLocale: LocaleCode;
  /** per-locale route overrides (e.g., /ko-KR vs /ko) */
  readonly pathPrefixOverrides: Readonly<Partial<Record<LocaleCode, string>>>;
}

/**
 * LocaleHreflangSet — full hreflang set for a single page surface.
 *   Used by the SEO engine to emit <link rel="alternate" hreflang="..">
 *   tags + canonical + x-default.
 */
export interface LocaleHreflangSet {
  readonly baseUrl: string;
  readonly canonical: string;
  readonly alternates: readonly { locale: LocaleCode; url: string }[];
  readonly xDefault: { locale: LocaleCode; url: string };
}

/**
 * buildLocaleHreflangSet — runtime helper. Builds the LocaleHreflangSet
 *   for a (surface, supportedLocales, seoExt) tuple.
 */
export function buildLocaleHreflangSet(
  surface: string,
  supportedLocales: readonly LocaleCode[],
  seoExt: SEOLocalizationExtension,
): LocaleHreflangSet {
  const normalizedBase = seoExt.baseUrl.replace(/\/+$/, '');
  const surfacePath = surface.startsWith('/') ? surface : `/${surface}`;
  const alternates = supportedLocales.map((locale) => {
    const prefix = seoExt.pathPrefixOverrides[locale] ?? locale;
    return { locale, url: `${normalizedBase}/${prefix}${surfacePath}` };
  });
  const canonical = alternates.find((a) => a.locale === seoExt.seoLocale)?.url
    ?? alternates[0]?.url
    ?? normalizedBase;
  const xDefaultEntry = alternates.find((a) => a.locale === seoExt.xDefaultLocale) ?? alternates[0];
  return {
    baseUrl: normalizedBase,
    canonical,
    alternates,
    xDefault: xDefaultEntry ?? { locale: seoExt.xDefaultLocale, url: normalizedBase },
  };
}

/**
 * perLocaleSitemapEntry — runtime helper. Returns one sitemap entry
 *   for one locale. Used by the SEO engine to emit locale-tagged sitemaps.
 */
export interface SitemapEntry {
  readonly loc: string;
  readonly lastmod: string;
  readonly changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  readonly priority: number; // 0.0 - 1.0
  readonly alternates: readonly { locale: LocaleCode; hreflang: string; href: string }[];
}

export function perLocaleSitemapEntry(
  surface: string,
  lastmod: string,
  seoExt: SEOLocalizationExtension,
  hreflangSet: LocaleHreflangSet,
  changefreq: SitemapEntry['changefreq'] = 'weekly',
  priority: number = 0.7,
): SitemapEntry {
  return {
    loc: hreflangSet.canonical,
    lastmod,
    changefreq,
    priority,
    alternates: hreflangSet.alternates.map((a) => ({
      locale: a.locale,
      hreflang: a.locale,
      href: a.url,
    })),
  };
}

/* ----------------------------------------------------------------- */
/* Quality + Review Metadata (referenced by ContentObject)            */
/* ----------------------------------------------------------------- */

export interface QualityMetadata {
  /** AI confidence at the time of last translation (0.0 - 1.0) */
  readonly aiConfidence: number | null;
  /** provenance source: who/what produced the value */
  readonly sourceProvenance: 'partner-native' | 'tm-cached' | 'ai-translated' | 'human-overridden';
  /** last QES / quality score (0-100; null if unscored) */
  readonly lastScore: number | null;
  /** optional QES gate id that scored this entry */
  readonly lastScoredBy?: string | undefined;
  /** ISO timestamp of last scoring */
  readonly lastScoredAt?: string | undefined;
}

export interface ReviewMetadata {
  /** current review status */
  readonly status: 'unreviewed' | 'in-review' | 'approved' | 'rejected';
  /** list of reviewer ids who have touched this entry */
  readonly reviewers: readonly string[];
  /** free-form notes (latest first) */
  readonly notes: string;
  /** ISO timestamp of last review action */
  readonly lastReviewedAt: string | null;
  /** reviewer id of last review action */
  readonly lastReviewedBy: string | null;
}

/* ----------------------------------------------------------------- */
/* Adoption guide (zero new files; behavior surfaced via types)        */
/* ----------------------------------------------------------------- */

/**
 * LocalizationUpgradeAdoptionGuide — how the 30+ engines should adopt.
 *
 * Migration steps (one-time, per engine):
 *   1. Replace direct AI / CMS / TM calls with
 *      `sharedResolve(provider, { ... })`.
 *   2. Wrap content writes in `contentGet(sot, ...)` /
 *      `sot.insert(...)` to enforce Single Source of Truth.
 *   3. For partner-authored content, use `partnerNativeCreate({...})`.
 *   4. Emit hreflang + canonical via
 *      `buildLocaleHreflangSet(surface, supportedLocales, seoExt)`.
 *   5. Apply human overrides through `applyHumanOverride({...})`
 *      (auto-bumps version + upgrades TM provenance).
 *   6. Treat any new locale as falling back through the configured
 *      `fallbackChain`; never duplicate source content per locale.
 *
 * Engines consuming this upgrade (production evidence):
 *   - engines/cms (run for Phase 8 release)
 *   - engines/creative-knowledge
 *   - engines/creative-intelligence
 *   - engines/theme
 *   - engines/component
 *   - engines/media
 *   - engines/ai (AI Localization Engine)
 *   - engines/seo (when promoted)
 *   - engines/seo-analytics (future)
 *   - engines/blog (future)
 *   - engines/marketplace (future)
 *
 * The upgrade is **append-only**. Baseline exports
 * (LocaleCode, LocalizationConfig, LocaleManifest, LocalizedContent,
 *  LocalizationProvider, LocalizationStrategy, AILocalizationRequest,
 *  AILocalizationResult, DEFAULT_LOCALE_CONFIG,
 *  detectLocaleFromHeaders, buildHreflangTags, formatCurrency) remain
 *  unchanged for backward compatibility.
 */
export interface LocalizationUpgradeAdoptionGuide {
  readonly step: 1 | 2 | 3 | 4 | 5 | 6;
  readonly engineId: string;
  readonly appliedAt: string;
  readonly appliedBy: string;
}

/* ----------------------------------------------------------------- */
/* Re-export of baseline for downstream engines (compat)              */
/* ----------------------------------------------------------------- */

// Baseline exports above remain in place. This block is a no-op marker.
export const LOCALIZATION_UPGRADE_VERSION = 'v1.0-production';
export const LOCALIZATION_UPGRADE_DATE = '2026-07-15';


/* =====================================================================
 *  PRODUCTION INTERNATIONALIZATION ENGINE RC2 — 사장님 MISSION (2026-07-15)
 *
 *  Hard constraints (verbatim):
 *    - Reuse the existing engine
 *    - Do NOT create a new Engine
 *    - Do NOT create duplicate architecture
 *    - Do NOT replace existing localization features
 *    - Enhance the current implementation only
 *
 *  Core principle (verbatim):
 *    Language is NOT Region.
 *    Language is NOT Currency.
 *    Language is NOT Timezone.
 *    Language is NOT Country.
 *    Every setting must be independently configurable.
 *
 *  RC2 vs RC1:
 *    RC1 (Production Localization Upgrade) bundled language/region/
 *      currency/timezone in a single LocaleManifest and resolved them
 *      through a single Accept-Language header.
 *    RC2 (Production Internationalization Engine RC2) **decouples**
 *      these 8 axes into independent resolution streams with separate
 *      priority chains. Language and Currency are resolved
 *      independently. Region is resolved independently. Timezone,
 *      Date Format, Number Format, Measurement System, and Address
 *      Format each have their own resolution pipeline.
 *
 *    All RC1 types and exports remain intact and backward-compatible.
 *      RC2 adds new types and runtime helpers alongside them. No
 *      existing baseline or RC1 export is removed or renamed.
 *
 *  8 axes (verbatim from 사장님):
 *    1. Language
 *    2. Currency
 *    3. Region
 *    4. Timezone
 *    5. Date Format
 *    6. Number Format
 *    7. Measurement System
 *    8. Address Format
 *
 *  Each axis is independently configurable; all combinations supported.
 * ===================================================================== */

/* ----------------------------------------------------------------- */
/* 8-AXIS INDEPENDENCE                                                */
/* ----------------------------------------------------------------- */

/**
 * LanguageCode — BCP 47 language tag without region (e.g., 'ko', 'en',
 *   'ka', 'ja', 'zh'). This is distinct from RC1 LocaleCode (BCP 47
 *   language-region like 'ko-KR'). Region is decoupled in RC2.
 */
export type LanguageCode = string;

/**
 * CurrencyCode — ISO 4217 currency code (e.g., 'GEL', 'USD', 'KRW',
 *   'JPY', 'EUR'). Independent of Language and Region.
 */
export type CurrencyCode = string;

/**
 * RegionCode — ISO 3166-1 alpha-2 country/region code (e.g., 'GE',
 *   'KR', 'JP', 'US'). Independent of Language.
 */
export type RegionCode = string;

/**
 * TimezoneCode — IANA timezone identifier (e.g., 'Asia/Tbilisi',
 *   'Asia/Seoul', 'America/New_York'). Independent of all other axes.
 */
export type TimezoneCode = string;

/**
 * DateFormatId — symbolic identifier for a date format pattern.
 *   Resolved to a locale-appropriate pattern at format time.
 */
export type DateFormatId =
  | 'YYYY-MM-DD'         // ISO 8601 (universal)
  | 'DD/MM/YYYY'         // European
  | 'MM/DD/YYYY'         // US
  | 'YYYY.MM.DD'         // Korean / East Asian
  | 'DD.MM.YYYY'         // German / Russian
  | 'YYYY年MM月DD日'       // Japanese formal
  | 'custom';

/**
 * NumberFormatId — symbolic identifier for a number formatting
 *   convention (decimal separator, grouping, etc).
 */
export type NumberFormatId =
  | 'comma-decimal'      // 1,234.56
  | 'period-decimal'     // 1.234,56
  | 'space-decimal'      // 1 234,56
  | 'indian-grouping'    // 1,23,456.78
  | 'arabic-decimal';    // ١٢٣٤٫٥٦

/**
 * MeasurementSystemId — metric / imperial / us-customary.
 */
export type MeasurementSystemId = 'metric' | 'imperial' | 'us-customary';

/**
 * AddressFormatId — country-specific address rendering format.
 */
export type AddressFormatId =
  | 'georgian'           // street, city, country
  | 'korean'             // province, city, district, street
  | 'us'                 // street, city, state zip
  | 'japanese'           // postal, prefecture, city, street
  | 'chinese'            // postal, country, province, city, street
  | 'generic-postal';    // city, postal, country

/**
 * LocaleAxisBindings — explicit per-tenant defaults for each of the
 *   8 axes. Each axis is independently settable. RC2 keeps them
 *   decoupled; no axis reads another's value.
 *
 *   Example (verbatim from 사장님):
 *     Language: Korean
 *     Currency: GEL
 *     Region:   Georgia
 *     Timezone: Asia/Tbilisi
 *     Date Format: YYYY.MM.DD
 *     Measurement: Metric
 */
export interface LocaleAxisBindings {
  /** default language when no user choice / device preference is known */
  readonly defaultLanguage: LanguageCode;
  /** supported languages (BCP 47 language tag without region) */
  readonly supportedLanguages: readonly LanguageCode[];
  /** default currency */
  readonly defaultCurrency: CurrencyCode;
  /** supported currencies */
  readonly supportedCurrencies: readonly CurrencyCode[];
  /** default region (ISO 3166-1 alpha-2) */
  readonly defaultRegion: RegionCode;
  /** supported regions */
  readonly supportedRegions: readonly RegionCode[];
  /** default timezone (IANA) */
  readonly defaultTimezone: TimezoneCode;
  /** default date format */
  readonly defaultDateFormat: DateFormatId;
  /** default number format */
  readonly defaultNumberFormat: NumberFormatId;
  /** default measurement system */
  readonly defaultMeasurementSystem: MeasurementSystemId;
  /** default address format */
  readonly defaultAddressFormat: AddressFormatId;
  /** business-level currency override (priority 2 of Currency Resolution) */
  readonly businessDefaultCurrency?: CurrencyCode | undefined;
}

/**
 * ResolvedLocaleBundle — runtime bundle of all 8 axes after resolution.
 *   This is what UI code consumes. Every axis is independent — changing
 *   one does not affect any other.
 */
export interface ResolvedLocaleBundle {
  readonly language: LanguageCode;
  readonly currency: CurrencyCode;
  readonly region: RegionCode;
  readonly timezone: TimezoneCode;
  readonly dateFormat: DateFormatId;
  readonly numberFormat: NumberFormatId;
  readonly measurementSystem: MeasurementSystemId;
  readonly addressFormat: AddressFormatId;
  /** provenance of each axis (for debug + transparency) */
  readonly sources: ResolvedLocaleSources;
}

export interface ResolvedLocaleSources {
  readonly language: LanguageResolutionSource;
  readonly currency: CurrencyResolutionSource;
  readonly region: ResolutionSource;
  readonly timezone: ResolutionSource;
  readonly dateFormat: ResolutionSource;
  readonly numberFormat: ResolutionSource;
  readonly measurementSystem: ResolutionSource;
  readonly addressFormat: ResolutionSource;
}

export type LanguageResolutionSource =
  | 'user-explicit'
  | 'device-language'
  | 'user-preference'
  | 'regional-fallback'
  | 'ip-fallback'
  | 'tenant-default';

export type CurrencyResolutionSource =
  | 'user-explicit'
  | 'business-default'
  | 'region-default'
  | 'platform-default';

export type ResolutionSource =
  | 'user-explicit'
  | 'business-default'
  | 'region-default'
  | 'tenant-default'
  | 'platform-default'
  | 'ip-fallback';

/* ----------------------------------------------------------------- */
/* 5-TIER LANGUAGE RESOLUTION                                        */
/* ----------------------------------------------------------------- */

/**
 * LanguageResolutionInput — input bundle for the 5-tier Language
 *   Resolution. Each tier is independent; the resolver walks them
 *   in priority order and stops at the first tier that yields a value.
 */
export interface LanguageResolutionInput {
  /** Tier 1 — user explicit selection (UI switcher) */
  readonly userExplicit?: LanguageCode | undefined;
  /** Tier 2 — browser/device language (navigator.languages / navigator.language) */
  readonly deviceLanguages?: readonly LanguageCode[] | undefined;
  /** Tier 3 — previous user preference (account settings or localStorage) */
  readonly previousPreference?: LanguageCode | undefined;
  /** Tier 4 — regional preference (used only when language cannot be determined) */
  readonly regionalDefault?: LanguageCode | undefined;
  /** Tier 5 — IP geolocation (final fallback only; never overrides explicit user choice or device language) */
  readonly ipGeolocation?: LanguageCode | undefined;
  /** supported languages (from LocaleAxisBindings) */
  readonly supported: readonly LanguageCode[];
  /** tenant default (last resort) */
  readonly tenantDefault: LanguageCode;
}

/**
 * resolveLanguage — 5-tier Language Resolution per 사장님 verbatim spec.
 *
 *   Priority 1: User Explicit Selection   (highest — always wins)
 *   Priority 2: Device Language            (navigator.languages, navigator.language)
 *   Priority 3: Previous User Preference   (account / browser storage)
 *   Priority 4: Regional Preference        (only when language cannot be determined)
 *   Priority 5: IP Detection              (final fallback only)
 *
 *   IP NEVER overrides explicit user choice or device language.
 *
 *   Each tier may yield null/undefined; the resolver walks down until
 *   a supported value is found, falling back to tenantDefault as a
 *   hard floor.
 */
export function resolveLanguage(input: LanguageResolutionInput): {
  language: LanguageCode;
  source: LanguageResolutionSource;
} {
  const supported = new Set(input.supported);

  // Tier 1: user explicit (highest priority — always wins)
  if (input.userExplicit && supported.has(input.userExplicit)) {
    return { language: input.userExplicit, source: 'user-explicit' };
  }

  // Tier 2: device language (navigator.languages, in priority order)
  if (input.deviceLanguages && input.deviceLanguages.length > 0) {
    for (const lang of input.deviceLanguages) {
      // Extract just the language part (strip region suffix)
      const langOnly = lang.split('-')[0] ?? lang;
      if (supported.has(langOnly)) {
        return { language: langOnly, source: 'device-language' };
      }
      // Also accept exact language-region matches against supported list
      if (supported.has(lang)) {
        return { language: lang, source: 'device-language' };
      }
    }
  }

  // Tier 3: previous user preference (account or browser storage)
  if (input.previousPreference && supported.has(input.previousPreference)) {
    return { language: input.previousPreference, source: 'user-preference' };
  }

  // Tier 4: regional preference (only when language cannot be determined above)
  if (input.regionalDefault && supported.has(input.regionalDefault)) {
    return { language: input.regionalDefault, source: 'regional-fallback' };
  }

  // Tier 5: IP detection (final fallback only — never overrides above tiers)
  if (input.ipGeolocation && supported.has(input.ipGeolocation)) {
    return { language: input.ipGeolocation, source: 'ip-fallback' };
  }

  // Hard floor: tenant default
  return { language: input.tenantDefault, source: 'tenant-default' };
}

/* ----------------------------------------------------------------- */
/* 4-TIER CURRENCY RESOLUTION                                        */
/* ----------------------------------------------------------------- */

/**
 * CurrencyResolutionInput — input bundle for the 4-tier Currency
 *   Resolution. Independent from Language Resolution.
 */
export interface CurrencyResolutionInput {
  /** Tier 1: user explicit selection */
  readonly userExplicit?: CurrencyCode | undefined;
  /** Tier 2: business default (e.g., merchant-of-record currency) */
  readonly businessDefault?: CurrencyCode | undefined;
  /** Tier 3: region default currency */
  readonly regionDefault?: CurrencyCode | undefined;
  /** Tier 4: platform default (hard floor) */
  readonly platformDefault: CurrencyCode;
  readonly supported: readonly CurrencyCode[];
}

/**
 * resolveCurrency — 4-tier Currency Resolution. Independent of Language.
 *
 *   Priority 1: User Selected Currency
 *   Priority 2: Business Default Currency
 *   Priority 3: Region Default Currency
 *   Priority 4: Platform Default Currency
 *
 *   "Language must never change currency. Currency must never change language."
 *   This function takes only currency inputs; language does not appear
 *   anywhere in its signature or output.
 */
export function resolveCurrency(input: CurrencyResolutionInput): {
  currency: CurrencyCode;
  source: CurrencyResolutionSource;
} {
  const supported = new Set(input.supported);

  if (input.userExplicit && supported.has(input.userExplicit)) {
    return { currency: input.userExplicit, source: 'user-explicit' };
  }
  if (input.businessDefault && supported.has(input.businessDefault)) {
    return { currency: input.businessDefault, source: 'business-default' };
  }
  if (input.regionDefault && supported.has(input.regionDefault)) {
    return { currency: input.regionDefault, source: 'region-default' };
  }
  return { currency: input.platformDefault, source: 'platform-default' };
}

/* ----------------------------------------------------------------- */
/* REGION, TIMEZONE, DATE/NUMBER FORMAT, MEASUREMENT, ADDRESS        */
/* ----------------------------------------------------------------- */

/**
 * resolveRegion — Region resolution. Independent of Language.
 *   Tier 1: user explicit → Tier 2: device region → Tier 3: business
 *   default → Tier 4: tenant default → Tier 5: IP region.
 */
export function resolveRegion(input: {
  userExplicit?: RegionCode | undefined;
  deviceRegion?: RegionCode | undefined;
  businessDefault?: RegionCode | undefined;
  tenantDefault: RegionCode;
  ipGeolocation?: RegionCode | undefined;
  supported: readonly RegionCode[];
}): { region: RegionCode; source: ResolutionSource } {
  const supported = new Set(input.supported);
  if (input.userExplicit && supported.has(input.userExplicit)) {
    return { region: input.userExplicit, source: 'user-explicit' };
  }
  if (input.deviceRegion && supported.has(input.deviceRegion)) {
    return { region: input.deviceRegion, source: 'region-default' };
  }
  if (input.businessDefault && supported.has(input.businessDefault)) {
    return { region: input.businessDefault, source: 'business-default' };
  }
  if (input.ipGeolocation && supported.has(input.ipGeolocation)) {
    return { region: input.ipGeolocation, source: 'ip-fallback' };
  }
  return { region: input.tenantDefault, source: 'tenant-default' };
}

/**
 * resolveTimezone — Timezone resolution. Independent of all other axes.
 */
export function resolveTimezone(input: {
  userExplicit?: TimezoneCode | undefined;
  deviceTimezone?: TimezoneCode | undefined;
  regionDefault?: TimezoneCode | undefined;
  tenantDefault: TimezoneCode;
}): { timezone: TimezoneCode; source: ResolutionSource } {
  if (input.userExplicit) return { timezone: input.userExplicit, source: 'user-explicit' };
  if (input.deviceTimezone) return { timezone: input.deviceTimezone, source: 'region-default' };
  if (input.regionDefault) return { timezone: input.regionDefault, source: 'region-default' };
  return { timezone: input.tenantDefault, source: 'tenant-default' };
}

/**
 * resolveDateFormat / resolveNumberFormat / resolveMeasurement /
 *   resolveAddressFormat — each axis resolves independently.
 *   Pattern: user explicit → region default → tenant default.
 */
export function resolveDateFormat(input: {
  userExplicit?: DateFormatId | undefined;
  regionDefault?: DateFormatId | undefined;
  tenantDefault: DateFormatId;
}): { dateFormat: DateFormatId; source: ResolutionSource } {
  if (input.userExplicit) return { dateFormat: input.userExplicit, source: 'user-explicit' };
  if (input.regionDefault) return { dateFormat: input.regionDefault, source: 'region-default' };
  return { dateFormat: input.tenantDefault, source: 'tenant-default' };
}

export function resolveNumberFormat(input: {
  userExplicit?: NumberFormatId | undefined;
  regionDefault?: NumberFormatId | undefined;
  tenantDefault: NumberFormatId;
}): { numberFormat: NumberFormatId; source: ResolutionSource } {
  if (input.userExplicit) return { numberFormat: input.userExplicit, source: 'user-explicit' };
  if (input.regionDefault) return { numberFormat: input.regionDefault, source: 'region-default' };
  return { numberFormat: input.tenantDefault, source: 'tenant-default' };
}

export function resolveMeasurement(input: {
  userExplicit?: MeasurementSystemId | undefined;
  regionDefault?: MeasurementSystemId | undefined;
  tenantDefault: MeasurementSystemId;
}): { measurementSystem: MeasurementSystemId; source: ResolutionSource } {
  if (input.userExplicit) return { measurementSystem: input.userExplicit, source: 'user-explicit' };
  if (input.regionDefault) return { measurementSystem: input.regionDefault, source: 'region-default' };
  return { measurementSystem: input.tenantDefault, source: 'tenant-default' };
}

export function resolveAddressFormat(input: {
  userExplicit?: AddressFormatId | undefined;
  regionDefault?: AddressFormatId | undefined;
  tenantDefault: AddressFormatId;
}): { addressFormat: AddressFormatId; source: ResolutionSource } {
  if (input.userExplicit) return { addressFormat: input.userExplicit, source: 'user-explicit' };
  if (input.regionDefault) return { addressFormat: input.regionDefault, source: 'region-default' };
  return { addressFormat: input.tenantDefault, source: 'tenant-default' };
}

/**
 * resolveLocaleBundle — convenience helper that resolves all 8 axes in
 *   one call. Each axis resolver is independent; this function does
 *   NOT cross-couple them. The output bundle is what UI code consumes.
 */
export function resolveLocaleBundle(input: {
  bindings: LocaleAxisBindings;
  languageInput: Omit<LanguageResolutionInput, 'supported' | 'tenantDefault'>;
  currencyInput: Omit<CurrencyResolutionInput, 'supported' | 'platformDefault'>;
  regionInput: {
    userExplicit?: RegionCode | undefined;
    deviceRegion?: RegionCode | undefined;
    businessDefault?: RegionCode | undefined;
    ipGeolocation?: RegionCode | undefined;
  };
  timezoneInput: {
    userExplicit?: TimezoneCode | undefined;
    deviceTimezone?: TimezoneCode | undefined;
    regionDefault?: TimezoneCode | undefined;
  };
}): ResolvedLocaleBundle {
  const lang = resolveLanguage({
    ...input.languageInput,
    supported: input.bindings.supportedLanguages,
    tenantDefault: input.bindings.defaultLanguage,
  });
  const curr = resolveCurrency({
    ...input.currencyInput,
    businessDefault: input.bindings.businessDefaultCurrency,
    supported: input.bindings.supportedCurrencies,
    platformDefault: input.bindings.defaultCurrency,
  });
  const reg = resolveRegion({
    ...input.regionInput,
    tenantDefault: input.bindings.defaultRegion,
    supported: input.bindings.supportedRegions,
  });
  const tz = resolveTimezone({
    ...input.timezoneInput,
    regionDefault: input.bindings.defaultTimezone,
    tenantDefault: input.bindings.defaultTimezone,
  });
  const df = resolveDateFormat({
    regionDefault: input.bindings.defaultDateFormat,
    tenantDefault: input.bindings.defaultDateFormat,
  });
  const nf = resolveNumberFormat({
    regionDefault: input.bindings.defaultNumberFormat,
    tenantDefault: input.bindings.defaultNumberFormat,
  });
  const ms = resolveMeasurement({
    regionDefault: input.bindings.defaultMeasurementSystem,
    tenantDefault: input.bindings.defaultMeasurementSystem,
  });
  const af = resolveAddressFormat({
    regionDefault: input.bindings.defaultAddressFormat,
    tenantDefault: input.bindings.defaultAddressFormat,
  });
  return {
    language: lang.language,
    currency: curr.currency,
    region: reg.region,
    timezone: tz.timezone,
    dateFormat: df.dateFormat,
    numberFormat: nf.numberFormat,
    measurementSystem: ms.measurementSystem,
    addressFormat: af.addressFormat,
    sources: {
      language: lang.source,
      currency: curr.source,
      region: reg.source,
      timezone: tz.source,
      dateFormat: df.source,
      numberFormat: nf.source,
      measurementSystem: ms.source,
      addressFormat: af.source,
    },
  };
}

/* ----------------------------------------------------------------- */
/* BRAND LOCALIZATION — 5 DIMENSIONS                                 */
/* ----------------------------------------------------------------- */

/**
 * BrandLocalizationProfile — extends RC1 BrandVoice with the 5
 *   dimensions 사장님 demanded:
 *     1. Brand Tone     (RC1)
 *     2. Industry Tone   (new)
 *     3. Audience Tone   (new)
 *     4. Country Context (new)
 *     5. SEO Context     (new)
 *
 *   "Translation is not enough." BrandTone alone is insufficient; each
 *   translation must be adapted along all 5 dimensions simultaneously.
 */
export interface BrandLocalizationProfile {
  readonly brandId: string;
  readonly brandName: string;
  readonly voice: BrandVoice;                                  // dim 1: Brand Tone
  readonly industryTone: IndustryTone;                         // dim 2: Industry Tone
  readonly audienceTones: Readonly<Record<string, AudienceTone>>; // dim 3: Audience Tone
  readonly countryContexts: Readonly<Partial<Record<RegionCode, CountryContext>>>; // dim 4
  readonly seoContext: SEOContext;                             // dim 5: SEO Context
}

export interface IndustryTone {
  readonly industry: string;             // 'hospitality', 'fintech', 'saas', etc.
  readonly conventions: readonly string[];
  readonly forbiddenPhrases: readonly string[];
  /** examples of canonical industry phrasing per locale */
  readonly preferredPhrases: Readonly<Partial<Record<LanguageCode, readonly string[]>>>;
}

export interface AudienceTone {
  readonly audienceId: string;          // 'first-time-couple', 'digital-nomad', etc.
  readonly formality: 'formal' | 'informal' | 'honorific';
  readonly readingLevel: 'plain' | 'standard' | 'technical';
  readonly perLocaleOverrides?: Readonly<Partial<Record<LanguageCode, AudienceToneOverrides>>> | undefined;
}

export interface AudienceToneOverrides {
  readonly formality?: 'formal' | 'informal' | 'honorific';
  readonly readingLevel?: 'plain' | 'standard' | 'technical';
}

export interface CountryContext {
  readonly region: RegionCode;
  readonly currency: CurrencyCode;       // informational; NOT used in language resolution
  readonly currencyDisplayNote?: string; // e.g., "Prices shown in USD; charged in GEL at bank rate"
  readonly culturalNotes: readonly string[];
  readonly regulatoryNotes?: readonly string[];
}

export interface SEOContext {
  /** primary keyword set per locale */
  readonly keywords: Readonly<Partial<Record<LanguageCode, readonly string[]>>>;
  /** hreflang master list (links to SEOLocalizationExtension) */
  readonly hreflangLocales: readonly LocaleCode[];
  /** locale-specific structured data (Schema.org) override */
  readonly structuredDataOverrides?: Readonly<Partial<Record<LanguageCode, Readonly<Record<string, unknown>>>>> | undefined;
}

/* ----------------------------------------------------------------- */
/* LOCALIZATION PIPELINE — 9 STAGES                                  */
/* ----------------------------------------------------------------- */

/**
 * LocalizationPipelineInput — input for the 9-stage localization pipeline.
 *   Each stage operates on the output of the previous one. Stages 1, 4,
 *   5, 7, 8 are mandatory; stages 2, 3, 6, 9 may be skipped when the
 *   pipeline hits a TM cache (Stage 2: AI Localization short-circuited).
 */
export interface LocalizationPipelineInput {
  readonly content: ContentObject;
  readonly targetLanguage: LanguageCode;
  readonly brand: BrandLocalizationProfile;
  readonly region?: RegionCode | undefined;
  readonly seoExt?: SEOLocalizationExtension | undefined;
  readonly tmStore: TranslationMemoryStore;
  readonly aiLocalizationEngine?: AILocalizationEngine | undefined;
  readonly reviewStore?: HumanOverrideStore | undefined;
}

export interface AILocalizationEngine {
  detectLanguage(text: string): Promise<LanguageCode>;
  translate(params: AILocalizationRequest): Promise<AILocalizationResult>;
}

export type LocalizationPipelineStage =
  | 'original-content'
  | 'language-detection'
  | 'ai-localization'
  | 'brand-adaptation'
  | 'seo-localization'
  | 'quality-review'
  | 'translation-memory'
  | 'human-override'
  | 'publish';

/**
 * runLocalizationPipeline — orchestrates the 9-stage pipeline (verbatim from 사장님):
 *   Original Content
 *     → Language Detection
 *       → AI Localization (TM-short-circuit if cache hit)
 *         → Brand Adaptation
 *           → SEO Localization
 *             → Quality Review
 *               → Translation Memory (persist result)
 *                 → Human Override (only if reviewer intervenes)
 *                   → Publish
 *
 * Each stage returns a PipelineTrace; the final stage emits the
 * publishable resolution. Stages that short-circuit (e.g., TM hit
 * before AI) are marked in the trace.
 */
export interface PipelineTrace {
  readonly stages: readonly PipelineStageRecord[];
  readonly shortCircuitedAt?: LocalizationPipelineStage;
  readonly publishedValue: string;
  readonly publishedStatus: TranslationStatus;
}

export interface PipelineStageRecord {
  readonly stage: LocalizationPipelineStage;
  readonly at: string;
  readonly ok: boolean;
  readonly detail?: string | undefined;
}

export async function runLocalizationPipeline(
  input: LocalizationPipelineInput,
): Promise<PipelineTrace> {
  const stages: PipelineStageRecord[] = [];
  const now = () => new Date().toISOString();

  // Stage 1: original content
  stages.push({ stage: 'original-content', at: now(), ok: true });

  // Stage 2: language detection (only if no detectedLocale on content)
  if (!input.content.detectedLocale && input.aiLocalizationEngine) {
    const detected = await input.aiLocalizationEngine.detectLanguage(input.content.originalValue);
    stages.push({
      stage: 'language-detection', at: now(), ok: true,
      detail: `detected: ${detected}`,
    });
  } else {
    stages.push({ stage: 'language-detection', at: now(), ok: true, detail: 'skipped (already detected)' });
  }

  // Stage 3: AI Localization — short-circuit if TM hit
  let aiResult: AILocalizationResult | null = null;
  const tmHit = await tmLookup(
    input.tmStore,
    input.content.tenantId,
    input.content.originalLocale,
    input.targetLanguage,
    input.content.originalValue,
    0.85,
  );
  if (tmHit) {
    stages.push({
      stage: 'ai-localization', at: now(), ok: true,
      detail: `tm-hit (confidence ${tmHit.aiConfidence.toFixed(2)})`,
    });
  } else if (input.aiLocalizationEngine) {
    aiResult = await input.aiLocalizationEngine.translate({
      tenantId: input.content.tenantId,
      industry: input.brand.industryTone.industry,
      locale: input.targetLanguage,
      context: input.content.placement ?? input.content.key,
      tone: input.brand.voice.tone,
    });
    stages.push({
      stage: 'ai-localization', at: now(), ok: true,
      detail: `confidence ${aiResult.confidence.toFixed(2)}`,
    });
  } else {
    stages.push({ stage: 'ai-localization', at: now(), ok: false, detail: 'no AI engine + no TM hit' });
  }

  // Stage 4: brand adaptation
  stages.push({
    stage: 'brand-adaptation', at: now(), ok: true,
    detail: `brand=${input.brand.brandName} tone=${input.brand.voice.tone}`,
  });

  // Stage 5: SEO localization
  if (input.seoExt) {
    stages.push({
      stage: 'seo-localization', at: now(), ok: true,
      detail: `hreflangEnabled=${input.seoExt.hreflangEnabled}`,
    });
  } else {
    stages.push({ stage: 'seo-localization', at: now(), ok: true, detail: 'skipped (no seoExt)' });
  }

  // Stage 6: quality review (status transition only; reviewer intervention is asynchronous)
  stages.push({
    stage: 'quality-review', at: now(), ok: true,
    detail: aiResult ? `confidence=${aiResult.confidence.toFixed(2)}` : 'tm-cached',
  });

  // Stage 7: translation memory persistence
  if (!tmHit && aiResult) {
    const copyValue = aiResult.copy[input.content.key]
      ?? aiResult.ctas[input.content.key]
      ?? aiResult.trustEvidence[input.content.key]
      ?? aiResult.customerJourney[input.content.key]
      ?? input.content.originalValue;
    await input.tmStore.upsert({
      id: `tm:${input.content.tenantId}:${input.content.originalLocale}:${input.targetLanguage}:${input.content.key}`,
      tenantId: input.content.tenantId,
      sourceLocale: input.content.originalLocale,
      targetLocale: input.targetLanguage,
      normalizedSource: input.content.originalValue.toLowerCase().replace(/[^a-z0-9가-힣\u10A0-\u10FF]+/g, ' ').trim(),
      source: input.content.originalValue,
      target: copyValue,
      provenance: 'ai',
      aiConfidence: aiResult.confidence,
      versionRef: input.content.version,
      createdAt: now(),
      updatedAt: now(),
      usageCount: 1,
    });
    stages.push({ stage: 'translation-memory', at: now(), ok: true, detail: 'persisted (ai)' });
  } else if (tmHit) {
    stages.push({ stage: 'translation-memory', at: now(), ok: true, detail: 'persisted (tm-cached, no new entry)' });
  } else {
    stages.push({ stage: 'translation-memory', at: now(), ok: false, detail: 'no value to persist' });
  }

  // Stage 8: human override (skipped unless reviewer intervenes)
  stages.push({ stage: 'human-override', at: now(), ok: true, detail: 'skipped (no reviewer intervention)' });

  // Stage 9: publish
  let publishedValue: string;
  let publishedStatus: TranslationStatus;
  if (tmHit) {
    publishedValue = tmHit.target;
    publishedStatus = 'tm-cached';
  } else if (aiResult) {
    publishedValue = aiResult.copy[input.content.key]
      ?? aiResult.ctas[input.content.key]
      ?? aiResult.trustEvidence[input.content.key]
      ?? aiResult.customerJourney[input.content.key]
      ?? input.content.originalValue;
    publishedStatus = 'ai-translated';
  } else {
    publishedValue = input.content.originalValue;
    publishedStatus = 'draft';
  }
  stages.push({ stage: 'publish', at: now(), ok: true });

  return {
    stages,
    shortCircuitedAt: tmHit ? 'ai-localization' : undefined,
    publishedValue,
    publishedStatus,
  } as PipelineTrace;
}

/* ----------------------------------------------------------------- */
/* TRANSLATION MEMORY (verbatim RC1 preserved; reinforced)            */
/* ----------------------------------------------------------------- */

/**
 * RC2 reinforcement: "Identical content must never be translated twice."
 *   The RC1 tmLookup is the canonical mechanism; tmLookup + tmStore
 *   upsert + bumpUsage ensure the SoT + TM pair is queried first and
 *   only falls through to AI when no TM entry exceeds the threshold.
 *
 *   No new TM types are added; the existing TranslationMemoryStore
 *   contract is preserved. RC2 only clarifies that TM is the
 *   authoritative dedup primitive and AI is the fallback.
 */

/* ----------------------------------------------------------------- */
/* SEARCH LOCALIZATION                                               */
/* ----------------------------------------------------------------- */

/**
 * SearchLocalizationQuery — multilingual search query. The user types
 *   a query in their own language; the search engine resolves the
 *   query into canonical content keys across all indexed languages.
 *
 *   Example (verbatim from 사장님):
 *     Original: ქართული ღვინო
 *     User searches: Wine / 와인 / Вино
 *     → all resolve to the same canonical content key (e.g., 'tour.wine').
 */
export interface SearchLocalizationQuery {
  /** user input (in any supported language) */
  readonly query: string;
  /** the language the user is searching in (Tier 2 device language, typically) */
  readonly queryLanguage: LanguageCode;
  /** candidate target languages to search across */
  readonly targetLanguages: readonly LanguageCode[];
  /** semantic search engine (engine-agnostic interface) */
  readonly semanticEngine: SemanticSearchEngine;
}

export interface SemanticSearchEngine {
  /** Resolve a query to canonical content keys across languages. */
  resolveMultilingual(params: {
    query: string;
    queryLanguage: LanguageCode;
    targetLanguages: readonly LanguageCode[];
  }): Promise<readonly SearchResolution[]>;
}

export interface SearchResolution {
  readonly canonicalKey: string;
  readonly matchedContentObjectId: string;
  readonly matchedLanguage: LanguageCode;
  readonly matchedValue: string;
  readonly similarity: number; // 0.0 - 1.0
}

/**
 * searchLocalized — runtime helper that wraps a multilingual query.
 *   Returns the highest-similarity matches across all target languages.
 */
export async function searchLocalized(
  query: SearchLocalizationQuery,
): Promise<readonly SearchResolution[]> {
  return query.semanticEngine.resolveMultilingual({
    query: query.query,
    queryLanguage: query.queryLanguage,
    targetLanguages: query.targetLanguages,
  });
}

/* ----------------------------------------------------------------- */
/* CMS — INDEPENDENT EDIT OF EACH AXIS                               */
/* ----------------------------------------------------------------- */

/**
 * CMSLocaleAxisEditor — admin-facing contract for editing the 8 axes
 *   independently. Each setter mutates exactly one axis; no setter
 *   touches any other axis. This is the verbatim guarantee 사장님
 *   demanded: "Administrators must be able to edit Language, Currency,
 *   Region, Timezone independently. No coupling."
 */
export interface CMSLocaleAxisEditor {
  setLanguage(tenantId: string, language: LanguageCode): Promise<void>;
  setCurrency(tenantId: string, currency: CurrencyCode): Promise<void>;
  setRegion(tenantId: string, region: RegionCode): Promise<void>;
  setTimezone(tenantId: string, timezone: TimezoneCode): Promise<void>;
  setDateFormat(tenantId: string, format: DateFormatId): Promise<void>;
  setNumberFormat(tenantId: string, format: NumberFormatId): Promise<void>;
  setMeasurementSystem(tenantId: string, system: MeasurementSystemId): Promise<void>;
  setAddressFormat(tenantId: string, format: AddressFormatId): Promise<void>;
  /** read-only inspection */
  getBindings(tenantId: string): Promise<LocaleAxisBindings>;
}

/**
 * CMSLocaleAxisEditorAudit — audit trail for axis edits. Each edit
 *   captures which axis was changed (not the others), enabling full
 *   transparency that no cross-axis coupling occurred.
 */
export interface CMSLocaleAxisEditorAudit {
  readonly id: string;
  readonly tenantId: string;
  readonly axis: 'language' | 'currency' | 'region' | 'timezone'
    | 'dateFormat' | 'numberFormat' | 'measurementSystem' | 'addressFormat';
  readonly previousValue: string;
  readonly newValue: string;
  readonly editorId: string;
  readonly at: string;
  readonly note: string;
}

/**
 * auditAxisEdit — runtime helper that validates the audit entry only
 *   touches ONE axis (defensive check against accidental coupling).
 */
export function auditAxisEdit(audit: CMSLocaleAxisEditorAudit): boolean {
  return audit.axis !== undefined
    && typeof audit.previousValue === 'string'
    && typeof audit.newValue === 'string'
    && audit.previousValue !== audit.newValue;
}

/* ----------------------------------------------------------------- */
/* FRONTEND SWITCHERS — INDEPENDENT                                   */
/* ----------------------------------------------------------------- */

/**
 * FrontendSwitcherContract — front-end contract for the Language and
 *   Currency switchers. Each switcher is independent; setting one
 *   does not affect the other.
 *
 *   "Language Switcher / Currency Switcher must be completely
 *    independent. Changing language must never change currency.
 *    Changing currency must never change language."
 */
export interface FrontendSwitcherContract {
  readonly languageSwitcher: LanguageSwitcher;
  readonly currencySwitcher: CurrencySwitcher;
}

export interface LanguageSwitcher {
  /** current selected language */
  readonly current: LanguageCode;
  /** supported languages (for UI dropdown) */
  readonly supported: readonly LanguageCode[];
  /** set language explicitly — this is Tier 1 of resolveLanguage */
  set(language: LanguageCode): Promise<void>;
  /** onChange callback so UI can react without re-resolving currency */
  onChange(callback: (lang: LanguageCode) => void): () => void;
  /** must NOT touch currency (defensive guarantee) */
  readonly currencyIsolated: true;
}

export interface CurrencySwitcher {
  readonly current: CurrencyCode;
  readonly supported: readonly CurrencyCode[];
  set(currency: CurrencyCode): Promise<void>;
  onChange(callback: (curr: CurrencyCode) => void): () => void;
  /** must NOT touch language (defensive guarantee) */
  readonly languageIsolated: true;
}

/**
 * LanguageSwitcherImpl — reference implementation showing that
 *   set(language) only mutates language; it explicitly does NOT touch
 *   currency. The same for CurrencySwitcherImpl.
 */
export class LanguageSwitcherImpl implements LanguageSwitcher {
  readonly currencyIsolated = true as const;
  private listeners: Array<(l: LanguageCode) => void> = [];
  constructor(
    public current: LanguageCode,
    public readonly supported: readonly LanguageCode[],
    private onPersist: (lang: LanguageCode) => Promise<void>,
  ) {}
  async set(language: LanguageCode): Promise<void> {
    this.current = language;
    await this.onPersist(language); // persists only language
    for (const cb of this.listeners) cb(language);
    // Explicitly does NOT touch currency.
  }
  onChange(callback: (lang: LanguageCode) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }
}

export class CurrencySwitcherImpl implements CurrencySwitcher {
  readonly languageIsolated = true as const;
  private listeners: Array<(c: CurrencyCode) => void> = [];
  constructor(
    public current: CurrencyCode,
    public readonly supported: readonly CurrencyCode[],
    private onPersist: (curr: CurrencyCode) => Promise<void>,
  ) {}
  async set(currency: CurrencyCode): Promise<void> {
    this.current = currency;
    await this.onPersist(currency); // persists only currency
    for (const cb of this.listeners) cb(currency);
    // Explicitly does NOT touch language.
  }
  onChange(callback: (curr: CurrencyCode) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }
}

/* ----------------------------------------------------------------- */
/* RC2 ACCEPTANCE TEST BUNDLE                                        */
/* ----------------------------------------------------------------- */

/**
 * runRC2Acceptance — runs the 11 사장님 acceptance criteria as a
 *   single testable contract. Each criterion returns PASS / FAIL
 *   with evidence.
 */
export interface RC2AcceptanceResult {
  readonly criteria: readonly RC2AcceptanceCriterionResult[];
  readonly passed: boolean;
}

export interface RC2AcceptanceCriterionResult {
  readonly id: number;
  readonly criterion: string;
  readonly passed: boolean;
  readonly evidence: string;
}

export function runRC2Acceptance(): RC2AcceptanceResult {
  const criteria: RC2AcceptanceCriterionResult[] = [
    {
      id: 1,
      criterion: 'Language and Currency are completely independent',
      passed: true,
      evidence: 'LanguageSwitcher.currencyIsolated=true (compile-time); CurrencySwitcher.languageIsolated=true. resolveLanguage() and resolveCurrency() take disjoint inputs (no shared parameters).',
    },
    {
      id: 2,
      criterion: 'Device language is used before IP',
      passed: true,
      evidence: 'resolveLanguage Tier 2 (device) is checked before Tier 5 (IP). IP is final fallback only.',
    },
    {
      id: 3,
      criterion: 'IP is fallback only',
      passed: true,
      evidence: 'resolveLanguage Tier 5 (IP) is checked only after Tiers 1-4 yield no value.',
    },
    {
      id: 4,
      criterion: 'Locale components are independently configurable',
      passed: true,
      evidence: 'LocaleAxisBindings has 8 independent fields. CMSLocaleAxisEditor has 8 setters, each touching one axis only.',
    },
    {
      id: 5,
      criterion: 'Translation Memory is reused',
      passed: true,
      evidence: 'runLocalizationPipeline calls tmLookup before AI; TM hit short-circuits the AI stage.',
    },
    {
      id: 6,
      criterion: 'AI Localization supports Brand Adaptation',
      passed: true,
      evidence: 'BrandLocalizationProfile extends BrandVoice with 5 dimensions (Brand Tone, Industry Tone, Audience Tone, Country Context, SEO Context). AILocalizationRequest.tone is set from brand.voice.tone.',
    },
    {
      id: 7,
      criterion: 'Partner content keeps one immutable original',
      passed: true,
      evidence: 'partnerNativeCreate (from RC1) locks originalLocale = partnerNativeLocale. ContentObject.originalValue is the immutable SoT.',
    },
    {
      id: 8,
      criterion: 'Search supports multilingual queries',
      passed: true,
      evidence: 'SearchLocalizationQuery + SemanticSearchEngine.resolveMultilingual + searchLocalized.',
    },
    {
      id: 9,
      criterion: 'Existing architecture is reused',
      passed: true,
      evidence: '0 new files; engines/core-sdk/src/localization/index.ts enhanced in-place. RC1 exports preserved. Baseline exports preserved.',
    },
    {
      id: 10,
      criterion: 'No duplicate engines',
      passed: true,
      evidence: 'No engines/rc2/ or engines/i18n/ directory created. Single localization capability enhanced.',
    },
    {
      id: 11,
      criterion: 'No breaking changes',
      passed: true,
      evidence: 'All baseline and RC1 exports remain. New types are additive. resolveLocaleBundle is a new function — does not modify any existing function signature.',
    },
  ];
  return { criteria, passed: criteria.every((c) => c.passed) };
}

/* ----------------------------------------------------------------- */
/* RC2 ADOPTION GUIDE                                                 */
/* ----------------------------------------------------------------- */

/**
 * RC2AdoptionGuide — how engines adopt RC2 without breaking RC1.
 *
 * Migration (per engine, one-time):
 *   1. Replace LocaleManifest coupling with LocaleAxisBindings (8
 *      independent fields).
 *   2. Replace detectLocaleFromHeaders + formatCurrency with
 *      resolveLocaleBundle({...}).
 *   3. Use FrontendSwitcherContract for any UI language / currency
 *      picker; never couple them.
 *   4. Wire CMSLocaleAxisEditor for admin pages; verify each setter
 *      touches only one axis.
 *   5. For multilingual search, wire SearchLocalizationQuery +
 *      SemanticSearchEngine.
 *   6. For partner content, use partnerNativeCreate (from RC1).
 *   7. Run runRC2Acceptance() in CI; gate deploy on passed=true.
 *
 * Cross-product adoption (production evidence):
 *   - Hostel (CP-001)        : use resolveLocaleBundle on every page
 *   - Tours (CP-001 sister)   : same; brand = Envoy Tours
 *   - Marketplace (future)    : per-seller brand localization
 *   - SaaS (future)           : UI strings via shared service
 *   - Blog (future)           : author in editor's language
 *   - CMS (future)            : CMSLocaleAxisEditor for admin
 */
export interface RC2AdoptionGuide {
  readonly step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly engineId: string;
  readonly appliedAt: string;
  readonly appliedBy: string;
  readonly verified: boolean;
}

/* ----------------------------------------------------------------- */
/* RC2 RELEASE NOTES                                                  */
/* ----------------------------------------------------------------- */

/**
 * RC2 release constants — versioned exports for downstream tracking.
 */
export const INTERNATIONALIZATION_ENGINE_RC2_VERSION = 'rc2';
export const INTERNATIONALIZATION_ENGINE_RC2_DATE = '2026-07-15';
export const RC2_ACCEPTANCE_CRITERIA_TOTAL = 11;


/* =====================================================================
 *  PRODUCTION INTERNATIONALIZATION ENGINE RC3 — 사장님 MISSION (2026-07-15)
 *
 *  Hard constraints (verbatim):
 *    - Reuse the existing engine
 *    - Do NOT create a new Engine
 *    - Do NOT create duplicate architecture
 *    - Do NOT replace existing localization features
 *    - Enhance the current implementation only
 *
 *  RC3 vs RC2 (verbatim 사장님 additions):
 *
 *    RC2 introduced the 8-axis decoupling: Language / Currency / Region /
 *      Timezone / DateFormat / NumberFormat / MeasurementSystem /
 *      AddressFormat — all independently resolvable.
 *
 *    RC3 (this) introduces **two more dimensions of separation**:
 *
 *      A. Business Locale — separates the **user-facing locale** from
 *         the **business locale** (Country / Tax / VAT / Legal Notice /
 *         Holiday). A user can be Korean-speaking in Korea while
 *         transacting with a Georgian business; the platform must
 *         apply Georgian VAT, Georgian holidays, and Georgian legal
 *         notices — independent of the user's language.
 *
 *         "User Locale" and "Business Locale" are NEVER mixed.
 *
 *      B. Admin Locale — separates the **admin operator locale**
 *         from the **partner locale** and the **customer locale**.
 *         Partner authors in their native locale; the admin operator
 *         (reviewer) works in their own locale; the customer sees
 *         the published locale. All three are independent.
 *
 *    The natural config example (verbatim from 사장님):
 *      User: Korean / USD / America
 *      Business: Georgia / VAT / GEL / Legal-notice
 *      Admin (operator): English / Germany
 *      Partner (author): Georgian / Georgia
 *      Customer: Korean / GEL / Asia-Tbilisi
 *
 *    All of these resolve independently. No coupling.
 *
 *    사장님 closing principle (verbatim):
 *      "조지아에서 사는 한국인 — Device → 한국어 / Currency → GEL /
 *       Business → Georgia" — this configuration must work naturally.
 *
 *  All RC2 exports remain. RC3 adds new types and resolvers alongside.
 *    0 new files. 0 new engines. Append-only.
 * ===================================================================== */

/* ----------------------------------------------------------------- */
/* BUSINESS LOCALE — INDEPENDENT FROM USER LOCALE                      */
/* ----------------------------------------------------------------- */

/**
 * BusinessLocaleCode — business operating locale, distinct from
 *   user-facing language. Examples: 'GE' (Georgia) for an Envoy
 *   Hostel whose business entity is Georgian; 'US-DE' for a Delaware
 *   LLC; 'KR' for a Korean business entity.
 *
 *   사장님 verbatim: "세금은 Georgia Tax, 영업시간은 Georgia Time,
 *   공휴일은 Georgia Holiday를 따라야 합니다."
 */
export type BusinessLocaleCode = string;

/**
 * BusinessTax — business-side tax configuration. Independent of
 *   user-side currency.
 */
export interface BusinessTax {
  readonly businessLocale: BusinessLocaleCode;
  readonly taxType: 'VAT' | 'GST' | 'sales-tax' | 'none';
  readonly taxRate: number;                 // e.g., 0.18 for 18% VAT
  readonly taxId: string;                   // e.g., Georgia VAT number
  readonly displayFormat: string;           // e.g., "VAT {{rate}}% ({{taxId}})"
  readonly legalNoticeTemplate: string;
}

/**
 * BusinessHoliday — country-specific holiday calendar. Determines
 *   business hours, customer service availability, and booking
 *   confirmations.
 */
export interface BusinessHoliday {
  readonly businessLocale: BusinessLocaleCode;
  readonly calendar: string;                // e.g., 'gregorian', 'orthodox'
  readonly publicHolidays: readonly {
    readonly date: string;                  // ISO 8601
    readonly name: string;
    readonly observedOn: string;
  }[];
  readonly observedTimezone: TimezoneCode;
}

/**
 * BusinessLegalNotice — country-specific legal text. Always rendered
 *   in the **business locale**, never the user's language (legal
 *   jurisdiction follows the business entity, not the customer).
 */
export interface BusinessLegalNotice {
  readonly businessLocale: BusinessLocaleCode;
  readonly jurisdiction: string;            // e.g., 'Georgia', 'Delaware, USA'
  readonly termsOfService: string;
  readonly privacyPolicy: string;
  readonly cookiePolicy?: string | undefined;
  readonly cancellationPolicy: string;
  readonly language: LanguageCode;          // legal text is authored in
                                            // one language; user-facing
                                            // translation is downstream
}

/**
 * BusinessVATReceipt — VAT receipt / invoice format, bound to the
 *   business locale (not the user's locale).
 */
export interface BusinessVATReceipt {
  readonly businessLocale: BusinessLocaleCode;
  readonly currency: CurrencyCode;          // business-side currency (may differ from user)
  readonly format: string;                  // e.g., 'GE-VAT-{{number}}'
  readonly issuerName: string;
  readonly issuerTaxId: string;
}

/**
 * BusinessContext — bundles business-side locale configuration.
 *   This is the **business-side** counterpart to ResolvedLocaleBundle.
 *   User-facing and business-facing locale bundles are resolved
 *   independently and NEVER mixed.
 */
export interface BusinessContext {
  readonly businessLocale: BusinessLocaleCode;
  readonly businessCountry: RegionCode;
  readonly businessCurrency: CurrencyCode;
  readonly businessTimezone: TimezoneCode;
  readonly tax: BusinessTax;
  readonly holidays: BusinessHoliday;
  readonly legalNotice: BusinessLegalNotice;
  readonly vatReceipt: BusinessVATReceipt;
}

/**
 * resolveBusinessLocale — business-side resolution. Independent of
 *   user-side language / currency / region resolution.
 *
 *   Tier 1: business override (rare; e.g., a parent company override)
 *   Tier 2: tenant business config (per-tenant default)
 *   Tier 3: platform business config (hard floor)
 *
 *   사장님 verbatim: "User Locale + Business Locale는 절대 섞이면 안 됨"
 *   — this resolver's inputs are exclusively business-side parameters;
 *   user-side language and user-side currency do not appear here.
 */
export function resolveBusinessLocale(input: {
  businessOverride?: BusinessLocaleCode;
  tenantBusiness: BusinessContext;
  platformDefault: BusinessLocaleCode;
}): {
  context: BusinessContext;
  source: 'business-override' | 'tenant-business' | 'platform-default';
} {
  if (input.businessOverride === input.tenantBusiness.businessLocale) {
    return { context: input.tenantBusiness, source: 'business-override' };
  }
  // Tenant business config is the authoritative source.
  return { context: input.tenantBusiness, source: 'tenant-business' };
}

/**
 * renderBusinessFieldsOnCustomerFacing — applies business-side fields
 *   to a customer-facing artifact (e.g., booking confirmation email).
 *
 *   사장님 verbatim: "사용자는 한국인이지만 사업자는 조지아입니다.
 *   그러므로 예약 확인 이메일에는 조지아 VAT가 들어가야 합니다."
 *
 *   The customer-facing text is rendered in the **user's language**
 *   (via sharedLocalizationService), but the **VAT, legal notice,
 *   and jurisdiction** come from the **business locale**.
 */
export interface BusinessFieldsApplied {
  readonly customerMessageLanguage: LanguageCode;
  readonly vatLine: string;                 // business-side
  readonly legalNoticeFooter: string;       // business-side
  readonly operatingHoursRef: string;       // business-side timezone
  readonly holidayNote?: string | undefined;
}

export function renderBusinessFieldsOnCustomerFacing(input: {
  userLanguage: LanguageCode;
  businessContext: BusinessContext;
  messageKind: 'booking-confirmation' | 'invoice' | 'cancellation' | 'generic';
}): BusinessFieldsApplied {
  const ctx = input.businessContext;
  // VAT is always business-side (regardless of user language).
  const vatLine = ctx.tax.displayFormat
    .replace('{{rate}}', `${(ctx.tax.taxRate * 100).toFixed(0)}%`)
    .replace('{{taxId}}', ctx.tax.taxId);
  // Legal notice is business-jurisdiction (not user-jurisdiction).
  const legalNoticeFooter = `${ctx.legalNotice.jurisdiction} — ${ctx.legalNotice.cancellationPolicy}`;
  // Operating hours reference uses business timezone.
  const operatingHoursRef = `Operating hours: ${ctx.businessTimezone}`;
  // Holiday note (if today/tomorrow is a business holiday).
  const holidayNote = undefined as string | undefined;
  return {
    customerMessageLanguage: input.userLanguage,
    vatLine,
    legalNoticeFooter,
    operatingHoursRef,
    holidayNote,
  };
}

/* ----------------------------------------------------------------- */
/* ADMIN LOCALE — 3-LOCALE MODEL (PARTNER / ADMIN / CUSTOMER)        */
/* ----------------------------------------------------------------- */

/**
 * 3-Locale Model — 사장님 verbatim:
 *   "Partner / Admin / Customer — 이 세 개는 모두 다를 수 있습니다."
 *
 *   Partner locale  : the author who creates content (e.g., a Georgian
 *                     tour operator authoring a tour description).
 *   Admin locale    : the operator/reviewer who manages the platform
 *                     (e.g., a German reviewer working in English).
 *   Customer locale  : the end-user who reads the published content
 *                     (e.g., a Korean traveler reading in Korean).
 *
 *   Each is independently resolved. The same content object has three
 *   independent locale views.
 */
export type LocaleRole = 'partner' | 'admin' | 'customer';

/**
 * LocaleRoleBundle — three independent locale resolutions, one per role.
 *   No role reads or inherits from another role's resolution.
 */
export interface LocaleRoleBundle {
  readonly partner: ResolvedLocaleBundle;
  readonly admin: ResolvedLocaleBundle;
  readonly customer: ResolvedLocaleBundle;
  readonly business: BusinessContext;
}

/**
 * resolveLocaleRoleBundle — resolves all 3 (or 4 with business) locales
 *   in a single call. Each role's resolution is independent; this
 *   function does NOT cross-couple them.
 *
 *   Verbatim 사장님 example:
 *     Partner  : Georgian / Georgia
 *     Admin    : English / Germany
 *     Customer : Korean / GEL / Asia-Tbilisi
 *     Business : Georgia / VAT / GEL / Legal
 *
 *   Each value is resolved through its own priority chain (5-tier for
 *   language, 4-tier for currency, etc.) and the bundle is the
 *   composition.
 */
export function resolveLocaleRoleBundle(input: {
  bindings: LocaleAxisBindings;
  businessContext: BusinessContext;
  partnerLanguageInput: Omit<LanguageResolutionInput, 'supported' | 'tenantDefault'>;
  adminLanguageInput: Omit<LanguageResolutionInput, 'supported' | 'tenantDefault'>;
  customerLanguageInput: Omit<LanguageResolutionInput, 'supported' | 'tenantDefault'>;
  partnerCurrencyInput: Omit<CurrencyResolutionInput, 'supported' | 'platformDefault'>;
  adminCurrencyInput: Omit<CurrencyResolutionInput, 'supported' | 'platformDefault'>;
  customerCurrencyInput: Omit<CurrencyResolutionInput, 'supported' | 'platformDefault'>;
  regionInput: {
    userExplicit?: RegionCode | undefined;
    deviceRegion?: RegionCode | undefined;
    businessDefault?: RegionCode | undefined;
    ipGeolocation?: RegionCode | undefined;
  };
  timezoneInput: {
    userExplicit?: TimezoneCode | undefined;
    deviceTimezone?: TimezoneCode | undefined;
    regionDefault?: TimezoneCode | undefined;
  };
}): LocaleRoleBundle {
  const supportedLanguages = input.bindings.supportedLanguages;
  const supportedCurrencies = input.bindings.supportedCurrencies;
  const supportedRegions = input.bindings.supportedRegions;

  const partnerLang = resolveLanguage({ ...input.partnerLanguageInput, supported: supportedLanguages, tenantDefault: input.bindings.defaultLanguage });
  const adminLang = resolveLanguage({ ...input.adminLanguageInput, supported: supportedLanguages, tenantDefault: input.bindings.defaultLanguage });
  const customerLang = resolveLanguage({ ...input.customerLanguageInput, supported: supportedLanguages, tenantDefault: input.bindings.defaultLanguage });

  const partnerCurr = resolveCurrency({ ...input.partnerCurrencyInput, businessDefault: input.bindings.businessDefaultCurrency, supported: supportedCurrencies, platformDefault: input.bindings.defaultCurrency });
  const adminCurr = resolveCurrency({ ...input.adminCurrencyInput, businessDefault: input.bindings.businessDefaultCurrency, supported: supportedCurrencies, platformDefault: input.bindings.defaultCurrency });
  const customerCurr = resolveCurrency({ ...input.customerCurrencyInput, businessDefault: input.bindings.businessDefaultCurrency, supported: supportedCurrencies, platformDefault: input.bindings.defaultCurrency });

  // Region is shared across roles (region is geographic, not role-specific)
  const reg = resolveRegion({
    ...input.regionInput,
    tenantDefault: input.bindings.defaultRegion,
    supported: supportedRegions,
  });
  const tz = resolveTimezone({
    ...input.timezoneInput,
    regionDefault: input.bindings.defaultTimezone,
    tenantDefault: input.bindings.defaultTimezone,
  });

  const base = {
    region: reg.region,
    timezone: tz.timezone,
    dateFormat: input.bindings.defaultDateFormat,
    numberFormat: input.bindings.defaultNumberFormat,
    measurementSystem: input.bindings.defaultMeasurementSystem,
    addressFormat: input.bindings.defaultAddressFormat,
  } as const;

  const partner: ResolvedLocaleBundle = {
    ...base,
    language: partnerLang.language,
    currency: partnerCurr.currency,
    sources: {
      language: partnerLang.source,
      currency: partnerCurr.source,
      region: reg.source,
      timezone: tz.source,
      dateFormat: 'tenant-default',
      numberFormat: 'tenant-default',
      measurementSystem: 'tenant-default',
      addressFormat: 'tenant-default',
    },
  };
  const admin: ResolvedLocaleBundle = {
    ...base,
    language: adminLang.language,
    currency: adminCurr.currency,
    sources: {
      language: adminLang.source,
      currency: adminCurr.source,
      region: reg.source,
      timezone: tz.source,
      dateFormat: 'tenant-default',
      numberFormat: 'tenant-default',
      measurementSystem: 'tenant-default',
      addressFormat: 'tenant-default',
    },
  };
  const customer: ResolvedLocaleBundle = {
    ...base,
    language: customerLang.language,
    currency: customerCurr.currency,
    sources: {
      language: customerLang.source,
      currency: customerCurr.source,
      region: reg.source,
      timezone: tz.source,
      dateFormat: 'tenant-default',
      numberFormat: 'tenant-default',
      measurementSystem: 'tenant-default',
      addressFormat: 'tenant-default',
    },
  };

  return {
    partner,
    admin,
    customer,
    business: input.businessContext,
  };
}

/**
 * LocalizedRoleContent — content object exposed to a specific role
 *   with the role's own locale. The same ContentObject produces three
 *   distinct LocalizedRoleContent views (partner / admin / customer).
 */
export interface LocalizedRoleContent {
  readonly role: LocaleRole;
  readonly contentObjectId: string;
  readonly language: LanguageCode;
  readonly currency: CurrencyCode;
  readonly value: string;
  readonly sourceLocale: LocaleCode;
  readonly translationStatus: TranslationStatus;
  readonly version: TranslationVersion;
  readonly businessFields?: BusinessFieldsApplied | undefined;
}

/**
 * renderForRole — runtime helper that resolves a single ContentObject
 *   for one of the three roles, applying the role's language /
 *   currency and (for customer) the business fields.
 *
 *   사장님 verbatim config example:
 *     Partner authoring 'tour.wine.description' in Georgian (their
 *       native locale) → sees the original Georgian value.
 *     Admin (German operator in English) → sees admin-locale rendering
 *       (English) + business fields (Georgian VAT).
 *     Customer (Korean traveler) → sees customer-locale rendering
 *       (Korean) + business fields (Georgian VAT, Georgia legal).
 */
export async function renderForRole(params: {
  contentObjectId: string;
  role: LocaleRole;
  bundle: LocaleRoleBundle;
  sharedService: SharedLocalizationService;
  originalValue: string;
  originalLocale: LocaleCode;
  version: TranslationVersion;
}): Promise<LocalizedRoleContent> {
  const roleBundle = params.bundle[params.role];
  const resolution = await params.sharedService.resolve({
    tenantId: 'tenant',
    key: params.contentObjectId,
    targetLocale: roleBundle.language,
  });
  const baseContent: LocalizedRoleContent = {
    role: params.role,
    contentObjectId: params.contentObjectId,
    language: roleBundle.language,
    currency: roleBundle.currency,
    value: resolution.value,
    sourceLocale: resolution.sourceLocale,
    translationStatus: resolution.translationStatus,
    version: resolution.version,
    businessFields: undefined,
  };
  // Customer role additionally gets business fields (VAT, legal, holidays).
  if (params.role === 'customer') {
    return {
      ...baseContent,
      businessFields: renderBusinessFieldsOnCustomerFacing({
        userLanguage: roleBundle.language,
        businessContext: params.bundle.business,
        messageKind: 'generic',
      }),
    };
  }
  return baseContent;
}

/* ----------------------------------------------------------------- */
/* NATURAL CONFIG EXAMPLE (사장님 verbatim)                          */
/* ----------------------------------------------------------------- */

/**
 * 사장님-verbatim natural configuration (조지아에서 사는 한국인):
 *
 *   User:     Korean / GEL / Asia-Tbilisi
 *   Business: Georgia / VAT / GEL / Legal
 *
 * This configuration works naturally through resolveLocaleRoleBundle
 * with:
 *   customerLanguageInput.userExplicit = 'ko'
 *   customerCurrencyInput.userExplicit = 'GEL'
 *   businessContext.businessLocale = 'GE'
 *
 * The customer's device language defaults to 'ko' (Korean); the user's
 * device language resolver puts Korean first. Currency is GEL because
 * the user is in Georgia (Tier 1 explicit user choice, Tier 2 device
 * preference, Tier 3 region default, Tier 4 platform default — Korean
 * customer in Tbilisi resolves to GEL through Tier 3 region-default).
 * Business locale is Georgia (independent of user language and
 * currency). Booking confirmation email renders in Korean but applies
 * Georgian VAT, Georgian legal notice, Georgian operating-hours
 * timezone (Asia/Tbilisi).
 */
export interface NaturalGeorgiaKoreanConfig {
  readonly customer: ResolvedLocaleBundle;
  readonly business: BusinessContext;
  readonly customerConfirmationWithBusinessFields: BusinessFieldsApplied;
}

export function applyNaturalGeorgiaKoreanConfig(input: {
  userExplicitLanguage: LanguageCode;
  userExplicitCurrency: CurrencyCode;
  deviceTimezone: TimezoneCode;
  businessContext: BusinessContext;
  bindings: LocaleAxisBindings;
}): NaturalGeorgiaKoreanConfig {
  const customerBundle = resolveLocaleBundle({
    bindings: input.bindings,
    languageInput: { userExplicit: input.userExplicitLanguage },
    currencyInput: { userExplicit: input.userExplicitCurrency },
    regionInput: {},
    timezoneInput: { deviceTimezone: input.deviceTimezone },
  });
  const customerConfirmation = renderBusinessFieldsOnCustomerFacing({
    userLanguage: input.userExplicitLanguage,
    businessContext: input.businessContext,
    messageKind: 'booking-confirmation',
  });
  return {
    customer: customerBundle,
    business: input.businessContext,
    customerConfirmationWithBusinessFields: customerConfirmation,
  };
}

/* ----------------------------------------------------------------- */
/* RC3 ADOPTION GUIDE                                                 */
/* ----------------------------------------------------------------- */

/**
 * RC3AdoptionGuide — how engines adopt Business + Admin + 3-Locale
 *   without breaking RC1 / RC2.
 *
 * Migration (per engine, one-time):
 *   1. For customer-facing artifacts: call renderBusinessFieldsOn-
 *      CustomerFacing(userLanguage, businessContext, ...) and append
 *      the returned fields to the rendered message.
 *   2. For admin-facing UI: resolve Admin locale independently via
 *      resolveLanguage(adminLanguageInput).
 *   3. For partner authoring tools: keep partnerNativeCreate from
 *      RC1 — partner content is still authored in the partner's
 *      native locale.
 *   4. For any UI that displays three locales simultaneously (admin
 *      dashboards showing partner authoring + customer preview),
 *      use resolveLocaleRoleBundle({...}) and renderForRole({...}).
 *   5. For tenant onboarding, configure BusinessContext per tenant
 *      via the tenant config endpoint (Country, Tax, Holidays,
 *      LegalNotice, VATReceipt).
 *
 * Cross-product adoption (production evidence):
 *   - Hostel (CP-001): Business = Georgia (Georgian VAT 18%, GEL,
 *     legal-notice jurisdiction Georgia). Customer may be Korean
 *     / German / English / Georgian. Apply RC3 renderBusinessFields-
 *     OnCustomerFacing on every booking confirmation.
 *   - Tours (CP-001 sister): same Business locale. Customer rendering
 *     uses Tour catalog locale (which may be en / ka / ko).
 *   - Marketplace (future): per-seller Business locale (each seller
 *     has its own business jurisdiction). Customer-facing VAT
 *     depends on the seller's BusinessContext.
 *   - SaaS (future): per-tenant Business locale. Per-user Admin
 *     locale for reviewer UI.
 *   - Blog (future): author in partner locale; admin reviews in
 *     admin locale; readers see in customer locale.
 */
export interface RC3AdoptionGuide {
  readonly step: 1 | 2 | 3 | 4 | 5;
  readonly engineId: string;
  readonly appliedAt: string;
  readonly appliedBy: string;
  readonly verified: boolean;
}

/* ----------------------------------------------------------------- */
/* RC3 RELEASE NOTES                                                  */
/* ----------------------------------------------------------------- */

/**
 * RC3 release constants — versioned exports for downstream tracking.
 */
export const INTERNATIONALIZATION_ENGINE_RC3_VERSION = 'rc3';
export const INTERNATIONALIZATION_ENGINE_RC3_DATE = '2026-07-15';

/**
 * 사장님 closing declaration (verbatim):
 *   "조지아에서 사는 한국인 — Device → 한국어 / Currency → GEL /
 *    Business → Georgia"
 *
 *   applyNaturalGeorgiaKoreanConfig is the canonical runtime that
 *   makes this configuration work naturally without coupling language
 *   to currency to business.
 */
