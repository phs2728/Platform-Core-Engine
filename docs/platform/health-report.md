# Health Report

## Engine Health Scores

| Engine | Score | Grade |
|---|---|---|
| core-sdk | █████████░ 95/100 | A |
| event-bus | ████████░░ 89/100 | B |
| platform-compatibility | ████████░░ 89/100 | B |
| policy | ████████░░ 89/100 | B |
| address | ████████░░ 85/100 | B |
| media | ████████░░ 85/100 | B |
| pricing | ████████░░ 85/100 | B |
| authorization | ████████░░ 83/100 | B |
| identity | ████████░░ 83/100 | B |
| organization | ███████░░░ 70/100 | C |
| user | ███████░░░ 70/100 | C |
| catalog | ██████░░░░ 60/100 | D |
| communication | █████░░░░░ 53/100 | F |
| billing | █████░░░░░ 50/100 | F |

## Platform Readiness

- **Status**: FAIL
- **Compatibility**: 100%
- **Average Health Score**: 78/100
- **Broken Contracts**: 4
- **Breaking Changes**: 0
- **Warnings**: 3

## Factor Breakdown

### core-sdk (95/100, Grade A)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 30/30 | 0 critical, 0 warning |
| Event Contracts | 15/15 | 0 events, 0 failed, 0 warning |
| Reference Contracts | 10/10 | 0 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 5/10 | provides: 8, events: 0, boundaries: no |

### event-bus (89/100, Grade B)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 30/30 | 0 critical, 0 warning |
| Event Contracts | 6/15 | 3 events, 0 failed, 3 warning |
| Reference Contracts | 10/10 | 0 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 8/10 | provides: 4, events: 3, boundaries: no |

### platform-compatibility (89/100, Grade B)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 30/30 | 0 critical, 0 warning |
| Event Contracts | 6/15 | 3 events, 0 failed, 3 warning |
| Reference Contracts | 10/10 | 0 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 8/10 | provides: 12, events: 3, boundaries: no |

### policy (89/100, Grade B)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 30/30 | 0 critical, 0 warning |
| Event Contracts | 6/15 | 4 events, 0 failed, 3 warning |
| Reference Contracts | 10/10 | 0 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 8/10 | provides: 4, events: 4, boundaries: no |

### address (85/100, Grade B)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 30/30 | 0 critical, 0 warning |
| Event Contracts | 0/15 | 8 events, 0 failed, 7 warning |
| Reference Contracts | 10/10 | 1 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 10/10 | provides: 15, events: 8, boundaries: yes |

### media (85/100, Grade B)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 30/30 | 0 critical, 0 warning |
| Event Contracts | 0/15 | 16 events, 0 failed, 14 warning |
| Reference Contracts | 10/10 | 2 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 10/10 | provides: 25, events: 14, boundaries: yes |

### pricing (85/100, Grade B)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 30/30 | 0 critical, 0 warning |
| Event Contracts | 0/15 | 26 events, 0 failed, 23 warning |
| Reference Contracts | 10/10 | 3 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 10/10 | provides: 28, events: 23, boundaries: yes |

### authorization (83/100, Grade B)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 30/30 | 0 critical, 0 warning |
| Event Contracts | 0/15 | 6 events, 0 failed, 6 warning |
| Reference Contracts | 10/10 | 0 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 8/10 | provides: 11, events: 6, boundaries: no |

### identity (83/100, Grade B)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 30/30 | 0 critical, 0 warning |
| Event Contracts | 0/15 | 34 events, 0 failed, 34 warning |
| Reference Contracts | 10/10 | 0 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 8/10 | provides: 4, events: 34, boundaries: no |

### organization (70/100, Grade C)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 20/30 | 0 critical, 2 warning |
| Event Contracts | 0/15 | 21 events, 0 failed, 15 warning |
| Reference Contracts | 10/10 | 3 refs, 0 failed |
| Dependency Health | 15/20 | layer violation |
| API Stability | 15/15 | stable |
| Manifest Completeness | 10/10 | provides: 20, events: 17, boundaries: yes |

### user (70/100, Grade C)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 15/30 | 1 critical, 0 warning |
| Event Contracts | 0/15 | 12 events, 1 failed, 9 warning |
| Reference Contracts | 10/10 | 1 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 10/10 | provides: 11, events: 11, boundaries: yes |

### catalog (60/100, Grade D)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 10/30 | 1 critical, 1 warning |
| Event Contracts | 0/15 | 21 events, 1 failed, 17 warning |
| Reference Contracts | 10/10 | 3 refs, 0 failed |
| Dependency Health | 15/20 | layer violation |
| API Stability | 15/15 | stable |
| Manifest Completeness | 10/10 | provides: 20, events: 18, boundaries: yes |

### communication (53/100, Grade F)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 0/30 | 11 critical, 0 warning |
| Event Contracts | 0/15 | 16 events, 11 failed, 5 warning |
| Reference Contracts | 10/10 | 0 refs, 0 failed |
| Dependency Health | 20/20 | clean |
| API Stability | 15/15 | stable |
| Manifest Completeness | 8/10 | provides: 9, events: 5, boundaries: no |

### billing (50/100, Grade F)

| Factor | Points | Detail |
|---|---|---|
| Contract Violations | 15/30 | 1 critical, 0 warning |
| Event Contracts | 0/15 | 11 events, 0 failed, 9 warning |
| Reference Contracts | 0/10 | 4 refs, 1 failed |
| Dependency Health | 10/20 | forbidden import |
| API Stability | 15/15 | stable |
| Manifest Completeness | 10/10 | provides: 24, events: 9, boundaries: yes |
