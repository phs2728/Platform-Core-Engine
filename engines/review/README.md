# Review Engine v0.1 RC1

> Platform-wide Trust & Reputation Engine — Industry-Agnostic, Organization-Owned.

## Overview

Review Engine은 단순한 별점 시스템이 아닙니다. 플랫폼 전체의 **평판(Trust & Reputation) 시스템**입니다.

- **Review lifecycle**: Draft → Pending → Published (+Hidden/Reported/Rejected/Archived/Deleted)
- **Rating**: 1~maxRating, half rating, weighted (verified = 2x)
- **Verified reviews**: Transaction reference 검증 시 Verified 부여
- **Replies**: owner/staff/customer/system 역할
- **Helpful votes & Reactions**: like/dislike/love/helpful
- **Reports & Moderation**: Auto/Manual/AI Hook/Admin
- **Reputation**: averageRating, trustScore(0~100), verifiedRatio, helpfulScore
- **Analytics**: distribution, topReviews, recentReviews

## Architecture

```
engines/review/
├── engine.json
├── README.md
├── docs/
│   └── 01-prd.md
├── src/
│   ├── interfaces/index.ts     — 10 entities + 7 repos + 6 host interfaces
│   ├── domain/
│   │   ├── statusTransition.ts — 8-state machine
│   │   ├── events.ts           — EventEnvelope builder
│   │   ├── audit.ts            — Audit helper
│   │   └── validation.ts       — zod schemas
│   ├── infrastructure/
│   │   ├── InMemoryRepositories.ts — 7 InMemory repos
│   │   └── hostAdapters.ts     — Verifiers, PolicyProvider, ModerationHook, EventBus
│   ├── use-cases/
│   │   ├── types.ts            — ReviewUseCaseDeps (3-Layer DI)
│   │   ├── ReviewCoreUseCases.ts   — 9 (create/update/publish/archive/restore/delete/get/search/list)
│   │   ├── RatingUseCases.ts       — 2 (changeRating/removeRating)
│   │   ├── ReplyUseCases.ts        — 3 (createReply/deleteReply/listReplies)
│   │   ├── EngagementUseCases.ts   — 3 (markHelpful/removeHelpful/addReaction)
│   │   ├── ModerationUseCases.ts   — 6 (moderate/approve/reject/hide + report/resolveReport)
│   │   ├── ReputationUseCases.ts   — 3 (calculate/get/rebuild)
│   │   └── AnalyticsUseCases.ts    — 1 (getAnalytics)
│   └── index.ts                — Public API barrel
├── test/
│   ├── helpers.ts
│   └── review.test.ts          — 61 tests
└── examples/
    └── 01-full-lifecycle.ts
```

## Public API (30 Use Cases)

### Review (9)
- `createReviewUseCase` / `updateReviewUseCase`
- `publishReviewUseCase` / `archiveReviewUseCase` / `restoreReviewUseCase`
- `deleteReviewUseCase`
- `getReviewUseCase` / `searchReviewsUseCase` / `listReviewsUseCase`

### Rating (2)
- `changeRatingUseCase` / `removeRatingUseCase`

### Reply (3)
- `createReplyUseCase` / `deleteReplyUseCase` / `listRepliesUseCase`

### Engagement (3)
- `markHelpfulUseCase` / `removeHelpfulUseCase` / `addReactionUseCase`

### Moderation + Report (6)
- `moderateReviewUseCase` / `approveReviewUseCase` / `rejectReviewUseCase` / `hideReviewUseCase`
- `reportReviewUseCase` / `resolveReportUseCase`

### Reputation (3)
- `calculateReputationUseCase` / `getReputationUseCase` / `rebuildReputationUseCase`

### Analytics (1)
- `getAnalyticsUseCase`

## Events (16)

```
review.created / review.updated / review.published / review.archived / review.restored / review.deleted
review.rating.changed
review.reported / review.report.resolved / review.hidden / review.moderated
review.reply.created / review.reply.deleted
review.helpful / review.reaction.added
review.reputation.updated
```

## State Machine

```
Draft → Pending → Published
                 ↓
Published → Hidden → Published (restore)
Published → Reported → Published/Rejected (resolve)
Any → Archived → Published (restore)
Any → Deleted (terminal)
```

## Trust Score Formula

```
trustScore = verifiedRatio * 30
           + helpfulScore  * 30
           + volumeFactor  * 20
           + ratingFactor  * 20
```
- `verifiedRatio`: verified reviews / total reviews
- `helpfulScore`: helpful votes / total reactions
- `volumeFactor`: min(1, totalReviews / 50)
- `ratingFactor`: averageRating / maxRating

## Host Interfaces

- `IOrganizationVerifier` — Organization 존재 검증
- `IUserVerifier` — User/Reviewer 존재 검증
- `IMediaVerifier` — Media attachment 검증
- `ITransactionVerifier` — Transaction reference 검증 (verified review)
- `ICustomDataPolicyProvider` — Industry-specific attributes 검증
- `IModerationHook` — AI / external moderation plugin

## Sprint 1 Scope

- 30 Use Cases (all listed above)
- 61 tests
- 7 InMemory Repositories
- Full lifecycle demo
- Industry-Agnostic (0 violations in engines/review/)
- Engine Boundary (0 cross-engine imports)
