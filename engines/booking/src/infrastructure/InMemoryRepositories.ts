/**
 * In-Memory Repositories — Booking Engine
 *
 * 사장님 확립: Multi-Tenant key = `${tenantId}::${id}`
 *
 * Booking/Resource/Participant/Timeline/Confirmation/PolicyRef/Audit 패턴 동일.
 */

import type {
  IBookingRepository,
  IBookingResourceRepository,
  IBookingParticipantRepository,
  IBookingTimelineRepository,
  IBookingConfirmationRepository,
  IBookingPolicyRefRepository,
  IBookingAuditRepository,
  Booking,
  BookingResource,
  BookingParticipant,
  BookingTimelineEntry,
  BookingConfirmation,
  BookingPolicyReference,
  BookingAuditRecord,
  BookingSearchCriteria,
  BookingSearchResult,
} from '../interfaces/index.js';

function key(t: string, id: string): string { return `${t}::${id}`; }

// ═══════════════════════════════════════════
// Booking
// ═══════════════════════════════════════════

export class InMemoryBookingRepository implements IBookingRepository {
  private store = new Map<string, Booking>();

  async insert(booking: Booking): Promise<void> {
    const k = key(booking.tenantId, booking.id);
    if (this.store.has(k)) throw new Error(`Duplicate booking id: ${booking.id}`);
    this.store.set(k, booking);
  }

  async findById(tenantId: string, id: string): Promise<Booking | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByBookingNumber(tenantId: string, bookingNumber: string): Promise<Booking | null> {
    for (const b of this.store.values()) {
      if (b.tenantId === tenantId && b.bookingNumber === bookingNumber) return b;
    }
    return null;
  }

  async update(tenantId: string, id: string, patch: Partial<Booking>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Booking not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async search(criteria: BookingSearchCriteria): Promise<BookingSearchResult> {
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const sortBy = criteria.sortBy ?? 'createdAt';
    const sortOrder = criteria.sortOrder ?? 'desc';

    let candidates: Booking[] = [];
    for (const b of this.store.values()) {
      if (b.tenantId !== criteria.tenantId) continue;
      if (criteria.organizationId !== undefined && b.organizationId !== criteria.organizationId) continue;
      if (criteria.type !== undefined && b.type !== criteria.type) continue;
      if (criteria.status !== undefined && b.status !== criteria.status) continue;
      if (criteria.tags !== undefined && !criteria.tags.every((t) => b.tags.includes(t))) continue;
      if (criteria.userId !== undefined && b.createdBy !== criteria.userId) continue;
      if (criteria.startAfter !== undefined && b.schedule.startAt < criteria.startAfter) continue;
      if (criteria.startBefore !== undefined && b.schedule.startAt > criteria.startBefore) continue;
      if (criteria.query !== undefined) {
        const q = criteria.query.toLowerCase();
        const title = b.title.toLowerCase();
        if (!title.includes(q)) continue;
      }
      candidates.push(b);
    }

    candidates.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortBy === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
      else if (sortBy === 'startAt') cmp = a.schedule.startAt.localeCompare(b.schedule.startAt);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    const total = candidates.length;
    return {
      bookings: candidates.slice(offset, offset + limit),
      total, limit, offset,
    };
  }

  async countByOrganization(tenantId: string, organizationId: string): Promise<number> {
    let count = 0;
    for (const b of this.store.values()) {
      if (
        b.tenantId === tenantId &&
        b.organizationId === organizationId &&
        b.status !== 'Cancelled' &&
        b.status !== 'Expired' &&
        b.status !== 'Rejected'
      ) {
        count += 1;
      }
    }
    return count;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// BookingResource
// ═══════════════════════════════════════════

export class InMemoryBookingResourceRepository implements IBookingResourceRepository {
  private store = new Map<string, BookingResource>();

  async insert(resource: BookingResource): Promise<void> {
    const k = key(resource.tenantId, resource.id);
    if (this.store.has(k)) throw new Error(`Duplicate booking resource id: ${resource.id}`);
    this.store.set(k, resource);
  }

  async findById(tenantId: string, id: string): Promise<BookingResource | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByBooking(tenantId: string, bookingId: string): Promise<BookingResource[]> {
    const list: BookingResource[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.bookingId === bookingId) list.push(r);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<BookingResource>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Booking resource not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Booking resource not found: ${id}`);
    this.store.delete(k);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// BookingParticipant
// ═══════════════════════════════════════════

export class InMemoryBookingParticipantRepository implements IBookingParticipantRepository {
  private store = new Map<string, BookingParticipant>();

  async insert(participant: BookingParticipant): Promise<void> {
    const k = key(participant.tenantId, participant.id);
    if (this.store.has(k)) throw new Error(`Duplicate booking participant id: ${participant.id}`);
    this.store.set(k, participant);
  }

  async findById(tenantId: string, id: string): Promise<BookingParticipant | null> {
    return this.store.get(key(tenantId, id)) ?? null;
  }

  async findByBooking(tenantId: string, bookingId: string): Promise<BookingParticipant[]> {
    const list: BookingParticipant[] = [];
    for (const p of this.store.values()) {
      if (p.tenantId === tenantId && p.bookingId === bookingId) list.push(p);
    }
    return list;
  }

  async update(tenantId: string, id: string, patch: Partial<BookingParticipant>): Promise<void> {
    const k = key(tenantId, id);
    const ex = this.store.get(k);
    if (!ex) throw new Error(`Booking participant not found: ${id}`);
    this.store.set(k, { ...ex, ...patch });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const k = key(tenantId, id);
    if (!this.store.has(k)) throw new Error(`Booking participant not found: ${id}`);
    this.store.delete(k);
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// BookingTimeline (insertion-order seq)
// ═══════════════════════════════════════════

export class InMemoryBookingTimelineRepository implements IBookingTimelineRepository {
  private store = new Map<string, BookingTimelineEntry>();
  private seq: BookingTimelineEntry[] = [];

  async insert(entry: BookingTimelineEntry): Promise<void> {
    const k = key(entry.tenantId, entry.id);
    if (this.store.has(k)) throw new Error(`Duplicate booking timeline entry id: ${entry.id}`);
    this.store.set(k, entry);
    this.seq.push(entry);
  }

  async findByBooking(tenantId: string, bookingId: string, limit?: number): Promise<BookingTimelineEntry[]> {
    const list: BookingTimelineEntry[] = [];
    for (const e of this.seq) {
      if (e.tenantId === tenantId && e.bookingId === bookingId) list.push(e);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.seq.length = 0; }
}

// ═══════════════════════════════════════════
// BookingConfirmation
// ═══════════════════════════════════════════

export class InMemoryBookingConfirmationRepository implements IBookingConfirmationRepository {
  private store = new Map<string, BookingConfirmation>();

  async insert(confirmation: BookingConfirmation): Promise<void> {
    const k = key(confirmation.tenantId, confirmation.id);
    if (this.store.has(k)) throw new Error(`Duplicate booking confirmation id: ${confirmation.id}`);
    this.store.set(k, confirmation);
  }

  async findByBooking(tenantId: string, bookingId: string): Promise<BookingConfirmation | null> {
    for (const c of this.store.values()) {
      if (c.tenantId === tenantId && c.bookingId === bookingId) return c;
    }
    return null;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// BookingPolicyRef
// ═══════════════════════════════════════════

export class InMemoryBookingPolicyRefRepository implements IBookingPolicyRefRepository {
  private store = new Map<string, BookingPolicyReference>();

  async insert(ref: BookingPolicyReference): Promise<void> {
    const k = key(ref.tenantId, ref.id);
    if (this.store.has(k)) throw new Error(`Duplicate booking policy ref id: ${ref.id}`);
    this.store.set(k, ref);
  }

  async findByBooking(tenantId: string, bookingId: string): Promise<BookingPolicyReference[]> {
    const list: BookingPolicyReference[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId && r.bookingId === bookingId) list.push(r);
    }
    return list;
  }

  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// BookingAudit (counter-based id)
// ═══════════════════════════════════════════

export class InMemoryBookingAuditRepository implements IBookingAuditRepository {
  private store = new Map<string, BookingAuditRecord>();
  private counter = 0;

  async insert(record: Omit<BookingAuditRecord, 'id' | 'createdAt'>): Promise<BookingAuditRecord> {
    this.counter += 1;
    const full: BookingAuditRecord = {
      ...record,
      id: `booking-audit-${this.counter}`,
      createdAt: new Date().toISOString(),
    };
    this.store.set(full.id, full);
    return full;
  }

  async findByTenant(tenantId: string, limit?: number): Promise<BookingAuditRecord[]> {
    const list: BookingAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId === tenantId) list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  async findByBooking(tenantId: string, bookingId: string, limit?: number): Promise<BookingAuditRecord[]> {
    const list: BookingAuditRecord[] = [];
    for (const r of this.store.values()) {
      if (r.tenantId !== tenantId) continue;
      if (r.bookingId !== bookingId) continue;
      list.push(r);
    }
    return limit !== undefined ? list.slice(0, limit) : list;
  }

  clear(): void { this.store.clear(); this.counter = 0; }
}
