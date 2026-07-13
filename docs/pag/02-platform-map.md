# PAG Part 2 — Platform Map

> Every Engine, its responsibility, inputs, outputs, dependencies, when to use, when NOT to use.

## Engine Categories

### Foundation Layer (Engines 1-11)

| Engine | Responsibility | Key Outputs | Depends On |
|---|---|---|---|
| **core-sdk** | Shared kernel: types, Result, EventEnvelope, Reliability, Tenant Context, Observability, QES, Skill Standard | All shared types + utilities | none |
| **identity** | User identity, authentication | User, Session, Token | core-sdk |
| **communication** | Notifications (email, SMS, push) | Notification, Template | core-sdk, identity |
| **authorization** | Permissions, roles, policies | Permission, Role, Policy | identity |
| **user** | User profiles, preferences | UserProfile, Preference | identity |
| **address** | Geographic addresses | Address, Geocode | core-sdk |
| **organization** | Multi-tenant org management | Organization, Tenant | identity |
| **catalog** | Product/service catalog | CatalogItem, Category | core-sdk |
| **pricing** | Price calculation | Price, Discount, TaxRule | catalog |
| **notification** | Notification dispatch | NotificationEvent | communication |
| **event-bus** | Event routing | EventEnvelope routing | core-sdk |
| **media** | Media storage, processing | MediaAsset, Transformation | core-sdk |

### Business Layer (Engines 12-18)

| Engine | Responsibility | Key Outputs | Depends On |
|---|---|---|---|
| **cms** | Content-only Engine: Content, Page, Section, Slot | Content, Page, LayoutSnapshot | core-sdk (reads Theme/Component via Host Interface) |
| **booking** | Reservation, availability | Booking, Calendar, Slot | catalog, pricing |
| **payment** | Payment processing | Payment, Refund, Transaction | pricing |
| **billing** | Invoicing, subscription | Invoice, Subscription | payment |
| **review** | Reviews, ratings | Review, Rating, Aggregate | core-sdk |
| **analytics** | Event tracking, metrics | AnalyticsEvent, Report | core-sdk |
| **ai** | AI inference, generation | AIResponse, Prompt | core-sdk |

### Platform Layer (Engines 19-28)

| Engine | Responsibility | Key Outputs | Depends On |
|---|---|---|---|
| **universal-core** | Cross-engine orchestration | OrchestrationPlan | all engines |
| **policy** | Policy enforcement | PolicyDecision | core-sdk |
| **platform-compatibility** | Version compat checking | CompatibilityReport | core-sdk |
| **platform-guardian** | Architecture boundary enforcement | BoundaryViolation | core-sdk |
| **platform-validation** | Platform-wide validation | ValidationReport | core-sdk |
| **query** | Query orchestration | QueryResult | all engines (read) |
| **search** | Full-text search | SearchResult | core-sdk |
| **release-manager** | Release, versioning | Release, Changelog | core-sdk |
| **package-manager** | Dependency management | DependencyTree | core-sdk |
| **runtime** | Runtime environment | RuntimeConfig | core-sdk |

### Experience Layer (Engines 29-35)

| Engine | Responsibility | Key Outputs | Depends On |
|---|---|---|---|
| **experience** | Page layout, UX journey | ExperienceManifest | core-sdk |
| **theme** | Brand design language, ThemeManifest | ThemeManifest, DesignTokens | core-sdk |
| **component** | UI components, variants | ComponentManifest | core-sdk (reads ThemeManifest) |
| **creative-intelligence** | Art Direction, CDA, Trust Architecture, AI Smell Detection | ArtDirection, CDAReport, TrustReport | core-sdk |
| **creative-knowledge** | Design knowledge base | KnowledgeAsset, Pattern | core-sdk |
| **learning** | Learning engine, pattern recognition | LearningEvent, Recommendation | core-sdk |
| **studio** | Page builder process | PageDraft, BuildSession, PublishIntent | core-sdk (reads Theme/Component/CMS) |

### Agency OS Layer (Engine 36)

| Engine | Responsibility | Key Outputs | Depends On |
|---|---|---|---|
| **agency-os** | Executive orchestration: CEO, PM, Orchestrator, Swarm, Debate, Memory | AgencyWorkflow, Swarm, ExpertDebate, ExecutiveDecision, ExecutiveMemory | all engines (via Host Interface) |

## When to Use / NOT to Use Each Engine

### Rule: Never cross engine boundaries directly
```
✅ Engine A → Host Interface → Engine B
❌ Engine A → import Engine B
```

### Rule: Industry knowledge lives in Creative Intelligence, NOT in Engines
```
✅ creative-intelligence → INDUSTRY_TRUST_PROFILES['Restaurant']
❌ cms → if (industry === 'restaurant') { ... }
```