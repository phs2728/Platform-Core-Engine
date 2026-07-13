# PAG Part 8 — QES Integration

> Every project must pass QES. No exceptions.

## When QES Runs

```
After Frontend Generation, BEFORE Release:

  Frontend Gen Complete
       ↓
  QES assessPage()          ← runs here
       ↓
  ┌─────┴─────┐
  ▼           ▼
 PASS    WARNING/FAIL
  │           │
  │      Improvement Tasks
  │      → Re-generate
  │      → Re-assess
  ▼
  Release eligible
```

## What PASS / WARNING / FAIL Mean

| Verdict | Meaning | Action |
|---|---|---|
| **PASS** | All 20 categories + 9 reviews + 0 AI Smell rejects | Auto-approved for release |
| **WARNING** | Some categories need improvement but no hard failures | CDO approval required before release |
| **FAIL** | AI Smell reject, or Accessibility FAIL, or Art Director FAIL | Release BLOCKED — must fix and re-assess |

## QES Assessment Pipeline

```
1. AI Smell Detection (13 rules)
   → Any reject → automatic FAIL

2. Professional Review (9 reviewers)
   → Each independently: PASS/WARNING/FAIL
   → Accessibility or Art Director FAIL → automatic FAIL

3. Category Assessment (20 categories)
   → Each: PASS/WARNING/FAIL

4. Golden Reference Comparison
   → Compare against Apple/Stripe/Aman/etc.
   → PASS/WARNING/FAIL per comparison

5. Aggregate:
   → Any FAIL → FAIL
   → Any WARNING (no FAIL) → WARNING
   → All PASS → PASS

6. Execution Level:
   → AI Smell reject → Bronze (FAIL)
   → Any FAIL → Bronze (FAIL)
   → Any WARNING → Gold (capped)
   → All PASS → Required Level met
```

## Improvement Task Generation

Every WARNING and FAIL generates actionable tasks:
- `[AI Smell — AI Gradient] Use brand-specific colors, avoid purple-blue-pink`
- `[Accessibility Specialist] Run WCAG AAA audit, fix color contrast`
- `[Art Director] Establish type scale (max 5-6 sizes)`

Tasks must be completed before re-assessment.