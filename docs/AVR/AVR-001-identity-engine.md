# AVR-001 — Architecture Validation Report

> **Identity Engine Architecture Cross-Check**
>
> PRD ↔ TRD ↔ Domain Model ↔ DB Schema ↔ API ↔ Events ↔ Decision Bible

**Report ID**: AVR-001
**Engine**: Identity Engine
**Date**: 2026-07-11
**Author**: AI Platform Architect (검증) + 사장님 Platform CTO (승인)
**Status**: 🔴 DRAFT (사장님 검토 대기)
**Target Status**: 🟢 PASS → Sprint 2 진입 가능

---

## 0. 이 문서의 목적

사장님 Platform CTO 확립 (2026-07-11):

> **"AI는 문서를 많이 만들면 서로 모순이 생깁니다. 예를 들어 PRD에는 Email Required, TRD에는 Optional. 이런 것이 생깁니다."**
>
> **"Sprint2 전에 이것을 전부 잡아야 합니다."**

이 보고서는 Identity Engine의 모든 설계 문서(14개 문서 + 11 테이블 + 31 API endpoints + 19 Domain Events + 49 Decisions)가 **서로 모순 없이 일관**되는지 검증합니다.

**검증 통과 기준**:
- 모든 **명시적 정책값**이 문서 간 일치
- 모든 **API endpoint**가 DB 테이블/Event와 연결
- 모든 **DB 컬럼**이 Domain Model과 일치
- 모든 **Event payload**가 Schema와 일치
- 모든 **[INCONSISTENCY] 항목**이 사장님 또는 ADR로 해결됨

---

## 1. 검증 범위 (Cross-Check Matrix)

| 문서 | 검증 항목 | 의존 |
|---|---|---|
| [PRD](./engines/identity/docs/01-prd.md) | 요구사항, 정책 명세 | TRD, Schema |
| [TRD](./engines/identity/docs/02-trd.md) | 기술 결정, 런타임, 라이브러리 | Schema, Architecture |
| [Domain Model](./engines/identity/docs/03-domain-model.md) | 9 엔티티 + Invariants | Schema, API |
| [DB Schema](./engines/identity/docs/04-db-schema.md) | 11 테이블 + RLS | Domain Model |
| [API Spec](./engines/identity/docs/06-api-spec.yaml) | 31 endpoints | Schema, Domain Model |
| [Events](./engines/identity/docs/07-events.md) | 19 event types | Domain Model |
| [Decision Bible](./engines/identity/docs/15-identity-decisions.md) | 49 decisions | PRD/TRD/Schema |

---

## 2. 결정 일관성 매트릭스 (Decision Cross-Check)

각 정책이 문서별로 어떻게 표현되는지 확인.

### 2.1 명시적 값 (값이 박혀있는 정책)

| 정책 | PRD | TRD | Domain Model | DB Schema | Decision Bible | 일관? |
|---|---|---|---|---|---|---|
| Password 최소 길이 | 12 (제안) | (없음) | (없음) | **DEFAULT 12** | (없음, [TBD]) | ❌ **[INC-001]** |
| Login Max Failures | 5 (제안) | 5 (제안) | 5 (제안) | **DEFAULT 5** | (없음, [TBD]) | ❌ **[INC-002]** |
| Lock Duration (분) | 30 (제안) | (없음) | (없음) | **DEFAULT 30** | (없음, [TBD]) | ❌ **[INC-003]** |
| Session Timeout (분) | 60 (제안) | 60 (제안) | (없음) | **DEFAULT 60** | (없음, [TBD]) | ❌ **[INC-004]** |
| Remember Me (일) | 30 (제안) | (없음) | (없음) | **DEFAULT 30** | (없음, [TBD]) | ❌ **[INC-005]** |
| Argon2id memory | 65536 (제안) | 65536 (제안) | 64MiB (제안) | (없음) | (없음, [TBD]) | ⚠️ **[INC-006]** |
| Rate Limit Per IP | 5/15min | 5/15min | 5/15min | **DEFAULT 5** | (없음, [TBD]) | ❌ **[INC-007]** |
| Verification 만료 (분) | 15 | 15 | (없음) | **DEFAULT 15** | (없음, [TBD]) | ❌ **[INC-008]** |
| Verification Max Attempts | 5 | 5 | (없음) | **DEFAULT 5** | (없음, [TBD]) | ❌ **[INC-009]** |
| Password History Count | 5 | 5 | (없음) | **DEFAULT 5** | (없음, [TBD]) | ❌ **[INC-010]** |

### 2.2 ON/OFF (Boolean 정책)

| 정책 | PRD | TRD | DB Schema | Decision Bible | 일관? |
|---|---|---|---|---|---|
| Email Verification Required | Optional | (없음) | (없음) | (없음, [TBD]) | ⚠️ **[INC-011]** |
| Phone Verification Required | Optional | (없음) | (없음) | (없음, [TBD]) | ⚠️ **[INC-011]** |
| 2FA Required | Optional | (없음) | (없음) | (없음, [TBD]) | ⚠️ **[INC-011]** |
| Admin Approval Required | 미사용 | (없음) | (없음) | (없음, [TBD]) | ⚠️ **[INC-011]** |
| Captcha Enabled | (없음) | (없음) | (없음) | (없음, [TBD]) | ⚠️ **[INC-011]** |

**판정**: 모든 정책이 **사장님 확립 없이 DEFAULT 값 또는 "제안" 형태로 박혀있음**. Decision Bible은 모두 미확정.

→ **헌법 §C-13 (Canonical before Code) 위반**:
```
Code/Schema → DEFAULT 값 (AI 추측)
Decision    → 미확정
이 둘이 일치하지 않으면 사장님 헌법 §1 위반
```

---

## 3. API ↔ Schema 일관성

### 3.1 API Endpoint → DB Table 매핑

| API Endpoint | DB Table | Domain Event | 일관? |
|---|---|---|---|
| `POST /auth/login` | users, credentials, sessions | auth.login.success / .failure | ✅ |
| `POST /auth/register` | users, user_identities | auth.register.success | ✅ |
| `POST /auth/logout` | sessions | auth.logout | ✅ |
| `POST /auth/logout-all` | sessions | auth.logout.all | ✅ |
| `POST /auth/password/reset` | password_resets | (이벤트 없음) | ⚠️ **[INC-012]** |
| `POST /auth/password/reset/confirm` | password_resets, credentials | auth.password.reset.completed | ✅ |
| `POST /auth/password/change` | credentials, sessions | auth.password.changed | ✅ |
| `POST /auth/verify/email/request` | verification_tokens | (이벤트 없음) | ⚠️ **[INC-013]** |
| `POST /auth/verify/email` | verification_tokens, user_identities | auth.email.verified | ✅ |
| `POST /auth/verify/sms/request` | verification_tokens | (이벤트 없음) | ⚠️ **[INC-013]** |
| `POST /auth/verify/sms` | verification_tokens, user_identities | auth.phone.verified | ✅ |
| `POST /auth/2fa/setup` | credentials (totp) | auth.2fa.enabled | ✅ |
| `POST /auth/2fa/verify` | credentials, sessions | (이벤트 없음) | ⚠️ **[INC-014]** |
| `POST /auth/2fa/disable` | credentials | auth.2fa.disabled | ✅ |
| `GET /auth/oauth/{provider}/initiate` | (state 임시 저장) | (이벤트 없음) | ⚠️ **[INC-015]** |
| `GET /auth/oauth/{provider}/callback` | credentials, user_identities | auth.register.success / auth.login.success | ✅ |
| `POST /auth/oauth/link` | credentials | auth.oauth.linked | ✅ |
| `POST /auth/oauth/unlink` | credentials | auth.oauth.unlinked | ✅ |
| `GET /auth/sessions` | sessions | (조회 이벤트 없음) | ✅ (정상) |
| `DELETE /auth/sessions/{id}` | sessions | (이벤트 없음) | ⚠️ **[INC-016]** |
| `GET /auth/me` | users | (조회 이벤트 없음) | ✅ (정상) |
| `POST /admin/auth/users/{userId}/lock` | users, sessions | auth.account.locked | ✅ |
| `POST /admin/auth/users/{userId}/unlock` | users | auth.account.unlocked | ✅ |
| `DELETE /admin/auth/users/{userId}/sessions` | sessions | auth.session.revoked.admin | ✅ |
| `GET /admin/auth/audit-logs` | audit_logs | (조회 이벤트 없음) | ✅ (정상) |
| `GET /admin/auth/providers` | auth_providers | (조회 이벤트 없음) | ✅ (정상) |
| `PATCH /admin/auth/providers/{id}` | auth_providers | (이벤트 없음) | ⚠️ **[INC-017]** |
| `GET /admin/auth/policy` | security_policies | (조회 이벤트 없음) | ✅ (정상) |
| `PATCH /admin/auth/policy` | security_policies | auth.policy.changed | ✅ |
| `GET /admin/auth/credentials` | tenant_credentials | (조회 이벤트 없음) | ✅ (정상, 민감) |
| `POST /admin/auth/credentials` | tenant_credentials | (이벤트 없음) | ⚠️ **[INC-018]** |
| `DELETE /admin/auth/credentials/{id}` | tenant_credentials | (이벤트 없음) | ⚠️ **[INC-018]** |
| `GET /.well-known/jwks.json` | (JWT keys) | (조회 이벤트 없음) | ✅ (정상) |

---

## 4. Domain Model ↔ DB Schema 일관성

### 4.1 도메인 모델 9 엔티티 vs DB 11 테이블

| Domain Model Entity | DB Table | 일관? | 비고 |
|---|---|---|---|
| User | users | ✅ | |
| UserIdentity | user_identities | ✅ | |
| AuthProvider | auth_providers | ✅ | |
| Credential | credentials | ✅ | |
| (없음) | password_history | ✅ | Domain Model에 없음 — 추가 검토 필요 [INC-019] |
| Session | sessions | ✅ | |
| VerificationToken | verification_tokens | ✅ | |
| PasswordReset | password_resets | ✅ | |
| SecurityPolicy | security_policies | ✅ | |
| AuditLog | audit_logs | ✅ | |
| TenantCredential | tenant_credentials | ✅ | |

### 4.2 Invariant ↔ Schema CHECK 제약

Domain Model에 정의된 Invariant가 DB CHECK 제약으로 표현되었는지 확인.

| Domain Model Invariant | Schema CHECK 제약 | 일관? |
|---|---|---|
| I-1: tenant_id NOT NULL | users.tenant_id NOT NULL | ✅ |
| I-3: User 'locked' → 인증 불가 | (없음, application level) | ⚠️ [INC-020] |
| I-6: (tenant_id, type, identifier_hash) unique | uniq_user_identities_active | ✅ |
| I-7: 마지막 identity 삭제 불가 | (없음, application level) | ⚠️ [INC-020] |
| I-12: 한 User는 같은 CredentialType 1개 | uniq_credentials_password_per_user, uniq_credentials_totp_per_user | ✅ |
| I-13: secret_hash Argon2id 포맷 | (없음, application level) | ⚠️ [INC-020] |
| I-20: VerificationToken 1회용 | consumed_at 컬럼 | ✅ |
| I-22: expires_at < now → invalid | expires_at 컬럼 | ✅ |
| I-28: SecurityPolicy 1:1 (Tenant당 1개) | PK = tenant_id | ✅ |
| I-29: passwordMinLength >= 8 | CHECK (password_min_length >= 8) | ✅ |
| I-30: sessionTimeoutMinutes 5~10080 | CHECK (session_timeout_minutes BETWEEN 5 AND 10080) | ✅ |
| I-32: AuditLog 절대 UPDATE/DELETE 불가 | BEFORE UPDATE/DELETE 트리거 | ✅ |
| I-35: TenantCredential 절대 평문 | bytea 컬럼 (암호화 저장) | ✅ |

**판정**: DB 레벨 invariant는 잘 표현됨. 단, application-level 검증으로만 처리되는 일부 invariant는 런타임에서만 보장됨 (예: I-3, I-7, I-13).

---

## 5. Events ↔ Domain Model 일관성

### 5.1 Event Payload ↔ Entity

19 events 모두 Domain Model의 Entity와 일관성 확인. 별도 표 생략 (전수 매칭 통과).

### 5.2 누락된 Event

API가 발생시키지만 Event로 정의되지 않은 것들:

| Trigger | Event 누락 | 권장 |
|---|---|---|
| POST /auth/password/reset (요청) | auth.password.reset.requested (PRD 7-event 정의됨 ✅) | ✅ |
| POST /auth/2fa/verify (challenge 응답) | auth.2fa.challenge.completed | [INC-014] |
| DELETE /auth/sessions/{id} | auth.session.revoked.user | [INC-016] |
| PATCH /admin/auth/providers/{id} | auth.provider.config.changed | [INC-017] |
| POST /admin/auth/credentials | auth.credentials.created | [INC-018] |
| DELETE /admin/auth/credentials/{id} | auth.credentials.deleted | [INC-018] |
| GET /auth/oauth/{provider}/initiate | auth.oauth.initiated | [INC-015] |

---

## 6. Industry-Agnostic 검증

`tools/scripts/industry-agnostic-check.sh`로 자동 검증.

### 6.1 PRD §2.1 절대 금지 단어

검증 결과: **스키마 0 위반, 문서 메타 컨텍스트 외 위반 없음** (자세한 건 `engines/identity/scripts/verify-industry-agnostic.sh` 실행 참조).

---

## 7. 발견된 모순 (Inconsistencies)

### 🔴 Critical — 사장님 확립 전 해결 필요

| ID | 위치 | 문제 | 영향 |
|---|---|---|---|
| **INC-001** | DB Schema `password_min_length DEFAULT 12` | 사장님 확립 없이 DEFAULT 값 박힘 | Schema Freeze 시 사장님 헌법 §1 위반 |
| **INC-002** | DB Schema `login_max_failures DEFAULT 5` | 동일 | 동일 |
| **INC-003** | DB Schema `lock_duration_minutes DEFAULT 30` | 동일 | 동일 |
| **INC-004** | DB Schema `session_timeout_minutes DEFAULT 60` | 동일 | 동일 |
| **INC-005** | DB Schema `remember_me_days DEFAULT 30` | 동일 | 동일 |
| **INC-007** | DB Schema `rate_limit_per_ip_max DEFAULT 5` | 동일 | 동일 |
| **INC-008** | DB Schema `verification_expiration_minutes DEFAULT 15` | 동일 | 동일 |
| **INC-009** | DB Schema `verification_max_attempts DEFAULT 5` | 동일 | 동일 |
| **INC-010** | DB Schema `password_history_count DEFAULT 5` | 동일 | 동일 |

**원인**: Decision Bible의 모든 정책이 **미확정 (Status = Draft)** 인데, DB Schema/Configuration은 AI가 DEFAULT 값을 박았음.

**해결 방안 (사장님 결정)**:
- **방안 A**: Decision Bible Level 1 (8개) + Level 2 (관련 결정) 사장님 확립 → Schema DEFAULT 자동 일치
- **방안 B**: Schema에서 DEFAULT 값 제거 (Tenant 생성 시 application이 명시적으로 insert)
- **방안 C**: Schema DEFAULT를 placeholder (NULL)로 두고 application이 항상 명시

> **권장**: 방안 A (사장님 확립). 사장님 헌법 §C-13 "Canonical before Code" 정신과 일치.

### 🟡 Warning — ADR 또는 사장님 확립 필요

| ID | 위치 | 문제 |
|---|---|---|
| INC-006 | Argon2id memory | 65536 KB vs 64 MiB — 단위만 다름 (동일 값, OK) |
| INC-011 | Boolean 정책 (Email/Phone/2FA/Admin/Captcha) | Decision Bible [TBD]. Schema DEFAULT 없음 (정상). PRD는 "Optional 제안" |
| INC-012 | `/auth/password/reset` (요청) | 응답이 항상 202 — 적절한 mitigation은 있으나 (constant-time), Event 발행 권장 |
| INC-013 | `/auth/verify/email/request`, `/auth/verify/sms/request` | Event 없음 — `auth.verification.requested` 추가 권장 |
| INC-014 | `/auth/2fa/verify` | Event 없음 — `auth.2fa.challenge.completed` 추가 권장 |
| INC-015 | `/auth/oauth/{provider}/initiate` | Event 없음 — `auth.oauth.initiated` 추가 권장 |
| INC-016 | `DELETE /auth/sessions/{id}` | Event 없음 — `auth.session.revoked.user` 추가 권장 |
| INC-017 | `PATCH /admin/auth/providers/{id}` | Event 없음 — `auth.provider.config.changed` 추가 권장 |
| INC-018 | `POST/DELETE /admin/auth/credentials` | Event 없음 — `auth.credentials.created/deleted` 추가 권장 (보안 중요) |
| INC-019 | Domain Model에 `password_history` 엔티티 누락 | DB에는 있는데 Domain Model 문서에 없음 |
| INC-020 | 일부 Invariant가 application level에만 | 런타임 보장 — 코드로 검증 필요 (Sprint 2) |

### 🟢 Info — 현재 OK

- 모든 DB 테이블이 Domain Model Entity와 1:1 매핑 (password_history 추가 검토 후 OK)
- 모든 API endpoint가 DB Table과 연결
- 모든 Domain Event가 Entity와 연결
- Industry-Agnostic 검증 통과
- Audit Log Append-Only 트리거 정상
- RLS 정책 모든 테이블에 적용

---

## 8. Constitutional Compliance Check

헌법 v0.1-draft 기준 [C-1 ~ C-13]:

| 헌법 원칙 | 준수 상태 | 비고 |
|---|---|---|
| **C-1**: Industry Agnostic | ✅ | 자동 검증 통과 |
| **C-2**: Multi-Tenant | ✅ | 모든 테이블 tenant_id + RLS |
| **C-3**: Audit Everything | ✅ | 11 Audit Log 컬럼, hash chain |
| **C-4**: Plugin-Ready | ✅ | OAuth Provider 인터페이스 정의 |
| **C-5**: Configuration Over Code | ⚠️ | INC-001 ~ INC-010 (DEFAULT vs Decision) |
| **C-6**: Encrypt Everything Sensitive | ✅ | Argon2id + AES-GCM + AES-SIV |
| **C-7**: API Stability | ✅ | OpenAPI 3.1 + Versioning 정책 |
| **C-8**: Configuration First | ⚠️ | INC-001 ~ INC-010 |
| **C-9**: Plugin First | ✅ | OAuth Provider 플러그인 패턴 |
| **C-10**: Domain Isolation | ✅ | Identity Engine만 다룸 |
| **C-11**: Backward Compatibility | ✅ | SemVer 정책 + ADR 절차 |
| **C-12**: Public Contract | ✅ | API + Event + DTO + Schema 정의 |
| **C-13**: Canonical before Code | ❌ | INC-001 ~ INC-010 — Schema DEFAULT vs 미확정 Decision |

**판정**:
- C-5, C-8, C-13 위반: INC-001 ~ INC-010 (DEFAULT 값이 사장님 확립 없이 박힘)
- **해결 방법**: Decision Bible Level 1 + Level 2 사장님 확립 → Schema DEFAULT와 일치시킴

---

## 9. 최종 판정

### 9.1 PASS / FAIL

```
전체 검증: 🔴 FAIL

Critical Issues (10):
  INC-001 ~ INC-010: Schema DEFAULT 값이 사장님 확립 없이 박힘

Warning Issues (10):
  INC-011 ~ INC-020: Event 누락 (10개), Domain Model 누락 (1개)

PASS 조건:
  1. Decision Bible Level 1 (8개) 사장님 확립
  2. Decision Bible Level 2 (관련 결정) 사장님 확립
  3. Schema DEFAULT 값 사장님 확립 값과 일치 확인
  4. INC-013 ~ INC-018 Event 추가 (사장님 결정)
  5. Domain Model에 password_history 엔티티 추가 (or Schema 제거)
```

### 9.2 사장님 결정 필요

#### 9.2.1 Critical 해결 (방안 선택)

**방안 A (권장)**: 사장님 확립 우선
1. Decision Bible Level 1 결정 8개 확립
2. Decision Bible Level 2 결정 (Password/Session/Security 정책) 확립
3. Schema DEFAULT 값이 확립된 값과 일치하는지 검증
4. INC-001 ~ INC-010 자동 해결

**방안 B**: Schema DEFAULT 제거
- DB Schema에서 모든 정책 DEFAULT 값 NULL로 변경
- Application이 Tenant 생성 시 명시적으로 정책 값 insert
- 사장님 확립 후에도 Schema 변경 불필요

**방안 C**: Hybrid
- 결정된 정책만 DEFAULT 값 유지
- 미결정 정책은 DEFAULT NULL + application이 fallback
- 점진적 사장님 확립 가능

→ **사장님 선택 대기**

#### 9.2.2 Event 추가 (사장님 결정)

INC-013 ~ INC-018: 누락된 Event 6종 추가 여부

권장 추가:
```
auth.verification.requested     (이메일/SMS 인증 코드 요청 시)
auth.2fa.challenge.completed   (2FA challenge 응답)
auth.oauth.initiated           (OAuth 시작)
auth.session.revoked.user      (사용자가 세션 종료)
auth.provider.config.changed   (Admin이 Provider 설정 변경)
auth.credentials.created       (Admin이 Credential 생성)
auth.credentials.deleted       (Admin이 Credential 삭제)
```

→ **사장님 선택 대기**

---

## 10. 다음 단계

### 10.1 사장님 확립 대기

```
[현재]    AVR-001 = 🔴 FAIL
          ↓
[Step 1]  사장님 Decision Bible Level 1 (8개) 확립
          ↓
[Step 2]  사장님 Critical 해결 방안 선택 (A / B / C)
          ↓
[Step 3]  사장님 Event 추가 여부 결정
          ↓
[Step 4]  AVR-001 재검증 → 🟢 PASS
          ↓
[Step 5]  Constitution v1.0 Frozen 선언
          ↓
[Step 6]  Sprint 2 시작 (Identity Engine 구현)
```

### 10.2 Sprint 2는 여전히 대기

> 사장님 Platform CTO 명시:
> "저라면 지금은 v1.0 Frozen 선언도, Sprint 2 구현도 바로 시작하지 않습니다."
> "먼저 아래 4가지를 완료합니다."
> "그 다음에야 Sprint 2에 들어갑니다."

**현재 상태**: Stage 4 (AVR-001) FAIL → 사장님 결정 대기.

---

**End of AVR-001 v0.1-draft**

**Author**: AI Platform Architect (검증)
**Reviewer**: 사장님 Platform CTO (확인 + 결정)
**Next Review**: 사장님 결정 후