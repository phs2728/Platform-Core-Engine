/**
 * Address Validator — 국가별 주소 검증
 *
 * 지원:
 * - 필수 항목 검증 (line1, city, country)
 * - 국가별 우편번호 패턴
 * - 좌표 범위 검증
 * - 국가 코드 표준 검증
 */

import type {
  Address,
  AddressValidationResult,
  AddressPolicy,
  Country,
} from '../interfaces/index.js';
import { getCountry, standardizeCountryCode, isValidCountryCode } from './country-data.js';

/**
 * 주소 검증
 */
export function validateAddressFields(
  address: Partial<Address>,
  policy?: AddressPolicy | null,
): AddressValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 필수 필드
  if (!address.line1 || address.line1!.trim().length === 0) {
    errors.push('Address line 1 is required');
  }
  if (!address.city || address.city!.trim().length === 0) {
    errors.push('City is required');
  }
  if (!address.country || address.country!.trim().length === 0) {
    errors.push('Country is required');
  }

  // 2. Country code validation
  if (address.country) {
    const code = address.country.toUpperCase();
    if (!isValidCountryCode(code)) {
      errors.push(`Invalid country code: ${address.country}. Use ISO 3166-1 alpha-2.`);
    }

    // Allowed countries check
    if (policy?.allowedCountries && policy.allowedCountries.length > 0) {
      if (!policy.allowedCountries.includes(code)) {
        errors.push(`Country ${code} is not allowed by policy`);
      }
    }
  }

  // 3. Postal code validation
  if (address.country && address.postalCode) {
    const country = getCountry(address.country);
    if (country?.postalCodePattern) {
      const regex = new RegExp(country.postalCodePattern);
      if (!regex.test(address.postalCode)) {
        warnings.push(
          `Postal code '${address.postalCode}' does not match expected pattern for ${country.code}: ${country.postalCodePattern}`,
        );
      }
    }
  } else if (policy?.requirePostalCode && !address.postalCode) {
    warnings.push('Postal code is recommended but missing');
  }

  // 4. Geo coordinate validation
  if (address.geo) {
    const { latitude, longitude } = address.geo;
    if (latitude < -90 || latitude > 90) {
      errors.push(`Latitude ${latitude} is out of range (-90 to 90)`);
    }
    if (longitude < -180 || longitude > 180) {
      errors.push(`Longitude ${longitude} is out of range (-180 to 180)`);
    }
  }

  // 5. Standardization suggestion
  let suggested: Partial<Address> | null = null;
  if (address.country) {
    const standardized = standardizeCountryCode(address.country);
    if (standardized && standardized !== address.country.toUpperCase()) {
      suggested = { country: standardized };
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggested,
  };
}

/**
 * Address Normalization — 표준화
 *
 * - Country name → ISO code
 * - Trimming whitespace
 * - Case normalization for country
 */
export function normalizeAddressFields(address: Partial<Address>): Partial<Address> {
  const normalized: Partial<Address> = { ...address };

  // Trim string fields
  if (normalized.line1) normalized.line1 = normalized.line1.trim();
  if (normalized.line2) normalized.line2 = normalized.line2.trim();
  if (normalized.city) normalized.city = normalized.city.trim();
  if (normalized.district) normalized.district = normalized.district.trim();
  if (normalized.region) normalized.region = normalized.region.trim();
  if (normalized.postalCode) normalized.postalCode = normalized.postalCode.trim().toUpperCase();
  if (normalized.label) normalized.label = normalized.label.trim();

  // Standardize country
  if (normalized.country) {
    const code = standardizeCountryCode(normalized.country);
    if (code) normalized.country = code;
  }

  // Trim recipient fields
  if (normalized.recipientName) normalized.recipientName = normalized.recipientName.trim();
  if (normalized.recipientPhone) normalized.recipientPhone = normalized.recipientPhone.trim();

  return normalized;
}
