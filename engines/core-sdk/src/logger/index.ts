/**
 * logger/ — Structured Logging
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "Logger는 처음부터 Structured Logging을 사용합니다.
 *  로그는 문자열이 아니라 객체를 기본으로 합니다."
 *
 * 헌법 §C-20: Minor 100% 하위 호환
 */

import type { EngineName } from '../types.js';

declare const process: { env: { [key: string]: string | undefined } };

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  /** Tenant ID (Multi-tenancy) */
  tenantId?: string;
  /** Request ID (HTTP request trace) */
  requestId?: string;
  /** User ID (인증된 사용자) */
  userId?: string;
  /** Engine 식별자 */
  engine: EngineName;
  /** 추가 컨텍스트 (PII 금지) */
  [key: string]: unknown;
}

export interface ILogger {
  trace(msg: string, context?: LogContext): void;
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, err?: Error, context?: LogContext): void;
  fatal(msg: string, err?: Error, context?: LogContext): void;

  /** 자식 Logger (Context 상속) */
  child(bindings: Partial<LogContext>): ILogger;
}

/**
 * PII 자동 마스킹
 * 헌법 §C-15
 */
const PII_FIELDS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'email', // 부분 마스킹
  'phone',
]);

export function maskPII(context: LogContext): LogContext {
  const masked: LogContext = { ...context };
  for (const key of Object.keys(masked)) {
    const lower = key.toLowerCase();
    if (PII_FIELDS.has(lower)) {
      if (lower === 'email' && typeof masked[key] === 'string') {
        masked[key] = maskEmail(masked[key] as string);
      } else if (lower === 'phone' && typeof masked[key] === 'string') {
        masked[key] = maskPhone(masked[key] as string);
      } else {
        masked[key] = '<redacted>';
      }
    }
  }
  return masked;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '<redacted>';
  return `${local[0]}***@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return '<redacted>';
  return `${phone.slice(0, 2)}****${phone.slice(-2)}`;
}

/**
 * Console Logger (기본 구현 — 호스트가 교체 가능)
 */
export class ConsoleLogger implements ILogger {
  constructor(private readonly baseContext: LogContext) {}

  trace(msg: string, context?: LogContext): void {
    this.log('trace', msg, undefined, context);
  }
  debug(msg: string, context?: LogContext): void {
    this.log('debug', msg, undefined, context);
  }
  info(msg: string, context?: LogContext): void {
    this.log('info', msg, undefined, context);
  }
  warn(msg: string, context?: LogContext): void {
    this.log('warn', msg, undefined, context);
  }
  error(msg: string, err?: Error, context?: LogContext): void {
    this.log('error', msg, err, context);
  }
  fatal(msg: string, err?: Error, context?: LogContext): void {
    this.log('fatal', msg, err, context);
  }

  child(bindings: Partial<LogContext>): ILogger {
    return new ConsoleLogger({ ...this.baseContext, ...bindings });
  }

  private log(level: LogLevel, msg: string, err?: Error, context?: LogContext): void {
    const merged = maskPII({ ...this.baseContext, ...context });
    const entry = {
      level,
      timestamp: new Date().toISOString(),
      msg,
      ...merged,
      ...(err ? { error: { name: err.name, message: err.message, stack: err.stack } } : {}),
    };
    // JSON Lines 포맷 (production)
    if (process.env['NODE_ENV'] === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      // Pretty (development)
      console.log(`[${entry.level}] ${entry.timestamp} ${entry.msg}`, merged, err ?? '');
    }
  }
}

/**
 * Logger 팩토리
 */
export function createLogger(base: LogContext): ILogger {
  return new ConsoleLogger(base);
}
