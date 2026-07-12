# Dependency Report

**Status**: fail

## Dependency Edges

| From | To | Declared |
|---|---|---|
| address | core-sdk | ✅ |
| address | policy | ✅ |
| authorization | core-sdk | ✅ |
| authorization | universal-core | ✅ |
| billing | core-sdk | ✅ |
| billing | policy | ✅ |
| billing | organization | ✅ |
| billing | order | ✅ |
| billing | pricing | ✅ |
| billing | event-bus | ✅ |
| catalog | core-sdk | ✅ |
| catalog | policy | ✅ |
| catalog | user | ✅ |
| catalog | organization | ✅ |
| catalog | event-bus | ✅ |
| communication | core-sdk | ✅ |
| communication | event-bus | ✅ |
| communication | universal-core | ✅ |
| core-sdk | policy | ✅ |
| core-sdk | universal-core | ✅ |
| event-bus | core-sdk | ✅ |
| event-bus | universal-core | ✅ |
| identity | policy | ✅ |
| identity | core-sdk | ✅ |
| identity | universal-core | ✅ |
| media | core-sdk | ✅ |
| media | policy | ✅ |
| media | organization | ✅ |
| media | event-bus | ✅ |
| organization | core-sdk | ✅ |
| organization | event-bus | ✅ |
| organization | policy | ✅ |
| organization | user | ✅ |
| organization | address | ✅ |
| platform-compatibility | core-sdk | ✅ |
| policy | universal-core | ✅ |
| pricing | core-sdk | ✅ |
| pricing | policy | ✅ |
| pricing | organization | ✅ |
| pricing | catalog | ✅ |
| pricing | event-bus | ✅ |
| user | core-sdk | ✅ |
| user | policy | ✅ |
| user | identity | ✅ |

## ✅ No Circular Dependencies

## Forbidden Imports

- **billing** → order

## Layer Violations

- **catalog**: Phase 4 engine depends on Phase 5 engine "user"
- **organization**: Phase 3 engine depends on Phase 5 engine "user"
- **organization**: Phase 3 engine depends on Phase 6 engine "address"
