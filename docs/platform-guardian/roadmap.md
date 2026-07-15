# Platform Roadmap

## Recommendations

| ID | Priority | Type | Title | Effort |
|---|---|---|---|---|
| ROADMAP-0002 | 🟠 P1 | new-engine | Build Notification Engine (Phase 3) | L |
| ROADMAP-0003 | 🟠 P1 | rfc | RFC: Event Contract Standardization (9 orphan events) | M |
| ROADMAP-0006 | 🟠 P1 | stabilize | Stabilize engine "communication" (53/100) | M |
| ROADMAP-0001 | 🟡 P2 | new-engine | Build Analytics Engine (Phase 7) | XL |
| ROADMAP-0004 | 🟡 P2 | rfc | RFC: Technical Debt Reduction (16 high-severity items) | L |
| ROADMAP-0005 | 🟡 P2 | rfc | RFC: Boundary Definition Standard (8 engines without boundaries) | M |
| ROADMAP-0007 | 🟢 P3 | refactor | Reduce coupling in "billing" | L |
| ROADMAP-0008 | 🟢 P3 | refactor | Reduce coupling in "booking" | L |
| ROADMAP-0009 | 🟢 P3 | refactor | Reduce coupling in "cms" | L |
| ROADMAP-0010 | 🟢 P3 | refactor | Reduce coupling in "component" | L |
| ROADMAP-0011 | 🟢 P3 | refactor | Reduce coupling in "order" | L |
| ROADMAP-0012 | 🟢 P3 | refactor | Reduce coupling in "payment" | L |
| ROADMAP-0013 | 🟢 P3 | refactor | Reduce coupling in "review" | L |
| ROADMAP-0014 | 🟢 P3 | refactor | Reduce coupling in "studio" | L |
| ROADMAP-0015 | 🟢 P3 | refactor | Reduce coupling in "workflow" | L |

## Next Engines to Build

- notification
- analytics

## RFC Recommendations

- RFC: Event Contract Standardization (9 orphan events)
- RFC: Technical Debt Reduction (16 high-severity items)
- RFC: Boundary Definition Standard (8 engines without boundaries)

## Recommendation Details

### ROADMAP-0002: Build Notification Engine (Phase 3)
- **Priority**: P1
- **Type**: new-engine
- **Description**: Create engine "notification" — User-facing notification center with preferences.
- **Rationale**: User-facing notification center with preferences.
- **Effort**: L
- **Target Engines**: notification

### ROADMAP-0003: RFC: Event Contract Standardization (9 orphan events)
- **Priority**: P1
- **Type**: rfc
- **Description**: Standardize event naming, publishing, and subscription patterns across the platform.
- **Rationale**: 9 event-related risks detected. Standardization will prevent future orphans.
- **Effort**: M

### ROADMAP-0006: Stabilize engine "communication" (53/100)
- **Priority**: P1
- **Type**: stabilize
- **Description**: Address health factors: Contract Violations, Event Contracts
- **Rationale**: Engine health is 53/100 (Grade F). Critical for platform stability.
- **Effort**: M
- **Target Engines**: communication

### ROADMAP-0001: Build Analytics Engine (Phase 7)
- **Priority**: P2
- **Type**: new-engine
- **Description**: Create engine "analytics" — Platform-wide insights and reporting.
- **Rationale**: Platform-wide insights and reporting.
- **Effort**: XL
- **Target Engines**: analytics

### ROADMAP-0004: RFC: Technical Debt Reduction (16 high-severity items)
- **Priority**: P2
- **Type**: rfc
- **Description**: Create a systematic plan to reduce high-severity technical debt.
- **Rationale**: 53 debt items detected (16 high). Platform health requires proactive debt management.
- **Effort**: L

### ROADMAP-0005: RFC: Boundary Definition Standard (8 engines without boundaries)
- **Priority**: P2
- **Type**: rfc
- **Description**: Define strict_boundaries for all engines to prevent ownership conflicts.
- **Rationale**: Without strict_boundaries, the platform risks concept ownership conflicts as it grows.
- **Effort**: M
- **Target Engines**: communication, core-sdk, event-bus, identity, platform-compatibility, platform-guardian, policy, authorization

### ROADMAP-0007: Reduce coupling in "billing"
- **Priority**: P3
- **Type**: refactor
- **Description**: Dependencies: core-sdk, policy, organization, order, pricing, event-bus
- **Rationale**: High coupling increases blast radius of changes.
- **Effort**: L
- **Target Engines**: billing

### ROADMAP-0008: Reduce coupling in "booking"
- **Priority**: P3
- **Type**: refactor
- **Description**: Dependencies: core-sdk, policy, organization, inventory, pricing, communication, event-bus
- **Rationale**: High coupling increases blast radius of changes.
- **Effort**: L
- **Target Engines**: booking

### ROADMAP-0009: Reduce coupling in "cms"
- **Priority**: P3
- **Type**: refactor
- **Description**: Dependencies: core-sdk, policy, organization, event-bus, experience, theme, component
- **Rationale**: High coupling increases blast radius of changes.
- **Effort**: L
- **Target Engines**: cms

### ROADMAP-0010: Reduce coupling in "component"
- **Priority**: P3
- **Type**: refactor
- **Description**: Dependencies: core-sdk, policy, organization, event-bus, experience, theme
- **Rationale**: High coupling increases blast radius of changes.
- **Effort**: L
- **Target Engines**: component

### ROADMAP-0011: Reduce coupling in "order"
- **Priority**: P3
- **Type**: refactor
- **Description**: Dependencies: core-sdk, policy, organization, booking, inventory, pricing, event-bus
- **Rationale**: High coupling increases blast radius of changes.
- **Effort**: L
- **Target Engines**: order

### ROADMAP-0012: Reduce coupling in "payment"
- **Priority**: P3
- **Type**: refactor
- **Description**: Dependencies: core-sdk, policy, organization, identity, user, address, pricing, workflow, event-bus, communication
- **Rationale**: High coupling increases blast radius of changes.
- **Effort**: L
- **Target Engines**: payment

### ROADMAP-0013: Reduce coupling in "review"
- **Priority**: P3
- **Type**: refactor
- **Description**: Dependencies: core-sdk, policy, user, organization, media, event-bus
- **Rationale**: High coupling increases blast radius of changes.
- **Effort**: L
- **Target Engines**: review

### ROADMAP-0014: Reduce coupling in "studio"
- **Priority**: P3
- **Type**: refactor
- **Description**: Dependencies: core-sdk, policy, organization, event-bus, experience, theme, component, cms
- **Rationale**: High coupling increases blast radius of changes.
- **Effort**: L
- **Target Engines**: studio

### ROADMAP-0015: Reduce coupling in "workflow"
- **Priority**: P3
- **Type**: refactor
- **Description**: Dependencies: core-sdk, policy, organization, identity, user, event-bus, communication
- **Rationale**: High coupling increases blast radius of changes.
- **Effort**: L
- **Target Engines**: workflow
