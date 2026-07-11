/**
 * Host Stubs + EventBus + Inventory Integration Mock — Test/Demo only
 *
 * Booking Engine 전용:
 *   - InMemoryOrganizationVerifier (add/verify/clear)
 *   - StaticBookingPolicyProvider (ICustomDataPolicyProvider)
 *   - MockInventoryIntegration (IInventoryIntegration)
 *   - InMemoryEventBus (Inventory/Pricing Engine 패턴 동일)
 */

import type { EventEnvelope } from '@platform/core-sdk';
import { Ok, Err, type Result } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
  ICustomDataPolicyProvider,
  IInventoryIntegration,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Verifiers
// ═══════════════════════════════════════════

export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();

  add(tenantId: string, orgId: string): void { this.store.add(`${tenantId}::${orgId}`); }

  async verify(tenantId: string, orgId: string): Promise<boolean> {
    return this.store.has(`${tenantId}::${orgId}`);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy (Booking-specific config)
// ═══════════════════════════════════════════

interface BookingTenantConfig {
  allowedBookingTypes: readonly string[];
  maxBookingsPerOrg: number;
  defaultExpirySeconds: number;
  defaultCancelWindowSeconds: number;
}

const DEFAULT_BOOKING_CONFIG: BookingTenantConfig = {
  allowedBookingTypes: ['default'],
  maxBookingsPerOrg: 1000,
  defaultExpirySeconds: 1800,       // 30 min pending→expired
  defaultCancelWindowSeconds: 86400, // 24h cancel window
};

export class StaticBookingPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, BookingTenantConfig>();

  set(tenantId: string, config: Partial<BookingTenantConfig>): void {
    const prev = this.tenantConfig.get(tenantId) ?? DEFAULT_BOOKING_CONFIG;
    this.tenantConfig.set(tenantId, {
      allowedBookingTypes: config.allowedBookingTypes ?? prev.allowedBookingTypes,
      maxBookingsPerOrg: config.maxBookingsPerOrg ?? prev.maxBookingsPerOrg,
      defaultExpirySeconds: config.defaultExpirySeconds ?? prev.defaultExpirySeconds,
      defaultCancelWindowSeconds: config.defaultCancelWindowSeconds ?? prev.defaultCancelWindowSeconds,
    });
  }

  async validateAttributes(
    _tenantId: string,
    _type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>> {
    // Sprint 1: pass-through (Host가 진짜 validation 구현)
    return Ok(attributes);
  }

  async getAllowedBookingTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedBookingTypes ?? DEFAULT_BOOKING_CONFIG.allowedBookingTypes;
  }

  async getMaxBookingsPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxBookingsPerOrg ?? DEFAULT_BOOKING_CONFIG.maxBookingsPerOrg;
  }

  async getDefaultExpirySeconds(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultExpirySeconds ?? DEFAULT_BOOKING_CONFIG.defaultExpirySeconds;
  }

  async getDefaultCancelWindowSeconds(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultCancelWindowSeconds ?? DEFAULT_BOOKING_CONFIG.defaultCancelWindowSeconds;
  }

  clear(): void { this.tenantConfig.clear(); }
}

// ═══════════════════════════════════════════
// MockInventoryIntegration
// Tracks available quantities per inventory+location.
// Supports checkAvailability/reserveInventory/allocateInventory/
// releaseReservation/releaseAllocation.
// ═══════════════════════════════════════════

interface ReservationState {
  tenantId: string;
  inventoryId: string;
  locationId: string;
  ownerId: string;
  quantity: number;
  expiresAt: string;
  status: 'Pending' | 'Released';
}

interface AllocationState {
  tenantId: string;
  inventoryId: string;
  locationId: string;
  ownerId: string;
  quantity: number;
  status: 'Active' | 'Released';
}

interface AvailabilityState {
  total: number;
  reserved: number;   // sum of active reservations
  allocated: number;  // sum of active allocations
}

export class MockInventoryIntegration implements IInventoryIntegration {
  /** key = `${tenantId}::${inventoryId}::${locationId}` → availability */
  private availability = new Map<string, AvailabilityState>();
  private reservations = new Map<string, ReservationState>();
  private allocations = new Map<string, AllocationState>();
  private counter = 0;

  /**
   * Test helper: set total available quantity for an inventory+location.
   */
  setAvailability(tenantId: string, inventoryId: string, locationId: string, total: number): void {
    this.availability.set(`${tenantId}::${inventoryId}::${locationId}`, {
      total,
      reserved: 0,
      allocated: 0,
    });
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  async checkAvailability(
    tenantId: string,
    inventoryId: string,
    locationId: string,
    quantity: number,
  ): Promise<Result<{ available: number; sufficient: boolean }, Error>> {
    const k = `${tenantId}::${inventoryId}::${locationId}`;
    const state = this.availability.get(k);
    if (!state) {
      return Err(new Error(`No availability tracked for ${k}`));
    }
    const available = state.total - state.reserved - state.allocated;
    return Ok({ available, sufficient: available >= quantity });
  }

  async reserveInventory(
    tenantId: string,
    inventoryId: string,
    locationId: string,
    ownerId: string,
    quantity: number,
    ttlSeconds?: number,
  ): Promise<Result<{ reservationId: string }, Error>> {
    const k = `${tenantId}::${inventoryId}::${locationId}`;
    const state = this.availability.get(k);
    if (!state) {
      return Err(new Error(`No availability tracked for ${k}`));
    }
    const available = state.total - state.reserved - state.allocated;
    if (available < quantity) {
      return Err(new Error(`Insufficient availability: requested ${quantity}, available ${available}`));
    }
    const reservationId = this.nextId('reservation');
    const ttl = ttlSeconds ?? 900;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    this.reservations.set(reservationId, {
      tenantId, inventoryId, locationId, ownerId, quantity, expiresAt, status: 'Pending',
    });
    state.reserved += quantity;
    return Ok({ reservationId });
  }

  async allocateInventory(
    tenantId: string,
    inventoryId: string,
    locationId: string,
    ownerId: string,
    quantity: number,
  ): Promise<Result<{ allocationId: string }, Error>> {
    const k = `${tenantId}::${inventoryId}::${locationId}`;
    const state = this.availability.get(k);
    if (!state) {
      return Err(new Error(`No availability tracked for ${k}`));
    }
    const available = state.total - state.reserved - state.allocated;
    if (available < quantity) {
      return Err(new Error(`Insufficient availability: requested ${quantity}, available ${available}`));
    }
    const allocationId = this.nextId('allocation');
    this.allocations.set(allocationId, {
      tenantId, inventoryId, locationId, ownerId, quantity, status: 'Active',
    });
    state.allocated += quantity;
    return Ok({ allocationId });
  }

  async releaseReservation(tenantId: string, reservationId: string): Promise<Result<void, Error>> {
    const r = this.reservations.get(reservationId);
    if (!r) {
      return Err(new Error(`Reservation not found: ${reservationId}`));
    }
    if (r.status === 'Released') {
      return Err(new Error(`Reservation already released: ${reservationId}`));
    }
    r.status = 'Released';
    const k = `${tenantId}::${r.inventoryId}::${r.locationId}`;
    const state = this.availability.get(k);
    if (state) state.reserved -= r.quantity;
    return Ok(undefined);
  }

  async releaseAllocation(tenantId: string, allocationId: string): Promise<Result<void, Error>> {
    const a = this.allocations.get(allocationId);
    if (!a) {
      return Err(new Error(`Allocation not found: ${allocationId}`));
    }
    if (a.status === 'Released') {
      return Err(new Error(`Allocation already released: ${allocationId}`));
    }
    a.status = 'Released';
    const k = `${tenantId}::${a.inventoryId}::${a.locationId}`;
    const state = this.availability.get(k);
    if (state) state.allocated -= a.quantity;
    return Ok(undefined);
  }

  /** Test helper: reset all state. */
  clear(): void {
    this.availability.clear();
    this.reservations.clear();
    this.allocations.clear();
    this.counter = 0;
  }
}

// ═══════════════════════════════════════════
// EventBus (Inventory/Pricing Engine 패턴 동일)
// ═══════════════════════════════════════════

export interface RecordedEnvelope<T = unknown> {
  envelope: EventEnvelope<T>;
  recordedAt: number;
}

export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];

  async emit<T>(envelope: EventEnvelope<T>): Promise<void> {
    this.emitted.push({ envelope, recordedAt: Date.now() });
  }

  byType(eventType: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.eventType === eventType);
  }

  byAggregate(aggregateId: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.aggregateId === aggregateId);
  }

  countByType(eventType: string): number {
    return this.byType(eventType).length;
  }

  clear(): void { this.emitted.length = 0; }
}
