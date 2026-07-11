# Identity Engine — Admin Console Specification

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [01-prd.md](./01-prd.md) §7

---

## 0. 문서 위치

이 문서는 **관리자가 코드를 수정하지 않고** Identity Engine을 설정하는 UI를 정의합니다.

**핵심 원칙 (사장님 확립)**: "관리자는 코드를 수정하지 않고 다음 항목을 설정할 수 있어야 한다."

이 콘솔은 **Identity Engine과 함께 제공되는 표준 Admin UI 명세**입니다. 호스트는 이 명세를 보고 자기 Admin Console에 통합하거나, Identity Engine Admin을 별도 페이지로 띄울 수 있습니다.

---

## 1. Admin Console 원칙

### 1.1 권한 분리

| 역할 | 책임 |
|---|---|
| **Tenant Owner** | 자기 Tenant의 모든 설정 변경 |
| **Tenant Admin** | 설정 변경 (일부 제한) |
| **Tenant Operator** | 사용자 관리 (lock/unlock), 감사 조회 |
| **Tenant Auditor** | 감사 로그 조회 (read-only) |

> 호스트의 Permission Engine과 통합.

### 1.2 모든 변경은 감사

```
모든 Admin Console 액션은 audit log에 기록:
  - admin.actor.update_policy
  - admin.actor.enable_provider
  - admin.actor.lock_user
  - ...
```

### 1.3 Dynamic UI (Plugin-Driven)

```
Provider 추가 시 Admin UI는 자동으로 표시:
  - Registry.list()로 현재 등록된 Provider 가져옴
  - 각 Provider의 manifest.configSchema로 form 동적 생성
  - 새 Provider 추가 시 Console 코드 0줄 수정
```

---

## 2. 화면 구조 (Screen Map)

```
/admin/auth/
  ├── /dashboard                    요약 통계
  ├── /providers                    인증 제공자 목록/설정
  │     ├── /:id/edit              개별 설정
  │     └── /:id/test              연결 테스트
  ├── /policy                       보안 정책
  ├── /credentials                  외부 서비스 자격증명
  │     ├── /new                   새 자격증명
  │     └── /:id/edit              자격증명 수정/삭제
  ├── /users                        사용자 관리
  │     ├── /:id                   사용자 상세
  │     ├── /:id/sessions          세션 관리
  │     └── /:id/audit             사용자별 감사 이력
  ├── /sessions                     전체 활성 세션 조회
  ├── /audit-logs                   감사 로그 조회
  └── /settings                     메타 설정 (Tenant 자체 — Universal Core 영역)
```

---

## 3. 화면별 상세

### 3.1 Dashboard

**목적**: Tenant의 인증/보안 상태 한눈에 보기

**위젯**:

| 위젯 | 표시 |
|---|---|
| Total Users | 이번 달 가입 / 누적 |
| Active Sessions | 현재 활성 세션 수 |
| Failed Logins (24h) | 최근 24시간 실패 로그인 수 |
| Locked Accounts | 현재 잠긴 계정 수 |
| Provider Status | 각 Provider ON/OFF + 마지막 활동 |
| Policy Compliance | 정책 위반 시도 수 |
| Recent Suspicious Logins | 새 디바이스/지역 로그인 |

```
┌──────────────────────────────────────────────────────────────┐
│  Identity Engine Dashboard                                   │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │ Total Users │ │ Sessions    │ │ Failed Logins│             │
│  │   1,234     │ │     87      │ │    42 (24h) │             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
│                                                              │
│  ┌────────────────────────────┐ ┌─────────────────────────┐ │
│  │ Provider Status            │ │ Recent Suspicious       │ │
│  │ ✓ Email     ON            │ │ • user@... new IP (2h)  │ │
│  │ ✓ Google    ON            │ │ • user2@... new country │ │
│  │ ✓ Kakao     ON            │ │ • admin@... new device  │ │
│  │ ✗ Apple     OFF           │ │                         │ │
│  └────────────────────────────┘ └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Authentication Providers (`/admin/auth/providers`)

**목적**: 어떤 인증 방식을 활성화/비활성화할지 관리

**목록**:

```
┌──────────────────────────────────────────────────────────────┐
│  Authentication Providers                          [+ Custom] │
│                                                              │
│  Email & Password          [● ON]      [Configure]  [Test]   │
│  Phone (SMS)               [○ OFF]     [Configure]           │
│  Username                  [● ON]      [Configure]           │
│  ─ OAuth Providers ────────────────────────────────────────  │
│  Google                    [● ON]      [Configure]  [Test]   │
│  Apple                     [○ OFF]     [Configure]           │
│  Facebook                  [○ OFF]     [Configure]           │
│  Kakao                     [● ON]      [Configure]  [Test]   │
│  Naver                     [○ OFF]     [Configure]           │
│  LINE                      [○ OFF]     [Configure]           │
│  Microsoft                 [○ OFF]     [Configure]           │
│  ─ MFA ─────────────────────────────────────────────────────  │
│  TOTP (Authenticator App)  [● ON]      [Configure]           │
│  SMS OTP                   [● ON]      [Configure]           │
│  Email OTP                 [○ OFF]     [Configure]           │
│  ─ Custom (added via Registry) ────────────────────────────  │
│  [+] Add Custom Provider                                    │
└──────────────────────────────────────────────────────────────┘
```

**Configure 화면** (Provider별):

`Registry.list()`에서 manifest를 읽어 동적으로 form 생성:

```typescript
// Admin이 추가한 새 Provider "CorpSSO" → 자동 표시
{
  id: 'corp-sso',
  type: 'oauth_corp_sso',
  displayName: 'Company SSO',
  configSchema: {
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, secret: true },
      { key: 'ssoUrl', label: 'SSO URL', type: 'url', required: true },
      { key: 'scopes', label: 'Scopes', type: 'multiselect', default: ['openid', 'email'] },
    ]
  }
}
```

→ Admin Console이 자동으로 form 렌더링. **새 Provider 추가 시 Console 코드 0줄 수정.**

### 3.3 Security Policy (`/admin/auth/policy`)

**목적**: Tenant별 보안 정책 설정

**섹션**:

#### Password Policy

```
┌──────────────────────────────────────────────────────────────┐
│  Password Policy                                             │
│                                                              │
│  Minimum Length        [12          ] (min: 8)               │
│  Require Uppercase     [✓]                                   │
│  Require Lowercase     [✓]                                   │
│  Require Number        [✓]                                   │
│  Require Special Char  [✓]                                   │
│  Expiration (days)     [90        ] (blank = no expiration)  │
│  History Count         [5         ] (prevent reuse)          │
│                                                              │
│  [Test Password] [Abc123!@#$%    ] → ✓ Strong               │
└──────────────────────────────────────────────────────────────┘
```

#### Lock & Failure

```
┌──────────────────────────────────────────────────────────────┐
│  Lock & Failure                                              │
│                                                              │
│  Max Failed Logins     [5         ]                          │
│  Lock Duration (min)   [30        ]                          │
│                                                              │
│  Rate Limiting                                                │
│  Per IP                [5         ] req / [15      ] min     │
│  Per Identifier        [10        ] req / [15      ] min     │
└──────────────────────────────────────────────────────────────┘
```

#### Session

```
┌──────────────────────────────────────────────────────────────┐
│  Session                                                     │
│                                                              │
│  Session Timeout (min) [60        ] (5-10080)                │
│  Remember Me (days)    [30        ]                          │
│  Max Concurrent        [5         ] (blank = unlimited)      │
└──────────────────────────────────────────────────────────────┘
```

#### Verification

```
┌──────────────────────────────────────────────────────────────┐
│  Verification                                                │
│                                                              │
│  Require Email Verification   [✓]                            │
│  Require Phone Verification   [ ]                            │
│  Code Expiration (min)       [15        ]                    │
│  Max Attempts                [5         ]                    │
│  Require Admin Approval      [ ]                            │
└──────────────────────────────────────────────────────────────┘
```

#### Two-Factor Authentication

```
┌──────────────────────────────────────────────────────────────┐
│  Two-Factor Authentication                                   │
│                                                              │
│  Enable 2FA                [✓]                                │
│  Required (vs Optional)    [ ]                                │
│                                                              │
│  Allowed Methods                                                │
│  [✓] TOTP (Authenticator App)                                │
│  [✓] SMS OTP                                                 │
│  [ ] Email OTP                                               │
└──────────────────────────────────────────────────────────────┘
```

#### CAPTCHA

```
┌──────────────────────────────────────────────────────────────┐
│  CAPTCHA                                                     │
│                                                              │
│  Enable CAPTCHA           [✓]                                │
│  Provider                 [hCaptcha ▼]                       │
│  Trigger After Failures   [3         ]                       │
│                                                              │
│  [Site Key] [  ] [Secret Key] [********]                     │
└──────────────────────────────────────────────────────────────┘
```

#### Audit

```
┌──────────────────────────────────────────────────────────────┐
│  Audit                                                       │
│                                                              │
│  Retention (days)         [           ] (blank = forever)    │
└──────────────────────────────────────────────────────────────┘
```

**[Save Policy]** 버튼 → 검증 후 저장 → Audit Log 기록.

### 3.4 Credentials (`/admin/auth/credentials`)

**목적**: Tenant의 외부 서비스 자격증명 관리

**목록**:

```
┌──────────────────────────────────────────────────────────────┐
│  Tenant Credentials                       [+ Add Credential] │
│                                                              │
│  Google OAuth (Production)       [Edit] [Delete]              │
│    Created: 2026-01-15   Updated: 2026-06-20                 │
│    • Client ID: 1080***...                                    │
│    • Last used: 2 min ago                                     │
│                                                              │
│  SMTP (SendGrid)                [Edit] [Delete]              │
│    Created: 2026-02-01   Updated: 2026-05-10                 │
│    • Host: smtp.sendgrid.net                                 │
│    • From: noreply@aibg.ge                                   │
│                                                              │
│  Twilio SMS                     [Edit] [Delete]              │
│    Created: 2026-02-15                                        │
│    • From: +995***...                                         │
└──────────────────────────────────────────────────────────────┘
```

**새 자격증명 추가** (Purpose 선택 → Dynamic form):

```
┌──────────────────────────────────────────────────────────────┐
│  Add Tenant Credential                                       │
│                                                              │
│  Purpose       [OAuth: Google ▼]                             │
│  Name          [Production Google OAuth]                     │
│                                                              │
│  Client ID     [1080***...                          ]        │
│  Client Secret [**********************************] (🔒)    │
│  Redirect URI  [https://app.aibg.ge/auth/callback/google]   │
│                                                              │
│  Scopes                                                      │
│  [✓] openid  [✓] email  [✓] profile                         │
│                                                              │
│  [Cancel]                                            [Save]  │
└──────────────────────────────────────────────────────────────┘
```

**보안 표시**:
- Secret 필드는 `type="password"` (마스킹)
- 절대 화면에 평문 표시 안 함
- 저장 시 AES-256-GCM 암호화 (KMS 키)

### 3.5 User Management (`/admin/auth/users`)

**목적**: 개별 사용자 계정 관리

**목록**:

```
┌──────────────────────────────────────────────────────────────┐
│  Users                                                       │
│                                                              │
│  [Search users by email/phone/username...      ] [Search]    │
│  Filter: [Status ▼] [Provider ▼] [Created ▼]                 │
│                                                              │
│  Email                  Status      Last Login     Actions    │
│  ──────────────────────────────────────────────────────────  │
│  tim@aibg.ge           ● active    2 hours ago    [Manage]   │
│  locked@aibg.ge        🔒 locked   1 day ago      [Manage]   │
│  disabled@aibg.ge      ⏸ disabled  30 days ago    [Manage]   │
└──────────────────────────────────────────────────────────────┘
```

**사용자 상세**:

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back     tim@aibg.ge                                      │
│                                                              │
│  Status: ● active                                            │
│  Created: 2026-01-15                                         │
│  Last login: 2026-07-11 06:00 (Seoul, KR)                    │
│                                                              │
│  Identities                                                   │
│  • email    tim@aibg.ge        ✓ verified                    │
│  • phone    +995****3456       ✓ verified                    │
│  • google   google:1080...     ✓ linked                      │
│                                                              │
│  Security                                                    │
│  2FA:     ● TOTP enabled                                      │
│  Password: Last changed 30 days ago (expires in 60 days)    │
│                                                              │
│  [Lock Account] [Force Logout All] [Send Password Reset]    │
│  [Disable 2FA (admin override)]                              │
│                                                              │
│  Active Sessions (3)                                         │
│  • Web (Chrome)  Seoul, KR  2 hours ago     [Revoke]         │
│  • Mobile (iOS)  Seoul, KR  1 day ago       [Revoke]         │
│  • Web (Safari)  Tbilisi, GE 5 min ago ⚠ suspicious [Revoke] │
│                                                              │
│  Recent Audit (last 20 events)                                │
│  • 2026-07-11 06:00  login.success                           │
│  • 2026-07-10 09:00  password.changed                        │
│  • ...                                                       │
└──────────────────────────────────────────────────────────────┘
```

**Lock Account**:

```
┌──────────────────────────────────────────────────────────────┐
│  Lock Account: tim@aibg.ge                                   │
│                                                              │
│  Reason:     [Suspicious activity ▼]                         │
│  Duration:   [30 min ▼]  (blank = indefinite)                │
│  Revoke Sessions: [✓]                                        │
│                                                              │
│  Note: User will receive email notification.                 │
│                                                              │
│  [Cancel]                                          [Lock]    │
└──────────────────────────────────────────────────────────────┘
```

### 3.6 Audit Logs (`/admin/auth/audit-logs`)

**목적**: 모든 인증 이벤트 조회

```
┌──────────────────────────────────────────────────────────────┐
│  Audit Logs                                                  │
│                                                              │
│  Filters                                                     │
│  [Event Type ▼] [Result ▼] [User ▼] [Date Range ▼]          │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Time     User          Event             IP         OK   │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 06:00    tim@aibg.ge   login.success     1.2.3.4    ✓    │ │
│  │ 06:01    x@x.com       login.failure     5.6.7.8    ✗    │ │
│  │          reason: invalid_credentials                    │ │
│  │ 06:02    admin@aibg.ge policy.changed    -           ✓    │ │
│  │          changed: passwordMinLength 8→12                │ │
│  │ 06:05    locked@x.com  account.locked    -           ✓    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [< Prev]  Page 1 of 234  [Next >]                          │
└──────────────────────────────────────────────────────────────┘
```

**상세 (modal)**:

```
┌──────────────────────────────────────────────────────────────┐
│  Audit Log Detail                                            │
│                                                              │
│  Event:     auth.login.success                               │
│  Time:      2026-07-11 06:00:23.456 UTC                      │
│  Tenant:    aibg-georgia                                     │
│  User:      tim@aibg.ge (uuid: ...)                          │
│  Session:   ... (uuid: ...)                                  │
│  IP:        1.2.3.4                                          │
│  Country:   KR                                               │
│  User Agent: Mozilla/5.0...                                  │
│  Result:    success                                          │
│                                                              │
│  Context                                                     │
│  {                                                            │
│    "authMethod": "password",                                 │
│    "mfaUsed": true,                                          │
│    "isSuspicious": false                                      │
│  }                                                            │
│                                                              │
│  Integrity                                                   │
│  Hash:     a1b2c3...                                         │
│  PrevHash: z9y8x7...                                         │
│  Verified: ✓                                                 │
│                                                              │
│  [Close]                                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. 접근 제어

### 4.1 역할별 화면 접근

| 화면 | Tenant Owner | Tenant Admin | Tenant Operator | Tenant Auditor |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Providers | RW | RW | R | R |
| Policy | RW | RW | R | R |
| Credentials | RW | RW | ❌ | ❌ |
| Users (list) | ✓ | ✓ | ✓ | ✓ |
| Users (lock/unlock) | ✓ | ✓ | ✓ | ❌ |
| Users (force logout) | ✓ | ✓ | ✓ | ❌ |
| Sessions (view all) | ✓ | ✓ | ✓ | R |
| Audit Logs | ✓ | ✓ | R | ✓ |

### 4.2 Audit Trail of Admin Actions

```
모든 Admin 액션은 audit_logs에 기록:
  - admin.actor.<action>
  - payload에 adminId, action, target 포함
```

### 4.3 Sensitive Operations — 추가 인증

다음 작업은 **추가 인증 (2FA 재확인)** 필요:

- 다른 Admin의 권한 변경
- Tenant 삭제 (Universal Core 영역)
- Audit Log 강제 purge (사장님 확립 시)

---

## 5. i18n

Admin Console UI는 **호스트의 i18n 시스템**을 사용합니다. Identity Engine이 자체 i18n을 제공하지 않습니다.

표시 언어:
- 모든 정적 텍스트 → 호스트 i18n
- 동적 데이터(이메일, 시간) → 사용자 locale

---

## 6. Real-time Updates (선택)

긴 시간이 걸리는 작업 (Provider 연결 테스트, Audit hash chain 검증 등)은 실시간 상태 표시:

```
┌──────────────────────────────────────────────────────────────┐
│  Testing Google OAuth Connection...                         │
│                                                              │
│  ✓ Credentials decrypted                                     │
│  ✓ Authorization endpoint reachable                          │
│  ⏳ Token exchange test...                                   │
│                                                              │
│  [Cancel]                                                    │
└──────────────────────────────────────────────────────────────┘
```

SSE 또는 WebSocket 사용 (호스트 환경에 따라).

---

## 7. Mobile Responsive

Admin Console은 모바일에서도 사용 가능해야 합니다 (긴급 lock/unlock):

- Tailwind/CSS-in-JS 반응형
- 최소 가로 폭 375px 지원
- 터치 친화적 버튼 크기 (44px+)

---

## 8. Accessibility

- WCAG 2.1 AA 준수
- 키보드 네비게이션
- 스크린 리더 지원 (ARIA)
- 색상 대비 4.5:1 이상
- Focus indicator 명확

---

## 9. Admin Console 구현 패턴

### 9.1 Dynamic Form (Provider Manifest 기반)

```typescript
// Admin Console 내부
async function renderProviderConfigForm(provider: AuthProvider) {
  const manifest = providerRegistry.getManifest(provider.id);
  return manifest.configSchema.fields.map(field => {
    switch (field.type) {
      case 'text':     return <TextInput {...field} />;
      case 'password': return <PasswordInput {...field} secret />;
      case 'url':      return <UrlInput {...field} />;
      case 'multiselect': return <MultiSelect {...field} options={field.options} />;
      // ...
    }
  });
}
```

### 9.2 Secret 표시 정책

```typescript
// 절대 평문 표시 금지
function CredentialDisplay({ cred }: { cred: TenantCredential }) {
  return (
    <>
      <div>Purpose: {cred.purpose}</div>
      <div>Name: {cred.name}</div>
      <div>Created: {cred.createdAt}</div>
      {/* payload 절대 표시 안 함 */}
      {/* 필요 시 "[Decrypt]" 버튼 (별도 감사 + 2FA 확인) */}
    </>
  );
}
```

### 9.3 Policy Validation (서버 측)

```typescript
// PATCH /admin/auth/policy
// 서버에서 검증:
if (body.passwordMinLength < 8) {
  return 400 { code: 'POLICY_VIOLATION', message: 'minLength must be >= 8' };
}
if (body.sessionTimeoutMinutes < 5 || body.sessionTimeoutMinutes > 10080) {
  return 400 { code: 'POLICY_VIOLATION', ... };
}
// OK → DB 업데이트 → Audit 기록
```

---

## 10. 미결정 사항

**모든 미결정 사항은 [`15-identity-decisions.md`](./15-identity-decisions.md)에 canonical로 정리되어 있습니다.**

이 문서에서는 더 이상 미결정 항목을 다루지 않습니다.

---