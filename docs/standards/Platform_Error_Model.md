# Platform Error Model

> **사장님 Platform Owner 확립 (2026-07-11)**
> **모든 Engine이 공유하는 Error 계층. 다르면 Platform이 망가진다.**

**Version**: v1.0
**Status**: 🔒 FROZEN (헌법 §C-13 + §C-19, 변경은 ADR)
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)
**Companion**: [Core SDK PRD/TRD](../../engines/core-sdk/docs/)

---

## 0. 목적

> **모든 Engine이 동일한 Error 계층을 사용한다.**
> PlatformError → ValidationError, AuthenticationError, AuthorizationError, ConflictError, NotFoundError, InternalError.

Platform이 망가지지 않으려면 **Error 표준이 일관**되어야 합니다.

```
❌ 금지 — Engine마다 다른 Error 형태
PolicyError
IdentityError
BookingError  ← 각자 다른 모양

✅ 표준 — PlatformError 단일 계층
PlatformError
├── ValidationError
├── AuthenticationError
├── AuthorizationError
├── ConflictError
├── NotFoundError
└── InternalError
```

---

## 1. PlatformError (Abstract Base)

```typescript
/**
 * Platform Error — 모든 Engine이 공유하는 단일 Base Class
 *
 * 헌법 §C-15 (Zero Business Logic in DB) 적용:
 * - code, httpStatus, safeToExpose 명확화
 * - PII 평문 노출 금지
 */
export abstract class PlatformError extends Error {
  /** Error Code (e.g., 'PLATFORM_VALIDATION_FAILED') */
  abstract readonly code: string;

  /** HTTP Status Code (호스트가 응답 변환 시 사용) */
  abstract readonly httpStatus: number;

  /** 클라이언트에 노출 가능 여부 (false면 generic 500) */
  readonly safeToExpose: boolean;

  /** 디버깅용 추가 정보 (PII 금지) */
  readonly context?: Record<string, unknown>;

  /** Error 카테고리 (Engine 식별 + 분류) */
  readonly category: ErrorCategory;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
  }

  /** 직렬화 (응답용) */
  toJSON(): ErrorResponse {
    return {
      code: this.code,
      message: this.safeToExpose ? this.message : 'An internal error occurred',
      category: this.category,
      ...(this.safeToExpose && this.context ? { context: this.context } : {}),
    };
  }
}

export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'conflict'
  | 'not_found'
  | 'internal';

export interface ErrorResponse {
  code: string;
  message: string;
  category: ErrorCategory;
  context?: Record<string, unknown>;
}
```

---

## 2. 6개 표준 Error

### 2.1 ValidationError

| 필드 | 값 |
|---|---|
| **code** | `PLATFORM_VALIDATION_FAILED` |
| **httpStatus** | 400 |
| **safeToExpose** | true |
| **category** | `validation` |
| **용도** | 입력 검증 실패, zod 스키마 위반, 비즈니스 규칙 위반 |

```typescript
export class ValidationError extends PlatformError {
  readonly code = 'PLATFORM_VALIDATION_FAILED';
  readonly httpStatus = 400;
  readonly safeToExpose = true;
  readonly category = 'validation' as const;

  constructor(
    message: string = 'Validation failed',
    public readonly violations?: unknown,
    context?: Record<string, unknown>,
  ) {
    super(message, { ...context, violations });
  }
}
```

### 2.2 AuthenticationError

| 필드 | 값 |
|---|---|
| **code** | `PLATFORM_AUTH_FAILED` |
| **httpStatus** | 401 |
| **safeToExpose** | true |
| **category** | `authentication` |
| **용도** | 신원 확인 실패, 자격증명 불일치, 만료된 토큰 |

```typescript
export class AuthenticationError extends PlatformError {
  readonly code = 'PLATFORM_AUTH_FAILED';
  readonly httpStatus = 401;
  readonly safeToExpose = true;
  readonly category = 'authentication' as const;

  constructor(
    message: string = 'Authentication failed',
    public readonly reason?: AuthFailureReason,
    context?: Record<string, unknown>,
  ) {
    super(message, { ...context, reason });
  }
}

export type AuthFailureReason =
  | 'invalid_credentials'
  | 'token_expired'
  | 'token_invalid'
  | 'account_locked'
  | 'account_disabled'
  | 'mfa_required'
  | 'mfa_failed';
```

### 2.3 AuthorizationError

| 필드 | 값 |
|---|---|
| **code** | `PLATFORM_AUTHZ_FAILED` |
| **httpStatus** | 403 |
| **safeToExpose** | true |
| **category** | `authorization` |
| **용도** | 권한 부족, RBAC 실패, Access Denied |

```typescript
export class AuthorizationError extends PlatformError {
  readonly code = 'PLATFORM_AUTHZ_FAILED';
  readonly httpStatus = 403;
  readonly safeToExpose = true;
  readonly category = 'authorization' as const;

  constructor(
    message: string = 'Access denied',
    public readonly requiredPermission?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, { ...context, requiredPermission });
  }
}
```

### 2.4 ConflictError

| 필드 | 값 |
|---|---|
| **code** | `PLATFORM_CONFLICT` |
| **httpStatus** | 409 |
| **safeToExpose** | true |
| **category** | `conflict` |
| **용도** | Optimistic locking 실패, Unique 제약 위반, 동시성 충돌 |

```typescript
export class ConflictError extends PlatformError {
  readonly code = 'PLATFORM_CONFLICT';
  readonly httpStatus = 409;
  readonly safeToExpose = true;
  readonly category = 'conflict' as const;

  constructor(
    message: string = 'Resource conflict',
    public readonly resource?: string,
    public readonly resourceId?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, { ...context, resource, resourceId });
  }
}
```

### 2.5 NotFoundError

| 필드 | 값 |
|---|---|
| **code** | `PLATFORM_NOT_FOUND` |
| **httpStatus** | 404 |
| **safeToExpose** | true |
| **category** | `not_found` |
| **용도** | 리소스 없음, Tenant 없음, User 없음 |

```typescript
export class NotFoundError extends PlatformError {
  readonly code = 'PLATFORM_NOT_FOUND';
  readonly httpStatus = 404;
  readonly safeToExpose = true;
  readonly category = 'not_found' as const;

  constructor(
    public readonly resource: string,
    public readonly id?: string,
    context?: Record<string, unknown>,
  ) {
    super(`${resource} not found${id ? `: ${id}` : ''}`, context);
  }
}
```

### 2.6 InternalError

| 필드 | 값 |
|---|---|
| **code** | `PLATFORM_INTERNAL_ERROR` |
| **httpStatus** | 500 |
| **safeToExpose** | false |
| **category** | `internal` |
| **용도** | 알 수 없는 내부 오류, 시스템 오류, 외부 의존성 실패 |

```typescript
export class InternalError extends PlatformError {
  readonly code = 'PLATFORM_INTERNAL_ERROR';
  readonly httpStatus = 500;
  readonly safeToExpose = false;  // ← 중요: 클라이언트에 상세 노출 안 함
  readonly category = 'internal' as const;

  constructor(
    message: string = 'Internal server error',
    context?: Record<string, unknown>,
  ) {
    super(message, context);
  }
}
```

---

## 3. Engine-Specific Error Mapping (헌법 §C-19)

각 Engine은 자신의 Error를 **PlatformError 계층에 매핑**합니다.

### 3.1 Identity Engine

```typescript
// 기존 IdentityError → PlatformError 매핑
// PolicyNotFoundError → NotFoundError
// AuthenticationFailedError → AuthenticationError
// AccountLockedError → AuthenticationError (reason: 'account_locked')
```

### 3.2 Policy Engine

```typescript
// PolicyNotFoundError → NotFoundError
// PolicySchemaError → ValidationError
// PolicyConflictError → ConflictError
// PolicyInternalError → InternalError
```

### 3.3 Booking Engine (Phase 5)

```typescript
// BookingNotFoundError → NotFoundError
// BookingConflictError → ConflictError
// PaymentRequiredError → AuthorizationError (또는 별도)
// ...
```

> **사장님 추가 원칙**: "구현 중 떠오른 아이디어는 RFC 후보 또는 백로그로 기록."
> → 위 매핑은 **Sprint 2B (Core SDK) 후속 또는 Phase 2+에서 실제 구현**.

---

## 4. 사장님 헌법 준수

- **C-15 Zero Business Logic**: `safeToExpose=false` (InternalError) 시 stack trace 노출 안 함
- **C-19 Working Software**: Sprint 2B에서 검증
- **§C-17 Stop Designing Rule**: 새 Error 추가 시 ADR 필수

---

## 5. 재사용 검증 (사장님 핵심 질문)

> "**이 구현이 다음 10개의 엔진에서도 그대로 재사용될 수 있는가?**"

✅ **YES** — 6개 표준 Error는 모든 Engine이 사용:
- Identity: ValidationError, AuthenticationError, NotFoundError, ConflictError
- Policy: ValidationError, NotFoundError, ConflictError, InternalError
- Notification: ValidationError, NotFoundError (사용자 없음)
- Booking: ValidationError, NotFoundError, ConflictError, AuthorizationError
- Payment: ValidationError, NotFoundError, ConflictError, InternalError
- (모든 Engine): InternalError fallback

---

**End of Platform Error Model v1.0**

> 사장님 Platform Owner 확립: "Core SDK에서 반드시 이 계층을 먼저 정의하세요."