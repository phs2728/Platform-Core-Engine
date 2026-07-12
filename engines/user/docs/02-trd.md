# User Engine — TRD

**Version**: 1.0.0
**Date**: 2026-07-11

---

## 1. 아키텍처

```
┌─────────────────────────────────────┐
│           Public API                 │
│  createUser / updateProfile / ...    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│            Use Cases                 │
│  Create / Update / Archive / Search  │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐┌────────┐┌───────────┐
│Domain  ││Repo    ││Event Bus  │
│(Audit) ││(Iface) ││(Emit)     │
└────────┘└────────┘└───────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       In-Memory Repositories         │
│  User / AuditLog                     │
└─────────────────────────────────────┘
```

---

## 2. File Structure

```
engines/user/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── engine.json
├── README.md
├── docs/
│   ├── 01-prd.md
│   └── 02-trd.md
├── src/
│   ├── index.ts                           # Public API
│   ├── interfaces/
│   │   └── index.ts                       # All interfaces, types, defaults
│   ├── domain/
│   │   └── audit.ts                       # Audit helper
│   ├── infrastructure/
│   │   ├── InMemoryUserRepository.ts
│   │   └── InMemoryAuditLogRepository.ts
│   └── use-cases/
│       ├── CreateUserUseCase.ts
│       ├── UpdateProfileUseCase.ts
│       ├── UpdatePreferenceUseCase.ts
│       ├── UserAttributeUseCases.ts       # Avatar, Language, Timezone, Tags
│       └── UserLifecycleUseCases.ts       # Archive, Restore, Search, Get, List
└── test/
    └── user.test.ts                       # 20 tests
```

---

## 3. Data Model

### User Entity

```
User {
  id: string           // Primary key
  tenantId: string     // Multi-tenancy
  identityId: string   // FK → Identity Engine Account
  displayName: string
  nickname: string?
  avatar: AvatarInfo?
  language: Language   // ko|en|ka|ru|tr|zh|de|ja|fr|es
  timezone: string     // IANA timezone
  status: active|suspended|archived
  tags: string[]
  emailReference: EmailReference?
  phoneReference: PhoneReference?
  profile: UserProfile
  preference: UserPreference
  metadata: Record<string, unknown>
  createdAt, updatedAt: string
  deletedAt: string?   // Soft delete
}
```

### Contact References

EmailReference와 PhoneReference는 Identity Engine의 Credential을 참조만 한다.
User Engine은 검증(verification)을 수행하지 않는다.

---

## 4. Use Case Patterns

모든 Use Case는 동일한 패턴을 따른다:

1. **zod validation** — 입력 검증
2. **Repository lookup** — 사용자 존재 확인
3. **Entity update** — 도메인 로직
4. **Repository persist** — 저장
5. **Event emission** — EventEnvelope 발행
6. **Audit** — recordAudit 호출
7. **Result return** — `Result<T, E>` 반환

---

## 5. Soft Delete Pattern

### Archive

1. `softDelete(id, deletedAt)` 호출
2. status → `'archived'`
3. deletedAt → timestamp
4. findById에서 제외됨

### Restore

1. `restore(id)` 호출
2. status → `'active'`
3. deletedAt → null
4. 다시 findById에서 조회 가능

### Search

- 기본적으로 archived 사용자 제외
- `status: 'archived'` 검색 시에만 포함

---

## 6. Tenant Isolation

모든 Repository 메서드는 `tenantId`를 첫 번째 매개변수로 받는다.
다른 테넌트의 사용자는 절대 조회되지 않는다.

---

## 7. Event Schema

모든 Event는 `EventEnvelope` 형식을 따른다:

```typescript
{
  engine: 'user',
  eventType: 'user.created',
  schemaRef: 'user.created.v1',
  tenantId: 't-1',
  aggregateId: 'user-1',
  payload: { userId, identityId },
}
```

---

## 8. Validation Rules

| Field | Rule |
|---|---|
| displayName | 1-100 characters |
| nickname | max 50 characters |
| bio | max 500 characters |
| nationality | ISO 3166-1 alpha-2 (2 chars) |
| avatar URL | valid URL, max 2000 chars |
| language | ko, en, ka, ru, tr, zh, de, ja, fr, es |
| tags | each max 50 characters |
