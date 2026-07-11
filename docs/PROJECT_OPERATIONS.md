# Platform Core Project Operations

> **사장님 Platform Owner 확립 (2026-07-11)**
> **재현 가능한 검증 결과가 자산.**

**Version**: v1.0  
**Status**: 🔒 FROZEN (Companion 헌법 §C-21, §C-22)  
**Effective Date**: 2026-07-11  
**Owner**: 사장님 (박흥식 / Tim Park)

---

## 0. 목적

> **이 문서는 Platform Core 프로젝트의 운영 원칙을 정의한다.**
> **Merge, Approval, Stable 선언이 어떻게 일어나는지 명확히 한다.**

---

## 1. 핵심 원칙

### 1.1 증거 중심 (Evidence-First)

```
"구현했습니다" < "PASS/PASS/PASS"
```

- 보고서만으로는 승인 ❌
- 실행 결과만으로 승인 ✅
- **재현 가능**해야 함 (CI 로 확인 가능)

### 1.2 자동 검증 우선

- 모든 검사는 **자동화**되어야 함
- 사람의 "이거 잘 됐어요"는 가치가 없음
- CI가 PASS하면 검증된 것

### 1.3 Platform 회사의 자산

- ❌ "문서가 많음"
- ✅ "재현 가능한 검증 결과"
- ❌ "구현 완료"
- ✅ "Green CI"

---

## 2. Merge Gate (C-22)

### 2.1 승인 기준 (6개 모두 PASS)

```
pnpm install    PASS
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS
pnpm build      PASS
GitHub Actions  Green
```

이 두 가지가 충족되어야 Merge/Approval 가능.

### 2.2 명령어

```bash
# 호스트에서 실행
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# Push 후 GitHub Actions 결과 확인
gh run list
```

### 2.3 하나라도 실패 시

- ❌ Merge/Approval 거부
- 원인 분석 → Fix → 재검증
- 사장님 보고: PASS된 것만, FAIL은 새로 검증 후 보고

---

## 3. 보고 형식 (간결)

Sprint 종료 시 사장님께 보고하는 표준 형식:

```
Sprint: [Sprint Name]

Build                  ✅ PASS
Lint                   ✅ PASS
Typecheck              ✅ PASS
Tests                  ✅ PASS (N/N)
Examples               ✅ PASS
Import Boundary        ✅ PASS
Public API Snapshot    ✅ PASS
GitHub Actions         ✅ PASS
PRG                    ✅ PASS
Engine Certification   ✅ PASS
```

### 3.1 형식 규칙

- ✅ PASS / ❌ FAIL / ⚠️ WARNING
- Tests 개수: `PASS (48/48)`
- 추가 설명은 ❌ (간결하게)
- 실패 시: 어떤 게 왜 실패했는지만

### 3.2 ❌ 금지된 보고 형식

```
# 이렇게 보고 안 됨

"Core SDK v1.0.0 RC1을 만들었습니다. 5개 모듈이 있어요.
 README도 작성했고, examples도 있어요. Sprint 2B-2가 잘 끝났어요..."
```

→ 이런 보고는 가치 없음. PASS/N만 가치 있음.

---

## 4. Platform Release Rule (C-21)

### 4.1 5단계

```
Draft
  ↓
Alpha
  ↓
Beta
  ↓
Release Candidate (RC)
  ↓
Stable
```

### 4.2 Stable 선언 절차

**Stable은 사람이 선언하는 것이 아닙니다.**  
**검증 결과를 사람이 확인한 뒤 선언하는 상태입니다.**

```
1. CI가 모두 통과
2. PRG가 통과
3. Engine Certification 완료
4. 사장님이 "Core SDK v1.0 Stable" 선언
5. v1.0.0 Tag 생성
```

### 4.3 현재 상태 (2026-07-11)

| 엔진 | 단계 | 비고 |
|---|---|---|
| Policy | RC 검증 대기 | Sprint 2A 완료 |
| **Core SDK** | **v1.0 RC1** | 조건 충족 시 Stable |
| Identity | ⏸ Stable 후 시작 | 의존성 안전 |

---

## 5. Identity Engine 시작 조건

다음 5개 + 1개 모두 PASS + 사장님 확인:

```
pnpm install    PASS
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS
pnpm build      PASS

GitHub Actions  Green
```

**그 후에 사장님이 "Stable 선언" + "Sprint 2C 시작" 둘 다 명시.**

---

## 6. 금지된 것

### ❌ 보고서로 승인 요청

```
"이번 Sprint는 잘 진행됐습니다. Pass 해 주세요."
```

### ❌ 부분 검증으로 PASS

```
"테스트는 좀 안 됐지만 나머지는 다 좋아요. Merge 해 주세요."
```

### ❌ Stable 조기 선언

```
"곧 Stable 될 거 같으니까 미리 선언해두죠."
```

### ❌ Sprint 2C 선행

```
"Identity Engine이 급하니까 Core SDK Stable 전에 시작할게요."
```

---

## 7. 권장되는 것

### ✅ 순수한 PASS 보고

```
Lint    ✅ PASS
Build   ✅ PASS
...
```

### ✅ 실패 시 명확한 진단

```
Lint    ❌ FAIL
Reason: engines/policy/src/errors.ts:42 - unused import 'PlatformError'
```

### ✅ 단계별 진행

```
RC1 → 실환경 검증 → Stable → Sprint 2C
```

---

## 8. 사장님 핵심 메시지 (저장)

> **"Stable은 사람이 선언하는 것이 아니라, 검증 결과를 사람이 확인한 뒤 선언하는 상태입니다."**

> **"Platform 회사는 문서보다 재현 가능한 검증 결과가 자산입니다."**

---

## 9. 다음 행동

**호스트 환경 (사장님 제공)**:
1. pnpm 9.x 설치
2. `pnpm install` (모노레포 workspace)
3. `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
4. Push 후 GitHub Actions 확인

**사장님**:
1. 6개 Gate 결과 확인
2. PRG + Engine Certification 확인
3. **`"Core SDK v1.0 Stable"`** 선언
4. **`"Sprint 2C 시작"`** 명령

---

**End of Platform Core Project Operations v1.0**

> 사장님 Platform Owner: "운영 관점에서 가장 중요한 것은 재현 가능한 검증 결과."