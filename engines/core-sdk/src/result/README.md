# result/

> **Rust 스타일 Result<T, E>. throw 최소화.**

---

## 목적

- 타입 안전한 성공/실패
- 호출자가 성공/실패를 컴파일타임에 인지
- throw는 시작점(main, route handler)에서만

---

## 사용법

### 1. 기본 사용

```ts
import { Ok, Err, type Result } from '@platform/core-sdk/result';

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return Err(new Error('Division by zero'));
  return Ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log('Result:', result.value); // 5
} else {
  console.error('Error:', result.error);
}
```

### 2. map / flatMap

```ts
import { Ok, Err, map, flatMap } from '@platform/core-sdk/result';

const r1: Result<number, Error> = Ok(5);
const r2 = map(r1, (x) => x * 2); // Ok(10)

const r3 = await flatMap(r1, async (x) => Ok(x * 3)); // Ok(15)
```

### 3. fromPromise (async)

```ts
import { fromPromise } from '@platform/core-sdk/result';

const result = await fromPromise(fetch('https://api.example.com'));
if (result.ok) {
  console.log('Data:', result.value);
} else {
  console.error('Fetch failed:', result.error);
}
```

### 4. Use Case 패턴 (사장님 확립)

```ts
import { Ok, Err, type Result } from '@platform/core-sdk/result';
import { AuthenticationError } from '@platform/core-sdk/errors';

async function loginUseCase(
  email: string,
  password: string,
): Promise<Result<Session, AuthenticationError>> {
  if (password !== 'correct') {
    return Err(new AuthenticationError('Invalid credentials'));
  }
  return Ok({ email, token: 'abc' });
}

const result = await loginUseCase('user@example.com', 'wrong');
if (result.ok) {
  console.log('Logged in:', result.value);
} else {
  // result.error는 AuthenticationError 타입
  console.error(result.error.code); // 'PLATFORM_AUTH_FAILED'
}
```

---

## 예제

자세한 예제: [`examples/`](./examples/)

- `examples/01-basic.ts` — Ok/Err/map/flatMap
- `examples/02-promise.ts` — fromPromise
- `examples/03-usecase.ts` — 실제 Use Case 패턴

---

## 하지 말아야 할 사용법

### ❌ throw 남용

```ts
// ❌
function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}

// ✅ Result 반환
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return Err(new Error('Division by zero'));
  return Ok(a / b);
}
```

### ❌ try/catch 남용

```ts
// ❌
try {
  const data = await fetchData();
  return data;
} catch (e) {
  return null;
}

// ✅ fromPromise
const result = await fromPromise(fetchData());
return result.ok ? result.value : null;
```

---

**End of result/ README**
