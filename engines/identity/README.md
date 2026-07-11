# Identity Engine

> **Industry-Agnostic Platform Core Engine**
>
> Authentication · Security · Session · Credential · Audit

> **One Engine = One Folder = One README = One PRD = One TRD**

이 폴더는 `Platform-Core-Engine/engines/identity/` 안에 있습니다.
루트 README는 플랫폼 소개 — 각 엔진 README는 자기 엔진 소개.

엔진 카탈로그: [`/README.md`](../../README.md) (루트)

---

## 이 엔진은 무엇인가?

**Identity Engine**은 AI Bridge Georgia Platform Core의 최상위 공통 엔진입니다.

이 엔진은 **특정 산업을 전혀 알지 모릅니다** — 여행, 호텔, 식당, 카페, 렌트카 등 어떤 도메인에도 종속되지 않습니다.

오직 **계정(Account)과 신원(Identity)만** 관리합니다.

이 엔진은 앞으로 10년 이상 모든 제품(Tour OS, Hospitality OS, Restaurant OS, Cafe OS, RentCar OS 등)이 공통으로 사용합니다.

```
This is NOT an application.
This is NOT a demo.
This is NOT an MVP.
This is a reusable Platform Core Engine.
Every design decision maximizes extensibility, configurability and long-term maintainability.
```

---

## 설계 원칙

1. **Industry Agnostic** — 여행/호텔/식당/예약/결제 등 산업 키워드 일절 사용 안 함
2. **Multi-Tenant** — 모든 데이터는 Tenant 단위, RLS로 격리
3. **Plugin-Ready** — OAuth Provider는 코드 수정 없이 추가 가능
4. **Configuration Over Code** — 관리자 UI로 모든 정책 변경
5. **Encrypt Everything Sensitive** — 비밀번호, 토큰, PII 모두 암호화
6. **Audit Everything** — 모든 인증 이벤트는 hash chain으로 변조 방지
7. **API Stability** — 하위 호환 보장 (SemVer)

---

## 문서 색인

### 1. PRD & TRD (무엇을, 어떻게)

| 문서 | 내용 |
|---|---|
| [docs/01-prd.md](./docs/01-prd.md) | Product Requirements Document |
| [docs/02-trd.md](./docs/02-trd.md) | Technical Requirements Document |

### 2. 도메인 모델

| 문서 | 내용 |
|---|---|
| [docs/03-domain-model.md](./docs/03-domain-model.md) | 9개 엔티티 + Value Objects + Invariants |
| [docs/04-db-schema.md](./docs/04-db-schema.md) | DDL 명세 + RLS 정책 |
| [docs/05-erd.md](./docs/05-erd.md) | Mermaid ERD + 시퀀스 다이어그램 |

### 3. API & 이벤트

| 문서 | 내용 |
|---|---|
| [docs/06-api-spec.yaml](./docs/06-api-spec.yaml) | OpenAPI 3.1 명세 |
| [docs/07-events.md](./docs/07-events.md) | 도메인 이벤트 카탈로그 |

### 4. 아키텍처

| 문서 | 내용 |
|---|---|
| [docs/08-architecture.md](./docs/08-architecture.md) | 레이어드 아키텍처 + 모듈 책임 |
| [docs/09-folder-structure.md](./docs/09-folder-structure.md) | 디렉토리 레이아웃 |
| [docs/10-plugin-architecture.md](./docs/10-plugin-architecture.md) | OAuth Provider 플러그인 추가 절차 |

### 5. 운영 & 보안

| 문서 | 내용 |
|---|---|
| [docs/11-test-strategy.md](./docs/11-test-strategy.md) | 단위/통합/E2E/보안 테스트 |
| [docs/12-admin-console.md](./docs/12-admin-console.md) | 관리자 콘솔 UI 명세 |
| [docs/13-configuration.md](./docs/13-configuration.md) | 설정 시스템 |
| [docs/14-security.md](./docs/14-security.md) | 보안 정책 (암호화, Rate Limit, Audit) |

### 6. 결정 사항 (Canonical Source of Truth)

| 문서 | 내용 |
|---|---|
| [**docs/15-identity-decisions.md**](./docs/15-identity-decisions.md) | **모든 미결정 사항의 단일 진실 공급원 (Canonical)** |

> 사장님이 결정할 항목, Status, Recommended Value는 15번 문서 참조.
>
> `docs/00-sajangnim-review.md`는 **DEPRECATED** — 새 결정은 15번에 추가.

### 7. DDL

| 파일 | 내용 |
|---|---|
| [db/schema.sql](./db/schema.sql) | 11개 테이블 + 트리거 + RLS |

---

## 데이터 도메인 (11개 테이블)

```
users               인증된 신원의 인덱스
user_identities     User가 가진 신원 (이메일/전화/사용자명/OAuth)
auth_providers      Tenant가 활성화한 인증 제공자
credentials         비밀번호 해시 / OAuth 토큰 / TOTP
password_history    비밀번호 재사용 방지
sessions            활성 세션
verification_tokens 이메일/SMS 인증 코드
password_resets     비밀번호 재설정 토큰
security_policies   Tenant별 보안 정책 (SSoT)
audit_logs          Append-Only 감사 로그 (hash chain)
tenant_credentials  외부 서비스 자격증명 (AES-256-GCM)
```

**저장하지 않는 것**: 프로필(이름, 아바타), 주소, 여권, 결제 수단, 업종별 데이터.

---

## 기술 스택

| 영역 | 선택 |
|---|---|
| 언어 | TypeScript 5.4+ (strict) |
| 런타임 | Node 20+ / Bun 1.x / Deno 1.40+ |
| 패키지 | ESM only |
| 암호화 | @noble/hashes, @noble/ciphers, jose |
| 입력 검증 | zod |
| DB | PostgreSQL 15+ |
| 캐시 | Redis 7+ |
| KMS | AWS KMS / GCP KMS / Vault (호스트) |

> 엔진은 특정 SaaS나 DB 드라이버에 종속되지 않습니다. 모든 인프라 의존성은 호스트가 주입합니다.

---

## Industry Agnostic 검증

자동 검증 스크립트: `scripts/verify-industry-agnostic.sh`

```bash
bash scripts/verify-industry-agnostic.sh
```

---

## 스프린트 계획

```
Sprint 1 — 설계 문서 (현재)
  ✓ PRD
  ✓ TRD
  ✓ 도메인 모델
  ✓ DB 스키마
  ✓ API 명세
  ✓ 이벤트 카탈로그
  ✓ 아키텍처
  ✓ 폴더 구조
  ✓ 플러그인 아키텍처
  ✓ 테스트 전략
  ✓ Admin Console 명세
  ✓ 설정 시스템
  ✓ 보안 정책
  ✓ 결정 문서 (Canonical)

Sprint 2 — Identity Engine 구현 (사장님 결정 대기)
  → 사장님 Level 1 결정 8개 확립 후 시작
  → src/engine.ts 진입점
  → usecase/auth/* (login, register, logout)
  → usecase/password/* (reset, change)
  → crypto/* (Argon2id, AES, JWT)
  → repository/* (CRUD)
  → provider/google (Reference)
```

---

## 다른 엔진과의 관계

| 엔진 | 관계 |
|---|---|
| **universal-core** (packages/) | Tenant, Event, Plugin 추상화 의존 |
| **notification** | 인증 이벤트 → 알림 발송 (구독) |
| **audit** | 모든 mutation → Audit Log (자동) |
| **media** | 사용자 아바타 (Identity Engine은 저장 안 함, URL만) |
| **booking** | User ID 참조 (FK), 인증 책임 없음 |

---

## 라이선스

Internal — Platform Core (사장님 확립)

---

**Status**: v1.0-draft — 사장님 결정 대기
**Last Updated**: 2026-07-11