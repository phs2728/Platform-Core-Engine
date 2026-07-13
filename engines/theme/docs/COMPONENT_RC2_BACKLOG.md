# Component Engine RC2 — Backlog (사장님 확립 2026-07-13)

> Theme Engine RC2가 `theme.changed` 이벤트를 emit하므로,
> Component Engine RC2는 이를 구독하여 자동 재생성 파이프라인을 구축한다.

---

## 자동 재생성 파이프라인

```
Theme Engine RC2
    ↓ emits
theme.changed
    ↓
Component Engine RC2 (이벤트 구독자)
    ↓
모든 Component의 Token 자동 재해결
    ↓
Component Quality Score 재계산
    ↓
Preview 재생성
    ↓
Publish Candidate 생성
```

---

## RC2 UseCases (추가 작업)

| UC | 설명 | 우선순위 |
|---|---|---|
| `subscribeToThemeChangedUseCase` | `theme.changed` 이벤트 구독 | P1 |
| `reResolveComponentTokensUseCase` | 모든 Component TokenReference 재해결 | P1 |
| `recalculateComponentScoresUseCase` | Quality Score 재계산 (9 dimensions) | P1 |
| `regenerateComponentPreviewUseCase` | Preview 재생성 | P2 |
| `createPublishCandidateUseCase` | Publish 후보 자동 생성 | P2 |
| `getComponentByManifestThemeUseCase` | Theme Manifest 기반 Component 조회 | P2 |

---

## Host Adapter 추가 필요

```typescript
interface IThemeManifestProvider {
  getManifest(tenantId: string, themeId: string): Promise<Result<ThemeManifest, Error>>;
}

interface IThemeEventSubscriber {
  onThemeChanged(tenantId: string, themeId: string): Promise<Result<void, Error>>;
}
```

---

## Component RC2 진행 순서

1. Theme Engine RC2 push (현재 작업) — `feature/theme-engine-rc2` ✅ 진행 중
2. Component Engine RC2: Theme Manifest 자동 연동 ← 다음 sprint
3. CMS Engine RC1 (Theme/Component 모두 참조)
4. Studio Engine RC1

---

## CMS Engine 영향 (사장님 지시)

> "CMS는 Theme를 직접 수정하면 안 됩니다. Component도 수정하면 안 됩니다. Content만 관리합니다."

CMS Engine은 Theme Manifest를 **읽기 전용**으로 참조한다:
- Hero → Theme Manifest (읽기)
- Search → Component (읽기)
- CTA → Component (읽기)
- Content → CMS 자체 관리

따라서 CMS Engine은 Theme/Component의 write API를 호출하지 않는다.