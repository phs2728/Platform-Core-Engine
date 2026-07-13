# Component Engine RC2 — Sprint B 절대 원칙

> 사장님 확립 2026-07-13
> **Sprint B의 목표는 "자동 생성"이 아니라 "Manifest를 소비하는 엔진"을 만드는 것이다.**

---

## 원칙 1. 단방향 의존성

```
Theme Engine
      │
      ▼
Theme Manifest
      │
      ▼
Component Engine
```

절대 금지:

```
Theme Engine ◄────► Component Engine  (순환 참조)
```

- Component Engine은 Theme Engine을 직접 import하지 않는다 (Host Interface만 사용)
- Theme Engine은 Component Engine을 호출하지 않는다 (event emit만)
- Theme Manifest가 둘 사이의 유일한 계약 (Contract)

---

## 원칙 2. Manifest 읽기 전용 계약

Component Engine은 **오직 다음 API만** 호출해야 한다:

```typescript
interface IThemeManifestConsumer {
  resolveThemeManifest(tenantId: string, themeId: string): Promise<Result<ResolvedManifest, Error>>;
  // ↑ Component가 호출할 수 있는 유일한 Theme API
}
```

다음은 **절대 금지**:

| 금지 동작 | 이유 |
|---|---|
| Theme 수정 | Theme Engine만 가능 |
| Theme 저장 | Theme Engine만 가능 |
| Theme 생성 | Theme Engine만 가능 |
| Theme 이벤트 발행 | Theme Engine만 가능 |
| BrandPersonality 조회 | Manifest 안에 있음 |
| BrandEmotion 조회 | Manifest 안에 있음 |
| MotionProfile 조회 | Manifest 안에 있음 |
| AccessibilityProfile 조회 | Manifest 안에 있음 |

Component Engine이 알아야 할 것은 **ThemeManifest 단 하나**뿐이다.

---

## 원칙 3. Auto Regeneration 범위 (단방향)

```
Theme 변경 (Theme Engine만 가능)
      │
      ▼
Manifest 생성/업데이트 (Theme Engine)
      │
      ▼
theme.changed 이벤트 emit
      │
      ▼
Component Engine이 이벤트 구독
      │
      ▼
영향받는 Component의 Token만 자동 재해결
      │
      ▼
Component Score 재계산
      │
      ▼
Preview 재생성
      │
      ▼
Publish Candidate 생성
      │
      ▼
끝
```

**절대 금지**:

```
Component 수정
      │
      ▼
Theme 수정
      │
      ▼
Manifest 수정
```

Theme는 항상 Source, Component는 항상 Sink.

---

## 원칙 4. 영향 범위 최소화

`theme.changed` 이벤트 수신 시:

- ✅ 영향받는 Component(같은 themeId 사용) **만** 재생성
- ❌ 모든 Component 전체 재생성 **절대 금지**

```typescript
// ✅ 올바른 예
const affected = components.filter(c => c.themeId === changedThemeId);
await Promise.all(affected.map(regenerateComponent));

// ❌ 절대 금지
const all = await listAllComponents();
await Promise.all(all.map(regenerateComponent));  // O(N) 전체 재생성
```

---

## 원칙 5. 결정적(deterministic) 재생성

같은 입력 → 항상 같은 결과:

```typescript
// resolveThemeManifest(tenantId, themeId)
//   - 동일한 Theme Manifest라면
//   - 항상 동일한 resolvedTokens 반환
//   - 결정적 함수 = side effect 없음 + 동일 입력 = 동일 출력
```

테스트에서 검증:

```typescript
const r1 = await resolveThemeManifest(tenantId, themeId);
const r2 = await resolveThemeManifest(tenantId, themeId);
expect(r1).toEqual(r2);  // 결정적
```

비결정적 입력 (Date.now(), Math.random()) 사용 금지.

---

## Merge Gate 추가 검증 (Sprint B 종료 시)

1. **단방향 의존성 유지**
   - `engines/component/` 에서 `engines/theme/` 직접 import 0건
   - `IThemeManifestConsumer` 외 Theme API 호출 0건

2. **Import Boundary**
   - `engines/component/` 가 `@platform/core-sdk` 외 다른 워크스페이스 패키지 import 0건
   - `ThemeManifest`, `ResolvedManifest` 타입은 Host Interface로만 노출

3. **영향 범위 최소화**
   - `regenerateAllComponentsOnThemeChange` 같은 API 절대 없음
   - `subscribeToThemeChanged` 가 영향받는 component만 emit하는지 검증

4. **결정성 (Determinism)**
   - `resolveThemeManifest` 가 동일 입력에 동일 출력 검증
   - 모든 신규 UseCase의 `clock` 은 외부에서 주입 (Mock 가능)
   - `Math.random()` 사용 0건 (idGenerator만 예외)

5. **Theme Domain Event 격리**
   - Component Engine은 `theme.changed` 만 구독
   - `theme.compiled`, `theme.scored`, `manifest.published` 같은 Theme 내부 이벤트 직접 의존 0건

---

## 분리 원칙: 정책 결정 vs 정책 해석

| 역할 | 엔진 |
|---|---|
| **정책 결정** (Source of Truth) | Theme Engine |
| **정책 해석** (Manifest 소비) | Component Engine |

- Theme Engine: BrandPersonality / BrandVoice / DesignLanguage / MotionProfile / AccessibilityProfile 를 **결정**한다
- Component Engine: ThemeManifest 안의 resolvedTokens 만 **읽고** Component를 **생성/업데이트**한다

이 분리가 깨지면 RC2의 의미가 사라진다.

---

## Component Engine RC2 신규 UseCases (6개)

| UC | 역할 | 단방향 |
|---|---|---|
| `subscribeToThemeChangedUseCase` | `theme.changed` 이벤트 구독 | O (read) |
| `reResolveComponentTokensUseCase` | 영향받는 Component TokenReference 재해결 | O (read) |
| `recalculateComponentScoresUseCase` | Component Quality Score 재계산 | O (self) |
| `regenerateComponentPreviewUseCase` | Preview 재생성 | O (self) |
| `createPublishCandidateUseCase` | Publish 후보 자동 생성 | O (self) |
| `getComponentsByManifestThemeUseCase` | Theme Manifest 기반 Component 조회 | O (read) |

총 6개 신규 UC. **Theme API 호출은 단 1개 (`resolveThemeManifest`)**.

---

## 변경 이력

- 2026-07-13: Sprint B 시작, 원칙 5개 확정 (사장님 승인)