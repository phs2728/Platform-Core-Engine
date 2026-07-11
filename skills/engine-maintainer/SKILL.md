# Engine Maintainer Skill

> **사장님 Platform Owner 확립 (2026-07-11)**
> **기존 Engine의 업그레이드, 버전 관리, Migration을 담당.**

## 목적

Engine이 Stable 선언된 후, **하위 호환성을 유지하면서 개선**하는 방법.

## 책임

```
1. 기존 Engine 업그레이드
2. Breaking Change 검사
3. Deprecation 관리
4. Migration Guide 생성
5. Version 관리 (SemVer)
6. Release Note 작성
```

## 업그레이드 순서

```
1. 현재 버전 확인 (engine.json, package.json)
2. Public API Snapshot 비교
3. 변경 사항 분류:
   ├── Patch (버그 수정) → 같은 버전
   ├── Minor (새 기능, 하위 호환) → +0.1.0
   └── Major (Breaking Change) → +1.0.0
4. Breaking Change 시:
   ├── ADR 작성 필수
   ├── Migration Guide 작성
   ├── 사장님 승인 필수
   └── Core SDK인 경우 C-20 (SDK Stability Rule) 검증
5. Deprecation:
   ├── @deprecated JSDoc 태그
   ├── 다음 Minor에서 경고
   └── 다음 Major에서 제거
6. Tests: 기존 테스트 전부 PASS 확인
7. PRG 통과
8. Release Note 작성
9. git tag (vX.Y.Z-<engine-name>)
```

## Version 규칙 (SemVer)

```
MAJOR.MINOR.PATCH

1.0.0 → 1.0.1  (Patch: 버그 수정, 기존 동작 변경 ❌)
1.0.0 → 1.1.0  (Minor: 새 기능, 하위 호환 100%)
1.x → 2.0.0    (Major: Breaking Change, ADR + 사장님 승인)
```

### Core SDK 특별 규칙 (C-20)

Core SDK는 **모든 Engine이 의존**:
- Minor: 100% 하위 호환 (기존 코드 0줄 수정)
- Major: 사장님 승인 + ADR 필수

## Deprecation 프로세스

```typescript
// Step 1: Minor에서 @deprecated 표시
/**
 * @deprecated Use `newMethod()` instead. Will be removed in v2.0.0.
 */
export function oldMethod(): void { ... }

// Step 2: 다음 Minor에서 console.warn
export function oldMethod(): void {
  console.warn('oldMethod() is deprecated. Use newMethod().');
  ...
}

// Step 3: Major에서 제거
// (삭제, Migration Guide에 명시)
```

## Release Note 형식

```markdown
# [Engine Name] vX.Y.Z

## Features (Minor)
- 새 기능 설명

## Fixes (Patch)
- 버그 수정 설명

## Breaking Changes (Major)
- 변경 사항 + Migration 방법

## Deprecations
- @deprecated: oldMethod() → newMethod()
```

## 참조

- 헌법 §C-20: SDK Stability Rule
- 헌법 §C-21: Platform Release Rule
- 헌법 §C-22: Merge Gate
- Public API Snapshot: `pnpm public-api-snapshot`
