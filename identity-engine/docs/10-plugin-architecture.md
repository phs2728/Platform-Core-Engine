# Identity Engine — Plugin Architecture

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [08-architecture.md](./08-architecture.md), [09-folder-structure.md](./09-folder-structure.md)

---

## 0. 문서 위치

이 문서는 **OAuth Provider (그리고 미래의 다른 플러그인)를 추가하는 표준 절차**를 정의합니다.

**목표 (사장님 확립)**:
> "새로운 Provider를 추가할 때 기존 코드를 수정하지 않고 Provider만 추가할 수 있어야 한다."

이 문서는 그 목표를 어떻게 달성하는지 보여줍니다.

---

## 1. 플러그인 대상

Identity Engine이 지원하는 플러그인 종류:

| 종류 | 인터페이스 | 예시 |
|---|---|---|
| OAuth 2.0 / OIDC Provider | `OAuthProvider` | Google, Apple, Facebook, Kakao, Naver, LINE, Microsoft |
| MFA Method | `MfaMethod` | TOTP, Email OTP, SMS OTP, WebAuthn (Phase 2), Hardware Key (Phase 2) |
| CAPTCHA Provider | `CaptchaProvider` | hCaptcha, reCAPTCHA, Cloudflare Turnstile |
| Notification Channel | `NotificationChannel` | Email (SMTP), SMS (Twilio), Push (FCM/APNS) |
| Secret Storage | `SecretStorage` | AWS KMS, GCP KMS, Vault, Local (dev only) |
| Identifier Validator | `IdentifierValidator` | libphonenumber, custom email regex |

> **Identity Engine은 위 인터페이스들의 골격을 정의하고, 기본 구현체를 제공한다. 새 구현체 추가는 플러그인처럼.**

---

## 2. AuthProvider 인터페이스 (OAuth 표준)

### 2.1 핵심 인터페이스

```typescript
// provider/_shared/auth-provider.interface.ts

export interface AuthProvider {
  /** Unique identifier (kebab-case) */
  readonly id: string;

  /** Type matches AuthProviderType enum */
  readonly type: AuthProviderType;

  /** OAuth flow type */
  readonly flow: 'authorization_code' | 'implicit' | 'hybrid';

  /** Default scopes to request */
  readonly defaultScopes: readonly string[];

  /** Initiate the OAuth flow — return redirect URL */
  initiate(input: ProviderInitiateInput, ctx: ProviderContext): Promise<ProviderInitiateResult>;

  /** Handle the OAuth callback — exchange code for tokens, fetch identity */
  callback(input: ProviderCallbackInput, ctx: ProviderContext): Promise<ProviderIdentity>;

  /** Refresh access token (optional — only if provider supports) */
  refresh?(input: ProviderRefreshInput, ctx: ProviderContext): Promise<ProviderTokens>;

  /** Revoke access (optional — only if provider supports) */
  revoke?(input: ProviderRevokeInput, ctx: ProviderContext): Promise<void>;

  /** Verify ID Token (for OIDC providers) */
  verifyIdToken?(input: ProviderVerifyIdTokenInput, ctx: ProviderContext): Promise<ProviderIdentity>;
}
```

### 2.2 입력/출력 타입

```typescript
export interface ProviderInitiateInput {
  state: string;                            // CSRF 방지 state
  redirectUri: string;                      // 최종 콜백 URL
  scopes?: readonly string[];               // Override default scopes
  additionalParams?: Record<string, string>;// PKCE code_challenge, login_hint 등
}

export type ProviderInitiateResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'error'; code: string; message: string };

export interface ProviderCallbackInput {
  code: string;
  state: string;
  redirectUri: string;
  // PKCE
  codeVerifier?: string;
}

export interface ProviderIdentity {
  /** Provider-specific subject (e.g. "google:108012345678901234567") */
  subject: string;
  /** Email if provided (verified by provider) */
  email?: string;
  emailVerified?: boolean;
  /** Phone if provided */
  phone?: string;
  phoneVerified?: boolean;
  /** Display name (NOT stored by Identity Engine — host decides) */
  displayName?: string;
  /** Avatar URL (NOT stored by Identity Engine — host decides) */
  avatarUrl?: string;
  /** Locale */
  locale?: string;
  /** Raw claims (for advanced use cases) */
  rawClaims?: Record<string, unknown>;
}

export interface ProviderTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;                       // seconds
  scope?: string;
  tokenType: 'Bearer';
}

export interface ProviderContext {
  tenantId: TenantId;
  /** Get tenant credentials (decrypted on demand) */
  tenantCredentials: TenantCredentialReader;
  /** HTTP client (provided by host) */
  httpClient: IHttpClient;
  /** Logger */
  logger: ILogger;
  /** Clock */
  clock: IClock;
}
```

### 2.3 호스트 의존성 (Context 통해 주입)

```typescript
// 호스트가 제공
export interface TenantCredentialReader {
  get(purpose: CredentialPurpose, tenantId: TenantId): Promise<unknown>;
  // 예: get('oauth_google', tenantId) → { clientId, clientSecret, redirectUri, ... }
}

export interface IHttpClient {
  fetch(url: string, init?: RequestInit): Promise<Response>;
  // 표준 fetch와 호환 (Node 18+ globalThis.fetch, Bun fetch, Deno fetch)
}
```

> **Host가 HTTP Client를 주입**. Provider는 `fetch`를 직접 호출하지 않음 (테스트 가능).

---

## 3. 레지스트리 (Registry)

### 3.1 정적 등록

```typescript
// provider/_shared/registry.ts

import { GoogleProvider } from '../google';
import { AppleProvider } from '../apple';
import { KakaoProvider } from '../kakao';
// ... 기타 표준 Provider

const BUILTIN_PROVIDERS: AuthProvider[] = [
  GoogleProvider,
  AppleProvider,
  FacebookProvider,
  KakaoProvider,
  NaverProvider,
  LineProvider,
  MicrosoftProvider,
];

class ProviderRegistryImpl {
  private providers = new Map<string, AuthProvider>();

  constructor() {
    for (const p of BUILTIN_PROVIDERS) {
      this.register(p);
    }
  }

  register(provider: AuthProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider '${provider.id}' already registered`);
    }
    this.providers.set(provider.id, provider);
  }

  get(id: string): AuthProvider | undefined {
    return this.providers.get(id);
  }

  list(): AuthProvider[] {
    return Array.from(this.providers.values());
  }

  /** Resolve by AuthProviderType */
  resolve(type: AuthProviderType): AuthProvider | undefined {
    return this.list().find(p => p.type === type);
  }
}

export const providerRegistry = new ProviderRegistryImpl();
```

### 3.2 외부 Provider 등록 (호스트 또는 다른 엔진)

```typescript
// 호스트 코드 (어디든)
import { providerRegistry } from '@aibg/engine-identity';
import { CustomSamlProvider } from './custom-saml-provider';

providerRegistry.register(CustomSamlProvider);
```

> **호스트가 외부 Provider를 등록할 수 있다**. 이때 Identity Engine 코드는 0줄 수정.

### 3.3 동적 디스커버리 (선택)

```typescript
// provider/_shared/registry.ts (advanced)

class ProviderRegistryImpl {
  // 빌드타임 또는 런타임에 외부 디렉토리에서 자동 발견
  async discoverFrom(directory: string): Promise<void> {
    const modules = await import.meta.glob(`${directory}/**/index.ts`);
    for (const [path, loader] of Object.entries(modules)) {
      const mod = await loader();
      const provider = mod.default as AuthProvider;
      this.register(provider);
    }
  }
}
```

> 빌드타임 등록 / 동적 import 모두 지원. 호스트 환경에 맞게 선택.

---

## 4. 새 Provider 추가 절차 (Step-by-Step)

### 4.1 시나리오

**새 OAuth Provider "Instagram"을 추가하고 싶다.**

### 4.2 단계

```
Step 1: 디렉토리 생성
  src/provider/instagram/
    ├── index.ts
    ├── config.ts
    └── README.md

Step 2: config.ts 작성 (~20 LOC)
  - Endpoint URLs
  - Default scopes
  - Response type (code)

Step 3: index.ts 작성 (~150 LOC)
  - AuthProvider 인터페이스 구현
  - initiate(): authorize URL 생성
  - callback(): code → token → userinfo
  - (선택) refresh, revoke

Step 4: registry.ts에 import 1줄 추가
  import { InstagramProvider } from '../instagram';
  ... register(InstagramProvider)

Step 5: DB 스키마 확장 (마이그레이션 1개)
  ALTER TABLE auth_providers DROP CONSTRAINT auth_providers_type_chk;
  ALTER TABLE auth_providers ADD CONSTRAINT auth_providers_type_chk
    CHECK (type IN (..., 'oauth_instagram'));
  ALTER TABLE tenant_credentials DROP CONSTRAINT tenant_credentials_purpose_chk;
  ALTER TABLE tenant_credentials ADD CONSTRAINT tenant_credentials_purpose_chk
    CHECK (purpose IN (..., 'oauth_instagram'));

Step 6: Admin Console UI에 "Instagram" 토글 추가 (선택)
  - 하드코딩된 enum 대신 Registry.list() 동적 표시

Step 7: 끝.
```

### 4.3 작성 예시 — Instagram Provider

```typescript
// src/provider/instagram/config.ts
export const InstagramConfig = {
  authorizationEndpoint: 'https://api.instagram.com/oauth/authorize',
  tokenEndpoint: 'https://api.instagram.com/oauth/access_token',
  userInfoEndpoint: 'https://graph.instagram.com/me',
  defaultScopes: ['user_profile', 'user_media'],
} as const;

// src/provider/instagram/index.ts
import { AuthProvider, ProviderIdentity, ... } from '../_shared/auth-provider.interface';
import { InstagramConfig } from './config';

interface InstagramTokens {
  access_token: string;
  user_id: number;
}

interface InstagramUserInfo {
  id: string;
  username: string;
}

export const InstagramProvider: AuthProvider = {
  id: 'instagram',
  type: 'oauth_instagram',
  flow: 'authorization_code',
  defaultScopes: InstagramConfig.defaultScopes,

  async initiate(input, ctx) {
    const creds = await ctx.tenantCredentials.get('oauth_instagram', ctx.tenantId) as {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    const url = new URL(InstagramConfig.authorizationEndpoint);
    url.searchParams.set('client_id', creds.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('scope', (input.scopes ?? this.defaultScopes).join(' '));
    url.searchParams.set('state', input.state);
    url.searchParams.set('response_type', 'code');
    return { kind: 'redirect', url: url.toString() };
  },

  async callback(input, ctx) {
    const creds = await ctx.tenantCredentials.get('oauth_instagram', ctx.tenantId) as {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    // 1. Exchange code for token
    const tokenRes = await ctx.httpClient.fetch(InstagramConfig.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: input.redirectUri,
        code: input.code,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Instagram token exchange failed: ${tokenRes.status}`);
    const tokens = await tokenRes.json() as InstagramTokens;
    // 2. Fetch userinfo
    const userRes = await ctx.httpClient.fetch(
      `${InstagramConfig.userInfoEndpoint}?fields=id,username&access_token=${tokens.access_token}`,
    );
    const user = await userRes.json() as InstagramUserInfo;
    return {
      subject: `instagram:${user.id}`,
      displayName: user.username,
      rawClaims: { tokens, user },
    };
  },

  async refresh(input, ctx) {
    // Instagram doesn't have refresh tokens in basic scope — implementation depends on permission level
    throw new Error('Refresh not supported by Instagram basic scope');
  },
};
```

**총 코드량**: ~80 LOC + config 20 LOC = ~100 LOC.

**기존 코드 수정**: registry.ts 2줄 (import + register). 스키마 마이그레이션 2개.

---

## 5. Plugin Manifest

```typescript
// provider/_shared/manifest.ts

export interface ProviderManifest {
  id: string;
  type: AuthProviderType;
  version: string;
  displayName: string;
  description: string;
  iconUrl?: string;
  configSchema: ConfigSchema;       // Admin Console가 dynamic form 생성
  supportedFeatures: ProviderFeatures;
}

export interface ConfigSchema {
  fields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select' | 'multiselect' | 'boolean' | 'number';
  required: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
  description?: string;
  secret?: boolean;                 // true면 암호화 저장
}

export interface ProviderFeatures {
  refreshToken: boolean;
  revokeToken: boolean;
  idToken: boolean;                 // OIDC
  pkce: boolean;
  accountLinking: boolean;
  dynamicRegistration: boolean;
}
```

### 5.1 Google Provider Manifest 예시

```typescript
export const GoogleProviderManifest: ProviderManifest = {
  id: 'google',
  type: 'oauth_google',
  version: '1.0.0',
  displayName: 'Google',
  description: 'Sign in with Google',
  iconUrl: '/icons/google.svg',
  configSchema: {
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, secret: false },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, secret: true },
      { key: 'redirectUri', label: 'Redirect URI', type: 'url', required: true },
      {
        key: 'scopes',
        label: 'Scopes',
        type: 'multiselect',
        required: false,
        default: ['openid', 'email', 'profile'],
        options: [
          { label: 'openid', value: 'openid' },
          { label: 'email', value: 'email' },
          { label: 'profile', value: 'profile' },
        ],
      },
    ],
  },
  supportedFeatures: {
    refreshToken: true,
    revokeToken: true,
    idToken: true,
    pkce: true,
    accountLinking: true,
    dynamicRegistration: false,
  },
};
```

> **Admin Console은 `manifest`를 읽고 동적으로 설정 UI를 그릴 수 있다**. Provider 추가 시 Console 코드 수정 불필요.

---

## 6. Schema 진화 전략

### 6.1 문제

새 Provider가 추가될 때마다 `auth_providers.type` CHECK 제약과 `tenant_credentials.purpose` CHECK 제약을 업데이트해야 한다.

### 6.2 해결: 두 가지 옵션

#### Option A — CHECK 제약 업데이트 (현재)

```sql
-- 마이그레이션
ALTER TABLE auth_providers DROP CONSTRAINT auth_providers_type_chk;
ALTER TABLE auth_providers ADD CONSTRAINT auth_providers_type_chk
  CHECK (type IN ('email', 'phone', ..., 'oauth_instagram'));
```

**단점**: Provider 추가마다 마이그레이션 필요.

#### Option B — JSONB + Registry 검증 (장기)

```sql
-- CHECK 제약 제거
-- 검증은 애플리케이션 레이어에서 provider_registry.list().map(p => p.type) 사용
```

**장점**: DB 마이그레이션 불필요.

**권장 (사장님 확립 필요)**:
- Phase 1 (현재): Option A (명시적, 안전)
- Phase 2: Option B로 마이그레이션 (자동 발견)

---

## 7. MFA Method 플러그인 (간략)

```typescript
// mfa/_shared/mfa-method.interface.ts
export interface MfaMethod {
  readonly id: 'totp' | 'email_otp' | 'sms_otp' | 'webauthn';
  readonly displayName: string;

  /** Begin enrollment */
  setup(input: MfaSetupInput, ctx: MfaContext): Promise<MfaSetupResult>;

  /** Complete enrollment (verify first code) */
  completeSetup(input: MfaCompleteSetupInput, ctx: MfaContext): Promise<MfaCredential>;

  /** Generate a challenge (during login) */
  challenge(input: MfaChallengeInput, ctx: MfaContext): Promise<MfaChallengeResult>;

  /** Verify a code */
  verify(input: MfaVerifyInput, ctx: MfaContext): Promise<MfaVerifyResult>;

  /** Disable */
  disable(input: MfaDisableInput, ctx: MfaContext): Promise<void>;
}
```

새 MFA 추가 (예: WebAuthn):
1. `mfa/webauthn/index.ts` 작성
2. Registry 등록
3. 끝. 기존 코드 0줄 수정.

---

## 8. 호스트 통합 패턴

### 8.1 호스트가 Custom Provider 추가

```typescript
// 호스트: src/auth/providers/my-custom-sso.ts
import type { AuthProvider } from '@aibg/engine-identity';

export const MyCustomSsoProvider: AuthProvider = {
  id: 'my-custom-sso',
  type: 'oauth_custom_sso',           // DB 스키마에 추가 필요
  // ...
};

// 호스트: src/server.ts
import { providerRegistry } from '@aibg/engine-identity';
import { MyCustomSsoProvider } from './auth/providers/my-custom-sso';

providerRegistry.register(MyCustomSsoProvider);
```

### 8.2 외부 패키지로 분리

```typescript
// 별도 npm 패키지: @acme/identity-provider-corp-sso
import type { AuthProvider } from '@aibg/engine-identity';

export const CorpSsoProvider: AuthProvider = { /* ... */ };

// 호스트
import { providerRegistry } from '@aibg/engine-identity';
import { CorpSsoProvider } from '@acme/identity-provider-corp-sso';
providerRegistry.register(CorpSsoProvider);
```

---

## 9. Plugin 추가 시 체크리스트

```
[ ] src/provider/<name>/ 디렉토리 생성
[ ] index.ts 작성 (AuthProvider 인터페이스 구현)
[ ] config.ts 작성 (선택)
[ ] README.md 작성 (설정 방법 + 콜백 URL)
[ ] provider/_shared/registry.ts에 import + register 추가
[ ] DB 마이그레이션 (auth_providers.type CHECK, tenant_credentials.purpose CHECK)
[ ] Admin Console manifest (configSchema 정의)
[ ] 단위 테스트 (initiate URL 생성, callback token 교환 mock)
[ ] 통합 테스트 (E2E with mock OAuth server)
[ ] 보안 테스트 (state 검증, redirect_uri 검증)
[ ] 문서 업데이트 (docs/06-api-spec.yaml의 provider enum)
```

---

## 10. 테스트 전략 (Provider)

### 10.1 단위 테스트

```typescript
// test/unit/provider/instagram.test.ts
describe('InstagramProvider', () => {
  it('initiate() returns correct authorize URL', async () => {
    const provider = InstagramProvider;
    const ctx = createMockProviderContext({
      tenantCredentials: { oauth_instagram: { clientId: 'cid', clientSecret: 'sec', redirectUri: 'https://app/cb' } },
    });
    const result = await provider.initiate({ state: 'abc', redirectUri: 'https://app/cb' }, ctx);
    expect(result.kind).toBe('redirect');
    expect((result as any).url).toContain('client_id=cid');
    expect((result as any).url).toContain('state=abc');
  });

  it('callback() exchanges code and fetches userinfo', async () => {
    const ctx = createMockProviderContext({
      httpClient: {
        fetch: vi.fn()
          .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'at', user_id: 123 }), { status: 200 }))
          .mockResolvedValueOnce(new Response(JSON.stringify({ id: '123', username: 'test' }), { status: 200 })),
      },
      tenantCredentials: { oauth_instagram: { clientId: 'cid', clientSecret: 'sec', redirectUri: 'https://app/cb' } },
    });
    const identity = await provider.callback({ code: 'c', state: 's', redirectUri: 'https://app/cb' }, ctx);
    expect(identity.subject).toBe('instagram:123');
  });
});
```

### 10.2 통합 테스트 (Mock OAuth Server)

```typescript
// test/integration/oauth/instagram.test.ts
describe('Instagram OAuth Flow', () => {
  let mockOAuthServer: MockOAuthServer;
  beforeAll(async () => {
    mockOAuthServer = await startMockOAuthServer('instagram');
  });

  it('full initiate → callback → session creation', async () => {
    const initiateRes = await engine.oauth.initiate('instagram', { ... });
    expect(initiateRes.url).toContain(mockOAuthServer.url);
    // Simulate provider redirect
    const callbackRes = await fetch(initiateRes.url.replace('authorize', 'callback') + '?code=test_code&state=' + state);
    // ...
  });
});
```

---

## 11. [TBD: 사장님 확립 필요]

| 항목 | 기본 제안 |
|---|---|
| Schema 진화 (Option A vs B) | Phase 1: A, Phase 2: B |
| Custom Provider 위치 | 호스트 코드 또는 별도 패키지 |
| Registry 자동 발견 (Phase 2) | `import.meta.glob` 또는 동적 import |
| Plugin 버전 정책 | SemVer |

---

**End of Plugin Architecture v1.0**