# Identity Engine — Folder Structure

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [08-architecture.md](./08-architecture.md)

---

## 0. 문서 위치

엔진 코드의 **물리적 디렉토리 레이아웃**을 정의합니다.

- **단위 패키지**: `@aibg/engine-identity` (단일 npm package)
- **내부 구조**: 헥사고날 + 레이어드 혼합 (사장님 확립 패턴)
- **테스트 코드**: `test/` 디렉토리 (vitest)

---

## 1. Top-Level

```
identity-engine/                              # Monorepo root or standalone package
├── src/                                      # 엔진 소스
├── test/                                     # 테스트
├── examples/                                 # 호스트 통합 예시
├── docs/                                     # 이 문서들
├── db/                                       # 스키마 명세 + DDL
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
└── CHANGELOG.md
```

> **Engine은 npm/pnpm 워크스페이스의 멤버**가 될 수도 있고, 독립 레포가 될 수도 있습니다.

---

## 2. `src/` 디렉토리

```
src/
├── engine.ts                                 # 진입점 (createIdentityEngine)
├── index.ts                                  # Public exports
│
├── domain/                                   # 순수 도메인 로직 (Layer 2)
│   ├── password/
│   │   ├── policy.ts                         # evaluatePassword()
│   │   ├── hash.ts                           # PasswordHash VO
│   │   └── history.ts                        # checkReuse()
│   ├── identifier/
│   │   ├── normalize.ts                      # normalizeEmail/Phone/Username
│   │   ├── hash.ts                           # deterministicEncrypt(), hmacHash()
│   │   └── types.ts                          # IdentityType enum
│   ├── token/
│   │   ├── opaque.ts                         # OpaqueToken.generate/hash
│   │   ├── jwt.ts                            # JwtSign / JwtVerify
│   │   └── totp.ts                           # TotpSecret.generate, verify
│   ├── session/
│   │   ├── timeout.ts                        # isExpired, isRememberMeExpired
│   │   ├── risk.ts                           # SuspiciousLoginScore
│   │   └── types.ts
│   ├── rate-limit/
│   │   └── check.ts                          # checkLimit()
│   ├── policy/
│   │   └── security-policy.ts                # SecurityPolicy.evaluate()
│   └── event/
│       └── types.ts                          # IdentityEventType enum
│
├── usecase/                                  # Use Cases (Layer 3)
│   ├── auth/
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── logout.ts
│   │   ├── logout-all.ts
│   │   └── _shared/
│   │       ├── handle-failed-login.ts
│   │       └── create-session.ts
│   ├── password/
│   │   ├── reset-request.ts
│   │   ├── reset-confirm.ts
│   │   └── change.ts
│   ├── verification/
│   │   ├── email-request.ts
│   │   ├── email-verify.ts
│   │   ├── sms-request.ts
│   │   └── sms-verify.ts
│   ├── two-factor/
│   │   ├── setup.ts
│   │   ├── verify.ts
│   │   └── disable.ts
│   ├── oauth/
│   │   ├── initiate.ts
│   │   ├── callback.ts
│   │   ├── link.ts
│   │   └── unlink.ts
│   ├── session/
│   │   ├── list.ts
│   │   └── revoke.ts
│   ├── identity/
│   │   └── me.ts
│   └── admin/
│       ├── list-providers.ts
│       ├── update-provider.ts
│       ├── get-policy.ts
│       ├── update-policy.ts
│       ├── list-credentials.ts
│       ├── create-credential.ts
│       ├── delete-credential.ts
│       ├── lock-user.ts
│       ├── unlock-user.ts
│       ├── revoke-user-sessions.ts
│       └── query-audit-logs.ts
│
├── repository/                               # Repositories (Layer 1)
│   ├── _internal/
│   │   ├── entity-store.repository.ts        # IEntityStore wrap (tenant 강제)
│   │   └── cache.repository.ts               # Cache abstraction
│   ├── user.repository.ts
│   ├── user-identity.repository.ts
│   ├── credential.repository.ts
│   ├── password-history.repository.ts
│   ├── session.repository.ts
│   ├── verification-token.repository.ts
│   ├── password-reset.repository.ts
│   ├── security-policy.repository.ts
│   ├── auth-provider.repository.ts
│   └── tenant-credential.repository.ts
│
├── provider/                                 # OAuth Providers (Plugins)
│   ├── _shared/
│   │   ├── auth-provider.interface.ts        # AuthProvider 인터페이스
│   │   ├── registry.ts                       # ProviderRegistry
│   │   └── manifest.ts                       # Plugin Manifest
│   ├── google/
│   │   ├── index.ts
│   │   ├── config.ts                         # GoogleOAuthConfig
│   │   └── README.md
│   ├── apple/
│   │   ├── index.ts
│   │   └── config.ts
│   ├── facebook/
│   ├── kakao/
│   ├── naver/
│   ├── line/
│   └── microsoft/
│
├── crypto/                                   # 암호화 (단일 진입점)
│   ├── password.crypto.ts                    # Argon2id wrap
│   ├── identifier.crypto.ts                  # AES-SIV + HMAC
│   ├── token.crypto.ts                       # Random bytes
│   ├── jwt.crypto.ts                         # JWT RS256
│   ├── envelope.crypto.ts                    # AES-256-GCM (TenantCredential)
│   └── _interfaces.ts                        # ICryptoProvider
│
├── policy/                                   # 정책 평가기 (도메인 위)
│   ├── password-policy.evaluator.ts          # 도메인 위 정책 평가
│   ├── rate-limit.evaluator.ts               # Redis 카운터
│   ├── session-policy.evaluator.ts
│   └── verification-policy.evaluator.ts
│
├── notification/                             # 알림 트리거 (선택적)
│   ├── email-templates.ts                    # 인증 코드, 환영, 알림
│   └── sms-templates.ts
│
├── event/                                    # 이벤트 발행
│   ├── emit.ts                               # emitIdentityEvent()
│   └── subscribers.ts                        # 엔진 자체 구독 (audit, etc.)
│
├── error/                                    # 도메인 에러 계층
│   ├── identity-error.ts                     # abstract base
│   ├── validation-error.ts
│   ├── authentication-failed-error.ts
│   ├── account-locked-error.ts
│   ├── verification-required-error.ts
│   ├── rate-limited-error.ts
│   ├── captcha-failed-error.ts
│   ├── password-policy-error.ts
│   ├── provider-error.ts
│   └── internal-error.ts
│
├── types/                                    # 외부 노출 타입
│   ├── engine.ts                             # IdentityEngine, IdentityEngineDeps
│   ├── input.ts                              # LoginInput, RegisterInput, ...
│   ├── output.ts                             # LoginResult, RegisterResult, ...
│   ├── entity.ts                             # User, Session, ...
│   └── index.ts
│
└── util/                                     # 범용 유틸 (주의해서 사용)
    ├── clock.ts                              # Clock interface (시간 주입)
    ├── random.ts                             # Random interface (난수 주입)
    ├── logger.ts                             # Logger interface
    └── mask.ts                               # PII 마스킹
```

---

## 3. `test/` 디렉토리

```
test/
├── unit/                                     # 단위 테스트 (순수 함수)
│   ├── domain/
│   │   ├── password/
│   │   │   ├── policy.test.ts
│   │   │   ├── hash.test.ts
│   │   │   └── history.test.ts
│   │   ├── identifier/
│   │   ├── token/
│   │   ├── session/
│   │   └── rate-limit/
│   └── crypto/
│       ├── password.crypto.test.ts
│       └── jwt.crypto.test.ts
│
├── integration/                              # 통합 (Repository + Use Case)
│   ├── auth/
│   │   ├── login.test.ts
│   │   ├── register.test.ts
│   │   └── logout.test.ts
│   ├── password/
│   │   ├── reset.test.ts
│   │   └── change.test.ts
│   ├── verification/
│   ├── two-factor/
│   ├── oauth/
│   └── admin/
│
├── security/                                 # 보안 테스트
│   ├── injection.test.ts                     # SQL/NoSQL Injection
│   ├── timing-attack.test.ts                 # 타이밍 공격
│   ├── rate-limit.test.ts
│   ├── brute-force.test.ts
│   ├── jwt-forge.test.ts
│   ├── session-hijack.test.ts
│   ├── account-enumeration.test.ts
│   └── password-policy.test.ts
│
├── e2e/                                      # End-to-End (실제 Postgres)
│   ├── full-flow.test.ts                     # 가입 → 로그인 → 로그아웃
│   ├── multi-tenant.test.ts                  # Tenant 격리
│   ├── oauth-flow.test.ts
│   └── concurrent-session.test.ts
│
├── fixtures/                                 # 테스트 데이터
│   ├── users.fixture.ts
│   ├── tenants.fixture.ts
│   └── policies.fixture.ts
│
├── helpers/                                  # 테스트 유틸
│   ├── create-test-engine.ts                 # 테스트용 엔진 인스턴스
│   ├── mock-deps.ts                          # Mock dependencies
│   ├── test-clock.ts
│   └── test-random.ts
│
└── setup.ts                                  # vitest setup
```

---

## 4. `examples/` 디렉토리

```
examples/
├── hono-server/                              # Hono 호스트 예시
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   └── auth.routes.ts
│   │   ├── adapters/
│   │   │   ├── postgres.adapter.ts           # IEntityStore 구현
│   │   │   ├── redis.adapter.ts              # ICache 구현
│   │   │   └── kms.adapter.ts                # ICryptoProvider 구현
│   │   └── tenant-resolver.ts
│   ├── package.json
│   └── README.md
│
├── nextjs-app/                               # Next.js 15 호스트 예시
│   ├── app/
│   │   └── api/auth/
│   │       └── [...path]/route.ts
│   ├── lib/
│   │   └── identity/
│   │       └── engine.ts                     # createIdentityEngine 호출
│   └── README.md
│
├── worker-thread/                            # Argon2id Worker Thread 예시
│   ├── password.worker.ts
│   └── pool.ts
│
└── README.md
```

> **examples는 production 코드 아님**. 호스트 통합 패턴을 보여주는 참고용.

---

## 5. 파일 명명 규칙

| 종류 | 명명 | 예시 |
|---|---|---|
| TypeScript 파일 | kebab-case | `login.use-case.ts`, `password-policy.ts` |
| 클래스 | PascalCase | `PasswordHash`, `OpaqueToken` |
| 함수/변수 | camelCase | `evaluatePassword`, `tenantId` |
| 타입/인터페이스 | PascalCase | `LoginInput`, `IdentityEngine` |
| 상수 (enum-like) | UPPER_SNAKE | `IDENTITY_AUTH_FAILED` |
| 디렉토리 | kebab-case | `two-factor`, `rate-limit` |

> **예외**: 사장님 확립 코드 컨벤션이 다르면 그것을 따름.

---

## 6. Import 경로 규칙

### 6.1 상대 경로 vs 절대 경로

```typescript
// ✓ 외부 패키지 (절대)
import { z } from 'zod';
import type { IEntityStore } from '@aibg/core';

// ✓ 내부 모듈 (절대 경로 alias 사용)
import { evaluatePassword } from '@/domain/password/policy';
import { createSession } from '@/usecase/auth/_shared/create-session';

// △ 같은 디렉토리 (상대)
import { handleFailedLogin } from './_shared/handle-failed-login';

// ❌ 깊은 상대 경로
import { foo } from '../../../domain/password/policy';  // 자제
```

### 6.2 tsconfig paths

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

## 7. `package.json` (예시)

```json
{
  "name": "@aibg/engine-identity",
  "version": "1.0.0",
  "description": "Industry-Agnostic Identity & Security Engine for Platform Core",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./provider/google": "./dist/provider/google/index.js",
    "./provider/apple": "./dist/provider/apple/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:security": "vitest run test/security",
    "lint": "eslint src/ test/",
    "typecheck": "tsc --noEmit",
    "docs": "typedoc"
  },
  "dependencies": {
    "@aibg/core": "^1.0.0",
    "@aibg/engine-permission": "^1.0.0",
    "@aibg/engine-audit": "^1.0.0",
    "@aibg/engine-notification": "^1.0.0",
    "@noble/hashes": "^1.4.0",
    "@noble/ciphers": "^0.4.0",
    "jose": "^5.6.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0"
  },
  "engines": {
    "node": ">=20"
  },
  "files": [
    "dist",
    "db/schema.sql",
    "docs",
    "README.md",
    "LICENSE"
  ]
}
```

---

## 8. `tsconfig.json` (예시)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

---

## 9. 빌드 산출물

```
dist/
├── engine.js
├── engine.d.ts
├── engine.js.map
├── engine.d.ts.map
├── domain/...
├── usecase/...
├── repository/...
├── provider/
│   ├── google/index.js
│   ├── apple/index.js
│   └── ...
├── crypto/...
├── types/...
└── index.js
```

> **엔진은 자체 빌드 산출물을 제공합니다.** 호스트는 `npm install @aibg/engine-identity`로 사용.

---

## 10. Multi-Package Monorepo 통합

호스트가 monorepo(pnpm workspace, turbo, nx 등)를 쓰는 경우:

```
aibg-monorepo/
├── packages/
│   ├── core/                       # @aibg/core
│   ├── engine-identity/            # @aibg/engine-identity  ← 여기
│   ├── engine-permission/          # @aibg/engine-permission
│   ├── engine-audit/               # @aibg/engine-audit
│   ├── engine-notification/        # @aibg/engine-notification
│   └── ...
├── apps/
│   ├── tour-os/                    # Tour OS (호스트)
│   ├── hospitality-os/             # Hospitality OS
│   └── ...
├── package.json
└── pnpm-workspace.yaml
```

> **Identity Engine은 `packages/engine-identity/`에 위치**. 다른 엔진과 동일한 구조.

---

## 11. 미결정 사항

**모든 미결정 사항은 [`15-identity-decisions.md`](./15-identity-decisions.md)에 canonical로 정리되어 있습니다.**

이 문서에서는 더 이상 미결정 항목을 다루지 않습니다.

---