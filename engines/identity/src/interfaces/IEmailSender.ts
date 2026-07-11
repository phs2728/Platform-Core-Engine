/**
 * Host가 구현 주입.
 *
 * Sprint 2C-2: 토큰이 발송되지 않으면 사용자가 Verification/Reset 못 함.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface IEmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class InMemoryEmailSender implements IEmailSender {
  readonly outbox: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.outbox.push(message);
  }

  /** 테스트 helper */
  lastMessage(): EmailMessage | null {
    return this.outbox[this.outbox.length - 1] ?? null;
  }
}
