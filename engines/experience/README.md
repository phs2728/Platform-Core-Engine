# Experience Engine

> **UX Standardization Engine** — Defines all user experience (UX) models across the platform.

## Purpose

The Experience Engine is **NOT a UI framework**. It standardizes UX through data models:

```
Any Frontend (Next.js, Flutter, React Native, Vue)
              ↓
     Experience Engine provides UX Model
              ↓
   Hero, Banner, Layout, Navigation, Dashboard,
   Responsive Rules, Accessibility, Personalization
```

## Acceptance Criteria

> *"Experience Engine을 삭제하면 Hero, Banner, Header, Footer, Navigation, Layout, Dashboard, UX Flow 등 플랫폼의 사용자 경험 정의가 모두 사라지는가?"*
>
> **YES**

## UX Pattern Library

| Pattern | Reference |
|---|---|
| Amazon Search | E-commerce search UX |
| Apple Landing | Product landing page |
| Stripe Checkout | Payment flow UX |
| Airbnb Listing | Detail page UX |
| Linear Dashboard | SaaS dashboard |
| Notion Workspace | Productivity workspace |
| GitHub Repository | Developer tools UX |
| Netflix Browse | Content browse UX |
| Google Search | Search results UX |
| Shopify Storefront | E-commerce storefront |

## Absolute Principles

- **Constitution C-1 ~ C-23** compliance
- **No Business Logic** — UX models only
- **No UI Framework dependency** — no React/Vue/Flutter code
- **No Theme tokens** — Theme Engine handles that
- **No Chart rendering** — Component Engine handles that
- **Host Interface** usage (3-Layer DI)
- **Industry Agnostic**

## License

Proprietary — Platform Core Engineering Team
