# errors/

> **Platform 단일 Error 계층. 모든 Engine이 사용.**

---

## 목적

- PlatformError 단일 Base Class
- 6개 표준 Error (Validation, Authentication, Authorization, Conflict, NotFound, Internal)
- 5개 필수 속성 (code, message, details, cause, safeToExpose)

---

## 사용법

### 1. 기본 사용 (Engine Use Case)

```ts
import { ValidationError, NotFoundError } from '@platform/core-sdk/errors';

async function getUser(id: string) {
  if (!id) {
    throw new ValidationError('User ID required', {
      details: { field: 'id' },
    });
  }

  const user = await db.findUser(id);
  if (!user) {
    throw new NotFoundError('User not found', {
      details: { resource: 'user', id },
    });
  }

  return user;
}
```

### 2. cause 사용 (연쇄 Error)

```ts
import { InternalError } from '@platform/core-sdk/errors';

try {
  await db.query('SELECT 1');
} catch (e) {
  throw new InternalError('Database query failed', {
    cause: e as Error,
    details: { query: 'SELECT 1' },
  });
}
```

### 3. safeToExpose 의미

| safeToExpose | 클라이언트 응답 |
|---|---|
| `true` | `code`, `message`, `details` 노출 |
| `false` | generic "Internal server error" (stack trace ❌) |

- `ValidationError`, `AuthenticationError`, `AuthorizationError`, `ConflictError`, `NotFoundError` → **true**
- `InternalError` → **false** (system error)

---

## 예제

자세한 예제: [`examples/`](./examples/)

- `examples/01-basic-usage.ts` — 기본 throw
- `examples/02-cause-chaining.ts` — cause 연쇄
- `examples/03-serialization.ts` — toJSON

---

## 하지 말아야 할 사용법

### ❌ throw 문자열
```ts
throw 'User not found'; // 금지 — 타입 안전 X
```

### ✅ throw Error 인스턴스
```ts
throw new NotFoundError('User not found'); // 정상
```

### ❌ Engine-specific Error 만들기
```ts
class BookingError extends PlatformError { ... } // 금지 — 6개 표준 사용
```

### ❌ safeToExpose=false인 InternalError로 클라이언트 정보 노출
```ts
throw new InternalError('DB password is wrong'); // 금지 — DB 정보 누출
```

---

## API Reference

| Class | code | httpStatus | safeToExpose |
|---|---|---|---|
| `ValidationError` | `PLATFORM_VALIDATION_FAILED` | 400 | true |
| `AuthenticationError` | `PLATFORM_AUTH_FAILED` | 401 | true |
| `AuthorizationError` | `PLATFORM_AUTHZ_FAILED` | 403 | true |
| `ConflictError` | `PLATFORM_CONFLICT` | 409 | true |
| `NotFoundError` | `PLATFORM_NOT_FOUND` | 404 | true |
| `InternalError` | `PLATFORM_INTERNAL_ERROR` | 500 | **false** |

---

**End of errors/ README**

> 사장님 Platform Owner 확립: "Core SDK를 삭제하면 Platform 전체가 깨지는가? YES."