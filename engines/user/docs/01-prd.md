# User Engine — PRD

**Version**: 1.0.0
**Date**: 2026-07-11
**Status**: Production

---

## 1. 목적

User Engine은 플랫폼의 **사용자 정보**를 관리하는 중심 Engine이다.

### 책임 분리

| Engine | 책임 |
|---|---|
| **Identity Engine** | 인증 (로그인, 비밀번호, 세션, OAuth, MFA) |
| **User Engine** | 사용자 정보 (프로필, 연락처, 환경설정, 아바타, 메타데이터) |
| **Authorization Engine** | 권한 (Role, Permission, Policy, Decision) |

User Engine은 **"사람"**을 관리한다. 인증이나 권한은 관여하지 않는다.

### 절대 포함하지 않는 것

- Password, Session, OAuth, MFA → Identity Engine
- Permission, Role, Policy → Authorization Engine
- Address → Address Engine (향후)
- Organization → Organization Engine (향후)
- Tax → Tax Profile Engine (향후)
- Payment → Payment Engine

---

## 2. 설계 원칙

- **Industry Agnostic** (헌법 §C-1)
- **Single Responsibility** — User Engine은 오직 사용자 정보만
- **Identity Reference** — Identity Engine의 Account를 참조 (identityId)
- **Event First** (헌법 §C-16) — 모든 변경 사항 Event 발행
- **Soft Delete** — 데이터 영구 삭제 없이 Archive/Restore
- **Multi-Tenant** — 테넌트 격리

---

## 3. Core Domain

### 3.1 User (Root Aggregate)

| Field | Type | 설명 |
|---|---|---|
| id | string | User ID (User Engine 생성) |
| identityId | string | Identity Engine Account ID |
| tenantId | string | 테넌트 |
| displayName | string | 표시 이름 |
| nickname | string\|null | 닉네임 |
| avatar | AvatarInfo\|null | 아바타 URL |
| language | Language | 언어 (ko, en, ka, ...) |
| timezone | Timezone | 시간대 (IANA) |
| status | UserStatus | active, suspended, archived |
| tags | string[] | 태그 |
| emailReference | EmailReference\|null | 이메일 참조 |
| phoneReference | PhoneReference\|null | 전화 참조 |
| profile | UserProfile | 상세 프로필 |
| preference | UserPreference | 환경설정 |
| metadata | Record | 동적 확장 필드 |
| deletedAt | string\|null | Soft Delete |

### 3.2 Profile

bio, gender, birthDate, nationality, occupation, company, website, socialLinks

### 3.3 Preference

theme, language, timezone, emailNotifications, pushNotifications, smsNotifications, marketingConsent, privacy

### 3.4 Contact (Reference)

EmailReference와 PhoneReference는 Identity Engine의 Credential을 **참조만** 한다.
실제 검증(verification)은 Identity Engine에서 수행한다.

---

## 4. Public API

| Method | 설명 |
|---|---|
| createUser() | 사용자 생성 (identityId 필수) |
| updateProfile() | 프로필 수정 |
| updatePreference() | 환경설정 수정 |
| uploadAvatar() | 아바타 변경 |
| changeLanguage() | 언어 변경 |
| changeTimezone() | 시간대 변경 |
| addTag() | 태그 추가 |
| removeTag() | 태그 제거 |
| archiveUser() | 아카이브 (Soft Delete) |
| restoreUser() | 아카이브 복원 |
| searchUsers() | 검색 (displayName, nickname, language, status, tags) |
| getUser() | 단일 조회 |
| listUsers() | 목록 조회 |

---

## 5. Events

| EventType | 트리거 |
|---|---|
| user.created | 사용자 생성 |
| user.profile.updated | 프로필 수정 |
| user.preference.updated | 환경설정 수정 |
| user.avatar.changed | 아바타 변경 |
| user.language.changed | 언어 변경 |
| user.timezone.changed | 시간대 변경 |
| user.archived | 아카이브 |
| user.restored | 복원 |
| user.tag.added | 태그 추가 |
| user.tag.removed | 태그 제거 |

---

## 6. Search

| 조건 | 지원 |
|---|---|
| displayName | 부분 일치 |
| nickname | 부분 일치 |
| language | 정확 일치 |
| status | 정확 일치 |
| tags | OR 일치 |

---

## 7. Dependencies

```yaml
depends_on:
  - core-sdk
  - policy
  - identity
```

---

## 8. Architecture

```
Use Case → Repository → Domain → Event → Event Bus
```

모든 Use Case는 `Result<T, E>` 반환. 모든 오류는 `PlatformError` 계층.
