# Experience Component Engine

> Phase 6 · Experience Component OS
> v1.0.0-rc1

NOT a UI library. NOT Material UI. NOT Ant Design. NOT shadcn/ui.

**Platform Experience Operating System** — manages Component Experience Models (data manifests), not rendered components.

## Domain

- **ExperienceComponent** — a single UX experience (Search, Booking, Checkout, Dashboard, ...)
- **ComponentVariant** — variant of a component (Luxury, Premium, Standard, Compact)
- **ComponentPreset** — pre-configured component with fixed props/tokens
- **ComponentComposition** — multiple components composed into an Experience
- **ComponentState** — interactive states (Hover, Press, Focus, Disabled, Loading, ...)
- **ComponentInteraction** — interaction model (press, drag, drop, expand, collapse)
- **ComponentAnimation** — animation specs (entrance, hover, loading, success, error, ...)
- **ComponentAccessibility** — WCAG compliance data (keyboard, screen reader, contrast, ...)
- **ComponentScore** — 9 quality dimensions (Professional, Premium, A11y, Performance, Trust, Conversion, Emotion, Consistency, Responsive)
- **ComponentPattern** — reusable composition pattern
- **ComponentSlot** — named slot for composition
- **ComponentTokenReference** — links component to Theme Engine tokens
- **ComponentBehavior** — declarative behavior rules
- **ComponentVersion** — semantic versioning for components
- **MarketplaceEntry** — marketplace distribution (Official / Organization / Marketplace / Private)

## Architecture

- **Industry Agnostic** — same components reused across Travel, Restaurant, Hotel, Marketplace, ERP, CRM
- **AI-aware** — Creative Intelligence → Theme → Learning → Component Adaptation
- **Quality Gate** — 90+ score required across 9 dimensions
- **Provider Plugin** — renderer / animation / accessibility / preview / analytics / learning providers

## Merge Gate

```
pnpm install   PASS
pnpm typecheck PASS
pnpm test      PASS (150+)
pnpm build     PASS
Examples       PASS
Import Boundary PASS
Industry Agnostic PASS
```
