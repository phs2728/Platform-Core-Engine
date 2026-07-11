# Result<T, E> 표준

> **사장님 Platform Owner 확립 (2026-07-11)**
> **Rust 스타일 Result<T, E>. Ok/Err. throw 최소화.**

**Version**: v1.0
**Status**: 🔒 FROZEN (헌법 §C-13 + §C-19, 변경은 ADR)
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)
**Companion**: [Platform Error Model](./Platform_Error_Model.md), [Core SDK PRD/TRD](../../engines/core-sdk/docs/)

---

## 0. 목적

> **throw를 최소화. 모든 실패는 명시적 Result 타입으로.**
> 호출자가 성공/실패를 컴파일타임에 알 수 있음.

```
❌ throw new Error("...")  // 호출자가 catch 잊으면 무방비

✅ return Result.err(new ValidationError(...))  // 타입으로 강제
```

---

## 1. Result<T, E> 정의 (Rust 스타일)

```typescript
/**
 * Result<T, E> — Type-Safe Success/Failure
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "Rust 스타일을 추천합니다. throw를 최소화하세요."
 *
 * 사장님 헌법 §C-19 (Working Software Validates Design):
 * 이 표준은 Core SDK에서 검증. Identity Engine에서 사용.
 */

export type Result<T, E extends PlatformError = PlatformError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// Type Guard (편의)
export const Ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

export const Err = <E extends PlatformError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});
```

---

## 2. Result 유틸리티 (Method Chaining)

```typescript
/**
 * Result.map — 성공 시에만 함수 적용
 */
export function map<T, U, E extends PlatformError>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return result.ok ? Ok(fn(result.value)) : result;
}

/**
 * Result.mapErr — 실패 시에만 에러 변환
 */
export function mapErr<T, E extends PlatformError, F extends PlatformError>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  return result.ok ? result : Err(fn(result.error));
}

/**
 * Result.flatMap (Promise) — 비동기 체이닝
 */
export async function flatMap<T, U, E extends PlatformError>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> {
  return result.ok ? await fn(result.value) : result;
}

/**
 * Result.andThen (동기) — 동기 체이닝
 */
export function andThen<T, U, E extends PlatformError>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

/**
 * Result.unwrap — 성공 값 추출 (실패 시 throw — 주의!)
 *
 * 사장님: "throw 최소화" 라도, 시작점(main/app)에서는 사용 가능.
 */
export function unwrap<T, E extends PlatformError>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;  // 시작점에서만 사용
}

/**
 * Result.unwrapOr — 성공 값 또는 default
 */
export function unwrapOr<T, E extends PlatformError>(
  result: Result<T, E>,
  defaultValue: T,
): T {
  return result.ok ? result.value : defaultValue;
}

/**
 * Result.fromPromise — Promise를 Result로 변환
 */
export async function fromPromise<T>(
  promise: Promise<T>,
): Promise<Result<T, InternalError>> {
  try {
    return Ok(await promise);
  } catch (e) {
    if (e instanceof PlatformError) {
      return Err(e);
    }
    return Err(new InternalError((e as Error).message));
  }
}

/**
 * Result.fromTry — 동기 함수를 Result로 변환
 */
export function fromTry<T>(fn: () => T): Result<T, InternalError> {
  try {
    return Ok(fn());
  } catch (e) {
    if (e instanceof PlatformError) {
      return Err(e);
    }
    return Err(new InternalError((e as Error).message));
  }
}
```

---

## 3. Use Case 패턴

```typescript
// ❌ 기존 — throw 기반
async function loginUseCase(input: LoginInput): Promise<Session> {
  const user = await findUser(input.email);
  if (!user) throw new AuthenticationError();  // 잊어버리면 무방비
  const ok = await verifyPassword(user, input.password);
  if (!ok) throw new AuthenticationError();
  return await createSession(user);
}

// ✅ 표준 — Result 기반
async function loginUseCase(
  input: LoginInput,
  deps: UseCaseDeps,
): Promise<Result<Session, AuthenticationError>> {
  const userResult = await findUser(input.email);
  if (!userResult.ok) return Err(new AuthenticationError('invalid_credentials'));
  const user = userResult.value;

  const verifyResult = await verifyPassword(user, input.password);
  if (!verifyResult.ok) return Err(new AuthenticationError('invalid_credentials'));

  return Ok(await createSession(user));
}
```

---

## 4. 호출자 (Engine Use Case 호출)

```typescript
// Use Case 호출
const result = await loginUseCase(input, deps);

if (result.ok) {
  // 성공 — 타입 안전
  const session = result.value;
  return { status: 200, body: { sessionToken: session.token } };
} else {
  // 실패 — 타입 안전
  const err = result.error;  // AuthenticationError 타입
  return { status: err.httpStatus, body: err.toJSON() };
}
```

---

## 5. Result vs Exception 정책

| 상황 | Result | Exception |
|---|---|---|
| **비즈니스 실패** (검증, 인증, 권한) | ✅ | ❌ |
| **시스템 실패** (DB 연결, 외부 API) | ⚠️ Result로 wrap | ⚠️ Allowed |
| **프로그래밍 오류** (TypeError, AssertionError) | ❌ | ✅ (즉시 crash) |
| **시작점** (main, route handler) | unwrap() OK | ⚠️ |

---

## 6. 사장님 헌법 준수

- **C-19 Working Software**: 이 표준은 Sprint 2B에서 검증
- **§C-17 Stop Designing Rule**: Result API 변경 시 ADR 필수

---

## 7. 재사용 검증 (사장님 핵심 질문)

> "이 구현이 다음 10개의 엔진에서도 그대로 재사용될 수 있는가?"

✅ **YES** — Result<T, E>는 모든 Engine의 Use Case에서 사용:

```typescript
// Identity Engine
Result<Session, AuthenticationError>
Result<User, NotFoundError>
Result<void, ValidationError>

// Policy Engine
Result<T, NotFoundError | ValidationError>
Result<void, ConflictError>

// Notification Engine
Result<MessageId, NotFoundError | ValidationError>
```

---

**End of Result<T, E> Standard v1.0**

> 사장님 Platform Owner 확립: "throw를 최소화하세요."