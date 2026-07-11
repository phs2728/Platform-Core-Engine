import type { ICountryRepository, Country } from '../interfaces/index.js';
import { COUNTRY_DATA, COUNTRY_MAP } from '../domain/country-data.js';

export class InMemoryCountryRepository implements ICountryRepository {
  private readonly data: Map<string, Country> = new Map(COUNTRY_MAP);

  async findByCode(code: string): Promise<Country | null> {
    return this.data.get(code.toUpperCase()) ?? null;
  }

  async findAll(): Promise<Country[]> {
    return Array.from(this.data.values());
  }

  async insert(country: Country): Promise<void> {
    this.data.set(country.code, country);
  }
}

/**
 * Pre-seed from COUNTRY_DATA
 */
export function createCountryRepositoryWithDefaults(): InMemoryCountryRepository {
  return new InMemoryCountryRepository();
}
