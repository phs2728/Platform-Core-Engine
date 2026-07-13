# PAG Part 14 — Anti-patterns

> Everything the AI must NEVER do.

## Architecture Anti-patterns

| Anti-pattern | Why Forbidden | Correct Approach |
|---|---|---|
| Create duplicate Engine | Increases complexity without value | Extend existing Engine via Host Interface |
| Create duplicate Skill | Dilutes knowledge | Update existing Skill version |
| Direct engine-to-engine import | Breaks boundary isolation | Use Host Interface via core-sdk |
| Industry logic in Engine core | Violates Industry Agnostic | Use Creative Intelligence or Playbooks |
| Invent new types not in core-sdk | Breaks compatibility | Use existing core-sdk types |
| Hardcode configuration | Violates Twelve-Factor | Use environment variables |

## Generation Anti-patterns

| Anti-pattern | Detection | Fix |
|---|---|---|
| Generic 3-column card layout | AI Smell: Generic Layout | Use asymmetric, bento, or full-bleed |
| Purple-blue-pink gradient | AI Smell: AI Gradient | Use brand-specific colors |
| Lorem ipsum placeholder | AI Smell: Placeholder Copy | Write real, customer-specific copy |
| "Submit" / "Click Here" CTA | AI Smell: Poor CTA | Use action verb: "Book Now" |
| No reviews/testimonials | AI Smell: Missing Trust Evidence | Add social proof |
| Same card repeated 4+ times | AI Smell: Repeated Cards | Vary layouts |
| Lucide icons in rounded squares | AI Smell: AI Icon Pattern | Mix styles or use custom |

## Process Anti-patterns

| Anti-pattern | Why Forbidden | Correct Approach |
|---|---|---|
| Skip QES assessment | Quality not verified | Always run assessPage() |
| Skip Professional Review | Single perspective | All 9 reviewers required |
| Skip Agency First Principle | Single AI decides alone | 6-gate pipeline required |
| Skip Learning feedback | No institutional learning | Feed metrics to Knowledge Base |
| Select skills randomly | Non-deterministic | Use Skill Selection Matrix |
| Select playbook by feeling | Non-deterministic | Use Playbook Selection Matrix |
| Bypass debate for speed | Sacrifices quality | Expert Debate Engine required |
| Release with QES FAIL | Quality gate bypassed | FORBIDDEN — no overrides |

## Content Anti-patterns

| Anti-pattern | Fix |
|---|---|
| Feature-first copy (lists features) | Benefit-first copy (what customer gains) |
| Corporate speak / jargon | Plain language, customer voice |
| Vague claims ("best service") | Specific evidence ("4.9★ from 847 guests") |
| No story flow (information dump) | Emotion → Story → Evidence → Trust → Decision → Action |
| Stock photos of models | Real photos of real people/places |
| CTA below fold with no visual cue | CTA above fold + sticky on mobile |