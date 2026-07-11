import { describe, it, expect } from 'vitest';
import {
  createUserUseCase,
  updateProfileUseCase,
  updatePreferenceUseCase,
  uploadAvatarUseCase,
  changeLanguageUseCase,
  changeTimezoneUseCase,
  addTagUseCase,
  removeTagUseCase,
  archiveUserUseCase,
  restoreUserUseCase,
  searchUsersUseCase,
  getUserUseCase,
  listUsersUseCase,
  InMemoryUserRepository,
  InMemoryAuditLogRepository,
} from '../src/index.js';

// ═══════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════

const fixedTime = new Date('2026-07-11T08:00:00.000Z');
const clock = { now: () => new Date(fixedTime) };
let idCounter = 0;
const idGen = { generate: () => `id-${++idCounter}` };
const eventBus = { events: [] as unknown[], async emit(e: unknown) { this.events.push(e); } };

function makeDeps() {
  return {
    userRepository: new InMemoryUserRepository(),
    auditLogRepository: new InMemoryAuditLogRepository(),
    idGenerator: idGen,
    clock,
    eventBus,
  };
}

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe('User Engine — createUser', () => {
  it('should create a user successfully', async () => {
    const deps = makeDeps();
    const result = await createUserUseCase(
      {
        tenantId: 't-1',
        identityId: 'acc-1',
        displayName: 'Kim Cheolsoo',
        language: 'ko',
        timezone: 'Asia/Seoul',
        email: 'kim@example.com',
        emailVerified: true,
        correlationId: 'r-1',
      },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBeDefined();
    expect(result.value.identityId).toBe('acc-1');
  });

  it('should reject duplicate identityId', async () => {
    const deps = makeDeps();
    await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );

    const result2 = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Lee', correlationId: 'r-2' },
      deps,
    );

    expect(result2.ok).toBe(false);
  });

  it('should reject empty displayName', async () => {
    const deps = makeDeps();
    const result = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: '', correlationId: 'r-1' },
      deps,
    );

    expect(result.ok).toBe(false);
  });

  it('should emit user.created event', async () => {
    const deps = makeDeps();
    const initialEventCount = deps.eventBus.events.length;
    await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Park', correlationId: 'r-1' },
      deps,
    );

    expect(deps.eventBus.events.length).toBe(initialEventCount + 1);
    const event = deps.eventBus.events[deps.eventBus.events.length - 1] as { eventType: string };
    expect(event.eventType).toBe('user.created');
  });
});

describe('User Engine — updateProfile', () => {
  it('should update profile fields', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await updateProfileUseCase(
      {
        tenantId: 't-1',
        userId: created.value.userId,
        bio: 'Software Engineer',
        gender: 'male',
        occupation: 'Developer',
        company: 'ACME',
        correlationId: 'r-2',
      },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bio).toBe('Software Engineer');
    expect(result.value.occupation).toBe('Developer');
    expect(result.value.company).toBe('ACME');
  });

  it('should return NotFoundError for non-existent user', async () => {
    const deps = makeDeps();
    const result = await updateProfileUseCase(
      { tenantId: 't-1', userId: 'nonexistent', bio: 'test', correlationId: 'r-1' },
      deps,
    );

    expect(result.ok).toBe(false);
  });
});

describe('User Engine — updatePreference', () => {
  it('should update theme and notifications', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await updatePreferenceUseCase(
      {
        tenantId: 't-1',
        userId: created.value.userId,
        theme: 'dark',
        emailNotifications: false,
        marketingConsent: true,
        correlationId: 'r-2',
      },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.theme).toBe('dark');
    expect(result.value.emailNotifications).toBe(false);
    expect(result.value.marketingConsent).toBe(true);
  });
});

describe('User Engine — Avatar', () => {
  it('should upload avatar', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await uploadAvatarUseCase(
      {
        tenantId: 't-1',
        userId: created.value.userId,
        url: 'https://cdn.example.com/avatar/123.png',
        alt: 'Profile photo',
        correlationId: 'r-2',
      },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.url).toBe('https://cdn.example.com/avatar/123.png');
    expect(result.value.alt).toBe('Profile photo');
  });

  it('should reject invalid URL', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await uploadAvatarUseCase(
      { tenantId: 't-1', userId: created.value.userId, url: 'not-a-url', correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(false);
  });
});

describe('User Engine — Language & Timezone', () => {
  it('should change language', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await changeLanguageUseCase(
      { tenantId: 't-1', userId: created.value.userId, language: 'ja', correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe('ja');
  });

  it('should reject unsupported language', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await changeLanguageUseCase(
      { tenantId: 't-1', userId: created.value.userId, language: 'xx' as never, correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(false);
  });

  it('should change timezone', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    const result = await changeTimezoneUseCase(
      { tenantId: 't-1', userId: created.value.userId, timezone: 'America/New_York', correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe('America/New_York');
  });
});

describe('User Engine — Tags', () => {
  it('should add and remove tags', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    // Add
    const addResult = await addTagUseCase(
      { tenantId: 't-1', userId: created.value.userId, tag: 'vip', correlationId: 'r-2' },
      deps,
    );
    expect(addResult.ok).toBe(true);
    if (!addResult.ok) return;
    expect(addResult.value).toContain('vip');

    // Add another
    const addResult2 = await addTagUseCase(
      { tenantId: 't-1', userId: created.value.userId, tag: 'premium', correlationId: 'r-3' },
      deps,
    );
    expect(addResult2.ok).toBe(true);
    if (!addResult2.ok) return;
    expect(addResult2.value).toHaveLength(2);

    // Remove
    const removeResult = await removeTagUseCase(
      { tenantId: 't-1', userId: created.value.userId, tag: 'vip', correlationId: 'r-4' },
      deps,
    );
    expect(removeResult.ok).toBe(true);
    if (!removeResult.ok) return;
    expect(removeResult.value).not.toContain('vip');
    expect(removeResult.value).toContain('premium');
  });

  it('should be idempotent for duplicate tags', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    await addTagUseCase(
      { tenantId: 't-1', userId: created.value.userId, tag: 'vip', correlationId: 'r-2' },
      deps,
    );
    const result = await addTagUseCase(
      { tenantId: 't-1', userId: created.value.userId, tag: 'vip', correlationId: 'r-3' },
      deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
  });
});

describe('User Engine — Archive & Restore', () => {
  it('should archive (soft delete) and restore', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;
    const userId = created.value.userId;

    // Archive
    const archiveResult = await archiveUserUseCase(
      { tenantId: 't-1', userId, correlationId: 'r-2' },
      deps,
    );
    expect(archiveResult.ok).toBe(true);

    // Should not find archived user via findById
    const getResult = await getUserUseCase(
      { tenantId: 't-1', userId, correlationId: 'r-3' },
      deps,
    );
    expect(getResult.ok).toBe(false); // Not found

    // Restore
    const restoreResult = await restoreUserUseCase(
      { tenantId: 't-1', userId, correlationId: 'r-4' },
      deps,
    );
    expect(restoreResult.ok).toBe(true);

    // Should find again
    const getResult2 = await getUserUseCase(
      { tenantId: 't-1', userId, correlationId: 'r-5' },
      deps,
    );
    expect(getResult2.ok).toBe(true);
  });

  it('should reject double archive', async () => {
    const deps = makeDeps();
    const created = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    if (!created.ok) return;

    await archiveUserUseCase(
      { tenantId: 't-1', userId: created.value.userId, correlationId: 'r-2' },
      deps,
    );

    const result = await archiveUserUseCase(
      { tenantId: 't-1', userId: created.value.userId, correlationId: 'r-3' },
      deps,
    );
    expect(result.ok).toBe(false);
  });
});

describe('User Engine — Search', () => {
  it('should search by displayName', async () => {
    const deps = makeDeps();
    await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim Cheolsoo', correlationId: 'r-1' },
      deps,
    );
    await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-2', displayName: 'Lee Soojin', correlationId: 'r-2' },
      deps,
    );

    const result = await searchUsersUseCase(
      { tenantId: 't-1', query: 'Kim', correlationId: 'r-3' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(1);
    expect(result.value.users[0]!.displayName).toBe('Kim Cheolsoo');
  });

  it('should search by tags', async () => {
    const deps = makeDeps();
    const u1 = await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-2', displayName: 'Lee', correlationId: 'r-2' },
      deps,
    );
    if (!u1.ok) return;
    await addTagUseCase(
      { tenantId: 't-1', userId: u1.value.userId, tag: 'vip', correlationId: 'r-3' },
      deps,
    );

    const result = await searchUsersUseCase(
      { tenantId: 't-1', tags: ['vip'], correlationId: 'r-4' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(1);
  });
});

describe('User Engine — List', () => {
  it('should list all users in tenant', async () => {
    const deps = makeDeps();
    await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );
    await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-2', displayName: 'Lee', correlationId: 'r-2' },
      deps,
    );
    await createUserUseCase(
      { tenantId: 't-2', identityId: 'acc-3', displayName: 'Park', correlationId: 'r-3' },
      deps,
    );

    const result = await listUsersUseCase(
      { tenantId: 't-1', correlationId: 'r-4' },
      deps,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
  });
});

describe('User Engine — Tenant Isolation', () => {
  it('should not find users from other tenants', async () => {
    const deps = makeDeps();
    await createUserUseCase(
      { tenantId: 't-1', identityId: 'acc-1', displayName: 'Kim', correlationId: 'r-1' },
      deps,
    );

    const result = await getUserUseCase(
      { tenantId: 't-2', userId: 'id-1', correlationId: 'r-2' },
      deps,
    );

    expect(result.ok).toBe(false);
  });
});
