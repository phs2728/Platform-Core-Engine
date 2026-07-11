/**
 * Event Bus Integration — Communication Engine이 구독하는 이벤트
 *
 * 사장님 확립:
 * "Communication Engine MUST subscribe to:
 *  identity.account.created, identity.email.verified,
 *  identity.password.reset, identity.login.success, identity.login.failed,
 *  booking.created, booking.cancelled,
 *  payment.completed, payment.failed,
 *  review.requested, system.announcement"
 */

import type { EventEnvelope } from '@platform/core-sdk';
import type { SendMessageDeps } from './SendMessageUseCase.js';
import { sendMessageUseCase } from './SendMessageUseCase.js';

export type Unsubscribe = () => void;

export interface EventBusIntegrationDeps extends SendMessageDeps {
  // Event Bus의 subscribe/on 메서드 사용
}

interface EventSubscription {
  eventType: string;
  templateName: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  priority: 'critical' | 'high' | 'normal' | 'low';
  category: string;
}

// 사장님 확립 구독 목록
const SUBSCRIPTIONS: EventSubscription[] = [
  { eventType: 'identity.account.created', templateName: 'welcome', channel: 'email', priority: 'high', category: 'system' },
  { eventType: 'identity.email.verified', templateName: 'email_verified_confirmation', channel: 'email', priority: 'normal', category: 'system' },
  { eventType: 'identity.password.reset', templateName: 'password_changed_notice', channel: 'email', priority: 'critical', category: 'security' },
  { eventType: 'identity.login.success', templateName: 'login_notification', channel: 'email', priority: 'low', category: 'security' },
  { eventType: 'identity.login.failed', templateName: 'login_failed_alert', channel: 'email', priority: 'high', category: 'security' },
  { eventType: 'booking.created', templateName: 'booking_confirmation', channel: 'email', priority: 'high', category: 'booking' },
  { eventType: 'booking.cancelled', templateName: 'booking_cancellation', channel: 'email', priority: 'high', category: 'booking' },
  { eventType: 'payment.completed', templateName: 'payment_receipt', channel: 'email', priority: 'high', category: 'payment' },
  { eventType: 'payment.failed', templateName: 'payment_failed_notice', channel: 'email', priority: 'critical', category: 'payment' },
  { eventType: 'review.requested', templateName: 'review_request', channel: 'email', priority: 'normal', category: 'review' },
  { eventType: 'system.announcement', templateName: 'system_announcement', channel: 'email', priority: 'normal', category: 'system' },
];

/**
 * Event Bus 구독 시작
 *
 * 각 Event에 대해:
 * 1. Template 조회
 * 2. sendMessageUseCase 호출
 * 3. User locale/preference 적용
 */
export function subscribeToEvents(
  eventBus: {
    on: <T>(eventType: string, handler: (e: EventEnvelope<T>) => Promise<void>) => Unsubscribe;
  },
  deps: EventBusIntegrationDeps,
): Unsubscribe[] {
  const unsubs: Unsubscribe[] = [];

  for (const sub of SUBSCRIPTIONS) {
    const unsub = eventBus.on(sub.eventType, async (envelope: EventEnvelope<unknown>) => {
      const payload = envelope.payload as Record<string, unknown>;

      // accountId 또는 email 추출
      const accountId = (payload['accountId'] ?? payload['userId'] ?? null) as string | null;
      const email = (payload['email'] ?? payload['to'] ?? '') as string;

      if (!email && !accountId) return;

      // sendMessage 호출
      await sendMessageUseCase(
        {
          tenantId: envelope.tenantId,
          accountId,
          channel: sub.channel,
          to: email || 'unknown@example.com',
          templateName: sub.templateName,
          variables: payload,
          locale: 'en', // 기본값 — Phase 후속에서 User locale 조회
          priority: sub.priority,
          category: sub.category,
          correlationId: envelope.correlationId,
        },
        deps,
      );
    });

    unsubs.push(unsub);
  }

  return unsubs;
}

/**
 * 구독 해제
 */
export function unsubscribeAll(unsubs: Unsubscribe[]): void {
  for (const unsub of unsubs) {
    unsub();
  }
}
