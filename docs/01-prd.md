# Identity Engine — Product Requirements Document

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)
**Review Cycle**: 1년

---

## 0. 문서 위치 (Positioning)

Identity Engine은 **Platform Core의 최상위 공통 엔진**입니다.

이 엔진은 **특정 산업을 전혀 알지 못해야 합니다** (Industry Agnostic).

이 엔진은 앞으로 개발될 **모든 제품**이 공통으로 사용합니다:

- Tour OS
- Hospitality OS
- Restaurant OS
- Cafe OS
- RentCar OS
- 그 외 모든 미래 OS

```
This is NOT an application.
This is NOT a demo.
This is NOT an MVP.
This is a reusable Platform Core Engine.
Every design decision must maximize extensibility, configurability and long-term maintainability.
```

---

## 1. 목적 (Mission)

> 사장님 확립:
>
> **Identity Engine은 사용자의 신원을 확인(Authentication)하고, 계정을 보호(Security)하며, 인증 상태를 관리하는 것을 유일한 책임으로 한다.**
>
> 이 엔진은 특정 산업(여행, 호텔, 식당 등)을 전혀 알지 못한다.
> Identity Engine은 오직 계정(Account)과 신원(Identity)만 관리한다.

### 1.1 책임 범위 (In Scope)

- 인증 (Authentication) — 누구인가
- 인가 메타데이터 (Security Policy) — 무엇이 허용되는가
- 세션 (Session) — 언제까지 유효한가
- 자격증명 (Credential) — 어떻게 증명하는가
- 감사 (Audit) — 무엇이 일어났는가
- 알림 (Notification) — 어떤 변화를 통지하는가
- 멀티테넌시 (Tenant Configuration) — 회사가 어떻게 설정하는가

### 1.2 책임 범위 밖 (Out of Scope)

다음은 **절대** Identity Engine에 포함되지 않습니다:

- ❌ 프로필 (이름, 아바타, 자기소개, 닉네임)
- ❌ 주소
- ❌ 결제 수단
- ❌ 여권/신분증
- ❌ 여행 이력, 예약 이력, 주문 이력
- ❌ 업종별 비즈니스 데이터
- ❌ 마케팅 동의, 개인정보 동의 (별도 Compliance Engine 후보)

→ 위 데이터가 필요해지면 **별도 엔진(Profile Engine, Compliance Engine 등)**을 만들거나 Universal Core의 별도 책임 영역에서 다룹니다.

---

## 2. 설계 원칙 (Core Principles)

### 2.1 Industry Agnostic (사장님 확립)

Identity Engine은 다음 개념을 **절대 포함하지 않습니다**.

| 절대 금지 단어 | 이유 |
|---|---|
| Tour | 산업 종속 |
| Booking | 산업 종속 |
| Hotel | 산업 종속 |
| Restaurant | 산업 종속 |
| Order | 산업 종속 |
| Product | 산업 종속 |
| Payment | 산업 종속 |
| Passport | 산업 종속 |
| Travel History | 산업 종속 |

> 코드, 스키마, 이벤트, API 어느 곳에도 위 단어가 등장하면 **PR Review에서 자동 거부**.

### 2.2 Multi-Tenant (사장님 확립)

모든 데이터는 **Tenant 기반**으로 관리합니다.

각 회사는 독립적인 로그인 정책을 가질 수 있습니다.

예시 (Tenant별 ON/OFF):

- Google Login ON/OFF
- Apple Login ON/OFF
- Password Policy (최소 길이, 복잡도, 만료)
- Email Verification 필수 여부
- SMS Verification 필수 여부
- 2FA 강제 여부
- CAPTCHA 강제 여부

**모든 설정은 Tenant 단위로 저장합니다. 글로벌 설정으로 우회할 수 없습니다.**

### 2.3 Plugin-Ready (사장님 확립 — OAuth Provider)

각 OAuth Provider는 **독립적인 모듈**로 구현합니다.

새로운 Provider를 추가할 때 **기존 코드를 수정하지 않고** Provider만 추가할 수 있어야 합니다.

예시 디렉토리 구조:

```
providers/
  google/
  apple/
  facebook/
  kakao/
  naver/
  line/
  microsoft/
  custom-saml/
```

각 디렉토리는 **동일한 인터페이스**를 구현하며, 레지스트리가 동적으로 발견합니다.

### 2.4 Configuration-Over-Code (사장님 확립 — Admin Console)

관리자는 **코드를 수정하지 않고** 다음 항목을 설정할 수 있어야 합니다.

(자세한 항목은 §10 Admin Console 참조)

### 2.5 Encrypt-Everything-Sensitive (사장님 확립 — Security)

모든 민감 정보는 **암호화하여 저장**합니다.

- 비밀번호: Argon2id (해시)
- API Key, Secret: AES-256-GCM (대칭 암호)
- PII (이메일, 전화번호): 검색 가능해야 하므로 결정적 암호화 또는 토큰화
- 세션 토큰: 서명된 JWT 또는 opaque random token

### 2.6 Audit-Everything (사장님 확립 — Audit Log)

모든 인증 관련 이벤트는 **Audit Log에 기록**합니다.

삭제하지 않습니다. **법적 보존 기간**이 명시될 때까지 영구 보관.

### 2.7 API-Stability (사장님 확립 — 하위 제품 호환)

API는 하위 제품(Tour OS, Hospitality OS 등)이 **그대로 사용할 수 있도록** 안정성과 호환성을 유지합니다.

- **Major 버전**: 하위 비호환 변경 (v1 → v2)
- **Minor 버전**: 하위 호환 추가 (v1.0 → v1.1)
- **Patch 버전**: 하위 호환 버그 수정

---

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 Authentication — 지원 로그인 방식

| Provider | 지원 | 비고 |
|---|---|---|
| Email | ✅ | Email + Password |
| Username | ✅ | Username + Password |
| Phone | ✅ | Phone + Password |
| Google OAuth | ✅ | 플러그인 |
| Apple Sign In | ✅ | 플러그인 |
| Facebook | ✅ | 플러그인 |
| Microsoft | ✅ | 플러그인 |
| Kakao | ✅ | 플러그인 |
| Naver | ✅ | 플러그인 |
| LINE | ✅ | 플러그인 |
| (향후 확장) Passkey/WebAuthn | 🔜 | Sprint 6+ |

> 모든 Provider는 **설정으로 활성화/비활성화** 가능해야 합니다 (Admin Console).

### 3.2 Registration — 지원 가입 방식

| 방식 | 지원 |
|---|---|
| Email Registration | ✅ |
| Phone Registration | ✅ |
| OAuth Registration (소셜로 가입) | ✅ |

옵션 (Tenant별 ON/OFF):

- Email Verification Required
- SMS Verification Required
- Admin Approval Required

### 3.3 Verification — 인증 코드

| 방식 | 지원 |
|---|---|
| Email Link | ✅ |
| Email OTP | ✅ |
| SMS OTP | ✅ |

기능:

- 재발송 (Resend)
- 만료시간 (Expiration)
- 최대 요청 횟수 (Max Retry)
- 중복 처리 (중복 요청 시 이전 토큰 무효화)

### 3.4 Password — 비밀번호 정책

기능:

- Password Reset (이메일/SMS 링크)
- Password Change (로그인 상태)
- Password Expiration (Tenant 설정 기간)
- Password History (재사용 방지 N회)

Password Policy (Tenant별 설정):

| 정책 | 기본값 | 비고 |
|---|---|---|
| Minimum Length | 12 | [TBD: 사장님 확립 필요] |
| Require Uppercase | true | |
| Require Lowercase | true | |
| Require Number | true | |
| Require Special Character | true | |

> 모든 정책은 관리자 설정으로 변경 가능해야 합니다.

### 3.5 Security — 보안 기능

- Login Failure Count (Tenant 설정 가능)
- Account Lock (자동 + 수동)
- Unlock Policy (시간 경과, 관리자 해제, 이메일 링크)
- Rate Limiting (IP/이메일/전화번호별)
- CAPTCHA Integration (hCaptcha / reCAPTCHA / Cloudflare Turnstile)
- Suspicious Login Detection (IP 변경, 국가 변경, 디바이스 변경)
- Device Recognition (디바이스 ID 등록)
- Session Management
- Concurrent Session Control (Tenant 설정 가능)
- Force Logout (관리자 또는 사용자 본인)

### 3.6 Two-Factor Authentication

| 방식 | 지원 |
|---|---|
| Email OTP | ✅ |
| SMS OTP | ✅ |
| Authenticator App (TOTP, RFC 6238) | ✅ |

향후 확장:

- Passkey (WebAuthn)
- Hardware Security Key (FIDO2)

### 3.7 OAuth Provider (Plugin Interface)

각 Provider는 **독립적인 모듈**로 구현합니다.

**필수 인터페이스** (자세한 건 `10-plugin-architecture.md`):

```typescript
interface AuthProvider {
  id: string;                          // 'google', 'apple', ...
  type: 'oauth2' | 'oidc' | 'saml' | 'magic-link';
  initiate(state: AuthState): Promise<RedirectResult>;
  callback(req: CallbackRequest): Promise<ProviderIdentity>;
  refresh?(refreshToken: string): Promise<ProviderTokens>;
  revoke?(accessToken: string): Promise<void>;
  verifyIdToken?(idToken: string): Promise<ProviderIdentity>;
}
```

새 Provider 추가는 `providers/<name>/index.ts` 1개 파일 추가 + 매니페스트 등록으로 끝납니다.

### 3.8 Credential Manager — Tenant별 인증 정보

각 Tenant는 자신의 외부 서비스 자격증명을 가집니다.

자격증명 종류:

| 종류 | 필드 |
|---|---|
| Google OAuth | Client ID, Client Secret |
| Apple Sign In | Service ID, Team ID, Key ID, Private Key |
| Facebook | App ID, App Secret |
| Kakao | REST API Key, Admin Key |
| Naver | Client ID, Client Secret |
| LINE | Channel ID, Channel Secret |
| Microsoft | Client ID, Client Secret, Tenant ID |
| SMTP | Host, Port, Username, Password |
| SMS (Twilio 등) | SID, Token, From Number |
| OpenAI | API Key |
| Anthropic | API Key |
| ... 무한 확장 가능 | (플러그인) |

**저장 방식**: AES-256-GCM으로 암호화하여 DB에 저장. 복호화 키는 KMS/환경변수.

### 3.9 Session

- Remember Me (Tenant 설정 가능, 기본 30일)
- Session Timeout (기본 1시간, Tenant 설정 가능)
- Device List (사용자가 모든 로그인 기기 확인)
- Active Sessions (현재 유효한 세션 목록)
- Remote Logout (특정 세션 / 전체 세션 강제 종료)

### 3.10 Audit Log

기록 이벤트 (사장님 확립):

| Event | 기록 |
|---|---|
| Login Success | ✅ |
| Login Failure | ✅ |
| Logout | ✅ |
| Password Change | ✅ |
| Password Reset Request | ✅ |
| Password Reset Complete | ✅ |
| Email Change | ✅ |
| Phone Change | ✅ |
| Provider Link (소셜 계정 연결) | ✅ |
| Provider Unlink (소셜 계정 해제) | ✅ |
| 2FA Enable | ✅ |
| 2FA Disable | ✅ |
| Account Lock | ✅ |
| Account Unlock | ✅ |
| Admin Force Logout | ✅ |
| Suspicious Login Detected | ✅ |

> **삭제하지 않습니다.** Append-only.

### 3.11 Notification

| 이벤트 | 채널 |
|---|---|
| New Login (새 디바이스/지역) | Email |
| Password Changed | Email |
| Email Changed | Email + SMS (이전 이메일로) |
| Phone Changed | SMS |
| Account Locked | Email + SMS |

채널:

- ✅ Email
- ✅ SMS
- 🔜 Push (향후)

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

### 4.1 Performance

| 항목 | 목표 | 비고 |
|---|---|---|
| Login API 응답시간 | p95 < 300ms | [TBD: 사장님 확립 필요] |
| Session 검증 시간 | p95 < 50ms | JWT 서명 검증 |
| Rate Limit 검사 | p95 < 5ms | Redis Lookup |
| Audit Log 기록 | 비동기 (응답 지연 없음) | Event Bus 후처리 |

### 4.2 Availability

- 목표: 99.9% (월 43분 다운타임 허용)
- DB: Primary + Read Replica
- Session Store: Redis Cluster (또는 동등)
- 다중 리전: Phase 2+

### 4.3 Scalability

- 1 Tenant당 사용자 수: [TBD: 사장님 확립 필요]
- 동시 로그인 가능 사용자 수: [TBD: 사장님 확립 필요]
- 초당 인증 요청: [TBD: 사장님 확립 필요]

### 4.4 Security

- 모든 통신: TLS 1.2+ (TLS 1.3 권장)
- 비밀번호 해시: Argon2id (메모리 ≥ 64MB, 시간 ≥ 3)
- API Key/Token: AES-256-GCM
- SQL Injection 방지: 파라미터화된 쿼리 (ORM)
- XSS 방지: 입력 검증 + 출력 인코딩
- CSRF 방지: SameSite Cookie + CSRF Token
- Secrets 관리: 환경변수 또는 KMS (절대 코드/저장소에 평문 저장 금지)
- Audit Log 무결성: Append-only + 해시 체인 (변조 방지)

### 4.5 Compliance

- GDPR: Right to be forgotten (Account 삭제 — Audit Log는 보존)
- GDPR: Data portability (Account 데이터 export)
- 한국 개인정보보호법: PII 분리 저장 + 암호화
- SOC 2: Audit Log + 접근 제어 (Phase 2)

### 4.6 Observability

- 구조화 로그 (JSON)
- 메트릭: Prometheus 호환
- 트레이싱: OpenTelemetry
- Audit Log: 자체 저장 (변조 방지)

### 4.7 Internationalization

- Identity Engine은 다국어 메시지를 지원
- 기본: 영어
- 추가: 한국어, 일본어, 중국어 (Tenant 설정)

---

## 5. 데이터 도메인 (Database Domain)

PRD가 명시한 9개 도메인:

```
- Users
- UserIdentities
- AuthProviders
- Credentials
- Sessions
- VerificationTokens
- PasswordResets
- SecurityPolicies
- AuditLogs
```

**절대 저장하지 않는 것** (재확인):

- ❌ 프로필 (이름, 닉네임, 아바타, 자기소개)
- ❌ 주소
- ❌ 여권/신분증
- ❌ 결제 수단
- ❌ 업종 관련 데이터

> 사장님 확립: "Profile 정보는 저장하지 않는다. 주소도 저장하지 않는다. 여권도 저장하지 않는다. 업종 관련 데이터는 저장하지 않는다."

자세한 스키마는 `04-db-schema.md` + `db/schema.sql`.

---

## 6. API (REST + Service Layer)

REST API 기본 형태 (자세한 건 `06-api-spec.yaml`):

| Endpoint | Method | 설명 |
|---|---|---|
| `/auth/login` | POST | 이메일/전화/사용자명 + 비밀번호 로그인 |
| `/auth/register` | POST | 신규 가입 |
| `/auth/logout` | POST | 현재 세션 종료 |
| `/auth/logout-all` | POST | 모든 세션 종료 |
| `/auth/password/reset` | POST | 재설정 메일 발송 |
| `/auth/password/change` | POST | 로그인 상태에서 비밀번호 변경 |
| `/auth/password/reset/confirm` | POST | 재설정 링크 확인 |
| `/auth/verify/email` | POST | 이메일 인증 코드 확인 |
| `/auth/verify/email/request` | POST | 이메일 인증 코드 발송 |
| `/auth/verify/sms` | POST | SMS 인증 코드 확인 |
| `/auth/verify/sms/request` | POST | SMS 인증 코드 발송 |
| `/auth/2fa/setup` | POST | 2FA 설정 시작 |
| `/auth/2fa/verify` | POST | 2FA 코드 확인 |
| `/auth/2fa/disable` | POST | 2FA 비활성화 |
| `/auth/oauth/{provider}/initiate` | GET | OAuth 시작 |
| `/auth/oauth/{provider}/callback` | GET | OAuth 콜백 |
| `/auth/oauth/link` | POST | OAuth 계정 연결 |
| `/auth/oauth/unlink` | POST | OAuth 계정 해제 |
| `/auth/sessions` | GET | 활성 세션 목록 |
| `/auth/sessions/{id}` | DELETE | 특정 세션 종료 |
| `/auth/me` | GET | 현재 인증된 신원 조회 |
| `/.well-known/jwks.json` | GET | JWT 검증용 공개키 |

Admin Console API (별도 prefix `/admin/auth`):

| Endpoint | Method | 설명 |
|---|---|---|
| `/admin/auth/providers` | GET/POST/PATCH/DELETE | Provider 설정 관리 |
| `/admin/auth/policy` | GET/PATCH | 보안 정책 관리 |
| `/admin/auth/credentials` | GET/POST/PATCH/DELETE | Credential 관리 |
| `/admin/auth/users/{id}/lock` | POST | 사용자 계정 잠금 |
| `/admin/auth/users/{id}/unlock` | POST | 사용자 계정 잠금 해제 |
| `/admin/auth/users/{id}/sessions` | DELETE | 사용자 세션 강제 종료 |
| `/admin/auth/audit-logs` | GET | Audit Log 조회 |

---

## 7. Admin Console 요구사항

관리자는 **코드를 수정하지 않고** 다음 항목을 설정할 수 있어야 합니다 (사장님 확립):

### 7.1 Authentication 설정

- [ ] Enable Email Login
- [ ] Enable Phone Login
- [ ] Enable Username Login
- [ ] Enable Google
- [ ] Enable Apple
- [ ] Enable Facebook
- [ ] Enable Kakao
- [ ] Enable Naver
- [ ] Enable LINE
- [ ] Enable Microsoft
- [ ] Enable Passkey (Phase 2+)

### 7.2 Verification 설정

- [ ] Email Verification Required
- [ ] SMS Verification Required
- [ ] Verification Code Expiration (분)
- [ ] Max Retry Count

### 7.3 Password Policy 설정

- [ ] Minimum Length
- [ ] Require Number
- [ ] Require Uppercase
- [ ] Require Lowercase
- [ ] Require Special Character
- [ ] Password Expiration (일)
- [ ] Password History Count

### 7.4 Security 설정

- [ ] Login Retry Limit
- [ ] Lock Duration (분)
- [ ] Session Timeout (분)
- [ ] Remember Me Duration (일)
- [ ] Enable 2FA (Optional / Required)
- [ ] Enable CAPTCHA
- [ ] CAPTCHA Provider (hCaptcha / reCAPTCHA / Turnstile)
- [ ] Max Concurrent Sessions per User
- [ ] Suspicious Login Detection Sensitivity

자세한 UX는 `12-admin-console.md`.

---

## 8. 향후 확장 (Future Scope)

다음은 **현재 범위 밖**이지만, 설계를 할 때 미리 고려해 둡니다:

- Passkey / WebAuthn (Sprint 6+)
- Hardware Security Key (FIDO2)
- Magic Link (비밀번호 없는 로그인)
- SSO (SAML 2.0)
- SCIM (프로비저닝)
- Advanced Fraud Detection (ML 기반)
- Biometric (모바일 SDK 연동)
- Decentralized Identity (DID/VC)

> 위 확장은 **기존 코드를 수정하지 않고** 플러그인/Provider 추가로 처리되어야 합니다.

---

## 9. ADR (Architecture Decision Records)

Identity Engine은 **설계 변경 시 ADR**을 남깁니다.

PRD 자체가 다음 결정을 **사장님이 확립**했습니다:

- ADR-001: Industry Agnostic 원칙 (절대 금지 단어 목록)
- ADR-002: Multi-Tenant (Shared Schema + Tenant ID 컬럼)
- ADR-003: Plugin Architecture (OAuth Provider 무수정 추가)
- ADR-004: Configuration Over Code (Admin Console)
- ADR-005: Encrypt Everything Sensitive
- ADR-006: Audit Everything
- ADR-007: API Stability Guarantee

향후 모든 결정은 ADR-NNN으로 기록.

---

## 10. [TBD: 사장님 확립 필요]

다음은 **PRD에 명시되지 않은 항목**으로, 사장님이 직접 정해주셔야 합니다:

| 항목 | 현재 상태 | 비고 |
|---|---|---|
| Performance 목표치 (p95 응답시간) | [TBD] | 기본 제안: Login p95 < 300ms |
| Scalability 목표치 (사용자/요청 수) | [TBD] | |
| Password 정책 기본값 | [TBD] | 기본 제안: 12자 + 대소문자+숫자+특수문자 |
| 기본 Session Timeout | [TBD] | 기본 제안: 1시간 |
| 기본 Remember Me 기간 | [TBD] | 기본 제안: 30일 |
| Lock Duration 기본값 | [TBD] | 기본 제안: 30분 |
| Rate Limit 정책 | [TBD] | 기본 제안: 5회/15분/IP |
| Session 저장소 | [TBD] | 기본 제안: Redis Cluster |
| Audit Log 보존 기간 | [TBD] | 기본 제안: 무기한 (법적 요구 우선) |
| GDPR Right-to-be-Forgotten 처리 | [TBD] | 기본 제안: User 행 삭제, Audit는 해시된 ID만 보존 |
| 다국어 지원 범위 | [TBD] | 기본 제안: EN 필수, KO/JA/ZH 옵션 |

---

**End of PRD v1.0**