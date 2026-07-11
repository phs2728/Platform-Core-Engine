import { describe, it, expect } from 'vitest';
import {
  createAddressUseCase,
  updateAddressUseCase,
  getAddressUseCase,
  searchAddressesUseCase,
  listAddressesUseCase,
  archiveAddressUseCase,
  restoreAddressUseCase,
  deleteAddressUseCase,
  setDefaultAddressUseCase,
  changeAddressTypeUseCase,
  validateAddressUseCase,
  normalizeAddressUseCase,
  formatAddressUseCase,
  reverseGeocodeUseCase,
  InMemoryAddressRepository,
  InMemoryCountryRepository,
  InMemoryGeoRepository,
  InMemoryAuditLogRepository,
  getCountry,
  standardizeCountryCode,
  encodeGeohash,
  decodeGeohash,
  distanceMeters,
  formatAddress,
  type Address,
} from '../src/index.js';

// ═══════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════

const fixedTime = new Date('2026-07-11T08:00:00.000Z');
const clock = { now: () => new Date(fixedTime) };
let idCounter = 0;
const idGen = { generate: () => `id-${++idCounter}` };
const eventBus = { events: [] as unknown[], async emit(e: unknown) { this.events.push(e); } };

function makeDeps() {
  return {
    addressRepository: new InMemoryAddressRepository(),
    countryRepository: new InMemoryCountryRepository(),
    geoRepository: new InMemoryGeoRepository(),
    auditLogRepository: new InMemoryAuditLogRepository(),
    idGenerator: idGen,
    clock,
    eventBus,
  };
}

// ═══════════════════════════════════════════
// Country Data Tests
// ═══════════════════════════════════════════

describe('Address Engine — Country Data', () => {
  it('should get country by code', () => {
    expect(getCountry('KR')?.name).toBe('South Korea');
    expect(getCountry('US')?.name).toBe('United States');
    expect(getCountry('GE')?.localName).toBe('საქართველო');
  });

  it('should standardize country names', () => {
    expect(standardizeCountryCode('대한민국')).toBe('KR');
    expect(standardizeCountryCode('South Korea')).toBe('KR');
    expect(standardizeCountryCode('Republic of Korea')).toBe('KR');
    expect(standardizeCountryCode('kr')).toBe('KR');
    expect(standardizeCountryCode('USA')).toBe('US');
    expect(standardizeCountryCode('日本')).toBe('JP');
  });

  it('should return null for unknown country', () => {
    expect(standardizeCountryCode('Atlantis')).toBeNull();
    expect(getCountry('XX')).toBeNull();
  });
});

// ═══════════════════════════════════════════
// Geohash Tests
// ═══════════════════════════════════════════

describe('Address Engine — Geohash', () => {
  it('should encode coordinates to geohash', () => {
    const hash = encodeGeohash(37.5665, 126.9780, 7); // Seoul
    expect(hash).toHaveLength(7);
    expect(hash).toMatch(/^[0-9a-z]+$/);
  });

  it('should decode geohash back to approximate coordinates', () => {
    const hash = encodeGeohash(37.5665, 126.9780, 9);
    const decoded = decodeGeohash(hash);
    expect(Math.abs(decoded.latitude - 37.5665)).toBeLessThan(0.001);
    expect(Math.abs(decoded.longitude - 126.9780)).toBeLessThan(0.001);
  });

  it('should calculate distance between points', () => {
    const seoul = [37.5665, 126.9780];
    const busan = [35.1796, 129.0756];
    const dist = distanceMeters(seoul[0]!, seoul[1]!, busan[0]!, busan[1]!);
    // Seoul to Busan ≈ 325km
    expect(dist).toBeGreaterThan(300000);
    expect(dist).toBeLessThan(350000);
  });
});

// ═══════════════════════════════════════════
// Create Address
// ═══════════════════════════════════════════

describe('Address Engine — Create', () => {
  it('should create address successfully', async () => {
    const deps = makeDeps();
    const result = await createAddressUseCase(
      {
        tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home',
        line1: '123 Main St', city: 'Seoul', country: 'KR',
        postalCode: '04524', correlationId: 'r-1',
      },
      deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.country).toBe('KR');
    expect(result.value.status).toBe('active');
    expect(result.value.version).toBe(1);
  });

  it('should reject invalid country code', async () => {
    const deps = makeDeps();
    const result = await createAddressUseCase(
      {
        tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home',
        line1: '123 Main St', city: 'X', country: 'XX', correlationId: 'r-1',
      },
      deps,
    );
    expect(result.ok).toBe(false);
  });

  it('should normalize country name on create', async () => {
    const deps = makeDeps();
    const result = await createAddressUseCase(
      {
        tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home',
        line1: '강남대로 123', city: 'Seoul', country: 'south korea', correlationId: 'r-1',
      },
      deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.country).toBe('KR');
  });

  it('should emit address.created event', async () => {
    const deps = makeDeps();
    const initialCount = deps.eventBus.events.length;
    await createAddressUseCase(
      {
        tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home',
        line1: 'Test', city: 'Test', country: 'KR', correlationId: 'r-1',
      },
      deps,
    );
    expect(deps.eventBus.events.length).toBe(initialCount + 1);
    const event = deps.eventBus.events[deps.eventBus.events.length - 1] as { eventType: string };
    expect(event.eventType).toBe('address.created');
  });

  it('should set geohash when geo is provided', async () => {
    const deps = makeDeps();
    const result = await createAddressUseCase(
      {
        tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home',
        line1: 'Test', city: 'Seoul', country: 'KR',
        geo: { latitude: 37.5665, longitude: 126.978 },
        correlationId: 'r-1',
      },
      deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.geo).not.toBeNull();
    expect(result.value.geo!.geohash).toBeDefined();
    expect(result.value.geo!.geohash!.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// Update Address
// ═══════════════════════════════════════════

describe('Address Engine — Update', () => {
  it('should update address fields', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'Old', city: 'Seoul', country: 'KR', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await updateAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, line1: 'New Address', correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.line1).toBe('New Address');
    expect(result.value.version).toBe(2);
  });

  it('should return NotFoundError for non-existent address', async () => {
    const deps = makeDeps();
    const result = await updateAddressUseCase(
      { tenantId: 't-1', addressId: 'nonexistent', line1: 'X', correlationId: 'r-1' },
      deps,
    );
    expect(result.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// Archive & Restore
// ═══════════════════════════════════════════

describe('Address Engine — Archive & Restore', () => {
  it('should archive and restore address', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'Test', city: 'Seoul', country: 'KR', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    // Archive
    const archResult = await archiveAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, correlationId: 'r-2' },
      deps,
    );
    expect(archResult.ok).toBe(true);

    // Not visible via findById
    const getResult = await getAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, correlationId: 'r-3' },
      deps,
    );
    expect(getResult.ok).toBe(false);

    // Restore
    const restoreResult = await restoreAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, correlationId: 'r-4' },
      deps,
    );
    expect(restoreResult.ok).toBe(true);

    // Visible again
    const getResult2 = await getAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, correlationId: 'r-5' },
      deps,
    );
    expect(getResult2.ok).toBe(true);
  });

  it('should reject double archive', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'Test', city: 'X', country: 'KR', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    await archiveAddressUseCase({ tenantId: 't-1', addressId: created.value.id, correlationId: 'r-2' }, deps);
    const result = await archiveAddressUseCase({ tenantId: 't-1', addressId: created.value.id, correlationId: 'r-3' }, deps);
    expect(result.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// Default Address
// ═══════════════════════════════════════════

describe('Address Engine — Default', () => {
  it('should set only one default per type', async () => {
    const deps = makeDeps();

    // Create two addresses of same type
    const a1 = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'shipping', line1: 'Addr1', city: 'Seoul', country: 'KR', isDefault: true, correlationId: 'r-1' },
      deps,
    );
    const a2 = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'shipping', line1: 'Addr2', city: 'Busan', country: 'KR', correlationId: 'r-2' },
      deps,
    );
    if (!a1.ok || !a2.ok) return;

    // a1 should be default
    const before = await getAddressUseCase({ tenantId: 't-1', addressId: a1.value.id, correlationId: 'r-3' }, deps);
    expect(before.ok && before.value.isDefault).toBe(true);

    // Set a2 as default
    await setDefaultAddressUseCase({ tenantId: 't-1', addressId: a2.value.id, correlationId: 'r-4' }, deps);

    // a1 should no longer be default
    const after1 = await getAddressUseCase({ tenantId: 't-1', addressId: a1.value.id, correlationId: 'r-5' }, deps);
    const after2 = await getAddressUseCase({ tenantId: 't-1', addressId: a2.value.id, correlationId: 'r-6' }, deps);
    expect(after1.ok && after1.value.isDefault).toBe(false);
    expect(after2.ok && after2.value.isDefault).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Change Type
// ═══════════════════════════════════════════

describe('Address Engine — Change Type', () => {
  it('should change address type', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'Test', city: 'Seoul', country: 'KR', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await changeAddressTypeUseCase(
      { tenantId: 't-1', addressId: created.value.id, newType: 'office', correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.type).toBe('office');
  });
});

// ═══════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════

describe('Address Engine — Validation', () => {
  it('should validate a correct address', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: '123 Main St', city: 'Seoul', country: 'KR', postalCode: '04524', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await validateAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(true);
    expect(result.value.errors).toHaveLength(0);
  });

  it('should detect invalid postal code pattern', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'Test', city: 'Seoul', country: 'KR', postalCode: 'INVALID', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await validateAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.warnings.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// Normalize
// ═══════════════════════════════════════════

describe('Address Engine — Normalize', () => {
  it('should normalize country code', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'Test', city: 'Seoul', country: 'KR', postalCode: '04524', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    // Manually set to non-standard
    await deps.addressRepository.update(created.value.id, { country: 'kr' });

    const result = await normalizeAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.country).toBe('KR');
  });
});

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

describe('Address Engine — Search', () => {
  it('should search by query string', async () => {
    const deps = makeDeps();
    await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'Gangnam-gu', city: 'Seoul', country: 'KR', correlationId: 'r-1' },
      deps,
    );
    await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'office', line1: 'Manhattan', city: 'New York', country: 'US', correlationId: 'r-2' },
      deps,
    );

    const result = await searchAddressesUseCase(
      { tenantId: 't-1', query: 'Gangnam', correlationId: 'r-3' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(1);
  });

  it('should filter by country', async () => {
    const deps = makeDeps();
    await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'A', city: 'Seoul', country: 'KR', correlationId: 'r-1' },
      deps,
    );
    await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'B', city: 'NYC', country: 'US', correlationId: 'r-2' },
      deps,
    );

    const result = await searchAddressesUseCase(
      { tenantId: 't-1', country: 'KR', correlationId: 'r-3' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(1);
  });
});

// ═══════════════════════════════════════════
// Format Address
// ═══════════════════════════════════════════

describe('Address Engine — Format', () => {
  it('should format Korean address (eastern format)', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: '강남대로 123', city: 'Seoul', region: 'Seoul', country: 'KR', postalCode: '04524', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await formatAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, locale: 'en', correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lines.length).toBeGreaterThan(0);
    expect(result.value.singleLine).toContain('Seoul');
  });

  it('should format US address (western format)', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: '123 Main St', city: 'New York', region: 'NY', country: 'US', postalCode: '10001', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await formatAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, locale: 'en', correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lines.length).toBeGreaterThan(0);
    expect(result.value.singleLine).toContain('New York');
  });

  it('should format Japanese address', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: '1-1-1 Chiyoda', city: 'Tokyo', region: 'Tokyo', country: 'JP', postalCode: '100-0001', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await formatAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, locale: 'en', correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Japanese format starts with 〒
    expect(result.value.lines.some((l) => l.includes('〒'))).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Reverse Geocode
// ═══════════════════════════════════════════

describe('Address Engine — Reverse Geocode', () => {
  it('should reverse geocode coordinates', async () => {
    const deps = makeDeps();
    const result = await reverseGeocodeUseCase(
      { latitude: 37.5665, longitude: 126.978, correlationId: 'r-1' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toBeNull();
    expect(result.value!.geo).toBeDefined();
    expect(result.value!.geo!.geohash).toBeDefined();
  });

  it('should reject invalid coordinates', async () => {
    const deps = makeDeps();
    const result = await reverseGeocodeUseCase(
      { latitude: 200, longitude: 0, correlationId: 'r-1' },
      deps,
    );
    expect(result.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// List Addresses
// ═══════════════════════════════════════════

describe('Address Engine — List', () => {
  it('should list addresses by owner', async () => {
    const deps = makeDeps();
    await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'A', city: 'Seoul', country: 'KR', correlationId: 'r-1' },
      deps,
    );
    await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'office', line1: 'B', city: 'Seoul', country: 'KR', correlationId: 'r-2' },
      deps,
    );
    await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-2', type: 'home', line1: 'C', city: 'Busan', country: 'KR', correlationId: 'r-3' },
      deps,
    );

    const result = await listAddressesUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', correlationId: 'r-4' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════
// Tenant Isolation
// ═══════════════════════════════════════════

describe('Address Engine — Tenant Isolation', () => {
  it('should not find addresses from other tenants', async () => {
    const deps = makeDeps();
    await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'A', city: 'Seoul', country: 'KR', correlationId: 'r-1' },
      deps,
    );

    const result = await getAddressUseCase(
      { tenantId: 't-2', addressId: 'id-1', correlationId: 'r-2' },
      deps,
    );
    expect(result.ok).toBe(false);
  });
});

// ═══════════════════════════════════════════
// Owner-Agnostic
// ═══════════════════════════════════════════

describe('Address Engine — Owner-Agnostic', () => {
  it('should support different owner types', async () => {
    const deps = makeDeps();

    // User owner
    const r1 = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'User Addr', city: 'Seoul', country: 'KR', correlationId: 'r-1' },
      deps,
    );
    expect(r1.ok).toBe(true);

    // Organization owner
    const r2 = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'Organization', ownerId: 'org-1', type: 'office', line1: 'Org Addr', city: 'Seoul', country: 'KR', correlationId: 'r-2' },
      deps,
    );
    expect(r2.ok).toBe(true);

    // Booking owner
    const r3 = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'Booking', ownerId: 'booking-1', type: 'hotel', line1: 'Hotel Addr', city: 'Busan', country: 'KR', correlationId: 'r-3' },
      deps,
    );
    expect(r3.ok).toBe(true);

    // Search by different owner types
    const userAddrs = await listAddressesUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', correlationId: 'r-4' },
      deps,
    );
    expect(userAddrs.ok && userAddrs.value.length).toBe(1);

    const orgAddrs = await listAddressesUseCase(
      { tenantId: 't-1', ownerType: 'Organization', ownerId: 'org-1', correlationId: 'r-5' },
      deps,
    );
    expect(orgAddrs.ok && orgAddrs.value.length).toBe(1);
  });
});

// ═══════════════════════════════════════════
// Delete (Hard Delete)
// ═══════════════════════════════════════════

describe('Address Engine — Delete', () => {
  it('should hard delete address', async () => {
    const deps = makeDeps();
    const created = await createAddressUseCase(
      { tenantId: 't-1', ownerType: 'User', ownerId: 'u-1', type: 'home', line1: 'Test', city: 'Seoul', country: 'KR', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const delResult = await deleteAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, correlationId: 'r-2' },
      deps,
    );
    expect(delResult.ok).toBe(true);

    // Should not find
    const getResult = await getAddressUseCase(
      { tenantId: 't-1', addressId: created.value.id, correlationId: 'r-3' },
      deps,
    );
    expect(getResult.ok).toBe(false);
  });
});
