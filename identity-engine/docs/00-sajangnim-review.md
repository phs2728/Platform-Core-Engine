# Identity Engine v1.0 — 사장님 검토 항목 (DEPRECATED)

> **이 문서는 더 이상 canonical이 아닙니다.**
>
> 모든 미결정 사항은 [`15-identity-decisions.md`](./15-identity-decisions.md)로 이동했습니다.
> 사장님 확립 진행 상황은 15번 문서의 Decision Checklist를 확인하세요.
>
> 이 문서는 v1.0 초기 검토용으로 작성되었으며, **새로운 결정은 15번 문서에 추가**됩니다.

---


## 검토 방법

각 항목에 대해 사장님이 결정하신 값을 알려주시면 됩니다:

```
형식: [섹션 번호] 항목명 = "값"
예: [A-1] Password 최소 길이 = 12
```

답변 받으면 각 문서를 업데이트하고 v1.1로 frozen 합니다.

---

## A. 비밀번호 정책

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| A-1 | Password 최소 길이 | 12 | ? |
| A-2 | Password 만료 기간 (일) | 무기한 (null) | ? |
| A-3 | Password 이력 보관 개수 | 5 | ? |
| A-4 | Argon2id 메모리 (KB) | 65536 (64 MiB) | ? |
| A-5 | Argon2id iterations | 3 | ? |
| A-6 | Argon2id parallelism | 1 | ? |

---

## B. 인증 정책

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| B-1 | Login Max Failures | 5 | ? |
| B-2 | Lock Duration (분) | 30 | ? |
| B-3 | Rate Limit Per IP | 5 / 15분 | ? |
| B-4 | Rate Limit Per Identifier | 10 / 15분 | ? |
| B-5 | Default Tenant Provider | email + password 강제? | ? |
| B-6 | 최소 1개 Provider 활성화 필수? | 아니오 | ? |

---

## C. 세션 정책

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| C-1 | Session Timeout (분) | 60 | ? |
| C-2 | Remember Me (일) | 30 | ? |
| C-3 | Max Concurrent Sessions | 무제한 | ? |
| C-4 | Session Token 형식 | opaque 256-bit (`sts_` prefix) | ? |
| C-5 | JWT 사용 여부 | 사용 (RS256, 15분 만료) | ? |
| C-6 | JWT Refresh Token | 사용 (30일) | ? |

---

## D. Verification 정책

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| D-1 | Email Verification 기본값 | Optional | ? |
| D-2 | Phone Verification 기본값 | Optional | ? |
| D-3 | Verification Code 만료 (분) | 15 | ? |
| D-4 | Verification Max Attempts | 5 | ? |
| D-5 | Admin Approval 기본값 | 사용 안 함 | ? |

---

## E. MFA 정책

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| E-1 | 2FA 기본값 | Optional | ? |
| E-2 | TOTP 알고리즘 | SHA1 (호환성) / SHA256 (보안) | ? |
| E-3 | TOTP 자릿수 | 6 | ? |
| E-4 | TOTP 주기 (초) | 30 | ? |
| E-5 | SMS OTP 사용 | 사용 (비용 발생) | ? |
| E-6 | Email OTP 사용 | 사용 | ? |

---

## F. Audit & Compliance

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| F-1 | Audit Log 보존 기간 | 무기한 | ? |
| F-2 | GDPR Right-to-be-Forgotten 처리 | User 삭제 + Audit에 user_erased 표시 | ? |
| F-3 | IP 로깅 정책 | 로깅 (GDPR 옵션 제공) | ? |
| F-4 | Audit hash chain 알고리즘 | SHA-256 | ? |

---

## G. 암호화 / 보안

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| G-1 | Password Hash | Argon2id | ? |
| G-2 | PII 암호화 | AES-SIV (결정적) + HMAC 검색 | ? |
| G-3 | Tenant Credential 암호화 | AES-256-GCM | ? |
| G-4 | JWT 서명 | RS256 | ? |
| G-5 | Secret Pepper 사용 | 사용 (env) | ? |
| G-6 | Trusted Proxy 정책 | 명시적 IP 화이트리스트만 신뢰 | ? |

---

## H. 성능 목표

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| H-1 | Login p95 응답시간 | 300ms | ? |
| H-2 | Session Verify p95 | 50ms | ? |
| H-3 | Token Refresh p95 | 200ms | ? |
| H-4 | 동시 사용자 수 / Tenant | [TBD] | ? |
| H-5 | 초당 인증 요청 / Tenant | [TBD] | ? |

---

## I. 기술 스택

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| I-1 | 주 런타임 | Node 20 LTS | ? |
| I-2 | 패키지 매니저 | pnpm | ? |
| I-3 | Postgres 최소 버전 | 15 | ? |
| I-4 | UUID 형식 | UUID v7 | ? |
| I-5 | ID 형식 (대안) | UUID v4 (구 호환) | ? |
| I-6 | DB RLS 강제 여부 | 강제 | ? |

---

## J. API & 통합

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| J-1 | Session Token 위치 | Header (`X-Session-Token`) + Cookie (HttpOnly) 둘 다 | ? |
| J-2 | Tenant ID 결정 방식 | Header (`X-Tenant-Id`) 또는 서브도메인 | ? |
| J-3 | Error 응답 포맷 | `{ code, messageId, details, traceId }` | ? |
| J-4 | Rate Limit 429 응답 헤더 | `Retry-After`, `X-RateLimit-*` | ? |
| J-5 | Idempotency Key 지원 | 지원 (선택) | ? |

---

## K. 운영 & 배포

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| K-1 | 캐시 (Session, Policy) | Redis 7+ | ? |
| K-2 | KMS | AWS KMS / GCP KMS / Vault | ? |
| K-3 | Email 발송 호스트 제공 | SMTP | ? |
| K-4 | SMS 발송 호스트 제공 | Twilio | ? |
| K-5 | Worker Thread (Argon2id) | 사용 (CPU 격리) | ? |

---

## L. 향후 확장 (Sprint 6+)

| # | 항목 | 상태 | 사장님 확립 |
|---|---|---|---|
| L-1 | Passkey / WebAuthn | 미정 | ? |
| L-2 | SAML 2.0 SSO | 미정 | ? |
| L-3 | SCIM 프로비저닝 | 미정 | ? |
| L-4 | Magic Link 로그인 | 미정 | ? |
| L-5 | Decentralized Identity (DID) | 미정 | ? |
| L-6 | Hardware Security Key (FIDO2) | 미정 | ? |

---

## M. 호환성 / 헌법

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| M-1 | Universal Core 의존성 | `@aibg/core` 추상화 인터페이스 사용 | ? |
| M-2 | Plugin Registry 통합 | 옵션 (manifest 등록 가능) | ? |
| M-3 | 다른 엔진(Audit, Notification) 의존 | 통합 | ? |
| M-4 | ADR 절차 적용 | 모든 변경 ADR-NNN 기록 | ? |
| M-5 | Schema 진화 정책 | Phase 1: 명시적 CHECK, Phase 2: 동적 발견 | ? |

---

## N. Industry Agnostic 검증

| # | 항목 | 기본 제안 | 사장님 확립 |
|---|---|---|---|
| N-1 | 금지 단어 목록 | PRD §2.1 (Tour, Booking, Hotel, Restaurant, Order, Product, Payment, Passport, Travel History) | ? |
| N-2 | 추가 금지 단어 | cafe, rentcar, visa, flight, itinerary 등 | ? |
| N-3 | 검증 도구 위치 | `scripts/verify-industry-agnostic.sh` | ? |
| N-4 | CI 통합 | PR마다 자동 실행 | ? |

---

## 결정 프로세스 (사장님 확립 시)

1. 사장님이 위 항목에 값 부여
2. AI가 `docs/01-prd.md`, `docs/02-trd.md`, `docs/13-configuration.md` 등에 반영
3. AI가 `docs/CHANGELOG.md`에 ADR-NNN 기록
4. 사장님 최종 승인 → v1.1 Frozen

---

## 결정 후 단계

모든 [TBD] 항목이 결정되면:

- Sprint 2 시작
- `src/engine.ts` 구현
- 단위 테스트 100% 작성
- 통합 테스트 (Postgres Testcontainers)
- Google Provider (Reference)
- 호스트 통합 예시 (Hono 또는 Next.js)

---

**작성일**: 2026-07-11
**상태**: DEPRECATED — [`15-identity-decisions.md`](./15-identity-decisions.md) 참조
**버전**: v1.0-draft (사장님 확립 후 v1.1-Frozen)