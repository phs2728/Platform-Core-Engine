/**
 * Country Data — ISO 3166-1 (주요 국가)
 *
 * Platform의 Single Source of Truth for Country metadata.
 */

import type { Country } from '../interfaces/index.js';

export const COUNTRY_DATA: Country[] = [
  { code: 'KR', code3: 'KOR', name: 'South Korea', localName: '대한민국', dialCode: '+82', currency: 'KRW', timezone: 'Asia/Seoul', postalCodePattern: '^\\d{5}$', addressFormat: 'eastern' },
  { code: 'US', code3: 'USA', name: 'United States', localName: 'United States', dialCode: '+1', currency: 'USD', timezone: 'America/New_York', postalCodePattern: '^\\d{5}(-\\d{4})?$', addressFormat: 'western' },
  { code: 'GB', code3: 'GBR', name: 'United Kingdom', localName: 'United Kingdom', dialCode: '+44', currency: 'GBP', timezone: 'Europe/London', postalCodePattern: '^[A-Z]{1,2}\\d[A-Z\\d]? \\d[A-Z]{2}$', addressFormat: 'western' },
  { code: 'GE', code3: 'GEO', name: 'Georgia', localName: 'საქართველო', dialCode: '+995', currency: 'GEL', timezone: 'Asia/Tbilisi', postalCodePattern: '^\\d{4}$', addressFormat: 'western' },
  { code: 'DE', code3: 'DEU', name: 'Germany', localName: 'Deutschland', dialCode: '+49', currency: 'EUR', timezone: 'Europe/Berlin', postalCodePattern: '^\\d{5}$', addressFormat: 'western' },
  { code: 'TR', code3: 'TUR', name: 'Turkey', localName: 'Türkiye', dialCode: '+90', currency: 'TRY', timezone: 'Europe/Istanbul', postalCodePattern: '^\\d{5}$', addressFormat: 'western' },
  { code: 'RU', code3: 'RUS', name: 'Russia', localName: 'Россия', dialCode: '+7', currency: 'RUB', timezone: 'Europe/Moscow', postalCodePattern: '^\\d{6}$', addressFormat: 'western' },
  { code: 'CN', code3: 'CHN', name: 'China', localName: '中国', dialCode: '+86', currency: 'CNY', timezone: 'Asia/Shanghai', postalCodePattern: '^\\d{6}$', addressFormat: 'eastern' },
  { code: 'JP', code3: 'JPN', name: 'Japan', localName: '日本', dialCode: '+81', currency: 'JPY', timezone: 'Asia/Tokyo', postalCodePattern: '^\\d{3}-\\d{4}$', addressFormat: 'japanese' },
  { code: 'FR', code3: 'FRA', name: 'France', localName: 'France', dialCode: '+33', currency: 'EUR', timezone: 'Europe/Paris', postalCodePattern: '^\\d{5}$', addressFormat: 'western' },
  { code: 'ES', code3: 'ESP', name: 'Spain', localName: 'España', dialCode: '+34', currency: 'EUR', timezone: 'Europe/Madrid', postalCodePattern: '^\\d{5}$', addressFormat: 'western' },
  { code: 'IT', code3: 'ITA', name: 'Italy', localName: 'Italia', dialCode: '+39', currency: 'EUR', timezone: 'Europe/Rome', postalCodePattern: '^\\d{5}$', addressFormat: 'western' },
  { code: 'CA', code3: 'CAN', name: 'Canada', localName: 'Canada', dialCode: '+1', currency: 'CAD', timezone: 'America/Toronto', postalCodePattern: '^[A-Z]\\d[A-Z] \\d[A-Z]\\d$', addressFormat: 'western' },
  { code: 'AU', code3: 'AUS', name: 'Australia', localName: 'Australia', dialCode: '+61', currency: 'AUD', timezone: 'Australia/Sydney', postalCodePattern: '^\\d{4}$', addressFormat: 'western' },
  { code: 'AE', code3: 'ARE', name: 'United Arab Emirates', localName: 'الإمارات', dialCode: '+971', currency: 'AED', timezone: 'Asia/Dubai', postalCodePattern: null, addressFormat: 'western' },
  { code: 'TH', code3: 'THA', name: 'Thailand', localName: 'ประเทศไทย', dialCode: '+66', currency: 'THB', timezone: 'Asia/Bangkok', postalCodePattern: '^\\d{5}$', addressFormat: 'western' },
  { code: 'VN', code3: 'VNM', name: 'Vietnam', localName: 'Việt Nam', dialCode: '+84', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', postalCodePattern: '^\\d{6}$', addressFormat: 'western' },
  { code: 'UZ', code3: 'UZB', name: 'Uzbekistan', localName: 'Oʻzbekiston', dialCode: '+998', currency: 'UZS', timezone: 'Asia/Tashkent', postalCodePattern: '^\\d{6}$', addressFormat: 'western' },
  { code: 'KZ', code3: 'KAZ', name: 'Kazakhstan', localName: 'Қазақстан', dialCode: '+7', currency: 'KZT', timezone: 'Asia/Almaty', postalCodePattern: '^\\d{6}$', addressFormat: 'western' },
  { code: 'NL', code3: 'NLD', name: 'Netherlands', localName: 'Nederland', dialCode: '+31', currency: 'EUR', timezone: 'Europe/Amsterdam', postalCodePattern: '^\\d{4} [A-Z]{2}$', addressFormat: 'western' },
];

/**
 * Quick lookup map
 */
export const COUNTRY_MAP: ReadonlyMap<string, Country> = new Map(
  COUNTRY_DATA.map((c) => [c.code, c]),
);

/**
 * Get country by code
 */
export function getCountry(code: string): Country | null {
  return COUNTRY_MAP.get(code.toUpperCase()) ?? null;
}

/**
 * Check if country code is valid
 */
export function isValidCountryCode(code: string): boolean {
  return COUNTRY_MAP.has(code.toUpperCase());
}

/**
 * Country name aliases → ISO code (Standardization)
 */
const COUNTRY_ALIASES: Record<string, string> = {
  // Korea
  'korea': 'KR', 'south korea': 'KR', 'republic of korea': 'KR',
  '대한민국': 'KR', '한국': 'KR',
  // USA
  'usa': 'US', 'united states': 'US', 'united states of america': 'US',
  'america': 'US',
  // UK
  'uk': 'GB', 'britain': 'GB', 'great britain': 'GB',
  // Germany
  'deutschland': 'DE',
  // Japan
  '日本': 'JP', 'nippon': 'JP', 'nihon': 'JP',
  // Georgia
  'საქართველო': 'GE',
};

/**
 * Standardize a country name/code to ISO 3166-1 alpha-2
 *
 * '대한민국' → 'KR'
 * 'South Korea' → 'KR'
 * 'Republic of Korea' → 'KR'
 * 'kr' → 'KR'
 */
export function standardizeCountryCode(input: string): string | null {
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  // Already a code
  if (COUNTRY_MAP.has(upper)) return upper;

  // Check aliases
  const aliased = COUNTRY_ALIASES[lower];
  if (aliased) return aliased;

  // Check by English name
  for (const c of COUNTRY_DATA) {
    if (c.name.toLowerCase() === lower) return c.code;
    if (c.localName === trimmed) return c.code;
  }

  return null;
}
