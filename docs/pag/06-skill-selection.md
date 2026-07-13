# PAG Part 6 — Skill Selection Rules

> Never allow AI to randomly select Skills. Selection is deterministic.

## Skill Pack Selection Matrix

| Industry | Foundation | Conversion | Accessibility | Performance | SEO | Frontend |
|---|---|---|---|---|---|---|
| Hospitality (Hotel) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Hospitality (Hostel) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Restaurant | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Travel | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Marketplace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SaaS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| NGO | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| Church | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| Medical | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Education | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| Corporate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Government | ✅ | — | ✅ | ✅ | ✅ | ✅ |

## Execution Order Within a Pack

```
1. Architecture (Twelve-Factor Config)
2. UX (Visual Hierarchy)
3. Accessibility (WCAG AAA Contrast)
4. SEO (Structured Data)
5. Performance (Core Web Vitals)
6. Security (OWASP Input Validation)
7. Testing (Boundary Isolation)
```

## Selection Algorithm

```
function selectSkillPacks(industry, projectType):
    packs = ['pack-premium-website-foundation']  // ALWAYS

    if industry has conversion goals (booking/purchase/donation):
        packs += ['pack-conversion-optimization']

    return packs
```

## Forbidden Selection Patterns

- ❌ Selecting skills by "feeling" or "intuition"
- ❌ Skipping Foundation Pack
- ❌ Using C/D-grade skills without explicit approval
- ❌ Creating ad-hoc skills not in registry