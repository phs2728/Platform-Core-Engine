# Engine Certification — Studio Engine RC1

> Sprint D: Page Builder Process · 2026-07-13

## Sprint D 절대 원칙 준수 (사장님 확립)

| # | 원칙 | 준수 |
|---|------|------|
| 1 | Process Ownership | ✅ Studio owns Workspace/BuildSession/Draft/Binding/Intent/Asset ONLY |
| 2 | Read-Only 3 Reader Surface | ✅ IThemeReaderForStudio + IComponentReaderForStudio + ICMSReaderForStudio ONLY |
| 3 | PublishIntent Pattern | ✅ Studio emits `studio.publish.intent`, CMS consumes (no direct write) |
| 4 | BuildSession 결정성 | ✅ previewDraftUseCase returns identical hash for identical inputs |
| 5 | Composition Verification | ✅ verifyDraftCompositionUseCase validates theme+component+content refs |

---

## RC1 도메인 (8 entities)

- **Workspace** — user working area
- **BuildSession** — page build session
- **PageDraft** — work-in-progress page (with themeRef, componentBindingIds, contentBindingIds)
- **ComponentBinding** — which component, where (slotName, order, propOverrides, themeOverrideRef)
- **ContentBinding** — which content, where (slotName, fallbackContentRef)
- **PublishIntent** — publish request (with status, targetPageId, errorMessage)
- **StudioAsset** — build assets
- **StudioAuditRecord** — audit trail

---

## RC1 UseCases (28개)

### Workspace (4)
- createWorkspaceUseCase (validates defaultThemeRef via read-only)
- updateWorkspaceUseCase
- archiveWorkspaceUseCase
- listWorkspacesUseCase

### BuildSession (4)
- startBuildSessionUseCase (validates themeRef + componentRefs read-only)
- attachThemeUseCase
- attachComponentLibraryUseCase (validates each componentRef read-only)
- endBuildSessionUseCase

### Draft (3)
- createDraftUseCase
- updateDraftTitleUseCase
- archiveDraftUseCase

### ComponentBinding (3)
- addComponentBindingUseCase (validates componentRef + themeOverrideRef read-only)
- updateComponentBindingPropsUseCase
- removeComponentBindingUseCase

### ContentBinding (3)
- addContentBindingUseCase (validates contentRef via CMS Reader)
- updateContentBindingUseCase
- removeContentBindingUseCase

### Verification + Publish (5)
- verifyDraftCompositionUseCase (validates ALL refs)
- previewDraftUseCase (deterministic)
- createPublishIntentUseCase (Studio emits event, CMS handles)
- listPublishIntentsUseCase
- cancelPublishIntentUseCase

### Library Query (3)
- searchComponentsUseCase (read-only IComponentReader)
- searchContentUseCase (read-only ICMSReaderForStudio)
- getCompatibleThemesUseCase (read-only IThemeReaderForStudio)

---

## 결정적 Preview (Sprint D 원칙 4)

```typescript
// Same input → same previewHash
const p1 = await previewDraftUseCase({ tenantId, draftId, device });
const p2 = await previewDraftUseCase({ tenantId, draftId, device });
p1.previewHash === p2.previewHash  // ✅

// Deterministic hash inputs: draft.id + device + themeManifestHash + (sorted) bindingIds
```

---

## PublishIntent Pattern (Sprint D 원칙 3)

```typescript
// Studio NEVER writes to CMS
// Instead, emits studio.publish.intent event:

const intentId = unwrap(await createPublishIntentUseCase({ ...base, draftId, workspaceId }, deps)).intentId;

// eventBus has 'studio.publish.intent' emitted
// CMS engine (separate process) consumes this event and performs actual publish

const eventBus = deps.eventBus as unknown as { countByType(t: string): number };
eventBus.countByType('studio.publish.intent');  // 1
```

---

## Import Boundary (Sprint D 원칙 2)

```bash
$ grep -rE "from '@platform/" engines/studio/src/ | grep -v 'core-sdk' | wc -l
0
```

Studio imports only `@platform/core-sdk`. No direct imports from engines/theme, engines/component, engines/cms.

---

## Read-Only API Surface (Sprint D 원칙 2)

```typescript
StudioUseCaseDeps {
  themeReader: IThemeReaderForStudio;       // ✅ read-only
  componentReader: IComponentReaderForStudio; // ✅ read-only
  cmsReader: ICMSReaderForStudio;           // ✅ read-only
  // NOT has: themeProvider (write), componentProvider (write), cmsProvider (write)
}
```

Verified by `StudioUseCaseDeps` type-shape + filesystem-based static checks.

---

## Event Isolation

Studio does NOT subscribe to:
- `theme.changed` ❌ (previewDraft resolves manifest lazily)
- `themanifest.published` ❌
- `component.reviewed` ❌
- `cms.page.rendered` ❌
- `cms.content.published` ❌

Studio emits only: `studio.*.*` (22 events).

---

## Architecture: A

- Clean separation: interfaces → domain → infrastructure → use-cases → index
- 8 domain entities + 22 events + 28 UseCases
- 8 InMemory repositories + 5 mock host adapters (Org/Policy/Theme/Component/CMS readers)
- No direct cross-engine imports (filesystem verified)

## Platform: A

- EngineName union updated (`studio`)
- Constitution C-1~C-23 준수
- engine.json strict_boundaries explicitly lists owns + forbidden

## Security: A

- 테넌트 격리 모든 Repository
- Organization verification + workspace slug uniqueness
- Theme ref / Component ref / Content ref read-only validation
- Theme/Component/CMS writes 절대 불가

## Performance: A

- 결정적 previewDraft = 캐싱 친화적
- 검증은 1회 manifest/component resolve (lazy)

## Maintainability: A

- 4 use-case 파일 (Workspace/Session / Draft/Binding / Verification/Publish)
- shared helpers (envelope, auditLog, deterministicHash)
- 5 examples (_helpers + 5 demos)
- README + SPRINT_D_PRINCIPLES + Engine_Certification

## Test: A

- **35 tests** PASS
- Workspace/Session/Draft/Binding/Verification/Preview/PublishIntent/Library coverage
- Read-Only API surface verified by type-shape + filesystem
- Determinism verified (5 iterations, no Date.now/Math.random)
- Tenant isolation
- Theme/Component/CMS event isolation (filesystem scan)

## Backward Compatibility: A (first release)

- v1.0.0-rc1 (initial)
- Public API stable (28 UCs)

---

## Merge Gate Summary

| Gate | Result |
|---|---|
| Build | ✅ PASS |
| Typecheck | ✅ PASS |
| Tests | ✅ PASS (35/35) |
| Examples | ✅ PASS (5/5) |
| Import Boundary | ✅ PASS (0 violations) |
| Industry Agnostic | ✅ PASS (0 violations) |
| **Sprint D 추가 검증** | |
| Read-Only 3 Reader Surface | ✅ PASS |
| CMS engines 직접 import | ✅ PASS (0건) |
| PublishIntent Pattern | ✅ PASS (Studio → event → CMS) |
| Composition Verification | ✅ PASS (theme+component+content 검증) |
| 결정적 Preview | ✅ PASS (동일 hash) |
| Theme/Component/CMS Event 격리 | ✅ PASS (filesystem 검증) |

**Overall: CONDITIONAL PASS → RC1**

---

## 🎉 전체 Sprint 파이프라인 완료

| Sprint | 엔진 | UseCases | Tests | 상태 |
|---|---|---|---|---|
| **Sprint A** | Theme Engine RC2 (Brand & Design Language) | 52 | 104 | ✅ |
| **Sprint B** | Component Engine RC2 (Manifest Consumer) | 53 | 97 | ✅ |
| **Sprint C** | CMS Engine RC1 (Content-only) | 28 | 50 | ✅ |
| **Sprint D** | Studio Engine RC1 (Page Builder) | 28 | 35 | ✅ |
| **합계** | 4 engines | 161 UCs | 286 tests | ✅ |

---

## 다음 단계 (사장님 Sprint 계획)

✅ **Theme → Component → CMS → Studio 파이프라인 완성**

남은 가능 방향:
1. **Publishing Orchestrator** — `studio.publish.intent` 이벤트를 구독하여 CMS publish 자동 실행
2. **Vertical Package** — Restaurant/Travel/Marketplace 등 실제 제품 패키지 조립
3. **Production Deployment** — 13-criteria Stable 검증 후 main merge

사장님 결정에 따라 다음 작업 진행 가능.