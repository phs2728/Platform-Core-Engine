# Studio Engine RC1 — Sprint D 절대 원칙

> 사장님 확립 2026-07-13
> **Studio는 페이지 빌더 UX만 관리. Theme/Component/CMS를 절대 수정하지 않는다.**

---

## 원칙 1. Studio = Page Builder Process (Process Ownership)

```
Theme Engine     (정책 결정, Source of Truth)
       ↓
Component Engine (정책 해석, Component 정의)
       ↓
CMS Engine       (Content SSoT, Page 정의)
       ↓
Studio Engine    ← Workspace/BuildSession/Draft/Publish-Intent (Process만 관리)
```

**Studio가 관리하는 것 (Process만)**:
- Workspace (사용자 작업 영역)
- BuildSession (페이지 빌드 세션)
- PageDraft (Page의 작업 중 상태, publish 전)
- ComponentBinding (어떤 Component를 어디에 배치할지 binding)
- ContentBinding (어떤 Content를 어디에 연결할지 binding)
- PublishIntent (CMS Page로 publish 요청)
- StudioAsset (빌드 자산)

**Studio가 절대 하지 않는 것**:
- Theme/Manifest/Brand 정의 ❌
- Component 정의 ❌
- Content 정의 ❌
- CMS Page 직접 publish (CMS가 처리) ❌

---

## 원칙 2. Read-Only Host Interface Surface (3 readers)

Studio는 다음 3개 reader만 호출 가능:

```typescript
interface IThemeReaderForStudio {
  resolveThemeManifest(tenantId: string, themeId: string): Promise<Result<ResolvedManifest, Error>>;
}

interface IComponentReaderForStudio {
  getComponent(tenantId: string, componentId: string): Promise<Result<ComponentManifest, Error>>;
  listComponentsByType(tenantId: string, componentType: string): Promise<Result<ComponentManifest[], Error>>;
}

interface ICMSReaderForStudio {
  // Studio는 Page를 직접 publish하지 않음 — PublishIntent만 생성
  // CMS가 consume하여 실제 publish 처리
  getPage(tenantId: string, pageId: string): Promise<Result<PageRef, Error>>;
  listContent(tenantId: string, type: ContentType): Promise<Result<ContentRef[], Error>>;
}
```

Studio는 다음을 **절대 호출 금지**:
- `themeProvider.createManifest()` ❌
- `componentProvider.createComponent()` ❌
- `cmsProvider.createPage()` (직접) ❌ → 대신 `publishIntentUseCase` → CMS가 처리
- `contentProvider.createContent()` ❌

---

## 원칙 3. PublishIntent Pattern (CMS는 그대로, Studio는 의도만)

Studio는 Page를 직접 publish하지 않습니다. 대신:

```
Studio
  ↓
createPublishIntentUseCase (Studio 내부, publish 요청만 기록)
  ↓ emits
studio.publish.intent event
  ↓
CMS Engine (별도 process)이 event 구독하여 실제 publish 처리
```

이렇게 함으로써:
- Studio는 publish 의도만 표현
- CMS는 publish 권한 + 검증 보유
- 책임 분리 명확

---

## 원칙 4. BuildSession 결정성 (Sprint B/C 원칙 계승)

```typescript
// 같은 (workspaceId, pageSlug, themeRef, componentBindings, contentBindings) → 같은 draft
const d1 = await createDraftUseCase({ workspaceId, pageSlug, themeRef, ... });
const d2 = await createDraftUseCase({ workspaceId, pageSlug, themeRef, ... });
// 결정적: 같은 입력 → 같은 draftId 외 동일 데이터
```

Studio의 모든 build operation은 결정적입니다.

---

## 원칙 5. Composition Verification

Studio는 draft를 publish 전에 **반드시 verify**합니다:

```typescript
verifyDraftCompositionUseCase:
  1. themeRef가 Theme Manifest에서 resolve 가능한가? (read-only)
  2. 모든 ComponentBinding이 ComponentManifest에서 resolve 가능한가? (read-only)
  3. 모든 ContentBinding이 CMS Content에 존재하는가? (read-only)
  4. 모든 Content가 Published 상태인가? (CMS 조회)
  
  → verification: { valid: boolean, errors: [], warnings: [] }
```

publish는 verification 통과 후에만 가능.

---

## Merge Gate 추가 검증 (Sprint D 종료 시)

1. **Read-Only 3 Reader Surface**
   - `engines/studio/` 가 IThemeReaderForStudio / IComponentReaderForStudio / ICMSReaderForStudio만 호출
   - write API 호출 0건

2. **Import Boundary**
   - `engines/studio/` 가 `@platform/core-sdk` 외 다른 워크스페이스 패키지 import 0건
   - 모든 cross-engine은 read-only Host Interface로만

3. **PublishIntent Pattern**
   - Studio는 CMS Page publish를 직접 호출하지 않음
   - studio.publish.intent event를 emit하고 CMS가 consume

4. **Composition Verification**
   - `verifyDraftCompositionUseCase` 가 theme/component/content 모두 resolve 확인
   - verification 통과 전 publish 거부

5. **Theme/Component/CMS Event 격리**
   - Studio는 theme.changed / component.reviewed / cms.page.rendered 직접 구독 안 함
   - BuildSession은 lazy resolve (render 시점에 최신 데이터 fetch)

---

## 분리 원칙

| 역할 | 엔진 |
|---|---|
| 정책 결정 | Theme Engine |
| 정책 해석 (Component 생성) | Component Engine |
| Content SSoT + Page 정의 | CMS Engine |
| 페이지 빌드 UX | **Studio Engine** ← new |
| 빌드 → Publish 의도 | Studio (PublishIntent) |
| 빌드 → Publish 실행 | CMS (event consumer) |

---

## Studio Engine RC1 신규 UseCases (28+개)

### Workspace (4)
- createWorkspaceUseCase
- updateWorkspaceUseCase
- archiveWorkspaceUseCase
- listWorkspacesUseCase

### BuildSession (5)
- startBuildSessionUseCase
- attachThemeUseCase (themeRef read-only 검증)
- attachComponentLibraryUseCase (componentRefs read-only 검증)
- endBuildSessionUseCase
- listBuildSessionsUseCase

### Draft (8)
- createDraftUseCase
- updateDraftTitleUseCase
- addComponentBindingUseCase
- updateComponentBindingPropsUseCase
- removeComponentBindingUseCase
- addContentBindingUseCase
- updateContentBindingUseCase
- removeContentBindingUseCase

### Verification & Publish (5)
- verifyDraftCompositionUseCase (theme+component+content 검증)
- previewDraftUseCase (Theme Manifest 기반 미리보기)
- createPublishIntentUseCase (publish 의도만 기록)
- listPublishIntentsUseCase
- cancelPublishIntentUseCase

### Studio Asset (3)
- uploadAssetUseCase (image/video refs)
- attachAssetToBindingUseCase
- removeAssetFromBindingUseCase

### Library Query (3)
- searchComponentsUseCase (read-only IComponentReader.listComponentsByType)
- searchContentUseCase (read-only ICMSReaderForStudio.listContent)
- getCompatibleThemesUseCase

총 **28 UCs**.

---

## 변경 이력

- 2026-07-13: Sprint D 시작, 원칙 5개 확정 (사장님 승인)