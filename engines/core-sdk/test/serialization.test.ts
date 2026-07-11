import { describe, it, expect } from 'vitest';
import {
  Ok,
  Err,
  ValidationError,
  InternalError,
  createEnvelope,
  type EventEnvelope,
} from '../src/index.js';

describe('Serialization (round-trip via JSON)', () => {
  it('Ok round-trips', () => {
    const original = Ok(42);
    const roundTrip = JSON.parse(JSON.stringify(original));
    expect(roundTrip.ok).toBe(true);
    expect(roundTrip.value).toBe(42);
  });

  it('Err round-trips (Error data only)', () => {
    const original = Err(new ValidationError('Invalid', { details: { field: 'email' } }));
    const roundTrip = JSON.parse(JSON.stringify(original));
    expect(roundTrip.ok).toBe(false);
    expect(roundTrip.error.code).toBe('PLATFORM_VALIDATION_FAILED');
    expect(roundTrip.error.message).toBe('Invalid');
    expect(roundTrip.error.details).toEqual({ field: 'email' });
  });

  it('PlatformError.toJSON + JSON.parse round-trips', () => {
    const error = new ValidationError('test', { details: { x: 1 } });
    const json = JSON.stringify(error);
    const parsed = JSON.parse(json);
    expect(parsed.code).toBe('PLATFORM_VALIDATION_FAILED');
    expect(parsed.message).toBe('test');
    expect(parsed.details).toEqual({ x: 1 });
  });

  it('InternalError safeToExpose=false → generic message after round-trip', () => {
    const error = new InternalError('DB password leaked');
    const json = JSON.stringify(error);
    const parsed = JSON.parse(json);
    expect(parsed.message).toBe('An internal error occurred');
    expect(parsed.message).not.toContain('password');
  });

  it('EventEnvelope round-trips', () => {
    const envelope: EventEnvelope<{ userId: string }> = createEnvelope({
      eventId: '01HXXXXXXXXXX',
      aggregateId: 'user-123',
      occurredAt: '2026-07-11T08:00:00.000Z',
      tenantId: 'tenant-123',
      correlationId: 'req-789',
      causationId: '',
      engine: 'identity',
      eventType: 'auth.login.success',
      schemaRef: 'auth.login.success.v1',
      payload: { userId: 'user-123' },
    });

    const json = JSON.stringify(envelope);
    const parsed = JSON.parse(json) as EventEnvelope<{ userId: string }>;

    expect(parsed.eventId).toBe('01HXXXXXXXXXX');
    expect(parsed.aggregateId).toBe('user-123');
    expect(parsed.tenantId).toBe('tenant-123');
    expect(parsed.engine).toBe('identity');
    expect(parsed.eventType).toBe('auth.login.success');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.payload.userId).toBe('user-123');
  });
});
