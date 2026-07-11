import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  InternalError,
  PlatformError,
} from '../src/errors/index.js';

describe('PlatformError', () => {
  it('5개 필수 속성을 가진다 (code, message, details, cause, safeToExpose)', () => {
    const error = new ValidationError('test message', {
      details: { field: 'email' },
      cause: new Error('inner'),
    });
    expect(error.code).toBe('PLATFORM_VALIDATION_FAILED');
    expect(error.message).toBe('test message');
    expect(error.details).toEqual({ field: 'email' });
    expect(error.cause).toBeInstanceOf(Error);
    expect(error.safeToExpose).toBe(true);
  });

  it('toJSON은 safeToExpose에 따라 다른 응답', () => {
    const safe = new ValidationError('user message');
    const unsafe = new InternalError('internal db password');
    expect(safe.toJSON()).toEqual({ code: 'PLATFORM_VALIDATION_FAILED', message: 'user message' });
    expect(unsafe.toJSON().message).toBe('An internal error occurred');
  });
});

describe('6개 표준 Error', () => {
  it('ValidationError — 400, safeToExpose=true', () => {
    const e = new ValidationError();
    expect(e.httpStatus).toBe(400);
    expect(e.safeToExpose).toBe(true);
    expect(e.code).toBe('PLATFORM_VALIDATION_FAILED');
  });

  it('AuthenticationError — 401', () => {
    const e = new AuthenticationError();
    expect(e.httpStatus).toBe(401);
    expect(e.code).toBe('PLATFORM_AUTH_FAILED');
  });

  it('AuthorizationError — 403', () => {
    const e = new AuthorizationError();
    expect(e.httpStatus).toBe(403);
    expect(e.code).toBe('PLATFORM_AUTHZ_FAILED');
  });

  it('ConflictError — 409', () => {
    const e = new ConflictError();
    expect(e.httpStatus).toBe(409);
    expect(e.code).toBe('PLATFORM_CONFLICT');
  });

  it('NotFoundError — 404', () => {
    const e = new NotFoundError();
    expect(e.httpStatus).toBe(404);
    expect(e.code).toBe('PLATFORM_NOT_FOUND');
  });

  it('InternalError — 500, safeToExpose=false', () => {
    const e = new InternalError();
    expect(e.httpStatus).toBe(500);
    expect(e.safeToExpose).toBe(false);
    expect(e.code).toBe('PLATFORM_INTERNAL_ERROR');
  });
});
