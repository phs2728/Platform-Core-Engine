/**
 * User Engine — Complete Interfaces
 *
 * 사장님 CTO 확립 (2026-07-11):
 * "User Engine은 '사람'을 관리한다.
 *  Identity는 인증을 관리한다.
 *  Authorization은 권한을 관리한다.
 *  절대로 서로의 책임을 침범하지 않는다."
 */

import type { EventEnvelope, Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════
// Value Objects
// ═══════════════════════════════════════════

export type UserStatus = 'active' | 'suspended' | 'archived';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type Theme = 'light' | 'dark' | 'system';
export type PrivacyLevel = 'public' | 'private' | 'friends';

/** Supported languages (ISO 639-1) */
export type Language = 'ko' | 'en' | 'ka' | 'ru' | 'tr' | 'zh' | 'de' | 'ja' | 'fr' | 'es';

/** IANA timezone (e.g., 'Asia/Tbilisi', 'America/New_York') */
export type Timezone = string;

// ═══════════════════════════════════════════
// Contact (References — NOT credentials)
// ═══════════════════════════════════════════

/**
 * EmailReference — Identity Engine의 Email Credential을 참조만 함.
 * 실제 검증(verification)은 Identity Engine에서 수행.
 */
export interface EmailReference {
  email: string;
  verified: boolean; // Identity Engine에서 동기화
}

/**
 * PhoneReference — Identity Engine의 Phone Credential을 참조만 함.
 */
export interface PhoneReference {
  phone: string;
  verified: boolean;
}

// ═══════════════════════════════════════════
// Social Links
// ═══════════════════════════════════════════

export interface SocialLinks {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
  website?: string;
}

// ═══════════════════════════════════════════
// Profile
// ═══════════════════════════════════════════

export interface UserProfile {
  bio: string | null;
  gender: Gender | null;
  birthDate: string | null;       // ISO 8601 date
  nationality: string | null;     // ISO 3166-1 alpha-2
  occupation: string | null;
  company: string | null;
  website: string | null;
  socialLinks: SocialLinks;
}

// ═══════════════════════════════════════════
// Preference
// ═══════════════════════════════════════════

export interface UserPreference {
  theme: Theme;
  language: Language;
  timezone: Timezone;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingConsent: boolean;
  privacy: PrivacyLevel;
}

// ═══════════════════════════════════════════
// Avatar
// ═══════════════════════════════════════════

export interface AvatarInfo {
  url: string;
  alt: string | null;
  uploadedAt: string;
}

// ═══════════════════════════════════════════
// User Entity (Root Aggregate)
// ═══════════════════════════════════════════

export interface User {
  id: string;
  tenantId: string;
  /** Identity Engine의 Account ID — 인증/비밀번호는 Identity Engine이 관리 */
  identityId: string;
  displayName: string;
  nickname: string | null;
  /** Avatar URL (Media Engine이 저장, User는 URL만 참조) */
  avatar: AvatarInfo | null;
  language: Language;
  timezone: Timezone;
  status: UserStatus;
  tags: string[];
  /** Contact references (실제 검증은 Identity Engine) */
  emailReference: EmailReference | null;
  phoneReference: PhoneReference | null;
  /** 상세 프로필 */
  profile: UserProfile;
  /** 사용자 환경설정 */
  preference: UserPreference;
  /** Dynamic JSON metadata */
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** Soft delete timestamp */
  deletedAt: string | null;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface UserSearchCriteria {
  tenantId: string;
  query?: string;           // displayName, nickname 검색
  language?: Language;
  status?: UserStatus;
  tags?: string[];          // OR matching
  limit?: number;
  offset?: number;
}

export interface UserSearchResult {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type AuditEventType =
  | 'user_created' | 'user_updated' | 'user_profile_updated'
  | 'user_preference_updated' | 'user_avatar_changed'
  | 'user_language_changed' | 'user_timezone_changed'
  | 'user_archived' | 'user_restored'
  | 'user_tag_added' | 'user_tag_removed';

export interface AuditLogRecord {
  id: string;
  tenantId: string;
  userId: string | null;
  eventType: AuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IUserRepository {
  insert(user: User): Promise<void>;
  findById(tenantId: string, id: string): Promise<User | null>;
  findByIdentityId(tenantId: string, identityId: string): Promise<User | null>;
  findByEmail(tenantId: string, email: string): Promise<User | null>;
  update(id: string, patch: Partial<User>): Promise<void>;
  search(criteria: UserSearchCriteria): Promise<UserSearchResult>;
  findByTenant(tenantId: string, limit?: number, offset?: number): Promise<User[]>;
  /** Soft delete (set deletedAt + status='archived') */
  softDelete(id: string, deletedAt: string): Promise<void>;
  /** Restore (clear deletedAt + status='active') */
  restore(id: string): Promise<void>;
  /** Include archived users in search */
  countByStatus(tenantId: string, status: UserStatus): Promise<number>;
}

export interface IAuditLogRepository {
  insert(record: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<AuditLogRecord>;
  findByTenant(tenantId: string, limit?: number): Promise<AuditLogRecord[]>;
  findByUser(userId: string): Promise<AuditLogRecord[]>;
}

// ═══════════════════════════════════════════
// Defaults
// ═══════════════════════════════════════════

export const DEFAULT_PROFILE: UserProfile = {
  bio: null,
  gender: null,
  birthDate: null,
  nationality: null,
  occupation: null,
  company: null,
  website: null,
  socialLinks: {},
};

export const DEFAULT_PREFERENCE: UserPreference = {
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  marketingConsent: false,
  privacy: 'private',
};

export const SUPPORTED_LANGUAGES: readonly Language[] = [
  'ko', 'en', 'ka', 'ru', 'tr', 'zh', 'de', 'ja', 'fr', 'es',
] as const;

export { type Result, type EventEnvelope };
