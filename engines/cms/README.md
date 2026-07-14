# CMS Engine — Content-only Engine

> Phase 6 · Sprint C · v1.0.0-rc1

NOT a Page Builder. NOT a Template Engine. NOT a Theme/Component Editor.

**Content-only Engine** — manages Content, Page, Section, ContentSlot, Locale Variant, Layout Snapshot.

Theme and Component are accessed **read-only** via Host Interfaces (`IThemeManifestReader`, `IComponentReader`).

## Ownership

CMS owns:
- Content (text, image, video, audio, document, code, JSON, markdown)
- ContentVersion (versioning)
- Page (slug, title, status, themeRef, componentRefs)
- PageSection (componentRef + slots)
- ContentSlot (slotName → contentId mapping)
- LocaleVariant (per-locale overrides)
- LayoutSnapshot (deterministic render record)

CMS NEVER modifies:
- Theme, ThemeManifest, BrandPersonality, BrandVoice, BrandEmotion, DesignLanguage
- ExperienceComponent, ComponentVariant, ComponentPreset, ComponentScore

## Architecture

```
Theme Manifest (read-only)  ───┐
                              ├──> CMS renderPage (deterministic)
Component Manifest (read-only) ┘
Content + Page + Section ──────┘
```

CMS Engine has **NO write access** to Theme or Component engines. They expose only `resolve*()` and `get*()` methods.

## Merge Gate

```
pnpm install   PASS
pnpm typecheck PASS
pnpm test      PASS (80+)
pnpm build     PASS
Examples       PASS
Import Boundary PASS
Industry Agnostic PASS
Read-Only API Surface PASS
Determinism PASS
Theme/Component Event Isolation PASS
```