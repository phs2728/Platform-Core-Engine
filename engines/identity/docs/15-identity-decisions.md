# Identity Engine — Decision Bible

> **사장님 Product Owner 확립 (2026-07-11)**:
> **"Decision Bible은 정책 결정만 기록합니다. Configuration 항목은 Decision Bible에서 제거하고 Configuration/Policy 영역으로 이관."**

**Version**: v1.0-draft (사장님 최종 확립 대기)
**Status**: 🟡 Draft
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)

---

## 0. 헌법 (헌법 §12.11 Decision ≠ Configuration)

> **Decision은 철학. Configuration은 값. 둘을 섞지 않는다.**

| 구분 | Decision (이 문서) | Configuration (Policy Engine) |
|---|---|---|
| 정의 | Platform의 **불변 결정** | 환경에 따라 **override 가능** |
| 변경 빈도 | 한 번 결정되면 안 바뀜 | 자주 바뀜 |
| 저장 위치 | 이 문서 (FROZEN) | `engines/policy/db/schema.sql` |
| 책임 | 사장님 확립 | Tenant/Engine/Platform |

**이 문서에 들어가는 것**: Platform의 **철학적 결정**만.
**이 문서에 안 들어가는 것**: Configuration 값 (Password Length, Session Timeout 등) → Configuration Engine (Policy Engine) 영역.

---

## 1. Level 1 — Platform 철학적 결정 (사장님 우선 지정)

> **사장님 Product Owner 확립 (2026-07-11): "Q1. 8개만 유지합니다. 이것은 Platform 철학입니다."**

이 8개 결정은 **Identity Engine만이 아니라 Platform 전체의 철학**입니다.

| ID | 결정 | Status | 사장님 확립 |
|---|---|---|---|
| **D-IDN-001** | 이메일 중복 허용 여부 (Tenant 내 / Platform 전체) | ✅ Approved | **(a) Unique Platform-Wide (허용 안 함)** |
| **D-IDN-002** | 전화번호 중복 허용 여부 (Tenant 내 / Platform 전체) | ✅ Approved | **(a) Unique Platform-Wide, NULL 허용** |
| **D-IDN-003** | Link Account 정책 (Email + Google 동시 연결 허용) | ✅ Approved | **허용 — Multi-Credential Per User** |
| **D-IDN-004** | 이메일 변경 정책 | ✅ Approved | **허용 — 새 이메일 재인증 후 변경** |
| **D-IDN-005** | 전화번호 변경 정책 | ✅ Approved | **허용 — 새 번호 OTP 인증 후 변경** |
| **D-IDN-006** | 계정 삭제 정책 (Self-Service / Admin Only / 불가) | ✅ Approved | **사용자 요청 + 관리자 정책에 따라 처리** |
| **D-IDN-007** | Soft Delete / Hard Delete | ✅ Approved | **기본 Soft, Hard는 관리자/법적 요구 시만** |
| **D-IDN-008** | Tenant 간 동일 이메일 처리 방식 | ✅ Approved | **허용 (Policy 결정) — SSO 또는 독립 계정 선택 가능** |

### 1.1 D-IDN-001 — 이메일 중복 허용 여부

| 필드 | 값 |
|---|---|
| **Description** | 같은 이메일 주소를 여러 User가 가질 수 있는가? |
| **Current Value** | **(a) Unique Platform-Wide (허용 안 함)** |
| **Allowed Values** | (a) Unique per Tenant / (b) Unique Platform-Wide / (c) Unique with Verified / (d) Always Allow |
| **Recommended Value** | (b) Unique Platform-Wide |
| **Reason** | 사장님 Product Owner 확립 (2026-07-11): 이메일은 사용자 본인의 핵심 식별자. 중복 시 enumeration 위험, SSO 통합 시 일관성 깨짐. |
| **Impact** | `user_identities.identifier_hash`에 Platform-wide unique 인덱스 추가. Google OAuth subject 충돌 시 명시적 해결 필요. |
| **Status** | ✅ Approved (사장님 확립) |

### 1.2 D-IDN-002 — 전화번호 중복 허용 여부

| 필드 | 값 |
|---|---|
| **Description** | 같은 전화번호를 여러 User가 가질 수 있는가? |
| **Current Value** | **(a) Unique Platform-Wide, NULL 허용** |
| **Allowed Values** | D-IDN-001과 동일 옵션 |
| **Recommended Value** | (b) Unique Platform-Wide, NULL 허용 |
| **Reason** | 사장님 Product Owner 확립 (2026-07-11): NULL 허용 = 전화번호 없는 User 가능 (OAuth-only 가입자). 유효한 전화번호는 Platform-wide unique. |
| **Impact** | `user_identities.identifier_hash`에 partial unique index (WHERE identifier IS NOT NULL). |
| **Status** | ✅ Approved (사장님 확립) |

### 1.3 D-IDN-003 — Link Account 정책

| 필드 | 값 |
|---|---|
| **Description** | 하나의 User가 Email/Password + Google OAuth를 동시에 가질 수 있는가? |
| **Current Value** | **허용 — Multi-Credential Per User** |
| **Allowed Values** | (a) Multi-Credential Per User / (b) One Credential Per User / (c) Multi-OAuth + One Password / (d) Multi-OAuth + Optional Password |
| **Recommended Value** | (a) Multi-Credential Per User |
| **Reason** | 사장님 Product Owner 확립 (2026-07-11): 사용자가 Google로 가입 후 Password를 추가하는 흐름. 한 명당 인증 수단 N개 허용. |
| **Impact** | 한 User가 여러 `credentials` 보유 가능. **마지막 인증 수단 삭제 불가** (Account Recovery). |
| **Status** | ✅ Approved (사장님 확립) |

### 1.4 D-IDN-004 — 이메일 변경 정책

| 필드 | 값 |
|---|---|
| **Description** | 사용자가 본인 이메일을 변경할 때 검증/알림/세션 처리 |
| **Current Value** | **허용 — 새 이메일 재인증 후 변경** |
| **Allowed Values** | (a) Verify New + Notify Old / (b) Verify New Only / (c) Verify Old + Verify New / (d) Admin Approval / (e) Email Immutable |
| **Recommended Value** | (a) Verify New + Notify Old |
| **Reason** | 사장님 Product Owner 확립 (2026-07-11): 새 이메일 재인증으로 변경. 옛 이메일로 알림. 계정 탈취 공격 시 옛 이메일이 마지막 방어선. |
| **Impact** | 새 이메일 링크 발송 → 클릭 시 변경 완료. 옛 이메일로 "email changed" 알림. 다른 세션 revoke. |
| **Status** | ✅ Approved (사장님 확립) |

### 1.5 D-IDN-005 — 전화번호 변경 정책

| 필드 | 값 |
|---|---|
| **Description** | 전화번호 변경 시 검증/알림 처리 |
| **Current Value** | **허용 — 새 번호 OTP 인증 후 변경** |
| **Allowed Values** | D-IDN-004와 동일 옵션 |
| **Recommended Value** | (a) Verify New + Notify Old |
| **Reason** | 사장님 Product Owner 확립 (2026-07-11): 새 번호 OTP 인증으로 변경. SMS MFA 사용자 보호. |
| **Impact** | 새 번호로 SMS OTP 발송 → 인증 시 변경 완료. 옛 번호로 알림 (있으면). 2FA 재확인 가능. |
| **Status** | ✅ Approved (사장님 확립) |

### 1.6 D-IDN-006 — 계정 삭제 정책

| 필드 | 값 |
|---|---|
| **Description** | 사용자가 자기 계정을 삭제할 수 있는가? |
| **Current Value** | **사용자 요청 + 관리자 정책에 따라 처리** |
| **Allowed Values** | (a) Self-Service Soft Delete / (b) Self-Service Hard Delete / (c) Grace Period + Self-Service / (d) Admin Only / (e) Not Allowed |
| **Recommended Value** | (c) Grace Period + Self-Service |
| **Reason** | 사장님 Product Owner 확립 (2026-07-11): 사용자 요청은 받되, 관리자 정책이 최종 결정. 단순 자기-삭제는 아니지만, 거부도 아님. |
| **Impact** | 사용자 요청 → Soft Delete (`status='disabled'`) → 관리자 검토 → 정책에 따라 Hard Delete or Restore. |
| **Status** | ✅ Approved (사장님 확립) |

### 1.7 D-IDN-007 — Soft Delete / Hard Delete

| 필드 | 값 |
|---|---|
| **Description** | User 삭제 시 row 자체를 지우는가? 아니면 `deleted_at`만 설정? |
| **Current Value** | **기본 Soft, Hard는 관리자/법적 요구 시만** |
| **Allowed Values** | (a) Soft Only / (b) Soft by Default, Hard on Request / (c) Hard Always / (d) Anonymize |
| **Recommended Value** | (b) Soft by Default, Hard on Request |
| **Reason** | 사장님 Product Owner 확립 (2026-07-11): 기본은 Soft (`deleted_at` + `status='disabled'`). Hard는 관리자 결정 또는 GDPR Right-to-be-Forgotten 등 법적 요구 시. |
| **Impact** | 모든 unique index가 `WHERE deleted_at IS NULL` partial. Audit Log hash chain은 user_id를 NULL로 anonymize. |
| **Status** | ✅ Approved (사장님 확립) |

### 1.8 D-IDN-008 — Tenant 간 동일 이메일 처리 방식

| 필드 | 값 |
|---|---|
| **Description** | 사장님(같은 사람)이 회사 A와 회사 B에서 같은 이메일로 가입 가능? |
| **Current Value** | **허용 (Policy 결정) — SSO 또는 독립 계정 선택 가능** |
| **Allowed Values** | (a) Independent per Tenant / (b) Cross-Tenant Link / (c) Cross-Tenant Block / (d) Cross-Tenant Verify-Then-Link |
| **Recommended Value** | (d) Cross-Tenant Verify-Then-Link |
| **Reason** | 사장님 Product Owner 확립 (2026-07-11): **D-IDN-008은 철학이지만 실제 동작은 Policy로 결정**. 어떤 고객은 SSO 원하고, 어떤 고객은 분리 원함. 양쪽 지원. |
| **Impact** | **(헌법 §12.11 Decision ≠ Configuration 적용)**: 철학 = "허용 (Policy 결정)". 실제 모드 (SSO vs Independent)는 Configuration Engine에서. |
| **Status** | ✅ Approved (사장님 확립) |

---

## 2. Configuration — Policy Engine 영역으로 이관

> **사장님 Product Owner 확립 (2026-07-11)**: "Password Length, Session Timeout, Retry Count 같은 것은 Decision이 아닙니다. Configuration입니다."

이 문서에서 **제거**되었으며, **Policy Engine (`engines/policy/`)** 의 Configuration으로 이관:

| 이전 Decision ID | 항목 | 이관 위치 |
|---|---|---|
| D-PWD-001~006 | Password 정책 (Min Length, 만료, 이력, Argon2id 파라미터) | `engines/policy/` Configuration |
| D-SEC-001~006 | Login Max Failures, Lock Duration, Rate Limit, CAPTCHA | `engines/policy/` Configuration |
| D-SESS-001~006 | Session Timeout, Remember Me, Max Concurrent, Token Format, JWT, Refresh | `engines/policy/` Configuration |
| D-VER-001~006 | Email/Phone Verification, Code 만료, Max Attempts, Admin Approval | `engines/policy/` Configuration |
| D-OAUTH-001~005 | OAuth Provider 정책 | `engines/policy/` Configuration |
| D-TENANT-002~003 | Tenant 격리, Provider 최소 1개 | `engines/policy/` Configuration |
| D-AUDIT-001~004 | Audit 보존, GDPR, IP 로깅, Hash Chain | `engines/policy/` Configuration |
| D-CONFIG-001~006 | 런타임, UUID, RLS, Cache, KMS, Tenant ID | `engines/policy/` Configuration |

> **총 41개의 Level 2 결정이 제거됨**. 이 영역은 이제 Policy Engine의 Configuration Schema로 정의됩니다 (`engines/policy/docs/02-trd.md` §7).

---

## 3. 결정 프로세스 (Level 1)

```
1. 사장님이 위 8개 항목에 대해 결정 (Current Value 채움)
2. AI가 관련 PRD/TRD 업데이트
3. ADR-NNN 기록
4. 헌법 §C-17 (Stop Designing Rule) 적용: 이 8개가 Frozen되면 추가 Decision 금지
5. Configuration 값은 Policy Engine Schema로 정의
```

---

## 4. 헌법 준수 확인

- [x] §C-13 Canonical before Code — 8개 결정 Frozen 후 Identity Engine 구현
- [x] §C-17 Stop Designing Rule — Level 2 Decision Bible 제거 (Configuration으로 이관)
- [x] §12.11 Decision ≠ Configuration — 철학과 값 분리
- [x] §C-14 Policy Injection — Configuration은 Policy Engine을 통해 주입

---

**End of Identity Engine Decision Bible v1.0-draft (8 Decisions)**

> 사장님 Product Owner 확립: "Q1. 8개만 유지합니다. 이것은 Platform 철학입니다."