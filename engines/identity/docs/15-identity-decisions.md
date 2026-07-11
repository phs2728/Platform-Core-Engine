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
| **D-IDN-001** | 이메일 중복 허용 여부 (Tenant 내 / Platform 전체) | 🟥 Draft | ❓ |
| **D-IDN-002** | 전화번호 중복 허용 여부 (Tenant 내 / Platform 전체) | 🟥 Draft | ❓ |
| **D-IDN-003** | Link Account 정책 (Email + Google 동시 연결 허용) | 🟥 Draft | ❓ |
| **D-IDN-004** | 이메일 변경 정책 | 🟥 Draft | ❓ |
| **D-IDN-005** | 전화번호 변경 정책 | 🟥 Draft | ❓ |
| **D-IDN-006** | 계정 삭제 정책 (Self-Service / Admin Only / 불가) | 🟥 Draft | ❓ |
| **D-IDN-007** | Soft Delete / Hard Delete | 🟥 Draft | ❓ |
| **D-IDN-008** | Tenant 간 동일 이메일 처리 방식 | 🟥 Draft | ❓ |

### 1.1 D-IDN-001 — 이메일 중복 허용 여부

| 필드 | 값 |
|---|---|
| **Description** | 같은 이메일 주소를 여러 User가 가질 수 있는가? |
| **Allowed Values** | (a) Unique per Tenant / (b) Unique Platform-Wide / (c) Unique with Verified / (d) Always Allow |
| **Reason** | 이 결정은 `user_identities.identifier_hash`의 unique 정책에 직접 영향. |
| **Status** | 🟥 Draft (사장님 확립 대기) |

### 1.2 D-IDN-002 — 전화번호 중복 허용 여부

| 필드 | 값 |
|---|---|
| **Description** | 같은 전화번호를 여러 User가 가질 수 있는가? |
| **Allowed Values** | D-IDN-001과 동일 |
| **Status** | 🟥 Draft |

### 1.3 D-IDN-003 — Link Account 정책

| 필드 | 값 |
|---|---|
| **Description** | 하나의 User가 Email/Password + Google OAuth를 동시에 가질 수 있는가? |
| **Allowed Values** | (a) Multi-Credential / (b) One Credential / (c) Multi-OAuth + One Password / (d) Multi-OAuth + Optional Password |
| **Status** | 🟥 Draft |

### 1.4 D-IDN-004 — 이메일 변경 정책

| 필드 | 값 |
|---|---|
| **Description** | 사용자가 본인 이메일을 변경할 때 검증/알림/세션 처리 |
| **Allowed Values** | (a) Verify New + Notify Old / (b) Verify New Only / (c) Verify Old + Verify New / (d) Admin Approval / (e) Email Immutable |
| **Status** | 🟥 Draft |

### 1.5 D-IDN-005 — 전화번호 변경 정책

| 필드 | 값 |
|---|---|
| **Description** | 전화번호 변경 시 검증/알림 처리 |
| **Allowed Values** | D-IDN-004와 동일 |
| **Status** | 🟥 Draft |

### 1.6 D-IDN-006 — 계정 삭제 정책

| 필드 | 값 |
|---|---|
| **Description** | 사용자가 자기 계정을 삭제할 수 있는가? |
| **Allowed Values** | (a) Self-Service Soft / (b) Self-Service Hard / (c) Grace Period / (d) Admin Only / (e) Not Allowed |
| **Status** | 🟥 Draft |

### 1.7 D-IDN-007 — Soft Delete / Hard Delete

| 필드 | 값 |
|---|---|
| **Description** | User 삭제 시 row 자체를 지우는가? 아니면 `deleted_at`만 설정? |
| **Allowed Values** | (a) Soft Only / (b) Soft by Default, Hard on Request / (c) Hard Always / (d) Anonymize |
| **Status** | 🟥 Draft |

### 1.8 D-IDN-008 — Tenant 간 동일 이메일 처리 방식

| 필드 | 값 |
|---|---|
| **Description** | 사장님(같은 사람)이 회사 A와 회사 B에서 같은 이메일로 가입 가능? |
| **Allowed Values** | (a) Independent per Tenant / (b) Cross-Tenant Link / (c) Cross-Tenant Block / (d) Cross-Tenant Verify-Then-Link |
| **Status** | 🟥 Draft |

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