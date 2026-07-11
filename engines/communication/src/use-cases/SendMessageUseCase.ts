/**
 * Send Message UseCase
 *
 * 사장님 Engineering Manager 확립:
 * "No Engine may send Email, SMS, Push or Webhook directly.
 *  Every communication MUST go through Communication Engine."
 *
 * 흐름:
 * 1. Template 조회 (name + channel + locale)
 * 2. Template 렌더링 ({{variables}})
 * 3. User Preference 확인 (채널/카테고리/조용시간)
 * 4. Message Queue에 저장
 * 5. Provider로 발송 (또는 스케줄링)
 * 6. Analytics 기록
 * 7. Event 발행
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
import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IMessageRepository,
  ITemplateRepository,
  ITemplateRenderer,
  IPreferenceRepository,
  IAnalyticsRepository,
  IProviderManager,
  IChannelProvider,
  ChannelType,
  MessagePriority,
  IMessageRecord,
  MessageStatus,
  DeliveryStatus,
  IAnalyticsEvent,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Input/Output
// ═══════════════════════════════════════════

export interface SendMessageInput {
  tenantId: string;
  accountId: string | null;
  channel: ChannelType;
  to: string;
  templateName: string;
  variables: Record<string, unknown>;
  locale: string;
  priority?: MessagePriority;
  scheduledAt?: string;
  category?: string;
  correlationId: string;
}

export interface SendMessageOutput {
  messageId: string;
  status: MessageStatus;
  providerMessageId: string | null;
}

export interface SendMessageDeps {
  messageRepository: IMessageRepository;
  templateRepository: ITemplateRepository;
  templateRenderer: ITemplateRenderer;
  preferenceRepository: IPreferenceRepository;
  analyticsRepository: IAnalyticsRepository;
  providerManager: IProviderManager;
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
}

const sendMessageSchema = z.object({
  tenantId: z.string().min(1),
  channel: z.string().min(1),
  to: z.string().min(1),
  templateName: z.string().min(1),
  locale: z.string().min(2),
});

// ═══════════════════════════════════════════
// UseCase
// ═══════════════════════════════════════════

export async function sendMessageUseCase(
  input: SendMessageInput,
  deps: SendMessageDeps,
): Promise<Result<SendMessageOutput, ValidationError | NotFoundError>> {
  // 1. 입력 검증
  const validation = sendMessageSchema.safeParse({
    tenantId: input.tenantId,
    channel: input.channel,
    to: input.to,
    templateName: input.templateName,
    locale: input.locale,
  });
  if (!validation.success) {
    return Err(new ValidationError('Invalid input', { details: { issues: validation.error.errors } }));
  }

  // 2. Template 조회
  const template = await deps.templateRepository.findByName(
    input.templateName,
    input.channel,
    input.locale,
  );
  if (!template) {
    return Err(new NotFoundError('Template not found', {
      details: { templateName: input.templateName, channel: input.channel, locale: input.locale },
    }));
  }

  // 3. Template 렌더링
  const body = deps.templateRenderer.render(template.bodyTemplate, input.variables);
  const subject = template.subjectTemplate
    ? deps.templateRenderer.render(template.subjectTemplate, input.variables)
    : null;
  const html = template.htmlTemplate
    ? deps.templateRenderer.render(template.htmlTemplate, input.variables)
    : null;

  // 4. User Preference 확인
  if (input.accountId) {
    const pref = await deps.preferenceRepository.findByAccount(input.accountId);
    if (pref) {
      // 채널 확인
      const channelEnabled = pref.channelPreferences[input.channel];
      if (channelEnabled === false) {
        // 채널 비활성화 → 발송 안 함 (조용히 무시)
        return Ok({ messageId: 'suppressed', status: 'failed', providerMessageId: null });
      }

      // 조용한 시간 확인 (critical 제외)
      if (input.priority !== 'critical' && pref.quietHoursStart && pref.quietHoursEnd) {
        const now = deps.clock.now();
        const hour = now.getHours();
        const start = parseInt(pref.quietHoursStart.split(':')[0]!, 10);
        const end = parseInt(pref.quietHoursEnd.split(':')[0]!, 10);
        const inQuietHours = start < end
          ? (hour >= start && hour < end)
          : (hour >= start || hour < end);
        if (inQuietHours) {
          return Ok({ messageId: 'quiet_hours', status: 'queued', providerMessageId: null });
        }
      }
    }
  }

  // 5. Message Queue에 저장
  const messageId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const priority = input.priority ?? 'normal';
  const scheduledAt = input.scheduledAt ?? now;

  const messageRecord: IMessageRecord = {
    id: messageId,
    tenantId: input.tenantId,
    accountId: input.accountId,
    channel: input.channel,
    providerName: null,
    templateName: input.templateName,
    to: input.to,
    subject,
    body,
    html,
    variables: input.variables,
    locale: input.locale,
    priority,
    status: 'queued',
    scheduledAt,
    sentAt: null,
    attempts: 0,
    maxAttempts: 3,
    nextRetryAt: null,
    providerMessageId: null,
    errorMessage: null,
    correlationId: input.correlationId,
    createdAt: now,
    updatedAt: now,
  };

  await deps.messageRepository.insert(messageRecord);

  // 6. 즉시 발송 (scheduledAt이 now 이전이면)
  if (new Date(scheduledAt) <= deps.clock.now()) {
    return deliverMessage(messageId, deps);
  }

  // 7. Event 발행
  await emitMessageEvent(deps, messageId, input.tenantId, input.correlationId, 'communication.message.queued', now);

  return Ok({ messageId, status: 'queued', providerMessageId: null });
}

// ═══════════════════════════════════════════
// Message 발송 (Provider 호출)
// ═══════════════════════════════════════════

export async function deliverMessage(
  messageId: string,
  deps: SendMessageDeps,
): Promise<Result<SendMessageOutput, NotFoundError>> {
  const record = await deps.messageRepository.findById(messageId);
  if (!record) {
    return Err(new NotFoundError('Message not found', { details: { messageId } }));
  }

  // Provider 조회
  const provider = deps.providerManager.getDefault(record.channel);
  if (!provider) {
    await deps.messageRepository.update(messageId, {
      status: 'failed',
      errorMessage: `No provider for channel: ${record.channel}`,
      updatedAt: deps.clock.now().toISOString(),
    });
    return Ok({ messageId, status: 'failed', providerMessageId: null });
  }

  // 상태 → sending
  await deps.messageRepository.update(messageId, {
    status: 'sending',
    providerName: provider.name,
    attempts: record.attempts + 1,
    updatedAt: deps.clock.now().toISOString(),
  });

  // 발송
  const result = await provider.send({
    to: record.to,
    ...(record.subject !== null ? { subject: record.subject } : {}),
    body: record.body,
    ...(record.html !== null ? { html: record.html } : {}),
  });

  const now = deps.clock.now().toISOString();

  if (result.ok) {
    // 성공
    await deps.messageRepository.update(messageId, {
      status: 'sent',
      sentAt: now,
      providerMessageId: result.providerMessageId,
      errorMessage: null,
      updatedAt: now,
    });

    // Analytics
    await recordAnalytics(deps, messageId, record.tenantId, record.channel, 'delivered', record.attempts + 1);

    // Event
    await emitMessageEvent(deps, messageId, record.tenantId, record.correlationId, 'communication.message.sent', now);

    return Ok({ messageId, status: 'sent', providerMessageId: result.providerMessageId });
  } else {
    // 실패
    const attempts = record.attempts + 1;
    const shouldRetry = result.retryable && attempts < record.maxAttempts;

    if (shouldRetry) {
      // 재시도 예약 (exponential backoff)
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 60000);
      const nextRetry = new Date(deps.clock.now().getTime() + backoffMs).toISOString();

      await deps.messageRepository.update(messageId, {
        status: 'queued',
        attempts,
        nextRetryAt: nextRetry,
        errorMessage: result.error,
        updatedAt: now,
      });

      await emitMessageEvent(deps, messageId, record.tenantId, record.correlationId, 'communication.message.retry_scheduled', now);

      return Ok({ messageId, status: 'queued', providerMessageId: null });
    } else {
      // Dead Letter
      await deps.messageRepository.update(messageId, {
        status: 'dead_letter',
        attempts,
        errorMessage: result.error,
        updatedAt: now,
      });

      await recordAnalytics(deps, messageId, record.tenantId, record.channel, 'failed', attempts);

      await emitMessageEvent(deps, messageId, record.tenantId, record.correlationId, 'communication.message.dead_letter', now);

      return Ok({ messageId, status: 'dead_letter', providerMessageId: null });
    }
  }
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

async function emitMessageEvent(
  deps: SendMessageDeps,
  messageId: string,
  tenantId: string,
  correlationId: string,
  eventType: string,
  occurredAt: string,
): Promise<void> {
  const envelope: EventEnvelope<{ messageId: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: messageId,
    occurredAt,
    tenantId,
    correlationId,
    causationId: '',
    engine: 'communication',
    eventType,
    schemaRef: `${eventType}.v1`,
    payload: { messageId },
  });
  await deps.eventBus.emit(envelope);
}

async function recordAnalytics(
  deps: SendMessageDeps,
  messageId: string,
  tenantId: string,
  channel: ChannelType,
  status: DeliveryStatus,
  retryCount: number,
): Promise<void> {
  const event: IAnalyticsEvent = {
    id: deps.idGenerator.generate(),
    messageId,
    tenantId,
    channel,
    status,
    latency: null,
    retryCount,
    metadata: {},
    createdAt: deps.clock.now().toISOString(),
  };
  await deps.analyticsRepository.insert(event);
}
