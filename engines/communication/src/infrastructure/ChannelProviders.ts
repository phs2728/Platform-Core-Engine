/**
 * In-Memory Channel Provider — 모든 Channel 테스트용
 *
 * 실제 발송 대신 outbox에 저장. 테스트/개발 환경용.
 */

import type { IChannelProvider, ChannelType, OutboundMessage, ProviderResult } from '../interfaces/index.js';

export class InMemoryChannelProvider implements IChannelProvider {
  readonly outbox: OutboundMessage[] = [];
  readonly shouldFail: boolean;
  readonly failMessage: string;

  constructor(
    readonly channel: ChannelType,
    readonly name: string = 'in-memory',
    options: { shouldFail?: boolean; failMessage?: string } = {},
  ) {
    this.shouldFail = options.shouldFail ?? false;
    this.failMessage = options.failMessage ?? 'Simulated failure';
  }

  async send(message: OutboundMessage): Promise<ProviderResult> {
    if (this.shouldFail) {
      return { ok: false, error: this.failMessage, retryable: true };
    }
    this.outbox.push(message);
    return { ok: true as const, providerMessageId: `msg-${this.outbox.length}` };
  }

  lastMessage(): OutboundMessage | null {
    return this.outbox[this.outbox.length - 1] ?? null;
  }

  clear(): void {
    this.outbox.length = 0;
  }
}

/**
 * SMTP Provider (Email) — 실제 SMTP 발송 (Phase 후속 구현)
 */
export class SmtpEmailProvider implements IChannelProvider {
  readonly channel = 'email' as const;

  constructor(
    readonly name: string = 'smtp',
    readonly config: { host: string; port: number; username: string; password: string },
  ) {}

  async send(message: OutboundMessage): Promise<ProviderResult> {
    // TODO: Phase 후속에서 nodemailer 등으로 실제 SMTP 발송
    return { ok: true as const, providerMessageId: `smtp-${Date.now()}` };
  }
}

/**
 * Twilio SMS Provider — 실제 Twilio API 호출 (Phase 후속 구현)
 */
export class TwilioSmsProvider implements IChannelProvider {
  readonly channel = 'sms' as const;

  constructor(
    readonly name: string = 'twilio',
    readonly config: { accountSid: string; authToken: string; fromNumber: string },
  ) {}

  async send(message: OutboundMessage): Promise<ProviderResult> {
    // TODO: Phase 후속에서 twilio SDK로 실제 SMS 발송
    return { ok: true as const, providerMessageId: `twilio-${Date.now()}` };
  }
}

/**
 * Firebase Push Provider — 실제 FCM API 호출 (Phase 후속 구현)
 */
export class FirebasePushProvider implements IChannelProvider {
  readonly channel = 'push' as const;

  constructor(
    readonly name: string = 'firebase',
    readonly config: { serviceAccountKey: string },
  ) {}

  async send(message: OutboundMessage): Promise<ProviderResult> {
    // TODO: Phase 후속에서 firebase-admin으로 실제 Push 발송
    return { ok: true as const, providerMessageId: `fcm-${Date.now()}` };
  }
}

/**
 * Webhook Provider — HTTP POST 발송
 */
export class WebhookProvider implements IChannelProvider {
  readonly channel = 'webhook' as const;

  constructor(
    readonly name: string = 'http',
    readonly config: { defaultUrl: string; secret: string },
  ) {}

  async send(message: OutboundMessage): Promise<ProviderResult> {
    try {
      const response = await fetch(this.config.defaultUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}`, retryable: response.status >= 500 };
      }
      return { ok: true as const, providerMessageId: `webhook-${Date.now()}` };
    } catch (e) {
      return { ok: false, error: String(e), retryable: true };
    }
  }
}

/**
 * Telegram Bot Provider
 */
export class TelegramProvider implements IChannelProvider {
  readonly channel = 'telegram' as const;

  constructor(
    readonly name: string = 'telegram',
    readonly config: { botToken: string },
  ) {}

  async send(message: OutboundMessage): Promise<ProviderResult> {
    try {
      const chatId = message.to;
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message.body }),
      });
      if (!response.ok) {
        return { ok: false, error: `Telegram API ${response.status}`, retryable: false };
      }
      return { ok: true as const, providerMessageId: `tg-${Date.now()}` };
    } catch (e) {
      return { ok: false, error: String(e), retryable: true };
    }
  }
}

/**
 * Slack Webhook Provider
 */
export class SlackProvider implements IChannelProvider {
  readonly channel = 'slack' as const;

  constructor(
    readonly name: string = 'slack',
    readonly config: { webhookUrl: string },
  ) {}

  async send(message: OutboundMessage): Promise<ProviderResult> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.body }),
      });
      if (!response.ok) {
        return { ok: false, error: `Slack ${response.status}`, retryable: false };
      }
      return { ok: true as const, providerMessageId: `slack-${Date.now()}` };
    } catch (e) {
      return { ok: false, error: String(e), retryable: true };
    }
  }
}

/**
 * Discord Webhook Provider
 */
export class DiscordProvider implements IChannelProvider {
  readonly channel = 'discord' as const;

  constructor(
    readonly name: string = 'discord',
    readonly config: { webhookUrl: string },
  ) {}

  async send(message: OutboundMessage): Promise<ProviderResult> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.body }),
      });
      if (!response.ok) {
        return { ok: false, error: `Discord ${response.status}`, retryable: false };
      }
      return { ok: true as const, providerMessageId: `discord-${Date.now()}` };
    } catch (e) {
      return { ok: false, error: String(e), retryable: true };
    }
  }
}
