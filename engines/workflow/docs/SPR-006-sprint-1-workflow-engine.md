# SPR-006 — Workflow Engine Sprint 1 (RC1)

## Goal

Phase 6 Platform Layer Foundation Engine: Workflow Engine v0.1 RC1.
플랫폼 전체의 상태 전이(State Machine)와 프로세스 자동화(Process Orchestration)를 담당하는 Foundation Engine 구축.

## Completed

### Sprint 1 UseCases (30)
| Domain | Count | UseCases |
|--------|-------|----------|
| Workflow CRUD | 8 | create, update, archive, restore, delete, get, list, search |
| Instance | 5 | start, cancel, restart, get, list |
| Transition | 6 | transition, approve, reject, rollback, retry, skip |
| Task | 5 | create, assign, complete, cancel, reassign |
| Timer | 2 | schedule, cancel |
| History | 2 | getHistory, getTimeline |
| Reference/Timeline | 2 | attachReference, appendTimeline |

### Architecture
- 8-state machine: Draft→Active→Waiting→Paused→Completed (+Cancelled/Failed/Expired)
- Failed → Active retry transition 지원
- Definition-level state machine (states + transitions 별도 검증)
- Approval Flow: Pending→Approved/Rejected/Skipped/Expired
- Task lifecycle: Pending→Assigned→Completed/Cancelled
- Timer: Delay/Deadline/Reminder/Retry/Timeout
- History (append-only) + Timeline (narrative) 분리
- Organization Ownership (mandatory)
- CustomDataPolicy (1회 호출 at entry)
- 8 InMemory Repositories
- 13 Event types
- 6 Host Interfaces (Organization/User/Identity/Policy/EventBus/IdGen+Clock)

### Tests
- 57 tests (목표 50+ 초과 달성)
- 9 describe blocks: CRUD, State Machine, Activation, Instance, Transition, Approval, Retry, Task, Timer, History

## Remaining (Sprint 2+)
- Escalation execution engine (rule evaluation + Communication Engine integration)
- Compensation action execution
- Automation Hook execution (BeforeTransition/AfterTransition/OnFailure/OnTimeout/OnComplete)
- Timer expiry background processor (findExpired → expireTimer)
- Retry strategy computation (FixedDelay/Linear/ExponentialBackoff)
- Workflow definition publish/version (multi-version support)
- SLA monitoring + breach detection

## PRG Result
N/A (Sprint 1 scope — PRG is pre-merge quality gate, not run for initial RC1 scaffold)

## Coverage
- Workflow CRUD: 13 tests
- State Machine: 7 tests
- Instance Lifecycle: 7 tests
- State Transition: 6 tests
- Approval Flow: 4 tests
- Retry: 2 tests
- Task Lifecycle: 8 tests
- Timer: 3 tests
- History/Timeline/References: 4 tests
- Activation guard: 1 test
- Error paths: extensive (unknown org, bad type, duplicate slug, terminal state transitions, etc.)

## Next Sprint
Sprint 2: Escalation execution + Automation Hooks + Timer expiry processor + Retry strategy computation.
