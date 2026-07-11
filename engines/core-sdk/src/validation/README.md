# validation/

> **zod 통합 + Result. throw 대신 ValidationError.**

---

## 목적

- zod schema + Result 통합
- 도메인 검증 (Email, Phone, Password)
- Type-Safety 보장

---

## 사용법

### 1. Schema 검증

```ts
import { z, validate } from '@platform/core-sdk/validation';

const emailSchema = z.string().email();

const result = validate(emailSchema, 'tim@example.com');
if (result.ok) {
  console.log('Valid:', result.value);
} else {
  console.error(result.error.code); // 'PLATFORM_VALIDATION_FAILED'
}
```

### 2. 도메인 검증

```ts
import { Email, Phone, Password, validate } from '@platform/core-sdk/validation';

// Email
const emailResult = validate(Email.schema(), 'tim@example.com');

// Phone (E.164)
const phoneResult = validate(Phone.schema(), '+995****5678');

// Password (정책 기반)
const passwordSchema = Password.withPolicy({
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
});
const passwordResult = validate(passwordSchema, input.password);
```

### 3. Use Case 패턴

```ts
import { z, validate, Email } from '@platform/core-sdk/validation';
import { Ok, Err, type Result } from '@platform/core-sdk/result';
import { ValidationError } from '@platform/core-sdk/errors';

const createUserSchema = z.object({
  email: Email.schema(),
  password: z.string().min(12),
  name: z.string().min(1).max(100),
});

async function createUser(input: unknown): Promise<Result<User, ValidationError>> {
  const validation = validate(createUserSchema, input);
  if (!validation.ok) return validation; // ValidationError 그대로 propagate
  return Ok(await db.createUser(validation.value));
}
```

---

## 예제

자세한 예제: [`examples/`](./examples/)

- `examples/01-basic.ts` — 기본 validate
- `examples/02-policy-password.ts` — Password 정책 기반 검증
- `examples/03-usecase.ts` — Use Case 패턴

---

## 하지 말아야 할 사용법

### ❌ try/catch with parse
```ts
try {
  const user = userSchema.parse(input);
} catch (e) {
  // zod ZodError 처리 필요
}
```

### ✅ validate (Result 반환)
```ts
const result = validate(userSchema, input);
if (!result.ok) return Err(result.error);
```

### ❌ 도메인 검증 직접
```ts
if (!email.includes('@')) throw new Error('Invalid email');
```

### ✅ Email.schema() 사용
```ts
const result = validate(Email.schema(), input.email);
```

---

**End of validation/ README**
