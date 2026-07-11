/**
 * In-Memory Email & SMS Senders (테스트 + 개발용)
 *
 * 사장님 확립 (Sprint 2C-3):
 * - Verification / Password UseCase가 토큰/OTP를 발송
 * - 테스트 환경에서는 outbox를 통해 발송 내역 검증
 */

import type { EmailMessage, SmsMessage, IEmailSender, ISmsSender } from '../interfaces/index.js';

export class InMemoryEmailSender implements IEmailSender {
  readonly outbox: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.outbox.push(message);
  }

  /** 테스트 helper: 마지막 메시지 */
  lastMessage(): EmailMessage | null {
    return this.outbox[this.outbox.length - 1] ?? null;
  }

  /** 테스트 helper: 특정 수신자에게 보낸 메시지 */
  messagesTo(to: string): EmailMessage[] {
    return this.outbox.filter((m) => m.to === to);
  }

  /** 테스트 helper: 초기화 */
  reset(): void {
    this.outbox.length = 0;
  }
}

export class InMemorySmsSender implements ISmsSender {
  readonly outbox: SmsMessage[] = [];

  async send(message: SmsMessage): Promise<void> {
    this.outbox.push(message);
  }

  /** 테스트 helper: 마지막 메시지 */
  lastMessage(): SmsMessage | null {
    return this.outbox[this.outbox.length - 1] ?? null;
  }

  /** 테스트 helper: 특정 수신자에게 보낸 메시지 */
  messagesTo(to: string): SmsMessage[] {
    return this.outbox.filter((m) => m.to === to);
  }

  /** 테스트 helper: 초기화 */
  reset(): void {
    this.outbox.length = 0;
  }
}

/**
 * In-Memory Random (IRandom 구현 — 테스트용)
 * - bytes(n): hex 문자열 (2n 길이)
 * - digits(n): n자리 숫자 문자열
 */
export class InMemoryRandom {
  private counter = 0;

  bytes(n: number): string {
    // 결정적 테스트를 위해 counter 기반 생성 (운영에서는 crypto.randomBytes 사용)
    this.counter += 1;
    const base = `${this.counter}`.padStart(n * 2, '0');
    return base.slice(0, n * 2).split('').map((c) => {
      const code = c.charCodeAt(0);
      // 0-9 → a-j, 그 외 그대로 (hex처럼 보이게)
      return code >= 48 && code <= 57
        ? String.fromCharCode(97 + (code - 48))
        : c;
    }).join('');
  }

  digits(n: number): string {
    this.counter += 1;
    const base = `${this.counter}`.padStart(n, '0');
    return base.slice(-n);
  }

  /** 테스트 helper: 초기화 */
  reset(): void {
    this.counter = 0;
  }
}
