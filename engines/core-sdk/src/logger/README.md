# logger/

> **Structured Logging. 객체 기본. 4개 필수 Context.**

---

## 목적

- 로그 = 객체 (문자열 X)
- 4개 필수 Context: `tenantId`, `requestId`, `userId`, `engine`
- PII 자동 마스킹
- `child()` 패턴으로 Context 상속

---

## 사용법

### 1. 기본 사용

```ts
import { createLogger } from '@platform/core-sdk/logger';

const logger = createLogger({ engine: 'identity' });

logger.info('User login', {
  tenantId: 'tenant-123',
  userId: 'user-456',
  requestId: 'req-789',
  // 추가 필드 가능
  duration_ms: 120,
});
```

### 2. child() 패턴

```ts
const baseLogger = createLogger({ engine: 'identity' });
const tenantLogger = baseLogger.child({ tenantId: 'tenant-123' });
const requestLogger = tenantLogger.child({ requestId: 'req-789' });

requestLogger.info('login'); // → engine + tenantId + requestId 자동 포함
```

### 3. Error 로깅

```ts
try {
  await db.query();
} catch (e) {
  logger.error('DB query failed', e as Error, {
    tenantId: 'tenant-123',
    engine: 'identity',
  });
}
```

---

## 예제

자세한 예제: [`examples/`](./examples/)

- `examples/01-basic.ts` — 기본 info/warn/error
- `examples/02-child.ts` — child() 패턴
- `examples/03-pii-masking.ts` — PII 자동 마스킹

---

## PII 자동 마스킹 (헌법 §C-15)

| 필드 | 마스킹 결과 |
|---|---|
| `email: "tim@example.com"` | `t***@example.com` |
| `phone: "+99512345678"` | `+9****78` |
| `password: "secret"` | `<redacted>` |
| `token: "abc..."` | `<redacted>` |
| `apiKey: "key..."` | `<redacted>` |

자동 마스킹 — 명시적 호출 불필요.

---

## 하지 말아야 할 사용법

### ❌ 문자열 로그
```ts
logger.info(`User ${userId} logged in`); // 금지
```

### ✅ 객체 로그
```ts
logger.info('User logged in', { userId, tenantId });
```

### ❌ PII 평문
```ts
logger.info('login', { password: 'secret123' }); // 자동 마스킹됨
```

### ✅ PII 안전
```ts
logger.info('login', { tenantId }); // PII 없음
```

---

**End of logger/ README**
