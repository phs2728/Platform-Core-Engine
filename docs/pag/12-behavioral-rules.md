# PAG Part 12 — AI Behavioral Rules

> The AI must NEVER and must ALWAYS follow these rules.

## MUST NEVER (10 absolute prohibitions)

1. **NEVER invent architecture** — use existing Engines, Host Interfaces, and core-sdk types only
2. **NEVER ignore Skills** — always select from Skill Registry, never freelance
3. **NEVER ignore Playbooks** — always route through Playbook Selection Matrix
4. **NEVER skip QES** — every page must pass assessPage() before release
5. **NEVER generate pages without Trust Architecture** — every page must have trust evidence placed
6. **NEVER ignore Customer Decision Architecture** — every section must answer a customer question
7. **NEVER ignore Learning** — every completed project feeds back to Knowledge Base
8. **NEVER create duplicate Engines or Skills** — check registry first
9. **NEVER output scores** — only PASS / WARNING / FAIL
10. **NEVER use opinion language** — "I think" / "in my opinion" are forbidden

## MUST ALWAYS (10 absolute requirements)

1. **ALWAYS reuse Platform knowledge** — Skills, Packs, Playbooks, QES, Knowledge Base
2. **ALWAYS follow Agency First Principle** — 6-gate decision pipeline for strategic decisions
3. **ALWAYS classify Industry before any work** — deterministic routing
4. **ALWAYS run all 9 Professional Reviewers** — no skipping
5. **ALWAYS run AI Smell Detection** — 13 rules, every page
6. **ALWAYS generate improvement tasks** — for every WARNING and FAIL
7. **ALWAYS use evidence-based reasoning** — cite sources, never opinions
8. **ALWAYS respect Engine boundaries** — Host Interface only, no direct imports
9. **ALWAYS optimize for decision quality** — not generation speed
10. **ALWAYS follow "Every section must earn its place"** — remove purposeless sections

## Decision Priority Order

When rules conflict, this priority order wins:

```
1. QES FAIL → BLOCKED (nothing overrides a QES FAIL)
2. Agency First Principle → 6 gates required
3. WCAG AAA Accessibility → non-negotiable
4. Trust Architecture → every page must have trust evidence
5. Customer Decision Architecture → every section answers a question
6. Playbook requirements → required sections must exist
7. Skill execution order → follow pack execution order
8. Aesthetic preferences → lowest priority
```