# Platform Agent Guide (PAG) v1

> **The AI Operating Manual for Platform Core Engine**
>
> 사장님 확립 2026-07-13
>
> PAG is NOT an Engine, NOT a Skill, NOT a Playbook, NOT a Standard.
> PAG is the AI Operating Manual.
> Its purpose is to allow any AI Agent (ChatGPT, Claude, Gemini, Codex, Cursor Agent, etc.)
> to immediately understand how to operate inside this Platform.

---

## Acceptance

> A completely new AI Agent must be able to join the Platform, read PAG, and immediately work exactly like an experienced Platform engineer.

---

## Table of Contents

1. [Platform Philosophy](#1-platform-philosophy)
2. [Platform Map](docs/pag/02-platform-map.md)
3. [Decision Tree](docs/pag/03-decision-tree.md)
4. [Workflow Rules](docs/pag/04-workflow-rules.md)
5. [Agency OS](docs/pag/05-agency-os.md)
6. [Skill Selection Rules](docs/pag/06-skill-selection.md)
7. [Playbook Selection Rules](docs/pag/07-playbook-selection.md)
8. [QES Integration](docs/pag/08-qes-integration.md)
9. [Learning Rules](docs/pag/09-learning-rules.md)
10. [Golden Workflows](docs/pag/10-golden-workflows.md)
11. [Reference Project: Envoy](docs/pag/11-reference-envoy.md)
12. [AI Behavioral Rules](docs/pag/12-behavioral-rules.md)
13. [Execution Modes](docs/pag/13-execution-modes.md)
14. [Anti-patterns](docs/pag/14-anti-patterns.md)
15. [Platform Governance](docs/pag/15-governance.md)
16. [Acceptance Checklist](#16-acceptance-checklist)

---

## 1. Platform Philosophy

### Why this Platform exists

The Platform exists to solve a single problem:

> **Customers don't visit websites to admire design. They visit to solve a problem.**

Every existing AI website generator produces "layouts and code." This Platform produces **customer decision experiences** — the psychological journey from problem awareness to trust to action.

### What problems it solves

| Problem | Platform Solution |
|---|---|
| AI-generated websites look "AI-made" | AI Smell Detection + Golden Reference comparison |
| Customers don't trust AI-generated content | Trust Architecture + Evidence Placement |
| AI generates pages without purpose | "Every section must earn its place" principle |
| Quality varies by LLM | QES ensures consistent output regardless of AI |
| No institutional learning | Knowledge Evolution + Executive Memory |
| Single AI makes all decisions | Agency First Principle (6-gate pipeline) |

### Platform Vision (v4 — Agency OS)

```
RC2: "AI evaluates websites" → V2: "AI designs trust" → RC3.1: "AI designs decisions" → Agency OS: "AI Agency collaborates to design decisions"
```

**Platform is NOT a Website Builder.**
**Platform IS an AI Digital Agency Operating System.**

### 8 Foundational Principles

#### 1. Customer Decision Architecture (CDA) First Principle
> Users do not visit websites to admire design. Users visit websites to solve a problem. Every page must answer the next question inside the customer's mind. Do not generate pages. Generate customer decisions.

#### 2. Trust Architecture Principle
> AI does not generate scores. AI generates trust by placing the right evidence at the right place at the right time.

#### 3. Agency First Principle
> No single AI agent is allowed to make an important decision alone. Every strategic decision must pass through: Research → Expert Review → Debate → Evidence Verification → Executive Decision → Learning. The platform must optimize for the quality of decisions, not the speed of generation.

#### 4. Learning First Principle
> Every completed project must feed back into the Learning Engine. Only evidence-based improvements may modify Platform knowledge.

#### 5. Evidence First Principle (Skill Standard)
> Evidence → Pattern → Skill → Execution. Never Opinion → Skill. No AI folklore. No prompt hacks. No unverified opinions.

#### 6. Industry Agnostic Principle
> The Platform core must contain zero industry-specific business logic. Industry knowledge lives in Creative Intelligence, Detail Strategy Library, and Playbooks — never in Engines.

#### 7. Configuration First Principle
> Strict separation of configuration from code (Twelve-Factor App). Environment variables at runtime. No hardcoded URLs or credentials.

#### 8. Human Quality Principle
> The Platform must consistently produce agency-grade, human-quality, production-ready websites independent of which LLM executes the work.

---

## 16. Acceptance Checklist

A new AI Agent has successfully onboarded when it can:

- [ ] Classify a client request into Industry + Project Type
- [ ] Select the correct Playbook deterministically
- [ ] Select the correct Skill Packs for the Playbook
- [ ] Execute Skills in the correct order
- [ ] Run QES assessment and interpret PASS/WARNING/FAIL
- [ ] Generate improvement tasks from WARNINGs
- [ ] Feed project results back into Learning Engine
- [ ] Never skip Agency First Principle gates
- [ ] Never generate a page without Trust Architecture
- [ ] Never ignore Customer Decision Architecture
- [ ] Never create a duplicate Engine or Skill
- [ ] Never bypass QES

---

> **Next:** [Platform Map →](docs/pag/02-platform-map.md)