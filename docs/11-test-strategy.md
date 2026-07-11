# Identity Engine — Test Strategy

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)

---

## 0. 문서 위치

이 문서는 **Identity Engine의 모든 코드가 어떻게 검증되는가**를 정의합니다.

- **테스트 피라미드**: Unit > Integration > E2E > Security > Performance
- **커버리지 목표**: 라인 90%+, 브랜치 85%+
- **CI 게이트**: 모든 PR은 lint + typecheck + test 통과 필수

---

## 1. 테스트 원칙

### 1.1 사장님 확립

> 사장님 확립: "테스트 코드 없이 종료 금지"

```
1. 모든 Use Case는 최소 1개의 통합 테스트 통과
2. 모든 Repository는 최소 1개의 통합 테스트 통과 (실제 DB)
3. 모든 Provider는 단위 + 통합 테스트
4. 모든 보안 위협은 명시적인 회귀 테스트
5. 회귀 버그는 반드시 테스트로 막는다
```

### 1.2 추가 원칙

| 원칙 | 설명 |
|---|---|
| **Deterministic** | 같은 입력 → 같은 출력. 시간/난수/IO는 주입. |
| **Independent** | 테스트 간 의존성 없음. 순서 무관. |
| **Fast** | 단위 테스트 100ms 이내, 통합 테스트 1초 이내. |
| **No real secrets** | 테스트에서 실제 OAuth/SMS API 호출 금지 (Mock) |
| **No real network** | HTTP Client는 mock. 단, E2E OAuth flow만 mock server. |

---

## 2. 테스트 피라미드

```
              ╱╲
             ╱  ╲         Performance Test (선택)
            ╱ 10 ╲        k6 / autocannon
           ╱──────╲
          ╱        ╲
         ╱  E2E     ╲      End-to-End
        ╱   (5%)    ╲      실제 Postgres + Redis
       ╱────────────╲
      ╱              ╲
     ╱  Integration   ╲   통합 (Use Case + Repo + Mock Infra)
    ╱      (25%)       ╲  실제 Postgres or Testcontainers
   ╱────────────────────╲
  ╱                      ╲
 ╱    Unit (70%)           ╲  단위 (순수 함수 + Crypto)
╱──────────────────────────╲
```

### 2.1 분포

| 종류 | 비율 | 위치 | 의존성 |
|---|---|---|---|
| Unit | 70% | `test/unit/` | 없음 (또는 DI mock) |
| Integration | 25% | `test/integration/` | Postgres (Testcontainers), Redis Mock |
| E2E | 5% | `test/e2e/` | 실제 인프라 |
| Security | 모든 단계 | `test/security/` | 위협별 |
| Performance | 선택 | `test/perf/` | k6 |

---

## 3. 테스트 도구

| 도구 | 용도 |
|---|---|
| **Vitest** | 테스트 러너 (단위 + 통합) |
| **@vitest/coverage-v8** | 커버리지 측정 |
| **Testcontainers** | 실제 Postgres 인스턴스 (통합 테스트) |
| **ioredis-mock** | Redis mock (통합 테스트) |
| **nock** 또는 **MSW** | HTTP Client mock (외부 OAuth API mock) |
| **Playwright** | (선택) 호스트 통합 시 E2E |
| **k6** | (선택) 부하 테스트 |

---

## 4. 단위 테스트 (Unit)

### 4.1 대상

- `src/domain/**` (순수 함수)
- `src/crypto/**` (해시, 토큰 생성 — 결정적)
- `src/policy/**` (정책 평가)
- `src/event/**` (이벤트 envelope 생성)

### 4.2 예시

```typescript
// test/unit/domain/password/policy.test.ts
import { describe, it, expect } from 'vitest';
import { evaluatePassword } from '@/domain/password/policy';

describe('evaluatePassword', () => {
  const policy = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
  };

  it.each([
    ['short', 'Aa1!aaaa', { kind: 'too_short', minLength: 12 }],
    ['no-upper', 'aa1!aaaaaaaa', { kind: 'no_uppercase' }],
    ['no-lower', 'AA1!AAAAAAAA', { kind: 'no_lowercase' }],
    ['no-number', 'AAa!AAAAAAAA', { kind: 'no_number' }],
    ['no-special', 'AAa1aaaaaaaa', { kind: 'no_special' }],
    ['valid', 'Valid1!Passwd', null],
  ])('returns %s for %s input', (_label, input, expected) => {
    expect(evaluatePassword(input, policy)).toEqual(expected);
  });
});
```

```typescript
// test/unit/crypto/password.crypto.test.ts
describe('PasswordCrypto', () => {
  it('hashes and verifies a password', async () => {
    const crypto = createPasswordCrypto({ memory: 64 * 1024, iterations: 3 });
    const hash = await crypto.hash('Valid1!Passwd');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await crypto.verify(hash, 'Valid1!Passwd')).toBe(true);
    expect(await crypto.verify(hash, 'wrong')).toBe(false);
  });

  it('produces different hashes for same input (salt)', async () => {
    const crypto = createPasswordCrypto({ memory: 1024, iterations: 1 });  // test-only
    const a = await crypto.hash('test');
    const b = await crypto.hash('test');
    expect(a).not.toBe(b);
  });
});
```

---

## 5. 통합 테스트 (Integration)

### 5.1 대상

- `src/usecase/**` (모든 비즈니스 흐름)
- `src/repository/**` (실제 DB)
- `src/provider/**` (Mock OAuth Server)

### 5.2 환경

```
Postgres: Testcontainers (각 테스트마다 깨끗한 DB)
Redis:    ioredis-mock (또는 Testcontainers)
KMS:      in-memory mock (AES-256-GCM with static key)
Email:    capture (테스트용 발송 캡처)
SMS:      capture
HTTP:     MSW (Mock Service Worker) 또는 nock
```

### 5.3 예시 — Login Use Case

```typescript
// test/integration/auth/login.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestEngine, setupTestDb, teardownTestDb, createTestUser } from '../helpers';

describe('LoginUseCase', () => {
  let engine: IdentityEngine;
  let db: TestDatabase;

  beforeEach(async () => {
    db = await setupTestDb();
    engine = createTestEngine({ db, cache: createMockCache() });
    await createTestUser(db, {
      email: 'test@example.com',
      password: 'Valid1!Passwd',
      verified: true,
    });
  });

  afterEach(async () => {
    await teardownTestDb(db);
  });

  it('logs in with valid credentials', async () => {
    const result = await engine.login({
      tenantId: db.tenantId,
      identifier: 'test@example.com',
      password: 'Valid1!Passwd',
    });
    expect(result.sessionToken).toMatch(/^sts_/);
    expect(result.user.id).toBeDefined();
    expect(result.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects invalid password', async () => {
    await expect(
      engine.login({
        tenantId: db.tenantId,
        identifier: 'test@example.com',
        password: 'wrong',
      })
    ).rejects.toThrow(AuthenticationFailedError);
  });

  it('locks account after max failures', async () => {
    const policy = await db.getSecurityPolicy();
    for (let i = 0; i < policy.loginMaxFailures; i++) {
      await expect(
        engine.login({ tenantId: db.tenantId, identifier: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow(AuthenticationFailedError);
    }
    // Next attempt → AccountLockedError
    await expect(
      engine.login({ tenantId: db.tenantId, identifier: 'test@example.com', password: 'Valid1!Passwd' })
    ).rejects.toThrow(AccountLockedError);
  });

  it('emits auth.login.success event', async () => {
    const events: SystemEvent[] = [];
    engine.deps.events.on('*', async (e) => { events.push(e); });
    await engine.login({
      tenantId: db.tenantId,
      identifier: 'test@example.com',
      password: 'Valid1!Passwd',
    });
    expect(events.some(e => e.eventType === 'auth.login.success')).toBe(true);
  });

  it('emits auth.login.failure with reason', async () => {
    const events: SystemEvent[] = [];
    engine.deps.events.on('*', async (e) => { events.push(e); });
    try {
      await engine.login({ tenantId: db.tenantId, identifier: 'test@example.com', password: 'wrong' });
    } catch {}
    const failureEvent = events.find(e => e.eventType === 'auth.login.failure');
    expect(failureEvent).toBeDefined();
    expect((failureEvent?.payload as any).reason).toBe('invalid_credentials');
  });

  it('rate limits after threshold', async () => {
    const policy = await db.getSecurityPolicy();
    for (let i = 0; i < policy.rateLimitPerIPMax; i++) {
      try {
        await engine.login({ tenantId: db.tenantId, identifier: 'test@example.com', password: 'wrong', ipAddress: '1.2.3.4' });
      } catch {}
    }
    await expect(
      engine.login({ tenantId: db.tenantId, identifier: 'test@example.com', password: 'Valid1!Passwd', ipAddress: '1.2.3.4' })
    ).rejects.toThrow(RateLimitedError);
  });
});
```

### 5.4 예시 — Multi-Tenant 격리

```typescript
// test/integration/multi-tenant.test.ts
it('does not allow cross-tenant access', async () => {
  const tenantA = await createTestTenant('A');
  const tenantB = await createTestTenant('B');
  await createTestUser(tenantA, { email: 'a@example.com', password: 'Valid1!Passwd' });
  // Same email NOT created in tenant B

  // Login as tenant B with same email → should NOT find user
  await expect(
    engine.login({ tenantId: tenantB.id, identifier: 'a@example.com', password: 'Valid1!Passwd' })
  ).rejects.toThrow(AuthenticationFailedError);

  // Login as tenant A → success
  const result = await engine.login({ tenantId: tenantA.id, identifier: 'a@example.com', password: 'Valid1!Passwd' });
  expect(result.user.id).toBeDefined();
});
```

---

## 6. End-to-End 테스트 (E2E)

### 6.1 대상

- 전체 흐름 (가입 → 이메일 인증 → 로그인 → 2FA → 로그아웃)
- OAuth 전체 흐름 (initiate → 콜백 → 세션 생성)
- Admin Console 흐름

### 6.2 환경

```
Postgres: 실제 (Docker Compose)
Redis: 실제
KMS: LocalStack (또는 mock KMS)
Email: MailHog (캡처 + 검증)
SMS: mock
OAuth: Mock OAuth Server (nock + 커스텀 handler)
```

### 6.3 예시 — Full Registration Flow

```typescript
// test/e2e/full-flow.test.ts
it('user can register, verify email, and log in', async () => {
  // 1. Register
  const reg = await engine.register({
    tenantId,
    identifier: { type: 'email', value: 'new@example.com' },
    password: 'Valid1!Passwd',
  });
  expect(reg.requiresVerification).toContain('email');
  expect(reg.sessionToken).toBeDefined();  // 즉시 세션 (Tenant 정책 따라 다름)

  // 2. Email verification code captured
  const email = mailhog.getLastEmail('new@example.com');
  const code = extractCode(email.body);
  expect(code).toMatch(/^\d{6}$/);

  // 3. Verify
  await engine.verify.email({ tenantId, email: 'new@example.com', code });

  // 4. Logout
  await engine.logout({ sessionToken: reg.sessionToken });

  // 5. Re-login
  const login = await engine.login({ tenantId, identifier: 'new@example.com', password: 'Valid1!Passwd' });
  expect(login.user.id).toBe(reg.user.id);
});
```

---

## 7. 보안 테스트 (Security)

### 7.1 위협 모델

| 위협 | 시나리오 | 테스트 |
|---|---|---|
| **SQL Injection** | Login input에 SQL 구문 삽입 | `injection.test.ts` |
| **NoSQL Injection** | (해당 없음 — Postgres만) | N/A |
| **XSS** | Email 필드에 `<script>` | `xss.test.ts` |
| **CSRF** | OAuth callback에 외부 사이트 요청 | `csrf.test.ts` |
| **Account Enumeration** | 존재하는/존재하지 않는 email 구분 | `enumeration.test.ts` |
| **Brute Force** | 짧은 시간에 다수 비밀번호 시도 | `brute-force.test.ts` |
| **Timing Attack** | Argon2id 시간이 노출되는가 | `timing-attack.test.ts` |
| **Session Hijacking** | 토큰 가로채기 (X-Forwarded-For 위조) | `session-hijack.test.ts` |
| **JWT Forge** | 임의 JWT 위조 시도 | `jwt-forge.test.ts` |
| **Password Reuse** | 비밀번호 이력 검사 | `password-reuse.test.ts` |
| **OAuth State Bypass** | state 없이 callback 호출 | `oauth-state-bypass.test.ts` |
| **Replay Attack** | Verification code 재사용 | `replay-attack.test.ts` |
| **Rate Limit Bypass** | IP 우회 (X-Forwarded-For 헤더) | `rate-limit-bypass.test.ts` |
| **Tenant Confusion** | 다른 tenant의 user에 접근 | `tenant-confusion.test.ts` |
| **Audit Log Tampering** | hash chain 변조 감지 | `audit-tamper.test.ts` |

### 7.2 SQL Injection 테스트

```typescript
// test/security/injection.test.ts
it('login is not vulnerable to SQL injection', async () => {
  const injections = [
    "' OR '1'='1",
    "admin'--",
    "'; DROP TABLE users; --",
    "\\'; DROP TABLE users; --",
  ];
  for (const inj of injections) {
    await expect(
      engine.login({ tenantId, identifier: inj, password: 'anything' })
    ).rejects.toThrow(AuthenticationFailedError);  // or ValidationError, NOT success
  }
  // Verify tables still exist
  const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'users'");
  expect(tables.length).toBeGreaterThan(0);
});
```

### 7.3 Account Enumeration 테스트

```typescript
// test/security/enumeration.test.ts
it('password reset does not leak user existence via timing', async () => {
  await createTestUser(tenantId, { email: 'exists@example.com' });

  const t1 = Date.now();
  await engine.password.reset.request({ tenantId, identifier: { type: 'email', value: 'exists@example.com' } });
  const existsTime = Date.now() - t1;

  const t2 = Date.now();
  await engine.password.reset.request({ tenantId, identifier: { type: 'email', value: 'notfound@example.com' } });
  const notFoundTime = Date.now() - t2;

  // 시간 차이 100ms 이내 ([D-CONFIG Scalability](./15-identity-decisions.md#11-configuration-policy) 참조)
  expect(Math.abs(existsTime - notFoundTime)).toBeLessThan(100);
});
```

### 7.4 Audit Log Tampering 테스트

```typescript
// test/security/audit-tamper.test.ts
it('detects audit log hash chain tampering', async () => {
  await engine.login({ tenantId, identifier: 'test@example.com', password: 'Valid1!Passwd' });
  const logs = await db.query('SELECT * FROM audit_logs ORDER BY created_at ASC LIMIT 5');

  // 정상 검증
  expect(verifyHashChain(logs)).toBe(true);

  // 임의 수정
  await db.query('UPDATE audit_logs SET reason = $1 WHERE id = $2', ['hacked', logs[0].id]);
  // (실제로는 append-only 트리거가 막지만, 트리거 disable 가정)

  // 검증 실패 감지
  expect(verifyHashChain(logs)).toBe(false);  // 또는 트리거가 throw
});
```

### 7.5 Rate Limit Bypass 테스트

```typescript
// test/security/rate-limit-bypass.test.ts
it('rate limit cannot be bypassed via X-Forwarded-For header (unless trusted proxy configured)', async () => {
  const policy = await db.getSecurityPolicy();
  for (let i = 0; i < policy.rateLimitPerIPMax; i++) {
    try {
      await engine.login({ tenantId, identifier: 'x@x.com', password: 'wrong', ipAddress: '1.1.1.1' });
    } catch {}
  }
  // X-Forwarded-For로 우회 시도
  for (let i = 0; i < 5; i++) {
    try {
      await engine.login({ tenantId, identifier: 'x@x.com', password: 'wrong', ipAddress: '2.2.2.2', headers: { 'x-forwarded-for': '1.1.1.1' } });
    } catch (e) {
      // 우회 시도해도 여전히 rate limit
      expect(e).toBeInstanceOf(RateLimitedError);
    }
  }
});
```

> **Trusted Proxy 정책**: 호스트가 명시적으로 trusted proxy를 등록한 경우에만 X-Forwarded-For 신뢰. 기본은 직접 연결 IP만 신뢰.

---

## 8. 회귀 테스트 전략

### 8.1 Bug → Test 패턴

```
Bug 발견
  ↓
1. Bug를 재현하는 테스트 작성 (RED)
  ↓
2. 코드 수정 (GREEN)
  ↓
3. 리팩토링 (REFACTOR)
  ↓
4. PR에 "fixes #N" 라벨
  ↓
5. 회귀 방지를 위해 절대 제거하지 않음
```

### 8.2 모든 도메인 에러는 테스트

```typescript
// test/integration/error-catalog.test.ts
// 모든 IdentityError에 대해:
//   - 정상 입력에서 발생하지 않음
//   - 비정상 입력에서 발생함
//   - error.code, error.httpStatus, error.safeToExpose 정확
```

---

## 9. 커버리지 목표

| 영역 | 목표 | 비고 |
|---|---|---|
| src/domain/ | 100% | 순수 함수, 검증 가능 |
| src/crypto/ | 100% | 보안 결정 단일 진입점 |
| src/policy/ | 95%+ | 정책 평가 로직 |
| src/usecase/ | 90%+ | 모든 분기 |
| src/repository/ | 85%+ | DB 쿼리 |
| src/provider/ | 80%+ | 외부 API mock으로 |
| src/error/ | 100% | 에러 정확성 |
| 전체 | 90%+ | PR 머지 게이트 |

---

## 10. CI 통합

```yaml
# .github/workflows/test.yml (호스트)
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run test:security
      - name: Coverage Check
        run: |
          if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 90 ]; then
            echo "Coverage below 90%"
            exit 1
          fi
```

---

## 11. 테스트 데이터 (Fixtures)

### 11.1 원칙

```
- 테스트마다 자체 데이터 생성 (no shared state)
- Cleanup은 afterEach/afterAll
- 비밀번호는 명시적 ('Valid1!Passwd')
- 이메일은 unique-per-test (예: `${Date.now()}@test.com`)
```

### 11.2 Fixture Factory

```typescript
// test/fixtures/user.fixture.ts
export async function createTestUser(tenantId: string, overrides?: Partial<NewUser>): Promise<User> {
  const password = overrides?.password ?? 'Valid1!Passwd';
  const email = overrides?.email ?? `${Date.now()}-${Math.random()}@test.com`;
  const user = await engine.register({
    tenantId,
    identifier: { type: 'email', value: email },
    password,
    skipVerification: true,  // 테스트 편의
  });
  if (overrides?.verified !== false) {
    // 자동으로 verified 처리
    await db.query('UPDATE user_identities SET verified = true WHERE user_id = $1', [user.user.id]);
  }
  return user.user;
}
```

---

## 12. Mock 가이드

### 12.1 HttpClient Mock (Provider 테스트)

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const mockGoogleOAuth = setupServer(
  http.post('https://oauth2.googleapis.com/token', () => {
    return HttpResponse.json({
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      id_token: 'mock_id_token',
      expires_in: 3600,
      token_type: 'Bearer',
    });
  }),
  http.get('https://www.googleapis.com/oauth2/v3/userinfo', () => {
    return HttpResponse.json({
      sub: '108012345678901234567',
      email: 'test@gmail.com',
      email_verified: true,
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    });
  })
);
```

### 12.2 Email Mock

```typescript
// mailhog 또는 capture 패턴
export function createCapturingEmailProvider() {
  const sent: Email[] = [];
  return {
    async send(email: Email) { sent.push(email); },
    getSent(): readonly Email[] { return sent; },
    getLastEmail(to: string): Email | undefined {
      return sent.filter(e => e.to === to).pop();
    },
  };
}
```

---

## 13. Property-Based Testing (선택)

```typescript
// test/unit/domain/password/policy.test.ts (advanced)
import { fc, test } from 'fast-check';

test('evaluatePassword is deterministic', () => {
  fc.assert(
    fc.property(fc.string(), (password) => {
      const policy = defaultPolicy;
      const r1 = evaluatePassword(password, policy);
      const r2 = evaluatePassword(password, policy);
      expect(r1).toEqual(r2);
    })
  );
});

test('evaluatePassword with empty minLength rejects all short', () => {
  fc.assert(
    fc.property(fc.string({ minLength: 0, maxLength: 7 }), (password) => {
      const policy = { ...defaultPolicy, minLength: 8 };
      expect(evaluatePassword(password, policy)?.kind).toBe('too_short');
    })
  );
});
```

---

## 14. 미결정 사항

**모든 미결정 사항은 [`15-identity-decisions.md`](./15-identity-decisions.md)에 canonical로 정리되어 있습니다.**

이 문서에서는 더 이상 미결정 항목을 다루지 않습니다.

---