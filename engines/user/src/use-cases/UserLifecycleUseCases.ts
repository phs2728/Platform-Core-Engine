/**
 * Archive, Restore, Search, Get, List UseCases
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  NotFoundError,
  ConflictError,
  type EventEnvelope,
  createEnvelope,
  z,
} from '@platform/core-sdk';
import { recordAudit } from '../domain/audit.js';
import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IUserRepository,
  IAuditLogRepository,
  User,
  UserSearchCriteria,
  UserSearchResult,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Common Deps
// ═══════════════════════════════════════════

interface BaseDeps {
  userRepository: IUserRepository;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
  auditLogRepository: IAuditLogRepository;
}

// ═══════════════════════════════════════════
// Archive User (Soft Delete)
// ═══════════════════════════════════════════

export interface ArchiveUserInput {
  tenantId: string;
  userId: string;
  correlationId: string;
}

export async function archiveUserUseCase(
  input: ArchiveUserInput,
  deps: BaseDeps,
): Promise<Result<void, NotFoundError | ConflictError>> {
  // findById excludes archived users, so we need a raw lookup
  // First try findById — if it returns null, user may already be archived or not exist
  const user = await deps.userRepository.findById(input.tenantId, input.userId);
  if (!user) {
    // Could be already archived. Check via search with archived status.
    const archived = await deps.userRepository.search({
      tenantId: input.tenantId,
      status: 'archived',
    });
    const found = archived.users.find((u) => u.id === input.userId);
    if (found) {
      return Err(new ConflictError('User already archived', { details: { userId: input.userId } }));
    }
    return Err(new NotFoundError('User not found', { details: { userId: input.userId } }));
  }

  const now = deps.clock.now().toISOString();
  await deps.userRepository.softDelete(input.userId, now);

  const envelope: EventEnvelope<{ userId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.archived',
    schemaRef: 'user.archived.v1',
    payload: { userId: input.userId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: 'user_archived',
    metadata: {},
  });

  return Ok(undefined);
}

// ═══════════════════════════════════════════
// Restore User
// ═══════════════════════════════════════════

export interface RestoreUserInput {
  tenantId: string;
  userId: string;
  correlationId: string;
}

export async function restoreUserUseCase(
  input: RestoreUserInput,
  deps: BaseDeps,
): Promise<Result<void, NotFoundError>> {
  // Check if user exists in archived state
  const archived = await deps.userRepository.search({
    tenantId: input.tenantId,
    status: 'archived',
  });
  const found = archived.users.find((u) => u.id === input.userId);
  if (!found) {
    return Err(new NotFoundError('Archived user not found', { details: { userId: input.userId } }));
  }

  await deps.userRepository.restore(input.userId);

  const now = deps.clock.now().toISOString();
  const envelope: EventEnvelope<{ userId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.restored',
    schemaRef: 'user.restored.v1',
    payload: { userId: input.userId },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: 'user_restored',
    metadata: {},
  });

  return Ok(undefined);
}

// ═══════════════════════════════════════════
// Search Users
// ═══════════════════════════════════════════

export interface SearchUsersInput {
  tenantId: string;
  query?: string;
  language?: string;
  status?: 'active' | 'suspended' | 'archived';
  tags?: string[];
  limit?: number;
  offset?: number;
  correlationId: string;
}

export async function searchUsersUseCase(
  input: SearchUsersInput,
  deps: BaseDeps,
): Promise<Result<UserSearchResult, ValidationError>> {
  const criteria: UserSearchCriteria = {
    tenantId: input.tenantId,
    limit: input.limit ?? 50,
    offset: input.offset ?? 0,
  };
  if (input.query !== undefined) criteria.query = input.query;
  if (input.language !== undefined) {
    // Assert non-empty after cast
    const lang: User['language'] = input.language as User['language'];
    if (lang) criteria.language = lang;
  }
  if (input.status !== undefined) criteria.status = input.status;
  if (input.tags !== undefined) criteria.tags = input.tags;

  const result = await deps.userRepository.search(criteria);

  // Audit (search queries are audited lightly)
  await recordAudit(deps.auditLogRepository, {
    userId: null,
    tenantId: input.tenantId,
    eventType: 'user_updated', // Reuse — no dedicated search audit type
    metadata: {
      action: 'search',
      query: input.query ?? null,
      resultCount: result.total,
    },
  });

  return Ok(result);
}

// ═══════════════════════════════════════════
// Get User
// ═══════════════════════════════════════════

export interface GetUserInput {
  tenantId: string;
  userId: string;
  correlationId: string;
}

export async function getUserUseCase(
  input: GetUserInput,
  deps: Pick<BaseDeps, 'userRepository'>,
): Promise<Result<User, NotFoundError>> {
  const user = await deps.userRepository.findById(input.tenantId, input.userId);
  if (!user) {
    return Err(new NotFoundError('User not found', { details: { userId: input.userId } }));
  }
  return Ok(user);
}

// ═══════════════════════════════════════════
// List Users
// ═══════════════════════════════════════════

export interface ListUsersInput {
  tenantId: string;
  limit?: number;
  offset?: number;
  correlationId: string;
}

export async function listUsersUseCase(
  input: ListUsersInput,
  deps: Pick<BaseDeps, 'userRepository'>,
): Promise<Result<User[], NotFoundError>> {
  const users = await deps.userRepository.findByTenant(
    input.tenantId,
    input.limit ?? 50,
    input.offset ?? 0,
  );
  return Ok(users);
}
