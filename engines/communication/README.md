# Communication Engine

> **Platform Core — Universal Communication Layer**
>
> Email · SMS · Push · Webhook · In-App · WhatsApp · Telegram · Slack · Discord · Teams · Voice
>
> **모든 Engine의 통신은 Communication Engine을 통해서만.**

**Version**: 0.1.0 (Draft)
**Phase**: 2

---

## 목적

사장님 확립 (2026-07-11):
> "No Engine may send Email, SMS, Push or Webhook directly.
> Every communication MUST go through Communication Engine."

---

## 기능

| 기능 | 설명 |
|---|---|
| **Channel Management** | 12개 채널 (Email, SMS, Push, Webhook, In-App, WhatsApp, Telegram, Slack, Discord, Teams, Voice, Browser) |
| **Provider Management** | Plugin Pattern (SMTP, SES, Twilio, Firebase, HTTP 등) |
| **Template System** | HTML/Text/Markdown, {{variables}}, Conditional, Localization |
| **Localization** | ko, en, ka, ru, tr, zh, de |
| **Queue** | Priority (Critical/High/Normal/Low) |
| **Retry** | Exponential Backoff |
| **Dead Letter Queue** | 실패한 메시지 추적 |
| **Scheduling** | Immediate, Delayed, Scheduled, Recurring |
| **Preference** | Channel/Category/Quiet Hours/Frequency |
| **Analytics** | Delivered, Opened, Clicked, Failed, Bounce, Spam, Latency |
| **Plugin Architecture** | 모든 Channel, Provider, Renderer, Analytics가 Plugin |
| **Event Bus 통합** | Identity/Booking/Payment 이벤트 자동 구독 |

---

## Event Bus 통합

Communication Engine은 다음 이벤트를 **자동 구독**:

```
identity.account.created → welcome email
identity.email.verified → confirmation
identity.password.reset → security notice
identity.login.success → login notification
identity.login.failed → security alert
booking.created → booking confirmation
booking.cancelled → cancellation notice
payment.completed → receipt
payment.failed → payment alert
review.requested → review email
system.announcement → announcement
```

---

## 빠른 시작

```typescript
import {
  sendMessageUseCase,
  createTemplateUseCase,
  InMemoryChannelProvider,
  InMemoryMessageRepository,
  // ...
} from '@platform/engine-communication';

// Provider 등록
const emailProvider = new InMemoryChannelProvider('email', 'in-memory');

// Template 생성
await createTemplateUseCase(
  { name: 'welcome', channel: 'email', locale: 'en', bodyTemplate: 'Hello {{name}}!' },
  deps,
);

// 메시지 발송
const result = await sendMessageUseCase(
  { tenantId: 't-1', accountId: 'user-1', channel: 'email', to: 'user@example.com', templateName: 'welcome', variables: { name: 'Tim' }, locale: 'en', correlationId: 'r-1' },
  deps,
);
```

---

## Plugin Architecture

### Channel Provider Plugin

```typescript
import type { IChannelProvider } from '@platform/engine-communication';

class MyCustomProvider implements IChannelProvider {
  readonly channel = 'email';
  readonly name = 'my-custom';

  async send(message) {
    // 발송 로직
    return { ok: true, providerMessageId: 'xxx' };
  }
}
```

**새 Provider 추가 시 기존 코드 무수정** (헌법 §C-9).

---

## Tests

```bash
pnpm test
```
