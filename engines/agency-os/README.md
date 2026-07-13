# Agency OS Engine — AI Digital Agency Operating System

> Phase 8 · RC1 · v1.0.0-rc1
> **Platform Agency OS RC1 — Engine Collection에서 AI Digital Agency OS로 진화**

## Agency First Principle

```
No single AI agent is allowed to make an important decision alone.

Every strategic decision must pass through:
Research → Expert Review → Debate → Evidence Verification → Executive Decision → Learning

The platform must optimize for the quality of decisions, not the speed of generation.
```

## Architecture (4-Layer)

```
Executive Layer (6 Agents)
  CEO Agent / Project Manager / Agency Orchestrator
  Memory Manager / Quality Director / Release Director

Swarm Layer (9 Swarms)
  Research / Creative / UX / Engineering / QA
  Learning / Marketing / SEO / Accessibility

Platform Engines (35 engines)

Memory
  Executive Memory / Learning / Creative Knowledge
```

## UseCases (25)

### Workflow (4)
- initiateWorkflowUseCase
- advanceWorkflowPhaseUseCase (10 phases)
- getWorkflowUseCase
- listWorkflowsUseCase

### Swarm (3)
- createSwarmUseCase (9 swarm types)
- completeSwarmUseCase
- getSwarmUseCase

### Task (4)
- createTaskUseCase
- executeTaskUseCase (parallel mock)
- retryTaskUseCase
- getTaskUseCase

### Debate (3) — Expert Debate Engine
- startDebateUseCase (6 experts auto-generated)
- addOpinionUseCase
- resolveDebateUseCase (Consensus/CDO/CEO)

### Decision (2) — Agency First Principle
- makeDecisionUseCase (6 gates)
- listDecisionsUseCase

### Memory (4) — Executive Memory
- storeMemoryUseCase
- queryMemoryUseCase
- seedDefaultMemoryUseCase (4 presets)
- updateMemoryUseCase

### Report (2) — 6 types
- generateReportUseCase (Execution/SwarmCollaboration/DebateSummary/DecisionLog/ExecutiveMemory/LearningEvolution)
- listWorkflowTemplatesUseCase (8 templates)

### Validation (1)
- validateAgencyFirstPrinciple (6-gate pipeline)

## Tests: 81 PASS

## 8 Workflow Templates

- LaunchHotelWebsite (Hospitality)
- LaunchRestaurantWebsite (Restaurant)
- LaunchMarketplace (Marketplace)
- LaunchSaaS (SaaS)
- LaunchChurchWebsite (Church)
- LaunchNGOWebsite (NGO)
- LaunchTravelWebsite (Travel)
- Custom