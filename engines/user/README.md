# User Engine

> **Platform Core Foundation — Manages "User" (Person)**
>
> Identity Engine은 **"인증"**을 관리합니다.
> Authorization Engine은 **"권한"**을 관리합니다.
> User Engine은 **"사용자 정보"**를 관리합니다.

**Version**: 1.0.0
**Phase**: 5
**Status**: Production

---

## 목적

User Engine은 플랫폼의 **모든 사용자 정보**를 관리한다.

### 책임 분리

| Engine | 책임 |
|---|---|
| **Identity Engine** | 인증 (로그인, 비밀번호, 세션, OAuth, MFA) |
| **User Engine** | 사용자 정보 (프로필, 연락처, 환경설정, 아바타, 메타데이터) |
| **Authorization Engine** | 권한 (Role, Permission, Policy, Decision) |

### 절대 포함하지 않는 것

❌ Password, Session, OAuth, MFA (→ Identity Engine)
❌ Permission, Role, Policy (→ Authorization Engine)
❌ Address, Organization, Tax, Payment (→ 별도 Business Engine)

---

## Core Domain

| Aggregate | 설명 |
|---|---|
| **User** | 사용자 엔티티 (identityId 참조, displayName, status) |
| **Profile** | 상세 프로필 (bio, gender, birthDate, nationality, occupation, website, socialLinks) |
| **Preference** | 사용자 환경설정 (theme, language, timezone, notification, marketingConsent, privacy) |
| **Contact** | 연락처 참조 (EmailReference, PhoneReference — 실제 검증은 Identity Engine) |
| **Avatar** | 아바타 이미지 URL |
| **Metadata** | 동적 JSON 확장 필드 |

---

## Public API

```typescript
createUser()        // 사용자 생성
updateProfile()     // 프로필 수정
updatePreference()  // 환경설정 수정
uploadAvatar()      // 아바타 변경
changeLanguage()    // 언어 변경
changeTimezone()    // 시간대 변경
archiveUser()       // 사용자 아카이브 (Soft Delete)
restoreUser()       // 아카이브 복원
searchUsers()       // 사용자 검색
getUser()           // 단일 사용자 조회
listUsers()         // 사용자 목록
```

---

## Platform Foundation

```
Core SDK
    ↓
Policy
    ↓
Identity (인증)
    ↓
User (사용자 정보)  ← THIS ENGINE
    ↓
Authorization (권한)
    ↓
Event Bus
    ↓
Communication
```

---

## 빠른 시작

```typescript
import {
  createUserUseCase,
  updateProfileUseCase,
  searchUsersUseCase,
  InMemoryUserRepository,
} from '@platform/engine-user';

// 1. Setup
const userRepo = new InMemoryUserRepository();

// 2. Create User
const result = await createUserUseCase(
  { identityId: 'acc-1', displayName: 'Kim', tenantId: 't-1', correlationId: 'r-1' },
  deps,
);

// 3. Search
const found = await searchUsersUseCase(
  { query: 'Kim', tenantId: 't-1' },
  deps,
);
```

---

## 의존성

```yaml
depends_on:
  - core-sdk
  - policy
  - identity
```

---

## Tests

```bash
pnpm test
pnpm typecheck
```
