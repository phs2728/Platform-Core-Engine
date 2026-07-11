/**
 * Communication Engine — Complete Interfaces
 * 사장님 Engineering Manager 확립 (2026-07-11)
 */

import type { EventEnvelope, Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════════════════════
// Core Infra
// ═══════════════════════════════════════════════════════════

export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// ═══════════════════════════════════════════════════════════
// Channel Types
// ═══════════════════════════════════════════════════════════

export type ChannelType =
  | 'email' | 'sms' | 'push' | 'browser' | 'in_app'
  | 'webhook' | 'whatsapp' | 'telegram' | 'slack' | 'discord'
  | 'teams' | 'voice';

// ═══════════════════════════════════════════════════════════
// Provider Plugin
// ═══════════════════════════════════════════════════════════

export interface OutboundMessage {
  to: string;
  subject?: string;
  body: string;
  html?: string;
  metadata?: Record<string, unknown>;
}

export type ProviderResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string; retryable: boolean };

export interface IChannelProvider {
  readonly channel: ChannelType;
  readonly name: string;
  send(message: OutboundMessage): Promise<ProviderResult>;
}

export interface IProviderManager {
  register(provider: IChannelProvider): void;
  get(channel: ChannelType, name: string): IChannelProvider | null;
  getDefault(channel: ChannelType): IChannelProvider | null;
  setDefault(channel: ChannelType, name: string): void;
  list(channel?: ChannelType): IChannelProvider[];
  unregister(channel: ChannelType, name: string): void;
}

// ═══════════════════════════════════════════════════════════
// Template
// ═══════════════════════════════════════════════════════════

export interface IMessageTemplate {
  id: string;
  name: string;
  channel: ChannelType;
  locale: string;
  subjectTemplate?: string;
  bodyTemplate: string;
  htmlTemplate?: string;
  version: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ITemplateRenderer {
  render(template: string, variables: Record<string, unknown>): string;
}

export interface ITemplateRepository {
  insert(template: IMessageTemplate): Promise<void>;
  findByName(name: string, channel: ChannelType, locale: string): Promise<IMessageTemplate | null>;
  findById(id: string): Promise<IMessageTemplate | null>;
  findAll(): Promise<IMessageTemplate[]>;
  update(id: string, patch: Partial<IMessageTemplate>): Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// Message Queue
// ═══════════════════════════════════════════════════════════

export type MessagePriority = 'critical' | 'high' | 'normal' | 'low';
export type MessageStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'dead_letter';

export interface IMessageRecord {
  id: string;
  tenantId: string;
  accountId: string | null;
  channel: ChannelType;
  providerName: string | null;
  templateName: string | null;
  to: string;
  subject: string | null;
  body: string;
  html: string | null;
  variables: Record<string, unknown>;
  locale: string;
  priority: MessagePriority;
  status: MessageStatus;
  scheduledAt: string;
  sentAt: string | null;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  providerMessageId: string | null;
  errorMessage: string | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMessageRepository {
  insert(record: IMessageRecord): Promise<void>;
  findById(id: string): Promise<IMessageRecord | null>;
  findPending(limit: number): Promise<IMessageRecord[]>;
  findByAccount(accountId: string): Promise<IMessageRecord[]>;
  findByTenant(tenantId: string, limit?: number): Promise<IMessageRecord[]>;
  findByStatus(status: MessageStatus, limit?: number): Promise<IMessageRecord[]>;
  update(id: string, patch: Partial<IMessageRecord>): Promise<void>;
  countByStatus(status: MessageStatus): Promise<number>;
  all(): Promise<IMessageRecord[]>;
}

// ═══════════════════════════════════════════════════════════
// Preference
// ═══════════════════════════════════════════════════════════

export type PreferenceCategory =
  | 'email' | 'sms' | 'push' | 'marketing' | 'security'
  | 'system' | 'booking' | 'payment' | 'review';

export interface IUserPreference {
  id: string;
  accountId: string;
  tenantId: string;
  channelPreferences: Partial<Record<ChannelType, boolean>>;
  categoryPreferences: Partial<Record<PreferenceCategory, boolean>>;
  locale: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  maxFrequencyPerDay: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPreferenceRepository {
  upsert(pref: IUserPreference): Promise<void>;
  findByAccount(accountId: string): Promise<IUserPreference | null>;
}

// ═══════════════════════════════════════════════════════════
// Analytics
// ═══════════════════════════════════════════════════════════

export type DeliveryStatus =
  | 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounce' | 'spam';

export interface IAnalyticsEvent {
  id: string;
  messageId: string;
  tenantId: string;
  channel: ChannelType;
  status: DeliveryStatus;
  latency: number | null;
  retryCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AnalyticsStats {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounce: number;
  spam: number;
  avgLatency: number | null;
}

export interface IAnalyticsRepository {
  insert(event: IAnalyticsEvent): Promise<void>;
  findByMessage(messageId: string): Promise<IAnalyticsEvent[]>;
  findByTenant(tenantId: string, limit?: number): Promise<IAnalyticsEvent[]>;
  getStats(tenantId: string): Promise<AnalyticsStats>;
}

// ═══════════════════════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════════════════════

export type AuditEventType =
  | 'message_queued' | 'message_sent' | 'message_failed'
  | 'message_dead_letter' | 'message_retry_scheduled'
  | 'template_created' | 'template_updated'
  | 'preference_updated' | 'provider_registered' | 'provider_removed';

export interface AuditLogRecord {
  id: string;
  tenantId: string;
  eventType: AuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export { type Result, type EventEnvelope };
