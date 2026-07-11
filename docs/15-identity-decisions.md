# Identity Decisions — Canonical Source of Truth

**Version**: v1.0-draft
**Status**: ⏸ Frozen Pending — 사장님 검토 대기
**Effective Date**: 2026-07-11 (Sprint 1 설계 동결)
**Last Reviewed**: —
**Owner**: 사장님 (박흥식 / Tim Park)

---

## 0. 이 문서의 위치

```
┌─────────────────────────────────────────────────────────────────┐
│  이 문서는 Identity Engine의 모든 미결정 사항을 모은 곳이다.      │
│                                                                  │
│  ★ 이 문서가 canonical source of truth.                          │
│  ★ 다른 문서(PRD/TRD/Admin Console 등)는 이 문서를 참조.          │
│  ★ Sprint 2 시작 전 사장님이 직접 결정해야 함.                    │
│  ★ Status = Draft 인 항목만 미결정.                                │
│  ★ AI는 값을 추측하여 박지 않는다.                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 사장님 헌법 (이 문서에 적용)

> **"사람이 직접 정하지 않은 것은 박지 않는다."**
> **"AI가 추측해 박은 1차 초안은 draft-superseded 표시 후 사장님 입력 대기."**

따라서:
- **Current Value**: 사장님이 확립한 값이 있으면 기록. 없으면 빈 값.
- **Recommended Value**: AI가 제시하는 권장값 (참고용). 사장님 확립 아님.
- **Status**:
  - `Draft` — 사장님 미결정 (대부분)
  - `Approved` — 사장님이 확립함
  - `Deprecated` — 더 이상 적용 안 됨

### Decision ID 규칙

```
D-<SECTION_CODE>-<NUMBER>

SECTION_CODE:
  AUTH    = Authentication Policy
  REG     = Registration Policy
  PWD     = Password Policy
  VER     = Verification Policy
  SEC     = Security Policy
  SESS    = Session Policy
  OAUTH   = OAuth Provider Policy
  TENANT  = Multi-Tenant Policy
  AUDIT   = Audit Policy
  CONFIG  = Configuration Policy

예: D-AUTH-001, D-PWD-005, D-SEC-012
```

---

## Decision Checklist (요약)

> 사장님이 검토하실 때 이 체크리스트를 사용하세요.
> Level 1 (반드시 먼저) → Level 2 → Level 3 순서.

### 🟥 Level 1 — Critical (Identity Lifecycle) — 사장님 우선 지정

| ID | 결정 | Status |
|---|---|---|
| D-AUTH-001 | 이메일 중복 허용 여부 (Tenant 내 / Platform 전체) | Draft |
| D-AUTH-002 | 전화번호 중복 허용 여부 (Tenant 내 / Platform 전체) | Draft |
| D-AUTH-003 | Link Account 정책 (Email + Google 동시 연결 허용?) | Draft |
| D-REG-001 | 이메일 변경 정책 | Draft |
| D-REG-002 | 전화번호 변경 정책 | Draft |
| D-REG-003 | 계정 삭제 정책 (Self-Service / Admin Only / 불가) | Draft |
| D-REG-004 | Soft Delete / Hard Delete | Draft |
| D-TENANT-001 | Tenant 간 동일 이메일 처리 방식 | Draft |

### 🟧 Level 2 — Operational (PRD §3 / 기존 검토)

| ID | 결정 | Status |
|---|---|---|
| D-PWD-001~006 | Password 정책 6개 | Draft |
| D-SEC-001~006 | Login Retry / Lock / Rate Limit / CAPTCHA | Draft |
| D-SESS-001~006 | Session 정책 6개 | Draft |

### 🟨 Level 3 — Extensibility (OAuth / MFA / Passkey)

| ID | 결정 | Status |
|---|---|---|
| D-OAUTH-001~005 | OAuth Provider 정책 | Draft |
| D-VER-001~006 | Verification 정책 | Draft |
| D-CONFIG-001~006 | Configuration 정책 | Draft |
| D-AUDIT-001~004 | Audit 정책 | Draft |

---

# ═══════════════════════════════════════════════════════════════
# Level 1 — Critical (사장님 우선 지정)
# ═══════════════════════════════════════════════════════════════

## 1. Authentication Policy

### D-AUTH-001 — 이메일 중복 허용 여부

| 필드 | 값 |
|---|---|
| **Description** | 같은 이메일 주소를 여러 User가 가질 수 있는가? (단, Tenant 내에서 / Platform 전체 기준) |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | (a) `Unique per Tenant` — Tenant 내에서는 unique, 다른 Tenant에서는 허용<br>(b) `Unique Platform-Wide` — Platform 전체에서 unique (1인 1계정)<br>(c) `Unique with Verified` — 미인증 이메일은 중복 허용, 인증된 이메일만 unique<br>(d) `Always Allow` — 중복 허용 (권장하지 않음) |
| **Recommended Value** | *(AI가 추측하지 않음 — 사장님 확립 필요)* |
| **Reason** | 이 결정은 `user_identities.identifier_hash`의 unique 인덱스 정책에 직접 영향을 미친다. Platform-wide unique는 사용자가 여러 회사를 쓰는 경우 마이그레이션을 막는다. Tenant-unique는 보안 사고 시 enumeration에 노출. |
| **Impact** | **(a)**: Multi-tenant SaaS 표준 패턴. schema.sql에 정의된 `(tenant_id, type, identifier_hash) UNIQUE` 그대로 사용 가능.<br>**(b)**: `user_identities.identifier_hash`에 Platform-wide unique 인덱스 추가 필요. Google OAuth 같은 외부 신원과 충돌.<br>**(c)**: `verified=true`인 행에만 unique partial index 필요.<br>**(d)**: enumeration 가능, Audit Log 노이즈. |
| **Status** | 🟥 Draft |

---

### D-AUTH-002 — 전화번호 중복 허용 여부

| 필드 | 값 |
|---|---|
| **Description** | 같은 전화번호를 여러 User가 가질 수 있는가? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | D-AUTH-001과 동일 옵션 (Tenant / Platform-Wide / Verified / Always) |
| **Recommended Value** | *(AI가 추측하지 않음 — 사장님 확립 필요)* |
| **Reason** | 전세계 가정에는 가족이 번호를 공유하는 경우도 있고, 한 사람이 여러 회사를 쓸 때도 있다. E.164 정규화 후의 동일성을 보장해야 함. |
| **Impact** | D-AUTH-001과 동일한 schema 영향. SMS 발송 시 비용 영향 (같은 번호로 중복 발송 방지). |
| **Status** | 🟥 Draft |

---

### D-AUTH-003 — Link Account 정책 (Email + Google 동시 연결)

| 필드 | 값 |
|---|---|
| **Description** | 하나의 User가 Email/Password + Google OAuth를 동시에 가질 수 있는가? 한 명당 인증 수단은 N개? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | (a) `Multi-Credential Per User` — User가 여러 Credential 보유 가능<br>(b) `One Credential Per User` — 단일 인증 수단만<br>(c) `Multi-OAuth + One Password` — OAuth는 여러 개 가능, Password는 1개<br>(d) `Multi-OAuth + Optional Password` — Password는 없을 수도 있음 (소셜 only) |
| **Recommended Value** | *(AI가 추측하지 않음 — 사장님 확립 필요)* |
| **Reason** | 사용자가 Google로 가입한 후 Password를 추가하는 흐름. 또는 Password로 가입한 후 Google을 Link. schema.sql은 이미 `credentials.password` unique + `credentials.oauth_*` unique로 분리되어 있어 어느 정책이든 표현 가능. 단, **"마지막 인증 수단 삭제 불가"** 같은 추가 규칙이 필요할 수 있음. |
| **Impact** | **(a)**: 가장 유연. Account enumeration 위험 ↓ (identifier가 여러 개).<br>**(b)**: 가장 단순. 단, OAuth 제공자가 사라지면 User 복구 불가.<br>**(c)(d)**: Google OAuth 강제 환경에서 자연스러움. |
| **Status** | 🟥 Draft |

---

## 2. Registration Policy

### D-REG-001 — 이메일 변경 정책

| 필드 | 값 |
|---|---|
| **Description** | 사용자가 본인 이메일을 변경할 때 어떤 검증/알림/세션 처리를 할 것인가? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | (a) `Verify New + Notify Old` — 새 이메일 인증 후 변경, 옛 이메일로 알림<br>(b) `Verify New Only` — 새 이메일만 인증<br>(c) `Verify Old + Verify New` — 양쪽 모두 인증 (가장 안전)<br>(d) `Admin Approval Required` — 관리자 승인 후 변경<br>(e) `Email Immutable` — 변경 불가 |
| **Recommended Value** | *(AI가 추측하지 않음 — 사장님 확립 필요)* |
| **Reason** | 계정 탈취 시 공격자가 이메일을 변경하면 비밀번호 재설정까지 가능. 강력한 검증 필수. |
| **Impact** | **(a)**: UX + 보안 균형. 표준.<br>**(c)**: 가장 안전. 단, 옛 이메일 접근 불가하면 갇힘.<br>**(e)**: username 같은 대체 식별자 필요. |
| **Status** | 🟥 Draft |

---

### D-REG-002 — 전화번호 변경 정책

| 필드 | 값 |
|---|---|
| **Description** | 전화번호 변경 시 검증/알림 처리 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | D-REG-001과 동일 옵션 (a)~(e) |
| **Recommended Value** | *(AI가 추측하지 않음 — 사장님 확립 필요)* |
| **Reason** | SMS OTP 기반 MFA 사용자에서 전화번호 변경은 MFA 우회 가능. 2FA 재확인 필수일 수 있음. |
| **Impact** | D-REG-001과 유사. 2FA 사용자에게는 추가 인증 요구 권장. |
| **Status** | 🟥 Draft |

---

### D-REG-003 — 계정 삭제 정책

| 필드 | 값 |
|---|---|
| **Description** | 사용자가 자기 계정을 삭제할 수 있는가? 누가? 어떻게? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | (a) `Self-Service Soft Delete` — 사용자가 직접 비활성화 (`disabled` status)<br>(b) `Self-Service Hard Delete` — 사용자가 즉시 완전 삭제 (GDPR)<br>(c) `Grace Period + Self-Service` — 30일 유예 후 자동 삭제<br>(d) `Admin Only` — 사용자 본인 삭제 불가, 관리자만<br>(e) `Not Allowed` — 삭제 불가 (비활성화만) |
| **Recommended Value** | *(AI가 추측하지 않음 — 사장님 확립 필요)* |
| **Reason** | GDPR Article 17 "Right to Erasure"는 EU 사용자에게 삭제 권리를 부여. 하지만 다른 엔진이 참조하는 User ID가 있으면 cascade 필요. |
| **Impact** | **(a)**: 가장 일반적. Audit Log는 유지.<br>**(b)**: GDPR 완전 준수. 단, 다른 시스템의 FK가 깨짐.<br>**(c)**: 표준 SaaS 패턴. 실수 복구 가능.<br>**(d)**: B2B 환경에서 흔함. |
| **Status** | 🟥 Draft |

---

### D-REG-004 — Soft Delete / Hard Delete

| 필드 | 값 |
|---|---|
| **Description** | User 삭제 시 row 자체를 지우는가? 아니면 `deleted_at`만 설정하는가? |
| **Current Value** | schema.sql에 `users.deleted_at`, `user_identities.deleted_at`, `credentials.deleted_at` 컬럼 정의됨 |
| **Allowed Values** | (a) `Soft Delete Only` — `deleted_at` 설정, row 유지<br>(b) `Soft by Default, Hard on Request` — 기본 soft, GDPR 요청 시 hard<br>(c) `Hard Delete Always` — 즉시 row 삭제<br>(d) `Anonymize` — PII는 삭제, FK는 유지 (UUID만 남김) |
| **Recommended Value** | *(AI가 추측하지 않음 — 사장님 확립 필요)* |
| **Reason** | D-REG-003과 강하게 결합. 또한 Audit Log의 hash chain 무결성에도 영향 (user_id가 사라지면 chain이 깨짐). |
| **Impact** | **(a)**: 모든 unique partial index가 `WHERE deleted_at IS NULL`로 동작. 단순.<br>**(b)**: 가장 현실적. Audit Log는 hash로 anonymize.<br>**(d)**: 가장 안전. schema.sql의 `password_history`나 `audit_logs`의 user_id를 NULL로 설정. |
| **Status** | 🟥 Draft |

---

## 3. Multi-Tenant Policy

### D-TENANT-001 — Tenant 간 동일 이메일 처리 방식

| 필드 | 값 |
|---|---|
| **Description** | 사장님(같은 사람)이 회사 A와 회사 B에서 가입할 때 같은 이메일을 쓸 수 있는가? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | (a) `Independent per Tenant` — Tenant마다 독립 (D-AUTH-001이 Tenant-unique일 때 자연스러움)<br>(b) `Cross-Tenant Link` — 같은 이메일을 쓰는 User 발견 시 자동으로 통합<br>(c) `Cross-Tenant Block` — 다른 Tenant에서 이미 가입된 이메일은 거부<br>(d) `Cross-Tenant Verify-Then-Link` — 양쪽 Tenant에서 이메일 인증 후 통합 |
| **Recommended Value** | *(AI가 추측하지 않음 — 사장님 확립 필요)* |
| **Reason** | 사장님 본인 사례: AI Bridge Georgia 외에 다른 회사 시스템에서도 같은 박흥식@gmail.com 가입. (a)가 가장 흔하지만, password 재사용 위험. (c)는 UX 저하. (b)/(d)는 강력한 데이터 모델 필요. |
| **Impact** | **(a)**: schema 그대로. 가장 단순.<br>**(b)(d)**: 별도 `cross_tenant_links` 테이블 필요. Universal Core 책임. |
| **Status** | 🟥 Draft |

---

# ═══════════════════════════════════════════════════════════════
# Level 2 — Operational
# ═══════════════════════════════════════════════════════════════

## 4. Password Policy

### D-PWD-001 — Password 최소 길이

| 필드 | 값 |
|---|---|
| **Description** | 비밀번호 최소 글자 수 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `8` / `10` / `12` / `14` / `16` / `[Tenant 설정 가능, 최소값 사장님 확립]` |
| **Recommended Value** | `12` (사장님 확립 필요) |
| **Reason** | NIST SP 800-63B는 8자 이상 권장. OWASP는 12자 이상 권장. 16자 이상은 엔터프라이즈. |
| **Impact** | 8자: 호환성 ↑, 보안 ↓. 16자: 보안 ↑, UX ↓. |
| **Status** | 🟧 Draft |

### D-PWD-002 — Password 만료 기간

| 필드 | 값 |
|---|---|
| **Description** | 비밀번호를 강제로 바꾸게 하는 주기 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `null` (무기한) / `30` / `60` / `90` / `180` / `365` (일) |
| **Recommended Value** | `null` (NIST 2024 권장) |
| **Reason** | NIST SP 800-63B 2024는 정기 만료 폐기 권장. 단, 사고 후 즉시 변경은 권장. |
| **Impact** | 만료 설정 시 사용자 불만 ↑. 무기한이면 피싱 사고 후 위험 ↑. |
| **Status** | 🟧 Draft |

### D-PWD-003 — Password 이력 보관 개수

| 필드 | 값 |
|---|---|
| **Description** | 최근 N개의 비밀번호와 동일하면 변경 거부 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `0` (검사 안 함) / `3` / `5` / `10` / `24` |
| **Recommended Value** | `5` |
| **Reason** | 재사용 방지로 ABC123 → 123ABC 같은 순환 패턴 차단. |
| **Impact** | 클수록 보안 ↑, 스토리지 ↑ (해시만 보관하므로 작음). |
| **Status** | 🟧 Draft |

### D-PWD-004 — Argon2id 메모리 (KB)

| 필드 | 값 |
|---|---|
| **Description** | Argon2id 해시 함수 메모리 비용 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `19456` (19 MiB, OWASP 최소) / `65536` (64 MiB) / `131072` (128 MiB) |
| **Recommended Value** | `65536` (64 MiB) |
| **Reason** | GPU 공격 저항성. 메모리 ↑ = 공격 비용 ↑. |
| **Impact** | 메모리 ↑ = 서버 응답 시간 ↑. 호스트 인프라 비용. |
| **Status** | 🟧 Draft |

### D-PWD-005 — Argon2id iterations

| 필드 | 값 |
|---|---|
| **Description** | Argon2id 시간 비용 (반복 횟수) |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `1` / `2` / `3` / `4` |
| **Recommended Value** | `3` |
| **Status** | 🟧 Draft |

### D-PWD-006 — Argon2id parallelism

| 필드 | 값 |
|---|---|
| **Description** | Argon2id 병렬 lanes |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `1` / `2` / `4` |
| **Recommended Value** | `1` |
| **Status** | 🟧 Draft |

---

## 5. Security Policy

### D-SEC-001 — Login Max Failures

| 필드 | 값 |
|---|---|
| **Description** | 연속 실패 횟수 임계치 (초과 시 계정 잠금) |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `3` / `5` / `10` / `[Tenant 설정 가능]` |
| **Recommended Value** | `5` |
| **Status** | 🟧 Draft |

### D-SEC-002 — Lock Duration (분)

| 필드 | 값 |
|---|---|
| **Description** | 계정 자동 잠금 해제까지 시간 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `15` / `30` / `60` / `1440` (24시간) / `null` (수동 해제만) |
| **Recommended Value** | `30` |
| **Status** | 🟧 Draft |

### D-SEC-003 — Rate Limit Per IP

| 필드 | 값 |
|---|---|
| **Description** | 동일 IP에서 단위 시간 내 최대 요청 수 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `[3 req / 15min]` / `[5 req / 15min]` / `[10 req / 15min]` |
| **Recommended Value** | `5 req / 15min` |
| **Status** | 🟧 Draft |

### D-SEC-004 — Rate Limit Per Identifier

| 필드 | 값 |
|---|---|
| **Description** | 동일 식별자(이메일/전화)에서 단위 시간 내 최대 요청 수 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `[5 req / 15min]` / `[10 req / 15min]` |
| **Recommended Value** | `10 req / 15min` |
| **Status** | 🟧 Draft |

### D-SEC-005 — CAPTCHA 기본 활성화

| 필드 | 값 |
|---|---|
| **Description** | 모든 로그인 폼에 CAPTCHA 기본 표시? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Disabled` / `Enabled After N Failures` / `Always Enabled` |
| **Recommended Value** | `Enabled After 3 Failures` |
| **Status** | 🟧 Draft |

### D-SEC-006 — CAPTCHA Provider

| 필드 | 값 |
|---|---|
| **Description** | 기본 CAPTCHA 제공자 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `hCaptcha` / `reCAPTCHA` / `Cloudflare Turnstile` |
| **Recommended Value** | *(AI가 추측하지 않음 — 사장님 확립 필요)* |
| **Status** | 🟧 Draft |

---

## 6. Session Policy

### D-SESS-001 — Session Timeout (분)

| 필드 | 값 |
|---|---|
| **Description** | 비활성 세션 만료 시간 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `15` / `30` / `60` / `240` (4시간) / `480` (8시간) |
| **Recommended Value** | `60` |
| **Status** | 🟧 Draft |

### D-SESS-002 — Remember Me (일)

| 필드 | 값 |
|---|---|
| **Description** | Remember Me 체크 시 세션 유지 기간 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `7` / `14` / `30` / `60` / `90` |
| **Recommended Value** | `30` |
| **Status** | 🟧 Draft |

### D-SESS-003 — Max Concurrent Sessions

| 필드 | 값 |
|---|---|
| **Description** | 한 User의 동시 활성 세션 수 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `1` / `3` / `5` / `null` (무제한) |
| **Recommended Value** | `null` (무제한) |
| **Status** | 🟧 Draft |

### D-SESS-004 — Session Token 형식

| 필드 | 값 |
|---|---|
| **Description** | 세션 토큰의 byte length, prefix |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `(256-bit, no prefix)` / `(256-bit, sts_ prefix)` / `(512-bit, no prefix)` |
| **Recommended Value** | `256-bit, sts_ prefix` (스캐너 회피) |
| **Status** | 🟧 Draft |

### D-SESS-005 — JWT 사용 여부

| 필드 | 값 |
|---|---|
| **Description** | Access Token을 JWT로 발급? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Opaque Token Only` / `JWT Only` / `Both (Hybrid)` |
| **Recommended Value** | `Both (Hybrid)` |
| **Status** | 🟧 Draft |

### D-SESS-006 — JWT Refresh Token 정책

| 필드 | 값 |
|---|---|
| **Description** | Refresh Token 만료 시간 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `null` (없음) / `7 days` / `30 days` / `60 days` |
| **Recommended Value** | `30 days` |
| **Status** | 🟧 Draft |

---

# ═══════════════════════════════════════════════════════════════
# Level 3 — Extensibility
# ═══════════════════════════════════════════════════════════════

## 7. Verification Policy

### D-VER-001 — Email Verification 기본값

| 필드 | 값 |
|---|---|
| **Description** | 신규 가입 시 이메일 인증이 필수인가? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Optional` / `Required` |
| **Recommended Value** | `Required` (보안 우선) 또는 `Optional` (UX 우선) |
| **Status** | 🟨 Draft |

### D-VER-002 — Phone Verification 기본값

| 필드 | 값 |
|---|---|
| **Description** | 신규 가입 시 전화 인증이 필수인가? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Optional` / `Required` |
| **Recommended Value** | `Optional` |
| **Status** | 🟨 Draft |

### D-VER-003 — Verification Code 만료 (분)

| 필드 | 값 |
|---|---|
| **Description** | 이메일/SMS 인증 코드 유효 시간 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `5` / `10` / `15` / `30` / `60` |
| **Recommended Value** | `15` |
| **Status** | 🟨 Draft |

### D-VER-004 — Verification Max Attempts

| 필드 | 값 |
|---|---|
| **Description** | 인증 코드 최대 시도 횟수 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `3` / `5` / `10` |
| **Recommended Value** | `5` |
| **Status** | 🟨 Draft |

### D-VER-005 — Admin Approval 기본값

| 필드 | 값 |
|---|---|
| **Description** | 신규 가입 시 관리자 승인 필요 여부 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Disabled` / `Enabled` |
| **Recommended Value** | `Disabled` |
| **Status** | 🟨 Draft |

### D-VER-006 — Verification Code 형식

| 필드 | 값 |
|---|---|
| **Description** | 코드 자릿수 (numeric / alphanumeric) |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `6 digits numeric` / `8 digits numeric` / `9 chars alphanumeric` |
| **Recommended Value** | `6 digits numeric` |
| **Status** | 🟨 Draft |

---

## 8. OAuth Provider Policy

### D-OAUTH-001 — 기본 활성화 Provider 목록

| 필드 | 값 |
|---|---|
| **Description** | 새 Tenant 생성 시 기본 활성화되는 OAuth Provider |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `none` / `google,kakao` / `google,apple` / `[사장님 확립]` |
| **Recommended Value** | *(AI가 추측하지 않음)* |
| **Status** | 🟨 Draft |

### D-OAUTH-002 — Tenant 간 OAuth Credential 공유

| 필드 | 값 |
|---|---|
| **Description** | 같은 회사가 여러 Tenant를 쓸 때 OAuth Credential 공유? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Per-Tenant` / `Shared with permission` |
| **Recommended Value** | `Per-Tenant` |
| **Status** | 🟨 Draft |

### D-OAUTH-003 — OAuth Link 시 Identifier 검증

| 필드 | 값 |
|---|---|
| **Description** | Google OAuth로 가입한 후 Email 추가 시, Provider의 email_verified 신뢰? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Trust Provider Verified` / `Always Re-Verify` |
| **Recommended Value** | `Trust Provider Verified` |
| **Status** | 🟨 Draft |

### D-OAUTH-004 — Unlink 정책

| 필드 | 값 |
|---|---|
| **Description** | OAuth 계정 연결 해제 시 마지막 인증 수단 보호? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Block Unlink Last` / `Allow Unlink Always` |
| **Recommended Value** | `Block Unlink Last` |
| **Status** | 🟨 Draft |

### D-OAUTH-005 — Schema 진화 정책

| 필드 | 값 |
|---|---|
| **Description** | 새 OAuth Provider 추가 시 DB 스키마 CHECK 제약 업데이트? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Explicit CHECK (Phase 1)` / `Dynamic Discovery (Phase 2)` |
| **Recommended Value** | `Explicit CHECK (Phase 1)`, then migrate |
| **Status** | 🟨 Draft |

---

## 9. Multi-Tenant Policy (기존 항목 + Tenant 격리)

### D-TENANT-002 — Tenant 격리 강제 수준

| 필드 | 값 |
|---|---|
| **Description** | RLS 강제 vs Engine 코드 tenant_id 명시 |
| **Current Value** | schema.sql은 둘 다 적용 |
| **Allowed Values** | `RLS Only` / `Engine Code Only` / `Both (Defense in Depth)` |
| **Recommended Value** | `Both (Defense in Depth)` |
| **Status** | 🟨 Draft (현재 구현 상태 그대로) |

### D-TENANT-003 — 최소 1개 Provider 활성화

| 필드 | 값 |
|---|---|
| **Description** | Tenant가 모든 인증 수단을 비활성화할 수 있는가? |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Allow Empty` / `Require Min 1` |
| **Recommended Value** | `Require Min 1` |
| **Status** | 🟨 Draft |

---

## 10. Audit Policy

### D-AUDIT-001 — Audit Log 보존 기간

| 필드 | 값 |
|---|---|
| **Description** | audit_logs row 보관 기간 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `null` (무기한) / `365` / `730` (2년) / `2555` (7년) |
| **Recommended Value** | `null` (무기한, 법적 요구 우선) |
| **Status** | 🟨 Draft |

### D-AUDIT-002 — GDPR Right-to-be-Forgotten 처리

| 필드 | 값 |
|---|---|
| **Description** | User 삭제 요청 시 Audit Log 처리 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | (a) `Anonymize user_id to NULL` (hash chain 유지)<br>(b) `Delete user_id` (chain 단절, integrity 손상)<br>(c) `Keep full record with legal basis` |
| **Recommended Value** | *(AI가 추측하지 않음)* |
| **Status** | 🟨 Draft |

### D-AUDIT-003 — IP 로깅 정책

| 필드 | 값 |
|---|---|
| **Description** | IP 주소를 audit_logs/sessions에 저장? |
| **Current Value** | schema.sql에 `inet` 컬럼 정의됨 |
| **Allowed Values** | `Full IP` / `Subnet (/24 IPv4, /48 IPv6)` / `Hash Only` / `Not Stored` |
| **Recommended Value** | *(AI가 추측하지 않음 — GDPR 영향)* |
| **Status** | 🟨 Draft |

### D-AUDIT-004 — Hash Chain 알고리즘

| 필드 | 값 |
|---|---|
| **Description** | Audit log hash chain에 사용할 해시 함수 |
| **Current Value** | schema.sql은 SHA-256 |
| **Allowed Values** | `SHA-256` / `SHA-512` / `BLAKE3` |
| **Recommended Value** | `SHA-256` (호환성 + 충분한 보안) |
| **Status** | 🟨 Draft |

---

## 11. Configuration Policy

### D-CONFIG-001 — 주 런타임

| 필드 | 값 |
|---|---|
| **Description** | Engine이 1차로 지원하는 런타임 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Node 20 LTS only` / `Node + Bun` / `Node + Bun + Deno` (모두 호환) |
| **Recommended Value** | `Node 20 LTS` |
| **Status** | 🟨 Draft |

### D-CONFIG-002 — UUID 형식

| 필드 | 값 |
|---|---|
| **Description** | PK로 사용할 UUID 버전 |
| **Current Value** | schema.sql은 UUID v7 (uuid_v7() 함수) |
| **Allowed Values** | `UUID v4` / `UUID v7` |
| **Recommended Value** | `UUID v7` (시간 정렬 + 분산 친화) |
| **Status** | 🟨 Draft |

### D-CONFIG-003 — DB RLS 강제

| 필드 | 값 |
|---|---|
| **Description** | Postgres Row Level Security 정책 강제? |
| **Current Value** | schema.sql에 RLS 활성화됨 |
| **Allowed Values** | `Mandatory` / `Optional` |
| **Recommended Value** | `Mandatory` |
| **Status** | 🟨 Draft |

### D-CONFIG-004 — 캐시 저장소

| 필드 | 값 |
|---|---|
| **Description** | Session/Policy 캐시 백엔드 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Redis 7+` / `Memcached` / `In-Memory (단일 인스턴스만)` |
| **Recommended Value** | `Redis 7+` |
| **Status** | 🟨 Draft |

### D-CONFIG-005 — KMS 제공자

| 필드 | 값 |
|---|---|
| **Description** | Tenant Credential 암호화 키 관리 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `AWS KMS` / `GCP KMS` / `HashiCorp Vault` / `Local Key (dev only)` |
| **Recommended Value** | *(AI가 추측하지 않음 — 호스트 환경 의존)* |
| **Status** | 🟨 Draft |

### D-CONFIG-006 — Tenant ID 결정 방식

| 필드 | 값 |
|---|---|
| **Description** | 호스트가 Tenant를 식별하는 방법 |
| **Current Value** | *(빈 값 — 사장님 확립 필요)* |
| **Allowed Values** | `Subdomain (acme.example.com)` / `Header (X-Tenant-Id)` / `JWT claim` / `Path prefix` |
| **Recommended Value** | `Subdomain` (multi-tenant 표준) + `Header` (fallback) |
| **Status** | 🟨 Draft |

---

# ═══════════════════════════════════════════════════════════════
# Appendices
# ═══════════════════════════════════════════════════════════════

## A. 결정 프로세스 (사장님 확립 시)

```
1. 사장님이 본 문서에서 직접 결정 (Current Value 채움)
2. AI가 PRD/TRD/Admin Console 등의 참조 업데이트
3. AI가 CHANGELOG.md에 ADR-NNN 기록
4. 사장님 최종 승인 → Status = "Approved"
5. v1.1 Frozen 선언
6. 그 다음에야 Sprint 2 시작 가능
```

## B. AI 행동 규칙 (이 문서에 적용)

```
DO:
  - 사장님 값을 Current Value에 정확히 기록
  - Recommended Value는 참고용으로만 제시 (사장님 확립 아님)
  - Status를 Draft → Approved로 변경 (사장님 지시 시에만)
  - ADR-NNN을 CHANGELOG.md에 기록

DO NOT:
  - Current Value를 추측하여 채우지 않는다
  - Recommended Value를 "사실"처럼 표현하지 않는다
  - 사장님 확립 없이 Status를 변경하지 않는다
  - 다른 문서(PRD/TRD)에 결정값을 직접 박지 않는다 (이 문서로 redirect)
```

## C. 다음 단계

| 단계 | 조건 |
|---|---|
| **v1.0 Frozen** | 이 문서 작성 완료 + 사장님 검토 시작. (현재 상태) |
| **v1.1 Frozen** | 모든 🟥 Level 1 결정 (8개) 사장님 확립 |
| **v1.2 Frozen** | 🟧 Level 2 결정 (18개) 사장님 확립 |
| **Sprint 2 시작** | v1.2 Frozen + 사장님 명시적 승인 |

> **사장님이 명시적으로 "Sprint 2 시작"이라 하지 않는 한, 어떤 구현 작업도 시작하지 않는다.**

---

**End of Identity Decisions v1.0-draft**

**다음 행동**: 사장님께서 이 문서를 검토하시고, Level 1 항목 8개에 대해 Current Value를 결정해주실 때까지 대기.