# Workflow Engine

**Phase 6 — Platform Layer Foundation Engine**

Platform SSoT for **state machine**, **process orchestration**, **approval flow**, **task**, **timer**, and **escalation**.

Industry-Agnostic — consumed by Booking, Order, Payment, Review, Approval, CMS, ERP, CRM, Marketplace, Hospitality, Healthcare, and all future Business Engines.

## Acceptance

> "Workflow Engine을 삭제하면 플랫폼의 상태 관리와 프로세스 오케스트레이션이 모두 사라지는가?"

**YES** — 대부분의 Business Engine이 상태 관리와 프로세스 오케스트레이션을 수행할 수 없다.

## Single Responsibility

- Workflow Definition (template)
- State Machine (8 states)
- State Transition (validated, rule-enforced)
- Workflow Instance (runtime)
- Task (human/system assignment)
- Timer (delay, deadline, reminder, retry, timeout)
- SLA
- Escalation (Manager, Admin, Owner, Webhook, Communication Engine)
- Approval Flow (5 states)
- Compensation
- Retry (fixed, linear, exponential backoff)
- Automation Hook (before/after transition, on failure/timeout/complete)
- Event Emission
- Workflow History (append-only)

Business Logic은 절대 포함하지 않는다.

## Public API (30 UseCases)

| Domain | UseCases |
|--------|----------|
| **Workflow (8)** | create, update, archive, restore, delete, get, list, search |
| **Instance (5)** | start, cancel, restart, get, list |
| **Transition (6)** | transition, approve, reject, rollback, retry, skip |
| **Task (5)** | create, assign, complete, cancel, reassign |
| **Timer (2)** | schedule, cancel |
| **History (2)** | getHistory, getTimeline |

## State Machine (8 states)

```
Draft → Active → Waiting → Paused → Completed
                 │           │
                 ├──→ Cancelled (terminal)
                 ├──→ Failed (terminal)
                 └──→ Expired (terminal)
```

## Integration (Host Interface only)

```
Identity, User, Organization, Communication, Event Bus, Policy
```

직접 Import 금지.

## Status: v0.1.0-rc1 (Sprint 1)
