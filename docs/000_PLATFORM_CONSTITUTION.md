# Platform Constitution

**Version**: **v1.0 — FROZEN** (사장님 Platform CTO + Product Owner 확립, 2026-07-11)
**Status**: 🔒 **FROZEN** — 변경은 ADR 절차로만 가능
**Effective Date**: 2026-07-11
**Next Review**: 2027-07-11 (1년)
**Owner**: 사장님 (박흥식 / Tim Park)

> **사장님 명령 (2026-07-11)**:
> **"Constitution v1.0 Frozen 선언. 단, 아래 조건: Platform Constitution v1.0 Frozen. Only by ADR. No direct editing."**
>
> 이 헌법은 **ADR로만 변경 가능**합니다. 직접 편집 금지.

---

## 0. 이 문서의 위치

```
┌────────────────────────────────────────────────────────────────┐
│  이 문서는 Platform Core의 영구 헌법이다.                          │
│                                                                 │
│  ★ 사장님이 직접 확립한 원칙만 canonical.                         │
│  ★ AI가 추측하는 부분은 [TBD: 사장님 확립] 표시.                  │
│  ★ 헌법 변경은 ADR-NNN 절차 필수.                                │
│  ★ 이 문서 자체의 수정 권한은 사장님만.                           │
│  ★ v1.0 Frozen: 직접 편집 금지. ADR로만 변경.                    │
└────────────────────────────────────────────────────────────────┘
```

> **사장님 헌법**: "사람이 직접 정하지 않은 것은 박지 않는다."
> **AI 행동**: 추측은 `draft-superseded` 또는 `[TBD: 사장님 확립]` 표시 후 사장님 입력 대기.

---

## 1. Platform Philosophy

### 1.1 사장님 확립 (Mission)

> **AI Bridge Georgia Platform Core**는 **데이터 기반으로 도시와 국가의 여행 생태계를 디지털화**하고,
> **여행자·협력업체·운영자를 하나의 신뢰 네트워크로 연결**하는 **글로벌 운영체제**이다.

이 헌법은 위 미션을 달성하기 위한 **모든 제품의 영구 기준**이 됩니다.

### 1.2 Industry-Agnostic 원칙

```
Platform Core는 특정 산업을 알지 못한다.
Tour, Booking, Hotel, Restaurant, Order, Product, Payment,
Passport, Travel History 같은 단어는 코드/문서/스키마에
한 번도 등장해서는 안 된다.
```

**자동 검증**: `tools/scripts/industry-agnostic-check.sh` (PR마다 자동 실행, 실패 시 머지 차단).

### 1.3 80% Universal / 20% Domain

```
Universal Core (engines/, packages/) = 80%
특정 제품 도메인 코드 = 20%
```

Universal Core는 도메인 지식이 없습니다. 도메인 코드는 Universal Core를 **가져다 쓰기만** 합니다.

### 1.4 Engine, Not Application

```
엔진 = 라이브러리
앱 = 호스트 (엔진을 import해서 쓰는 사람)
예시 = examples/ 폴더 (참고용)
```

엔진은 main() 진입점이 없습니다. 호스트(Hono/Next.js/Express 등)가 import해서 사용합니다.

### 1.5 Reusable for 10+ Years

```
모든 설계 결정은 다음을 최대화한다:
  - 확장성 (extensibility)
  - 설정 가능성 (configurability)
  - 장기 유지보수성 (long-term maintainability)
```

빠른 출시보다 **10년 후에도 쓸 수 있는 구조**를 우선합니다.

---

## 2. Engine Rules

### 2.1 One Engine = One Folder = One README = One PRD = One TRD

> 사장님 확립 (2026-07-11)

```
engines/<name>/
├── README.md          ← 엔진 소개
├── docs/
│   ├── 01-prd.md      ← Product Requirements Document
│   ├── 02-trd.md      ← Technical Requirements Document
│   ├── ...            ← 도메인 모델, DB 스키마, ERD, API, 이벤트 등
│   └── NN-decisions.md ← Decision Catalog (선택)
├── db/                ← DDL (선택)
├── scripts/           ← 엔진 자체 검증 도구
├── examples/          ← 엔진 통합 예시 (선택)
├── src/               ← 엔진 코드 (Sprint 2+)
└── test/              ← 테스트 (Sprint 2+)
```

각 엔진은 **독립적인 제품**처럼 다룹니다.

### 2.2 Industry-Agnostic 검증 의무

> 사장님 확립: "엔진은 자기 산업 도메인 모른다."

- 엔진 코드/문서/스키마에서 산업 키워드 0회 등장해야 함
- 위반 시 PR 자동 차단
- 예외: 메타 문맥 (예: PRD에서 "Tour는 금지"라는 내용을 서술할 때)만 허용

### 2.3 Plugin-Ready 구조

> 사장님 확립 (Identity Engine PRD §2.3): "새로운 Provider를 추가할 때 기존 코드를 수정하지 않고 Provider만 추가할 수 있어야 한다."

각 엔진은 **자기 도메인의 플러그인 인터페이스**를 제공합니다.

```
Identity:    AuthProvider 플러그인 (Google, Kakao, ...)
Notification: Channel 플러그인 (Email, SMS, Push)
Media:       Storage 플러그인 (S3, GCS, ...)
```

새 플러그인 추가 = **새 폴더 1개 + 레지스트리 등록 1줄**.

### 2.4 Configuration Over Code

> 사장님 확립: "관리자는 코드를 수정하지 않고 다음 항목을 설정할 수 있어야 한다."

모든 엔진은 **Admin Console 또는 Configuration API**를 통해 정책을 외부에서 변경 가능해야 합니다.

### 2.5 Audit-Everything

> 사장님 확립: "모든 인증/보안 관련 이벤트는 Audit Log에 기록한다."

- Audit Log는 **append-only** (수정/삭제 불가)
- 변조 방지: **hash chain** (각 로그가 이전 로그의 hash 포함)
- 보관: 사장님 확립 시 결정 (기본: 무기한, 법적 우선)

### 2.6 Encrypt-Everything-Sensitive

> 사장님 확립

- 비밀번호 해시: **Argon2id** (사장님 확립 시 파라미터)
- PII 암호화: 결정적 암호화 + HMAC 검색 (사장님 확립)
- 토큰 / API Key: AES-256-GCM
- KMS 키 분리 (테넌트별 가능)

### 2.7 Multi-Tenant by Default

> 사장님 확립: "모든 데이터는 Tenant 기반으로 관리한다."

- 모든 테이블에 `tenant_id`
- Postgres RLS로 격리 강제
- 엔진 코드도 `tenant_id` 명시 (Defense in Depth)

### 2.8 API Stability (SemVer)

> 사장님 확립: "API는 하위 제품이 그대로 사용할 수 있도록 안정성과 호환성을 유지한다."

- **Major 변경 (v1 → v2)**: 하위 비호환. ADR 필수.
- **Minor 변경 (v1.0 → v1.1)**: 하위 호환 추가.
- **Patch 변경 (v1.0.0 → v1.0.1)**: 하위 호환 버그 수정.

### 2.9 Event-First

> 사장님 헌법: "Event First — 모든 중요 액션은 도메인 이벤트를 발생시킨다"

- 모든 mutation은 도메인 이벤트 발행
- Event Bus는 Universal Core가 제공
- 엔진 간 통신은 이벤트 또는 명시적 인터페이스만 (직접 import 금지)

### 2.10 Engine-to-Engine 통신

```
엔진 A  →  이벤트  →  Event Bus  →  구독 (엔진 B)
엔진 A  →  직접 import  →  엔진 B       ❌ (금지)
```

예외: Universal Core (`packages/core`)는 모든 엔진이 import 가능. 엔진끼리는 **절대 직접 import 금지**.

---

## 3. Repository Rules

### 3.1 사장님 확립 (Monorepo Layout)

> 사장님 확립 (2026-07-11)

```
Platform-Core-Engine/
├── README.md            ← 플랫폼 소개
├── engines/             ← 모든 엔진
│   ├── identity/
│   ├── notification/    ← (예정)
│   ├── media/           ← (예정)
│   ├── cms/             ← (예정)
│   ├── booking/         ← (예정)
│   ├── review/          ← (예정)
│   └── ai/              ← (예정)
├── packages/            ← 공유 패키지
│   ├── core/            ← Universal Core (예정)
│   ├── primitives/      ← 공통 value object (예정)
│   └── testing/         ← 테스트 헬퍼 (예정)
├── docs/                ← 플랫폼 차원 문서 (헌장, ADR, KPI)
├── examples/            ← 호스트 통합 예시
└── tools/               ← 모노레포 운영 도구
```

### 3.2 루트는 플랫폼 리소스만

```
루트에 둘 수 있는 것:
  - README.md (플랫폼 소개)
  - LICENSE
  - CHANGELOG.md
  - package.json (모노레포 워크스페이스 정의)
  - turbo.json / nx.json / pnpm-workspace.yaml (모노레포 도구)
  - tsconfig.base.json (공통 TS 설정)
  - .gitignore / .editorconfig / .prettierrc
  - .github/ (CI/CD)

루트에 두면 안 되는 것:
  - 엔진 코드 (engines/<name>/ 안으로)
  - 패키지 코드 (packages/<name>/ 안으로)
  - 호스트별 docs (각 엔진 docs/ 안으로)
```

### 3.3 폴더별 책임 분리

| 폴더 | 책임 | 의존 가능 |
|---|---|---|
| `engines/<name>/` | 단일 엔진 책임 | `packages/*`, 다른 엔진은 Event Bus 경유만 |
| `packages/<name>/` | 도메인 무관 공유 코드 | 없음 (다른 패키지도 지양) |
| `docs/` | 플랫폼 헌법 + ADR | 없음 |
| `examples/` | 호스트 통합 예시 | `engines/*`, `packages/*` |
| `tools/` | 모노레포 운영 도구 | 없음 |

### 3.4 Engine-Internal / Engine-External 경계

- **Engine-Internal**: `engines/<name>/` 안의 모든 것. 다른 엔진에서 직접 import 금지.
- **Engine-External**: 패키지로 노출되는 것만. `engines/<name>/index.ts`로 명시.

```typescript
// engines/identity/src/index.ts (engine-external API)
export { createIdentityEngine } from './engine';
export type { IdentityEngine, IdentityEngineDeps } from './types';

// engines/identity/src/internal/... (engine-internal, 절대 export 금지)
```

### 3.5 사장님 헌법 — root 절대 규칙

> "사람이 직접 정하지 않은 것은 박지 않는다."

루트 README, 헌장, ADR은 **사장님 확립** 또는 **ADR-NNN을 거친 결정**만 canonical.

---

## 4. Coding Rules

### 4.1 언어 및 런타임

> 사장님 확립 (Universal Core 헌법): "TypeScript Everywhere"

| 항목 | 결정 | 비고 |
|---|---|---|
| 언어 | **TypeScript 5.4+ (strict)** | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| 모듈 | ESM only | CJS 금지 |
| 런타임 | Node 20 LTS / Bun 1.x / Deno 1.40+ | [D-CONFIG-001 결정 대기] |

### 4.2 스타일

> 사장님 확립 (Universal Core 헌법): "Work Simple, Think More"

- **단순한 아키텍처 우선** (복잡한 패턴 자제)
- **순수 함수 우선** (부수 효과는 가장자리에서)
- **명시적 의존성 주입** (global state 금지)
- **DI 컨테이너 자제** (명시적 파라미터)

### 4.3 함수 / 클래스 / 변수

| 종류 | 명명 |
|---|---|
| 변수/함수 | camelCase |
| 클래스/타입/인터페이스 | PascalCase |
| 상수 (immutable enum-like) | UPPER_SNAKE |
| 파일 | kebab-case |
| 디렉토리 | kebab-case |
| DB 테이블 | snake_case (복수형) |
| DB 컬럼 | snake_case |

### 4.4 Import 정책

> 사장님 헌법: "Business modules must never modify the Core"

```typescript
// ✅ OK: 엔진이 Universal Core를 import
import { IEntityStore } from '@platform/core';

// ❌ 금지: 엔진이 다른 엔진을 직접 import
import { NotificationEngine } from '../../notification/src/engine';

// ✅ OK: 다른 엔진과 통신은 Event Bus
import { eventBus } from '@platform/core';
eventBus.on('user.registered', async (event) => {
  // notification 엔진이 구독
});
```

### 4.5 에러 처리

> 사장님 확립: "스택 트레이스는 절대 클라이언트에 반환하지 않음"

- 도메인 에러는 사용자 친화적 메시지 ID만 노출
- 내부 에러는 로깅만
- 모든 에러는 Audit Log 기록 (인증 관련)

### 4.6 테스트

| 종류 | 위치 | 목표 |
|---|---|---|
| Unit | `<engine>/test/unit/` | 라인 90%+ |
| Integration | `<engine>/test/integration/` | Use Case + Repository |
| E2E | `<engine>/test/e2e/` | Full flow |
| Security | `<engine>/test/security/` | 위협별 회귀 |

> 사장님 확립: "테스트 코드 없이 종료 금지"

### 4.7 금지 패턴

```
❌ String concatenation in SQL queries
❌ eval(), Function constructor
❌ Lodash, Moment, Axios (네이티브 또는 더 작은 라이브러리 사용)
❌ CommonJS 의존성
❌ 글로벌 mutable state
❌ 비밀번호/토큰/API key 로깅
❌ PII 평문 저장
```

---

## 5. ADR Rules

### 5.1 사장님 확립 (ADR Process)

> 사장님 헌법: "모든 결정은 ADR-NNN으로 기록"

```
Issue 작성 (ISSUE-NNN.md)
   ↓
ADR 작성 (docs/ADR/ADR-NNN-title.md)
   ↓
사장님 승인 (Architecture Review Board)
   ↓
Approved → Frozen
   ↓
Rejected → Backlog
```

### 5.2 ADR이 필요한 결정

다음 중 하나라도 해당되면 ADR 필수:

- 새 엔진 추가
- 새 패키지 추가
- 헌법 변경 (이 문서 수정)
- Schema 변경 (DDL 변경)
- API 변경 (하위 비호환)
- 보안 정책 변경
- 의존성 추가 (npm package)
- Multi-tenancy 정책 변경

### 5.3 ADR 파일 형식

```markdown
# ADR-NNN: <Title>

**Status**: Proposed / Approved / Rejected / Deprecated
**Date**: YYYY-MM-DD
**Author**: 사장님 확립 또는 AI 추측 (사장님 검토)

## Context
무엇이 문제였는가

## Decision
어떤 결정을 내렸는가

## Consequences
긍정적/부정적 결과

## Alternatives Considered
검토한 대안들
```

### 5.4 ADR 번호 규칙

- **순차적 번호**: ADR-001, ADR-002, ...
- **삭제 안 함**: Approved 후에도 Deprecated로 표시, 절대 삭제 안 함
- **인덱스 파일**: `docs/ADR/INDEX.md`에 모든 ADR 목록 유지

---

## 6. Naming Rules

### 6.1 패키지

```
@platform/<name>           ← Universal Core 패키지
@platform/engine-<name>    ← 엔진 (예: @platform/engine-identity)
```

### 6.2 모듈 / 함수 / 타입

| 종류 | 규칙 | 예시 |
|---|---|---|
| 모듈 | kebab-case | `password-policy.ts` |
| 함수 | camelCase | `evaluatePassword` |
| 변수 | camelCase | `tenantId` |
| 클래스 | PascalCase | `PasswordHash` |
| 인터페이스 | PascalCase | `LoginInput` |
| 타입 alias | PascalCase | `UserId` |
| Enum | PascalCase (값은 UPPER_SNAKE) | `IdentityType.Email` |
| 상수 | UPPER_SNAKE | `MAX_LOGIN_FAILURES` |

### 6.3 DB 명명

```
테이블:    snake_case, 복수형      (users, sessions)
컬럼:      snake_case             (tenant_id, created_at)
PK:        id (UUID)              (id, session_id)
FK:        <table_singular>_id   (user_id, tenant_id)
시각:      *_at 접미사            (created_at, expires_at)
Boolean:   is_* 또는 * 단독       (enabled, verified)
Index:     idx_<table>_<cols>     (idx_users_tenant_status)
Unique:    uniq_<table>_<cols>    (uniq_users_email)
```

### 6.4 Slug / URL

```
엔진 슬러그:        <name>                  (identity, notification)
엔진 URL:           /engines/<slug>/         (/engines/identity/)
엔진 문서:          engines/<slug>/docs/    (engines/identity/docs/)
엔진 결정:          engines/<slug>/docs/<num>-<slug>-decisions.md
```

### 6.5 Event 이름

```
도메인: <domain>.<entity>.<action>     (auth.login.success, identity.provider.linked)
모두 lowercase
점(.)으로 구분
```

### 6.6 절대 금지 단어 (모든 곳)

> 사장님 확립 (Industry-Agnostic 검증)

```
❌ tour / travel / booking / hotel / restaurant
❌ order / product / payment / passport
❌ travel_history / cafe / rentcar / visa / flight / itinerary
```

자동 검증: `tools/scripts/industry-agnostic-check.sh`

---

## 7. Versioning Rules

### 7.1 버전 정책 (SemVer)

```
MAJOR.MINOR.PATCH

MAJOR 변경 (v1 → v2):
  - 하위 비호환 변경
  - ADR 필수
  - 마이그레이션 가이드 제공

MINOR 변경 (v1.0 → v1.1):
  - 하위 호환 기능 추가
  - 새 optional 필드, 새 메서드, 새 이벤트 타입

PATCH 변경 (v1.0.0 → v1.0.1):
  - 하위 호환 버그 수정
  - 문서 오타, 보안 패치
```

### 7.2 패키지별 버전

| 단위 | 버전 정책 | 비고 |
|---|---|---|
| 헌법 (`docs/000_PLATFORM_CONSTITUTION.md`) | 명시적 (v0.1 → v1.0 → v1.1) | ADR 필수 |
| Universal Core 패키지 (`packages/core/`) | SemVer | v1.0 동결, 변경 시 ADR |
| 엔진 (`engines/<name>/`) | SemVer | API 안정성 보장 |
| Country Pack / Theme | SemVer | (Phase 2+) |

### 7.3 v1.0 동결 정책

```
- 사장님이 확립한 v1.0 = Frozen
- 변경은 ADR 절차 필수
- 새 v1.x 추가 시 ADR-NNN 기록
- v2.0 마이그레이션 시 별도 가이드
```

### 7.4 Deprecation 정책

```
- Deprecation 예정 기능은 6개월간 병행 제공
- payload.metadata.deprecated: true 표시
- v2.0에서 완전 제거 (또는 별도 ADR)
```

---

## 8. Release Rules

### 8.1 릴리스 브랜치

```
main           ← 안정 버전, 태그 가능
develop        ← 다음 버전 작업
feature/*      ← 새 기능
hotfix/*       ← 긴급 버그 수정
release/*      ← 릴리스 준비
```

### 8.2 PR 게이트 (사장님 확립)

> 사장님 확립: "테스트 코드 없이 종료 금지" + 헌법 §1.2 Industry-Agnostic

PR이 머지되려면 **모든 게이트 통과**:

```
[ ] TypeScript lint 통과 (ESLint)
[ ] TypeScript typecheck 통과 (tsc --noEmit)
[ ] 단위 테스트 통과 (Vitest)
[ ] 통합 테스트 통과
[ ] 커버리지 90%+ 유지
[ ] Industry-Agnostic 검증 통과 (자동)
[ ] 헌법 준수 검증 통과 (자동, Phase 2+)
[ ] ADR-XXX 작성 (해당 시)
[ ] 사장님 리뷰 승인
```

### 8.3 태그 / 릴리스

```
git tag -a v1.0.0 -m "Identity Engine v1.0.0"

# GitHub Releases 자동 생성
- Title: Identity Engine v1.0.0
- Body: ADR 링크 + 변경 요약 + 마이그레이션 가이드
```

### 8.4 변경 로그 (CHANGELOG.md)

```markdown
# Changelog

## [Unreleased]

## [1.0.0] - 2026-07-11
### Added
- Identity Engine PRD/TRD/Domain Model
- ...

### Changed
- ...

### Deprecated
- ...

### Removed
- ...

### Fixed
- ...

### Security
- ...
```

### 8.5 Breaking Change 절차

```
1. Issue + ADR 작성
2. 사장님 승인
3. Deprecated 표시 (6개월)
4. 마이그레이션 가이드 작성
5. v2.0 릴리스
6. v1.x EOL 통보
```

### 8.6 보안 릴리스

> 사장님 헌법: "잘 되던 것이 갑자기 안되는 = 시스템 전반 회귀"

- 보안 패치는 **즉시 hotfix 브랜치** → main
- Critical CVE 발견 시 24시간 내 패치
- 모든 보안 릴리스는 **CVE ID 또는 내부 INC ID** 명시

---

## 9. 사장님 확립 헌법 진화

### 9.1 헌법 변경 절차

```
1. Issue 제기 (어떤 부분이 왜 부족한가)
2. ADR 작성 (변경 제안)
3. 사장님 승인 (Architecture Review Board)
4. 헌법 업데이트 (이 문서)
5. CHANGELOG 기록
6. v2.0 / v1.1 동결 선언
```

### 9.2 헌법 버전 히스토리

| 버전 | 날짜 | 변경 |
|---|---|---|
| v0.1-draft | 2026-07-11 | Initial draft (사장님 확립 대기) |
| v1.0 | (예정) | 사장님 최종 확립 후 Frozen |

### 9.3 헌법 vs ADR

| 종류 | 위치 | 변경 권한 |
|---|---|---|
| **헌법** | `docs/000_PLATFORM_CONSTITUTION.md` | 사장님만 (ADR 필수) |
| **ADR** | `docs/ADR/ADR-NNN-*.md` | 사장님 승인 후 누구든 |

---

## 10. [TBD: 사장님 확립 필요]

> 사장님 헌법 §1: "사람이 직접 정한 것만 canonical"
> 아래 항목들은 사장님이 직접 확립해주셔야 합니다.

### 10.1 사장님 확립 시 직접 결정할 항목

| # | 결정 | 사장님 확립 |
|---|---|---|
| 1 | Identity Engine PRD의 모든 [D-*-*** 결정](./engines/identity/docs/15-identity-decisions.md) | ❓ |
| 2 | 런타임 (Node vs Bun vs Deno) | ❓ |
| 3 | Argon2id 파라미터 (memory, iterations, parallelism) | ❓ |
| 4 | JWT 서명 알고리즘 (RS256 vs EdDSA) | ❓ |
| 5 | 기본 Session Timeout | ❓ |
| 6 | Audit Log 보존 기간 | ❓ |
| 7 | GDPR Right-to-be-Forgotten 처리 방식 | ❓ |
| 8 | Identity Engine Link/Unlink 정책 | ❓ |

### 10.2 헌법 자체 확립 항목 (사장님 결정 후 v1.0)

| # | 헌법 섹션 | 사장님 확립 |
|---|---|---|
| 1 | §2.6 Argon2id 파라미터 (보안 강도) | ❓ |
| 2 | §4.1 주 런타임 (Node LTS 권장) | ❓ |
| 3 | §7.1 v1.0 → v2.0 마이그레이션 정책 상세 | ❓ |
| 4 | §8.2 PR 게이트 우선순위 | ❓ |
| 5 | §8.6 보안 릴리스 SLA (24시간 vs 48시간) | ❓ |

---

## 11. 사장님 헌법 진실 (확립된 원칙 인용)

> 이 섹션은 사장님이 다른 문서에서 확립하신 원칙을 인용한 것입니다.
> 변경하려면 ADR 필수.

### 11.1 사장님 확립 (헌법 §C-1, 2026-07-04)

> **"허락이 없이 = 요청 안 변경 금지 (자동 수정도 빌드 야기)"**

AI는 사장님의 명시적 허락 없이 요청을 임의로 변경하지 않습니다.

### 11.2 사장님 확립 (헌법 §C-2)

> **"잘 되던 것이 갑자기 안되는 = 단일 서비스 아닌 시스템 전반 회귀"**

문제 발생 시 단일 서비스가 아닌 시스템 전반을 점검합니다.

### 11.3 사장님 확립 (헌법 §C-3)

> **"너가 작성한 글이야 = 책임 추적, 시스템 탓 금지"**

AI가 작성한 산출물은 AI가 책임지고, 시스템 탓을 하지 않습니다.

### 11.4 사장님 확립 (헌법 §C-4)

> **"정보성만 백과사전 스타일 작성 금지 — 사장님 시점 + 여행자 행동 유도 + Hub/CTA"**

(Identity Engine에는 직접 적용 안 되지만, 콘텐츠 엔진 작성 시 적용)

### 11.5 사장님 확립 (헌법 §C-5)

> **"사진 매칭 200 OK만으로 부족 — 실제 사진 내용 직접 확인"**

(Identity Engine에는 적용 안 됨, Media Engine에 적용 예정)

### 11.6 사장님 확립 (헌법 §C-7)

> **"큰 작업 완료 후 마스터 프롬프트 단일 압축 문서 요청"**

큰 작업 완료 후 단일 압축 문서를 작성/요청할 수 있습니다.

### 11.7 사장님 확립 (constitution-authoring skill)

> **"사장님이 직접 정한 것만 canonical, AI가 추측해 박은 1차 초안은 draft-superseded 표시 후 사장님 입력 대기"**

이 헌법 전체에 적용됩니다.

### 11.8 사장님 확립 (constitution-authoring skill)

> **"변경은 ADR 절차 필수: 새 ADR → 사장님 승인 → Frozen"**

이 헌법의 어떤 섹션도 ADR 없이 변경되지 않습니다.

### 11.9 사장님 확립 (2026-07-11)

> **"One Engine = One Folder = One README = One PRD = One TRD"**

각 엔진은 독립 폴더, 독립 README, 독립 PRD, 독립 TRD를 가집니다.

### 11.10 사장님 확립 (2026-07-11)

> **"Repository root should contain only platform-level resources"**

루트는 플랫폼 리소스만 둡니다. 엔진/패키지 코드는 `engines/`, `packages/` 안에.

---

## 12. Platform Design Principles (사장님 신규 확립, 2026-07-11)

> **사장님 Platform CTO 확립** — 모든 엔진의 영구 기준이 되는 6가지 원칙.
> 추가 / 변경 시 ADR 필수.

### 12.1 C-8 — Configuration First

> **모든 기능은 설정보다 코드를 먼저 만들면 안 된다.**

```
Google Login ON/OFF    → 설정 변경으로 처리
Password 정책          → 설정 변경으로 처리
Rate Limit             → 설정 변경으로 처리
```

- 새 기능을 추가할 때 **코드 추가보다 설정 옵션 추가**를 우선 검토
- 정책 / 임계값 / 동작 모드는 **DB 또는 환경변수**로 제어
- "코드를 수정해야만 동작이 바뀐다"는 Anti-pattern
- 예외: 새 비즈니스 로직 자체는 코드가 필요 (예: 새 OAuth Provider)

### 12.2 C-9 — Plugin First

> **새 기능은 기존 코드를 수정하는 것이 아니라 Plugin으로 추가한다.**

```
GoogleProvider     ← plugins/auth-providers/google/
AppleProvider      ← plugins/auth-providers/apple/
KakaoProvider      ← plugins/auth-providers/kakao/
```

- 기존 코드를 수정하지 않고 Plugin만 추가
- 새 Provider = 새 폴더 1개 + 레지스트리 등록 1줄
- 새 Storage Backend, 새 Channel, 새 Theme 모두 같은 원칙 적용
- Plugin 추가 시 기존 코드 0줄 수정이 정상

### 12.3 C-10 — Domain Isolation

> **엔진은 자신의 Domain만 안다.**

```
Identity  ─┐
           │  모름 (Event Bus로만 통신)
Booking  ──┤
           │
Payment  ──┘
```

- **Identity는 Booking을 모른다**
- **Booking은 Payment를 모른다**
- **Payment는 Identity를 모른다** (단, 인증된 신원 정보는 Event Payload로 받음)
- 엔진 간 직접 import 금지 (헌법 §2.10)
- 도메인 객체가 다른 엔진 객체로 새지 않음 (DTO 변환은 EventBus 경계에서)

### 12.4 C-11 — Backward Compatibility

> **Platform Core는 하위 Engine을 깨뜨리는 변경을 절대 하지 않는다.**

- Universal Core (`packages/core/`)의 인터페이스 변경 시:
  - **Major 버전** 업 (v1 → v2)
  - **6개월** Deprecation 기간
  - **마이그레이션 가이드** 제공
- 기존 Engine이 v2에서 깨지면 Platform Core의 잘못
- Engine이 Platform Core 버전을 명시적으로 lock (`@platform/core: ^1.0.0`)

### 12.5 C-12 — Public Contract

> **API, Event, DTO, Schema는 계약(Contract)이다. 마음대로 수정하면 안 된다.**

| Contract | 변경 정책 |
|---|---|
| Public API (REST/gRPC) | 하위 호환 (C-11) |
| Domain Event (이름 + payload) | v1.x 내 stable, 변경 시 deprecation |
| DTO (request/response 타입) | 하위 호환 |
| DB Schema | Forward-compatible (column 추가는 OK, drop은 ADR) |
| Plugin Interface | 하위 호환 (v1 → v2 마이그레이션 가이드) |

- Contract 변경은 **반드시 ADR 절차**
- 새 필드 추가는 OK (Optional), 필드 제거/타입 변경은 Breaking

### 12.6 C-13 — Canonical before Code (가장 중요)

> **코드보다 문서가 먼저다.**

순서는 항상:

```
Problem
   ↓
PRD (무엇을)
   ↓
TRD (어떻게)
   ↓
ADR (왜 이렇게 결정했나)
   ↓
Decision Catalog (구체적 결정 사항)
   ↓
Review (검증)
   ↓
Frozen (사장님 확립)
   ↓
Code (구현)
```

**절대 금지**:

```
Code → 문서    ❌
```

- 코드는 **문서가 Frozen된 후에만** 작성 시작
- 새 기능을 요청받으면 **먼저 PRD부터**
- 코드를 보고 문서를 작성하는 것은 **예외 없음**
- 모든 엔진은 이 순서를 따름

---

### 12.7 C-14 — Policy Injection (사장님 Platform CTO 확립, 2026-07-11)

> **엔진은 Configuration을 직접 조회하지 않는다. 모든 Policy는 Policy Provider를 통해 주입받는다.**

```
Identity ─→ Policy.getPasswordLength() ─→ 12
                    ↓
                Tenant
                    ↓
                Platform Default
                    ↓
                Engine Override
```

- 엔진 코드에 `await db.query("SELECT password_min_length FROM ...") 같은 **직접 조회 금지**
- 모든 정책은 `IPolicyProvider`, `IConfigurationProvider`, `ITenantPolicyResolver`를 통해 주입
- Policy Engine이 **Platform Core의 두 번째 엔진**이 됨
- Identity Engine도 Policy Engine 위에서 동작

**왜 중요한가**: 나중에
```
Restaurant  → Password = 8
Tour        → Password = 12
Bank        → Password = 16
```
이 되어도 Identity Engine은 **코드를 안 고친다**. Policy Engine만 설정 변경.

### 12.8 C-15 — Zero Business Logic in Database (사장님 Platform CTO 확립, 2026-07-11)

> **DB는 데이터 저장만 한다. Business Rule, Security Rule, Policy, Workflow를 가지지 않는다.**

**DB DEFAULT를 허용하는 것**: **기술적 필드만**

```sql
-- ✅ 허용
created_at        TIMESTAMPTZ DEFAULT clock_timestamp()
updated_at        TIMESTAMPTZ DEFAULT clock_timestamp()
version           BIGINT DEFAULT 1
is_deleted        BOOLEAN DEFAULT false
created_by        UUID
uuid              UUID DEFAULT uuid_v7()
```

```sql
-- ❌ 금지 (정책)
password_min_length = 12        -- 정책 = Configuration Engine
login_max_failures = 5          -- 정책 = Configuration Engine
lock_duration_minutes = 30      -- 정책 = Configuration Engine
session_timeout_minutes = 60    -- 정책 = Configuration Engine
require_email_verification = ... -- 정책 = Configuration Engine
two_factor_required = ...       -- 정책 = Configuration Engine
```

- 모든 비즈니스/보안 정책은 **Configuration Engine** 경유
- DB는 단순 저장소
- 정책 변경 시 DB 스키마 변경 불필요

### 12.9 C-16 — Event First Architecture (사장님 Platform CTO 확립, 2026-07-11)

> **모든 중요한 상태 변경은 Event를 발생시킨다. 직접 다른 Engine을 호출하지 않는다.**

```
Engine A ─→ Event Bus ─→ Engine B
       (직접 호출 금지 ❌)
```

- Engine A가 Engine B의 메서드를 직접 호출 ❌
- Engine A는 Event 발행 → Event Bus → Engine B가 구독
- Event는 **많아도 괜찮다. 부족하면 안 된다**
- 미래 Audit / Notification / Analytics / AI / Workflow 가 이 Event를 소비

**Identity Engine 추가 Event (사장님 확립, 2026-07-11)**:
- `auth.verification.requested` (이메일/SMS 인증 코드 요청)
- `auth.2fa.challenge.completed` (2FA challenge 응답)
- `auth.oauth.initiated` (OAuth 시작)
- `auth.session.revoked.user` (사용자가 세션 종료)
- `auth.provider.config.changed` (Admin이 Provider 설정 변경)
- `auth.credentials.created` (Admin이 Credential 생성)
- `auth.credentials.deleted` (Admin이 Credential 삭제)

### 12.10 C-17 — Stop Designing Rule (사장님 Product Owner 확립, 2026-07-11)

> **같은 Engine은 두 번 이상 설계하지 않는다.**

설계 사이클:

```
PRD
  ↓
TRD
  ↓
Decision (철학적 결정만)
  ↓
AVR (PASS)
  ↓
Frozen
  ↓
Implementation
  ↓
Test
  ↓
Review
  ↓
Release
```

**Frozen 이후에는 추가 설계 문서 작성 금지**. Implementation / Test / Review / Release만.

**위반 예 (금지)**:
- ❌ "PRD v2 작성" (PRD v1이 Frozen된 후)
- ❌ "Decision Bible Level 3 추가" (Frozen 이후)
- ❌ "TRD 보강 문서" (TRD v1이 Frozen된 후)
- ❌ "Architecture 문서 보충" (Architecture가 Frozen된 후)

**허용 예**:
- ✅ ADR (변경 결정 기록)
- ✅ Implementation (코드)
- ✅ Test (검증)
- ✅ Release (배포)
- ✅ Frozen 후의 "Bug Report" / "Post-mortem"

### 12.11 Decision ≠ Configuration (사장님 Product Owner 확립, 2026-07-11)

> **Decision은 철학. Configuration은 값. 둘을 섞지 않는다.**

| 구분 | Decision (철학) | Configuration (값) |
|---|---|---|
| 정의 | Platform의 **불변 결정** | 환경에 따라 **override 가능** |
| 변경 빈도 | 한 번 결정되면 안 바뀜 | 자주 바뀜 |
| 저장 위치 | Decision Bible (FROZEN) | Policy Engine (DB) |
| 예 | "이메일 중복 허용? NO" | "Password Length = 12" |
| 예 | "Link Account 허용? YES" | "Session Timeout = 60분" |
| 예 | "Soft Delete? YES" | "Lock Duration = 30분" |
| 책임 | 사장님 확립 | Tenant/Engine/Platform |

**혼동 금지**:
- ❌ Decision Bible에 "Password Length = 12" 같은 값 박기
- ❌ Configuration Engine에 "이메일 중복 허용? YES" 같은 철학 박기

**Configuration은 3계층 해결** (사장님 확립, 헌법 §C-14):
```
Tenant Policy (Restaurant = 8, Tour = 12, Bank = 16)
  ↓ (없으면)
Engine Policy
  ↓ (없으면)
Platform Policy (Global 기본값)
```

### 12.12 Core SDK (사장님 Product Owner 확립, 2026-07-11)

> **Core SDK는 Platform Core의 세 번째 엔진이다.**

```
Policy Engine
    ↓
Core SDK
    ↓
Identity Engine (Sprint 2 구현 시작)
```

**Core SDK가 모든 엔진에 공통 제공**:

- **Logger** — 구조화 로그
- **Config** — 환경 변수 / Boot-time 설정
- **Policy** — IPolicyProvider 래퍼 (Policy Engine 호출)
- **Errors** — 도메인 에러 계층 (IdentityError, PolicyError 등)
- **Result** — Type-safe Result<T, E> (성공/실패 타입)
- **Event** — IEventBus 래퍼 (Universal Core 호출)
- **Validation** — zod 스키마 통합

**왜 SDK인가?**
- Logger/Config/Errors/Result는 **Engine이 아님** (도메인 지식 없음)
- 하지만 **모든 Engine이 사용**해야 함
- 따라서 **공통 SDK**로 제공 (각 Engine이 재구현 방지)

**개발 순서 (사장님 확립)**:
```
[1] Policy Engine (인터페이스 Frozen 완료)
[2] Core SDK    (Policy Engine + Universal Core 활용)
[3] Identity Engine (Policy + Core SDK 활용)
```

**장기적 가치**:
- 모든 Engine이 **Policy Engine + Core SDK + Universal Core**만 의존
- Engine끼리 **직접 import 금지** (헌법 §C-10)
- 개발 순서: Policy → Core SDK → Identity (사장님 확립)

### 12.13 C-18 — Circular Dependency 절대 금지 (사장님 CEO 확립, 2026-07-11)

> **엔진은 항상 상위 → 하위만 참조한다. 절대 A ↔ B가 되면 안 된다.**

```
[허용] 상위 → 하위
Identity → Notification (OK)
Identity → Booking (OK)

[금지] 순환 의존
Identity ↔ Notification (CYCLE — C-18 위반)
```

**위반 시**:
- CI 자동 차단 (`tools/scripts/dep-validator.ts`)
- ADR 없이 해결 불가
- 플랫폼 전체 재설계 위험

**허용되는 의존성 방향**:
- 엔진 → Universal Core (모든 엔진)
- 엔진 → Policy (Policy Engine을 경유)
- 엔진 → Core SDK (SDK 모듈 사용)
- 엔진 → Event Bus (이벤트 발행/구독)

**금지되는 의존성**:
- A ↔ B (서로 직접 import)
- A → B, B → A (간접 순환)
- 엔진 자기 자신 의존

자세한 매트릭스: [Engine Dependency Graph](./Engine_Dependency_Graph.md)

### 12.15 C-19 — Working Software Validates Design (사장님 Platform Owner 확립, 2026-07-11)

> **문서는 설계를 정의한다. 구현은 설계를 검증한다. 구현 결과가 설계와 다르면 설계 또는 구현 중 하나를 수정해야 한다.**

**C-13과 보완 관계**:
- **C-13**: 설계가 먼저 (Canonical before Code)
- **C-19**: 구현으로 설계를 검증 (Working Software Validates Design)

```
[1] PRD 작성 (설계 정의)
[2] TRD 작성
[3] Decision Catalog
[4] AVR (PASS)
[5] Frozen
[6] Implementation ← 여기서 시작 (Working Software)
[7] 구현 결과가 설계와 다르면?
    ├─ 설계 오류 → PRD/TRD 업데이트 (ADR)
    └─ 구현 오류 → 코드 수정
[8] PRG (PASS)
[9] Engine Certification
[10] Release
```

**핵심**:
- 구현 중 떠오른 아이디어는 **즉시 헌법/PRD 수정 ❌**
- → **RFC 후보** 또는 **백로그**로 기록
- 현재 Sprint의 구현 완료가 우선

**플랫폼 품질의 측정**:
- ❌ "문서 개수"
- ✅ "동작하는 Engine 개수 + PRG 통과율"

### 12.17 C-21 — Platform Release Rule (사장님 Platform Owner 확립, 2026-07-11)

> **모든 Engine의 Release는 5단계를 거친다: Draft → Alpha → Beta → RC → Stable.**
> **Stable 선언은 절차의 완료가 아니라, Platform Core가 "실제 동작하는 기반"임을 증명하는 것.**

```
Draft
  ↓ (PRD/TRD 작성 완료)
Alpha
  ↓ (Interface Frozen + 인터페이스 검증)
Beta
  ↓ (구현 완료 + Unit Test 작성)
Release Candidate (RC)
  ↓ (실환경 검증: pnpm install, lint, typecheck, test, build, CI Green, PRG, Certification)
Stable
```

**Stable 선언 조건** (모두 PASS 필수):
1. `pnpm install` PASS
2. `pnpm lint` PASS
3. `pnpm typecheck` PASS
4. `pnpm test` PASS
5. `pnpm build` PASS
6. 다른 Engine에서 실제 Import + PASS
7. Examples 실행 + PASS
8. GitHub Actions Green
9. PRG PASS
10. Engine Certification PASS

**현재 상태** (2026-07-11):
- Core SDK → **v1.0 RC1** (Release Candidate)
- Identity Engine → ⏸ Stable 이후 시작
- Phase 1 (Policy) → Sprint 2A 완료, RC 검증 대기

**Stable 선언 후 Identity Engine 시작** 의 이유:
> "Identity는 Core SDK 위에 만들어집니다. Core SDK가 Stable이 아닌데 Identity를 만들면 나중에 SDK가 바뀔 수 있습니다."

이 원칙은 **의존성 안전 + Breaking Change 방지**.

### 12.16 C-20 — SDK Stability Rule (사장님 Platform Owner 확립, 2026-07-11)

> **Core SDK는 가장 많이 의존되는 엔진. Minor Release에서 100% 하위 호환 유지.**
> **Breaking Change는 Major Version에서만 허용.**

```
Minor (1.0 → 1.1) → 100% 하위 호환
Major (1.x → 2.0) → Breaking Change 가능 (ADR 필수)
```

**규칙**:
- **Minor (backward-compatible)**:
  - 새 인터페이스 추가 (Optional method)
  - 새 타입 추가
  - 새 모듈 추가
  - 기존 인터페이스에 Optional 필드 추가
  - **기존 코드 0줄 수정**

- **Major (breaking)**:
  - 기존 인터페이스 변경
  - 기존 메서드 시그니처 변경
  - 기존 타입 변경
  - 기존 필드 제거
  - **사장님 승인 + ADR 필수**

- **Patch (bug fix)**:
  - 기존 동작 변경 없이 버그만 수정

**시작점**: Core SDK v1.0 (Sprint 2B-1 Release 시점)

**이유**:
- Core SDK는 모든 Engine이 import
- Breaking Change 시 10~30개 Engine 모두 수정 필요
- 하위 호환성 보장이 Platform의 안정성

### 12.14 Platform Core v1.0 Foundation Complete 선언 (사장님 CEO, 2026-07-11)

> **사장님 CEO 확립**:
> "이것이 제가 마지막으로 추가하는 플랫폼 기능입니다. 이제 정말로 구현 단계로 들어갑니다."

Platform Core v1.0 Foundation은 다음을 포함합니다:

| 구성 요소 | Status |
|---|---|
| 헌법 (Constitution) — C-1 ~ C-18 (18개 원칙) | 🔒 Frozen |
| PAC (Platform Acceptance Criteria) — 10개 영구 기준 | 🔒 Frozen |
| PRG (Platform Review Gate) — 19개 질문 | 🔒 Frozen |
| Engine Certification — 7개 인증 항목 | 🔒 Frozen |
| Policy Engine Architecture | 🔒 Frozen |
| Core SDK Architecture | 🔒 Frozen |
| Identity Engine Architecture | 🔒 Frozen |
| Engine Dependency Rules (C-18) | 🔒 Frozen |

**이제부터는 새로운 규칙을 만드는 단계가 아니라, 정해진 규칙으로 엔진을 만드는 단계.**

플랫폼의 품질은 **새로운 문서**가 아니라 **구현 품질과 PRG 통과율**로 평가.

---

## 13. Standard Development Gate (모든 엔진 공통)

> **사장님 Platform CTO 확립 (2026-07-11)** — 모든 엔진이 동일한 품질 기준을 통과하도록 표준화된 게이트.
> 장기적으로 Platform의 가장 큰 경쟁력이 됨.

### 13.1 8단계 게이트

```
[1] PRD 작성 (문제 정의, 요구사항)
    ↓
[2] TRD 작성 (기술 결정, 아키텍처)
    ↓
[3] Decision Bible 작성 (미결정 사항 카탈로그)
    ↓
[4] Architecture Validation Report (AVR-NNN) 작성
    ↓ Cross-Check: PRD ↔ TRD ↔ DB ↔ API ↔ Events ↔ Decisions
    ↓ AVR-NNN = PASS 확인
    ↓
[5] Constitution Compliance Check
    ↓ Industry-Agnostic 검증
    ↓ 헌법 12섹션 준수 확인
    ↓ Constitution Compliance = PASS 확인
    ↓
[6] Implementation (Code)
    ↓
[7] Test (Unit + Integration + E2E + Security)
    ↓
[8] Release (Tag + CHANGELOG + Deploy)
```

### 13.2 Gate Skip 금지

> 어떤 단계도 건너뛸 수 없음.

- PRD 없이 Code 시작 ❌
- AVR 없이 Implementation ❌
- Constitution Check 없이 Release ❌

### 13.3 모든 엔진 적용

> 이 게이트는 **모든 엔진**에 동일하게 적용:

- Identity Engine
- Notification Engine
- Media Engine
- CMS Engine
- Booking Engine
- Payment Engine
- Review Engine
- Analytics Engine
- (이후 추가되는 모든 엔진)

**장기적 가치**: 모든 엔진이 동일한 품질 기준을 통과 → Platform의 가장 큰 경쟁력.

---

## 14. 다음 단계

```
[현재]   v0.1-draft (C-1 ~ C-13 보강 완료)
         ↓
[Step 1] Identity Decision Bible Level 1 결정 (8개) — 사장님 확립
         ↓
[Step 2] Architecture Validation Report (AVR-001) 작성
         ↓ Cross-Check: PRD ↔ TRD ↔ DB ↔ API ↔ Events ↔ Decisions
         ↓ 모순 발견 시 [INCONSISTENCY] 표시 + 권장 수정안
         ↓ AVR-001 = PASS 확인
         ↓
[Step 3] Constitution Compliance Check
         ↓ 헌법 12섹션 + C-8 ~ C-13 준수 확인
         ↓
[Step 4] 사장님 최종 검토
         ↓
[Step 5] v1.0 Frozen 선언 (사장님 명시 시)
         ↓
[Step 6] Identity Engine Sprint 2 시작 (구현)
```

> **사장님이 명시적으로 "v1.0 Frozen"이라 하지 않는 한, 어떤 엔진 구현 작업도 시작하지 않는다.**

---

**End of Platform Constitution v0.1-draft (C-8 ~ C-13 added)**

> 사장님 확립: "이 문서는 앞으로 Platform Core의 헌법이 됩니다."