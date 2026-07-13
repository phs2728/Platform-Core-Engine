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
