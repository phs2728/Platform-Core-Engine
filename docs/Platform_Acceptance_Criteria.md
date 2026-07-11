# Platform Acceptance Criteria (PAC)

> **사장님 Product Owner 확립 (2026-07-11)**
> **플랫폼이 완성되었는지를 측정하는 영구 기준**

**Version**: v1.0
**Status**: 🔒 FROZEN (헌법 §C-13 적용, 변경은 ADR)
**Effective Date**: 2026-07-11
**Owner**: 사장님 (박흥식 / Tim Park)

---

## 0. 목적

> **플랫폼이 진짜 플랫폼인지 측정하는 기준.**

각 PAC는 **PASS/FAIL**로 판정 가능해야 하며, 자동화 가능한 것은 자동화.

---

## PAC 목록 (10개)

| ID | 기준 | 측정 방법 | 측정 시점 |
|---|---|---|---|
| **PAC-001** | 새로운 Engine은 30분 안에 추가할 수 있어야 한다 | `engines/<name>/` 폴더 생성 + 매니페스트 등록 1줄 | 새 엔진 추가 시 |
| **PAC-002** | 새로운 OAuth Provider는 기존 코드 수정 없이 추가되어야 한다 | 기존 코드 0줄 변경, 새 폴더 1개 + Registry 등록 1줄 | 새 Provider 추가 시 |
| **PAC-003** | 새로운 Tenant는 코드 수정 없이 생성되어야 한다 | Admin Console / API로 Tenant 생성, 코드 변경 0줄 | 새 Tenant 온보딩 |
| **PAC-004** | 새로운 Language는 번역 파일만 추가하면 된다 | `locales/<lang>.json` 추가, 코드 변경 0줄 | 새 언어 추가 시 |
| **PAC-005** | 새로운 Theme는 CSS Override만으로 적용된다 | CSS 변수 오버라이드만으로 테마 변경 | 테마 추가 시 |
| **PAC-006** | Identity Engine은 Tour OS를 전혀 참조하지 않는다 | `grep -r "tour\|travel\|booking" engines/identity/` = 0건 | 매 PR |
| **PAC-007** | Policy Engine은 Identity Engine을 전혀 참조하지 않는다 | `grep -r "identity" engines/policy/src/` = 0건 | 매 PR |
| **PAC-008** | Core SDK는 어떤 Engine도 참조하지 않는다 | `grep -r "engines/" engines/core-sdk/src/` = 0건 | 매 PR |
| **PAC-009** | 모든 Engine은 독립적으로 테스트 가능하다 | Engine 단독으로 `npm test` 실행 가능 | 매 PR |
| **PAC-010** | 모든 Engine은 독립적으로 Versioning 가능하다 | Engine별 독립 SemVer (`engines/<name>/CHANGELOG.md`) | 릴리스 시 |

---

## PAC 상세

### PAC-001: 새 Engine 추가 시간 ≤ 30분

**측정 절차**:
1. `engines/<name>/` 폴더 생성
2. `README.md`, `docs/01-prd.md`, `docs/02-trd.md` 작성
3. `engines/<name>/package.json` 생성
4. 모노레포 워크스페이스에 등록 (`pnpm-workspace.yaml`)
5. CI 파이프라인에 포함

**PASS 기준**: 위 5단계가 30분 내 완료.

**자동화**: 폴더 구조 lint (`tools/scripts/pac-001.sh` 예정).

### PAC-002: 새 OAuth Provider 무수정 추가

**측정 절차**:
1. `engines/identity/src/provider/<name>/index.ts` 작성 (~100 LOC)
2. `engines/identity/src/provider/_shared/registry.ts`에 1줄 추가
3. `engines/identity/db/schema.sql`의 CHECK 제약 확장 (마이그레이션)
4. 기존 코드 (`usecase/`, `domain/`, `crypto/` 등) 변경 0줄

**PASS 기준**: `git diff --stat` 결과에서 `usecase/`, `domain/`, `crypto/`, `repository/` 변경 0줄.

### PAC-003: 새 Tenant 무수정 생성

**측정 절차**:
1. Admin Console에서 Tenant 이름/도메인 입력
2. "Create Tenant" 클릭
3. DB INSERT 1회 (Tenant + 기본 Security Policy + 기본 AuthProvider 설정)
4. 코드 변경 0줄

**PASS 기준**: Tenant 생성 후 즉시 로그인 가능.

### PAC-004: 새 Language 번역 파일만 추가

**측정 절차**:
1. `locales/<lang>.json` 생성
2. 번역 키 매핑
3. 코드 변경 0줄

**PASS 기준**: `i18n.register('ko', koJson)` 1줄 호출로 동작.

### PAC-005: 새 Theme CSS Override만

**측정 절차**:
1. `themes/<theme>.css` 생성
2. CSS 변수 (`--primary`, `--accent` 등) 정의
3. 코드 변경 0줄

**PASS 기준**: `<html data-theme="dark">` 1줄 토글만으로 테마 변경.

### PAC-006: Identity Engine은 Tour OS 미참조

**측정**: `tools/scripts/verify-industry-agnostic.sh` (헌법 §C-1)

```bash
cd engines/identity && bash scripts/verify-industry-agnostic.sh
# Expected: 0 violations
```

**PASS 기준**: 31개 금지 단어 (tour, booking, hotel 등) 0회 등장.

### PAC-007: Policy Engine은 Identity Engine 미참조

**측정**:
```bash
grep -rE "engines/identity|@aibg/engine-identity" engines/policy/src/
# Expected: 0 matches
```

**PASS 기준**: 0 매치.

### PAC-008: Core SDK는 Engine 미참조

**측정**:
```bash
grep -rE "engines/(identity|policy|notification|booking|media|ai|cms|review|analytics|workflow)" engines/core-sdk/src/
# Expected: 0 matches
```

**PASS 기준**: 0 매치 (Core SDK는 Universal Core만 의존).

### PAC-009: Engine 독립 테스트

**측정**:
```bash
cd engines/<name> && npm test
# Expected: exit 0
```

**PASS 기준**: Engine 단독으로 모든 테스트 통과.

### PAC-010: Engine 독립 Versioning

**측정**:
```bash
cat engines/<name>/package.json | grep '"version"'
# Expected: 독립 SemVer
```

**PASS 기준**: 각 Engine은 자기 SemVer를 갖고, 다른 Engine과 강결합 없음.

---

## PAC 판정 매트릭스 (현재 상태)

| PAC | 상태 | 비고 |
|---|---|---|
| PAC-001 | 🔴 Design 단계 | Sprint 2 이후 측정 |
| PAC-002 | 🟡 부분 | Plugin 인터페이스 정의됨, 실제 Provider 구현은 Sprint 2 |
| PAC-003 | 🔴 미구현 | Sprint 2 이후 |
| PAC-004 | 🔴 미구현 | i18n은 Identity Engine 범위 밖 (Core SDK?) |
| PAC-005 | 🔴 미구현 | 테마 시스템은 별도 결정 |
| PAC-006 | ✅ 자동화됨 | verify-industry-agnostic.sh |
| PAC-007 | ✅ 자동화됨 | grep 검증 |
| PAC-008 | ✅ 자동화됨 | grep 검증 |
| PAC-009 | 🔴 미구현 | Sprint 2 이후 |
| PAC-010 | 🟡 부분 | 폴더 구조는 분리됨, SemVer는 Sprint 2 이후 |

**자동화 도구** (헌법 §13.1 PR 게이트):
```bash
# PR마다 자동 실행
tools/scripts/pac-check.sh
# 모든 PAC-006/007/008 자동 PASS → PR 머지 허용
```

---

## PAC 위배 시 처리

1. **PAC-006/007/008 (자동)** — PR 자동 차단
2. **PAC-001~005, 009, 010 (수동)** — Engine Certification 단계에서 확인
3. **반복 위배** — ADR로 정책 재검토

---

**End of Platform Acceptance Criteria v1.0**

> 사장님 Product Owner 확립: "플랫폼이 완성되었는지를 측정하는 영구 기준"