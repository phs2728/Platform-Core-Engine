/**
 * logger/examples/01-basic.ts
 */

import { createLogger } from '../index.js';

// Engine은 base logger에, 나머지 Context는 호출 시점에
const baseLogger = createLogger({ engine: 'identity' });

// 1. Info — 호출 시점에 engine 포함
baseLogger.info('User login', {
  engine: 'identity',
  tenantId: 'tenant-123',
  userId: 'user-456',
  requestId: 'req-789',
});

// 2. Warn
baseLogger.warn('Slow query detected', {
  engine: 'identity',
  tenantId: 'tenant-123',
  duration_ms: 1500,
});

// 3. Error
const error = new Error('Database connection failed');
baseLogger.error('DB error', error, {
  engine: 'identity',
  tenantId: 'tenant-123',
});

// 4. Debug
baseLogger.debug('Cache hit', {
  engine: 'identity',
  tenantId: 'tenant-123',
  key: 'user:123',
});
