/**
 * PlatformError — 모든 Engine이 공유하는 단일 Base Class
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * 5개 속성 필수 (code/message/details/cause/safeToExpose)
 *
 * 헌법 §C-15: safeToExpose=false면 클라이언트에 stack trace 노출 안 함
 * 헌법 §C-20: Minor 100% 하위 호환
 */
export abstract class PlatformError extends Error {
  /** Error Code (e.g., 'PLATFORM_VALIDATION_FAILED') */
  abstract readonly code: string;

  /** HTTP Status Code (호스트가 응답 변환 시 사용) */
  abstract readonly httpStatus: number;

  /** 클라이언트에 노출 가능 여부 (false면 generic 500) */
  abstract readonly safeToExpose: boolean;

  /** 디버깅용 추가 정보 (PII 금지) */
  readonly details?: Record<string, unknown>;

  /** 원인 Error (연쇄) */
  override readonly cause?: Error;

  constructor(
    message: string,
    options: PlatformErrorOptions = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.details = options.details;
    this.cause = options.cause;
    // Error.cause 지원 (ES2022)
    if (options.cause && 'cause' in this === false) {
      Object.defineProperty(this, 'cause', { value: options.cause, enumerable: false });
    }
  }

  /** 직렬화 (응답용) */
  toJSON(): ErrorResponse {
    return {
      code: this.code,
      message: this.safeToExpose ? this.message : 'An internal error occurred',
      ...(this.safeToExpose && this.details ? { details: this.details } : {}),
    };
  }
}

export interface PlatformErrorOptions {
  details?: Record<string, unknown>;
  cause?: Error;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
