# Theme Engine

**Phase 6 — Design Token OS**

The Theme Engine is the platform's single source of truth for all design tokens: typography, spacing, color, motion, elevation, radius, and responsive breakpoints. It manages themes, brands, variants (light/dark), white-label themes, and accessibility token overrides.

## Core Principle

**NOT a CSS generator.** The Theme Engine manages **data models only** — design tokens as structured data. Frontend frameworks read the data and render accordingly. Token compilation is done via `IThemeCompilerProvider` plugin.

## Domains

| Domain | Description |
|--------|-------------|
| Theme | Root container — slug, status (Draft/Active/Archived) |
| Brand | Brand identity (name, logo refs, personality) |
| TokenSet | Categorized tokens (typography/color/spacing/motion/elevation/radius) |
| TypographyScale | Font families, sizes, weights, line heights |
| ColorPalette | Primary/secondary/accent/neutral with shades + semantic colors |
| SpacingSystem | Base unit, scale ratios |
| MotionSpec | Durations, easings |
| ElevationSystem | Z-index levels, shadows |
| ThemeVariant | Light/dark mode variants |
| ResponsiveTokens | Breakpoint-specific token overrides |
| WhiteLabelTheme | Tenant/org-specific theme overrides |

## Architecture

- Provider Plugin: IThemeCompilerProvider (compiles tokens → CSS variables / Tailwind config / etc.)
- Multi-tenant: tenantId on all entities, repo key = tenant::id
- Organization-scoped: each theme belongs to an organization
- Event-driven: 15 event types

## Token Model

All tokens follow the CSS Custom Property naming convention:
```
--color-primary-500: #7c2d3a
--spacing-base: 0.25rem
--font-size-lg: 1.125rem
--motion-duration-fast: 150ms
```
