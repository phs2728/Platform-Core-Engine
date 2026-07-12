/**
 * Address Formatter — 국가별 주소 출력 포맷
 *
 * Format Types:
 * - western: US, UK, Germany, Georgia (largest → smallest)
 * - eastern: Korea, China (smallest → largest)
 * - japanese: Japan (special format with prefecture)
 */

import type { Address, FormattedAddress, Locale, AddressFormatType } from '../interfaces/index.js';
import { getCountry } from './country-data.js';

/**
 * Format address by country convention
 *
 * @param address The address to format
 * @param locale Language locale (en, ko, ka, ja, ...)
 */
export function formatAddress(
  address: Address,
  locale: Locale = 'en',
): FormattedAddress {
  const country = getCountry(address.country);
  const formatType: AddressFormatType = country?.addressFormat ?? 'western';

  // Check for localized version
  const localized = address.localized[locale];

  const line1 = localized?.line1 ?? address.line1;
  const line2 = localized?.line2 ?? address.line2;
  const city = localized?.city ?? address.city;
  const region = localized?.region ?? address.region;
  const postalCode = localized?.postalCode ?? address.postalCode;
  const countryName = localized?.country ?? country?.name ?? address.country;

  let lines: string[];

  switch (formatType) {
    case 'eastern':
      lines = formatEastern(address, line1, line2, city, region, postalCode, countryName);
      break;
    case 'japanese':
      lines = formatJapanese(address, line1, line2, city, region, postalCode, countryName);
      break;
    default:
      lines = formatWestern(address, line1, line2, city, region, postalCode, countryName);
  }

  // Filter empty lines
  lines = lines.filter((l) => l.trim().length > 0);

  return {
    lines,
    singleLine: lines.join(', '),
    html: lines.map((l) => `<div>${escapeHtml(l)}</div>`).join(''),
  };
}

// ═══════════════════════════════════════════
// Western Format (US, UK, DE, GE, TR, ...)
// Largest → Smallest
// ═══════════════════════════════════════════

function formatWestern(
  address: Address,
  line1: string,
  line2: string | null,
  city: string,
  region: string | null,
  postalCode: string | null,
  countryName: string,
): string[] {
  const lines: string[] = [];

  if (address.recipientName) lines.push(address.recipientName);

  lines.push(line1);
  if (line2) lines.push(line2);

  // City, Region Postal
  const cityLine = [
    city,
    region ? `, ${region}` : '',
    postalCode ? ` ${postalCode}` : '',
  ].join('').trim();
  if (cityLine) lines.push(cityLine);

  lines.push(countryName);

  return lines;
}

// ═══════════════════════════════════════════
// Eastern Format (Korea, China)
// Smallest → Largest
// ═══════════════════════════════════════════

function formatEastern(
  address: Address,
  line1: string,
  line2: string | null,
  city: string,
  region: string | null,
  postalCode: string | null,
  countryName: string,
): string[] {
  const lines: string[] = [];

  if (address.recipientName) lines.push(address.recipientName);

  // Country first for international
  lines.push(countryName);

  // Region → City → District → Line
  if (region) lines.push(region);
  lines.push(city);
  if (address.district) lines.push(address.district);
  lines.push(line1);
  if (line2) lines.push(line2);

  // Postal code last
  if (postalCode) lines.push(postalCode);

  return lines;
}

// ═══════════════════════════════════════════
// Japanese Format
// 〒100-0001 東京都千代田区...
// ═══════════════════════════════════════════

function formatJapanese(
  address: Address,
  line1: string,
  line2: string | null,
  city: string,
  region: string | null,
  postalCode: string | null,
  countryName: string,
): string[] {
  const lines: string[] = [];

  if (address.recipientName) lines.push(address.recipientName);

  // Postal code with 〒 prefix
  if (postalCode) lines.push(`〒${postalCode}`);

  // Region → City → Line
  if (region) lines.push(region);
  lines.push(city);
  if (line2) lines.push(line2);
  lines.push(line1);

  lines.push(countryName);

  return lines;
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
