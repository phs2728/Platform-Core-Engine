# CMS Engine RC1 — Sprint C 절대 원칙

> 사장님 확립 2026-07-13
> **CMS는 Content만 관리한다. Theme/Component는 절대 수정하지 않는다.**

---

## 원칙 1. Content-only Ownership

```
Theme Engine  (정책 결정, Source of Truth)
      │
      ▼
Theme Manifest  (읽기 전용 계약)
      │
      ▼
Component Engine  (정책 해석, 컴포넌트 생성)
      │
      ▼
CMS Engine  ← Content만 관리, Theme/Component는 read-only 참조
      │
      ▼
Content  (CMS 자체 SSoT)
```

CMS가 **직접 관리하는 것**:
- Content (텍스트, 이미지, 비디오, 파일)
- Page (Content를 어디에 배치할지)
- Section (Page 안의 의미 단위)
- ContentSlot (Section 안의 Content 위치)
- Layout Snapshot (Page의 현재 렌더링 결과)

CMS가 **절대 하지 않는 것**:
- Theme 수정/저장/생성 ❌
- Component 수정/저장/생성 ❌
- BrandPersonality/DesignLanguage 결정 ❌
- Quality Score 결정 ❌

---

## 원칙 2. Read-Only Host Interface Surface

CMS는 다음 API만 호출 가능:

```typescript
// Theme에서
interface IThemeManifestReader {
  resolveThemeManifest(tenantId: string, themeId: string): Promise<Result<ResolvedManifest, Error>>;
  // ↑ CMS가 호출할 수 있는 유일한 Theme API
}

// Component에서
interface IComponentReader {
  getComponent(tenantId: string, componentId: string): Promise<Result<ComponentManifest, Error>>;
  listComponentsByType(tenantId: string, componentType: string): Promise<Result<ComponentManifest[], Error>>;
  // ↑ CMS가 호출할 수 있는 유일한 Component API
}
```

CMS는 다음을 **절대 호출 금지**:
- `themeProvider.createTheme()` ❌
- `componentProvider.createComponent()` ❌
- `themeProvider.updateBrandPersonality()` ❌
- `componentProvider.updateVariant()` ❌
- 어떤 Theme/Component의 write API도 ❌

---

## 원칙 3. Content는 CMS의 SSoT

```
Content = { contentId, tenantId, type, body, locale, status, ... }
         ↓
ContentSlot = PageSection 안의 Content 위치
         ↓
Page = URL 단위 (Hero, Search, CTA, Footer)
         ↓
Render = Content + Theme Manifest + Component (read-only)
```

Content 변경 → Page 재렌더링 (결정적)
Content 외 어떤 것도 CMS에서 변경 불가

---

## 원칙 4. Page 구성 = Theme Manifest 기반

```typescript
// CMS가 Page 생성 시
const page = createPage({
  slug: '/home',
  sections: [
    {
      id: 'hero-section',
      componentRef: 'hero-component-id',
      themeRef: 'theme-1',
      slots: [
        { slotName: 'headline', contentId: 'content-headline-1' },
        { slotName: 'cta', contentId: 'content-cta-1' }
      ]
    }
  ]
});

// Page render 시
const rendered = await renderPage({ pageId, device: 'desktop' });
// → ThemeManifest (read-only) + Component (read-only) + Content (CMS-owned)
// → 결정적 output
```

CMS는 Theme/Component의 `componentRef`/`themeRef`만 **참조**한다. 그것들의 정의는 다른 엔진이 소유.

---

## 원칙 5. Render는 결정적

```typescript
// 같은 (pageId, contentVersion, themeManifestHash) → 같은 rendered HTML
const r1 = await renderPage({ pageId: 'p-1' });
const r2 = await renderPage({ pageId: 'p-1' });
// r1 === r2 (deterministic if content unchanged)
```

테스트로 검증.

---

## Merge Gate 추가 검증 (Sprint C 종료 시)

1. **Read-Only API Surface**
   - `engines/cms/` 에서 Theme/Component write API import 0건
   - `IThemeManifestReader` (read-only) 외 Theme API 호출 0건
   - `IComponentReader` (read-only) 외 Component API 호출 0건

2. **Import Boundary**
   - `engines/cms/` 가 `@platform/core-sdk` 외 다른 워크스페이스 패키지 import 0건
   - Theme/Component 타입은 Host Interface로만 노출 (직접 import 금지)

3. **Content SSoT**
   - Content 생성/수정/삭제 CMS 안에서만 발생
   - Content 변경 시 Page 재렌더링이 결정적
   - Page Layout은 componentRef/themeRef만 보관 (definition은 다른 엔진)

4. **Determinism**
   - `renderPage` 가 동일 입력 → 동일 출력
   - 모든 use-case의 clock은 외부 주입
   - `Math.random()` 사용 0건

5. **Theme/Component Event 격리**
   - CMS는 `theme.changed`, `component.reviewed` 같은 이벤트를 직접 구독하지 않음
   - Page render는 항상 최신 Theme/Component를 resolve (lazy, not push)

---

## 분리 원칙: Content vs Policy vs Interpretation

| 역할 | 엔진 |
|---|---|
| **정책 결정** | Theme Engine |
| **정책 해석** (Component 생성) | Component Engine |
| **Content 관리** | CMS Engine |
| **출력 조립** (Content + Theme + Component) | CMS Engine (renderPage) |

---

## CMS Engine RC1 신규 UseCases (25+개)

### Content Lifecycle (5)
- createContentUseCase
- updateContentUseCase
- deleteContentUseCase
- getContentUseCase
- listContentByTypeUseCase

### Page Lifecycle (5)
- createPageUseCase
- updatePageUseCase
- archivePageUseCase
- getPageUseCase
- listPagesUseCase

### Section (3)
- addSectionUseCase
- updateSectionUseCase
- removeSectionUseCase

### ContentSlot (3)
- createContentSlotUseCase
- assignContentToSlotUseCase
- removeContentFromSlotUseCase

### Render (3)
- renderPageUseCase (deterministic)
- renderSectionUseCase
- renderPreviewUseCase (per-device preview)

### Locale & Versioning (3)
- createLocaleVariantUseCase
- publishContentUseCase
- listContentVersionsUseCase

### Layout Snapshot (3)
- createLayoutSnapshotUseCase
- getLayoutSnapshotUseCase
- compareLayoutSnapshotsUseCase

총 **28 UCs**.

---

## 변경 이력

- 2026-07-13: Sprint C 시작, 원칙 5개 확정 (사장님 승인)