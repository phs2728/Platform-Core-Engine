/**
 * Avatar, Language, Timezone, Tags UseCases
 *
 * uploadAvatar, changeLanguage, changeTimezone, addTag, removeTag
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  NotFoundError,
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
  Language,
  Timezone,
  AvatarInfo,
  User,
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
// Upload Avatar
// ═══════════════════════════════════════════

export interface UploadAvatarInput {
  tenantId: string;
  userId: string;
  url: string;
  alt?: string;
  correlationId: string;
}

export async function uploadAvatarUseCase(
  input: UploadAvatarInput,
  deps: BaseDeps,
): Promise<Result<AvatarInfo, ValidationError | NotFoundError>> {
  const urlSchema = z.string().url().max(2000);
  const urlValidation = urlSchema.safeParse(input.url);
  if (!urlValidation.success) {
    return Err(new ValidationError('Invalid avatar URL', { details: { issues: urlValidation.error.errors } }));
  }

  const user = await deps.userRepository.findById(input.tenantId, input.userId);
  if (!user) {
    return Err(new NotFoundError('User not found', { details: { userId: input.userId } }));
  }

  const now = deps.clock.now().toISOString();
  const avatar: AvatarInfo = {
    url: input.url,
    alt: input.alt ?? null,
    uploadedAt: now,
  };

  await deps.userRepository.update(input.userId, { avatar, updatedAt: now });

  const envelope: EventEnvelope<{ userId: string; url: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.avatar.changed',
    schemaRef: 'user.avatar.changed.v1',
    payload: { userId: input.userId, url: input.url },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: 'user_avatar_changed',
    metadata: { url: input.url },
  });

  return Ok(avatar);
}

// ═══════════════════════════════════════════
// Change Language
// ═══════════════════════════════════════════

export interface ChangeLanguageInput {
  tenantId: string;
  userId: string;
  language: Language;
  correlationId: string;
}

const supportedLangs = ['ko', 'en', 'ka', 'ru', 'tr', 'zh', 'de', 'ja', 'fr', 'es'] as const;

export async function changeLanguageUseCase(
  input: ChangeLanguageInput,
  deps: BaseDeps,
): Promise<Result<Language, ValidationError | NotFoundError>> {
  const langSchema = z.enum(supportedLangs);
  const validation = langSchema.safeParse(input.language);
  if (!validation.success) {
    return Err(new ValidationError('Unsupported language', { details: { issues: validation.error.errors } }));
  }

  const user = await deps.userRepository.findById(input.tenantId, input.userId);
  if (!user) {
    return Err(new NotFoundError('User not found', { details: { userId: input.userId } }));
  }

  const now = deps.clock.now().toISOString();
  await deps.userRepository.update(input.userId, {
    language: input.language,
    preference: { ...user.preference, language: input.language },
    updatedAt: now,
  });

  const envelope: EventEnvelope<{ userId: string; language: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.language.changed',
    schemaRef: 'user.language.changed.v1',
    payload: { userId: input.userId, language: input.language },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: 'user_language_changed',
    metadata: { language: input.language },
  });

  return Ok(input.language);
}

// ═══════════════════════════════════════════
// Change Timezone
// ═══════════════════════════════════════════

export interface ChangeTimezoneInput {
  tenantId: string;
  userId: string;
  timezone: Timezone;
  correlationId: string;
}

export async function changeTimezoneUseCase(
  input: ChangeTimezoneInput,
  deps: BaseDeps,
): Promise<Result<Timezone, ValidationError | NotFoundError>> {
  const tzSchema = z.string().min(1).max(100);
  const validation = tzSchema.safeParse(input.timezone);
  if (!validation.success) {
    return Err(new ValidationError('Invalid timezone', { details: { issues: validation.error.errors } }));
  }

  const user = await deps.userRepository.findById(input.tenantId, input.userId);
  if (!user) {
    return Err(new NotFoundError('User not found', { details: { userId: input.userId } }));
  }

  const now = deps.clock.now().toISOString();
  await deps.userRepository.update(input.userId, {
    timezone: input.timezone,
    preference: { ...user.preference, timezone: input.timezone },
    updatedAt: now,
  });

  const envelope: EventEnvelope<{ userId: string; timezone: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.timezone.changed',
    schemaRef: 'user.timezone.changed.v1',
    payload: { userId: input.userId, timezone: input.timezone },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: 'user_timezone_changed',
    metadata: { timezone: input.timezone },
  });

  return Ok(input.timezone);
}

// ═══════════════════════════════════════════
// Add Tag
// ═══════════════════════════════════════════

export interface AddTagInput {
  tenantId: string;
  userId: string;
  tag: string;
  correlationId: string;
}

export async function addTagUseCase(
  input: AddTagInput,
  deps: BaseDeps,
): Promise<Result<string[], ValidationError | NotFoundError>> {
  const tagSchema = z.string().min(1).max(50);
  const validation = tagSchema.safeParse(input.tag);
  if (!validation.success) {
    return Err(new ValidationError('Invalid tag', { details: { issues: validation.error.errors } }));
  }

  const user = await deps.userRepository.findById(input.tenantId, input.userId);
  if (!user) {
    return Err(new NotFoundError('User not found', { details: { userId: input.userId } }));
  }

  if (user.tags.includes(input.tag)) {
    return Ok(user.tags); // Idempotent
  }

  const tags = [...user.tags, input.tag];
  const now = deps.clock.now().toISOString();
  await deps.userRepository.update(input.userId, { tags, updatedAt: now });

  const envelope: EventEnvelope<{ userId: string; tag: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.tag.added',
    schemaRef: 'user.tag.added.v1',
    payload: { userId: input.userId, tag: input.tag },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: 'user_tag_added',
    metadata: { tag: input.tag },
  });

  return Ok(tags);
}

// ═══════════════════════════════════════════
// Remove Tag
// ═══════════════════════════════════════════

export interface RemoveTagInput {
  tenantId: string;
  userId: string;
  tag: string;
  correlationId: string;
}

export async function removeTagUseCase(
  input: RemoveTagInput,
  deps: BaseDeps,
): Promise<Result<string[], ValidationError | NotFoundError>> {
  const user = await deps.userRepository.findById(input.tenantId, input.userId);
  if (!user) {
    return Err(new NotFoundError('User not found', { details: { userId: input.userId } }));
  }

  if (!user.tags.includes(input.tag)) {
    return Ok(user.tags); // Idempotent
  }

  const tags = user.tags.filter((t) => t !== input.tag);
  const now = deps.clock.now().toISOString();
  await deps.userRepository.update(input.userId, { tags, updatedAt: now });

  const envelope: EventEnvelope<{ userId: string; tag: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: input.userId,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'user',
    eventType: 'user.tag.removed',
    schemaRef: 'user.tag.removed.v1',
    payload: { userId: input.userId, tag: input.tag },
  });
  await deps.eventBus.emit(envelope);

  await recordAudit(deps.auditLogRepository, {
    userId: input.userId,
    tenantId: input.tenantId,
    eventType: 'user_tag_removed',
    metadata: { tag: input.tag },
  });

  return Ok(tags);
}
