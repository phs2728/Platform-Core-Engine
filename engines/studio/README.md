# Studio Engine — Page Builder Process

> Phase 6 · Sprint D · v1.0.0-rc1

NOT a Page Renderer. NOT a Theme Editor. NOT a Component Builder. NOT a CMS Editor.

**Page Builder Process** — manages Workspace, BuildSession, PageDraft, ComponentBinding, ContentBinding, PublishIntent.

Theme/Component/CMS are accessed **read-only** via 3 Host Interfaces (`IThemeReaderForStudio`, `IComponentReaderForStudio`, `ICMSReaderForStudio`).

## Ownership

Studio owns:
- Workspace (user working area)
- BuildSession (page build session)
- PageDraft (work-in-progress page state)
- ComponentBinding (which component, where)
- ContentBinding (which content, where)
- PublishIntent (publish intent — CMS handles actual publish)
- StudioAsset (build assets)

Studio NEVER modifies:
- Theme, ThemeManifest, BrandPersonality, BrandVoice, BrandEmotion, DesignLanguage
- ExperienceComponent, ComponentVariant, ComponentPreset, ComponentScore
- Content, Page, PageSection, ContentSlot, LocaleVariant

## Architecture

```
Theme Manifest (read-only)   ──┐
                              ├──> Studio Draft Composition
Component Manifest (read-only) ┤
CMS Page + Content (read-only) ─┘
                              │
Studio-managed:               ─┘
  - Workspace
  - BuildSession
  - PageDraft
  - ComponentBinding
  - ContentBinding
  - PublishIntent
```

Studio's publish is **indirect** — creates PublishIntent, CMS engine consumes `studio.publish.intent` event to perform actual publish.

## Merge Gate

```
pnpm install   PASS
pnpm typecheck PASS
pnpm test      PASS (60+)
pnpm build     PASS
Examples       PASS
Import Boundary PASS
Industry Agnostic PASS
Read-Only 3 Reader Surface PASS
PublishIntent Pattern PASS
Composition Verification PASS
Theme/Component/CMS Event Isolation PASS
```