/**
 * Universal Event Bus — Interfaces
 *
 * 사장님 확립 (2026-07-11): "Universal Event Bus를 먼저 완성하겠다."
 *
 * 모든 Engine이 이 Event Bus를 통해 통신 (헌법 §C-10, §C-16).
 * Engine 간 직접 import ❌, Event Bus 경유만 허용.
 */

import type { EventEnvelope } from '@platform/core-sdk';

/**
 * 이벤트 핸들러 함수 타입
 */
export type EventHandler<T = unknown> = (envelope: EventEnvelope<T>) => Promise<void>;

/**
 * 구독 해제 함수
 */
export type Unsubscribe = () => void;

/**
 * 핸들러 등록 옵션
 */
export interface SubscribeOptions {
  /** 이벤트 타입 필터 (예: 'identity.login.success') */
  eventType?: string;
  /** 와일드카드 (예: 'identity.*') */
  eventPattern?: string;
  /** Tenant 필터 */
  tenantId?: string;
  /** Engine 필터 */
  engine?: string;
  /** 에러 시 재시도 횟수 */
  maxRetries?: number;
  /** 순서 보장 (같은 aggregateId 내에서) */
  ordered?: boolean;
}

/**
 * Dead Letter Record
 */
export interface DeadLetterRecord {
  id: string;
  envelope: EventEnvelope<unknown>;
  error: string;
  attempts: number;
  createdAt: string;
}

/**
 * Event Bus 통계
 */
export interface EventBusStats {
  totalPublished: number;
  totalDelivered: number;
  totalFailed: number;
  activeSubscribers: number;
  deadLetters: number;
}

/**
 * IEventBus — Universal Event Bus Interface
 *
 * 사장님 헌법 §C-16: Event First Architecture
 */
export interface IEventBus {
  /**
   * 이벤트 발행
   */
  publish<T>(envelope: EventEnvelope<T>): Promise<void>;

  /**
   * 이벤트 구독 (핸들러 등록)
   * @returns unsubscribe 함수
   */
  subscribe<T>(
    handler: EventHandler<T>,
    options?: SubscribeOptions,
  ): Unsubscribe;

  /**
   * 특정 eventType 구독 (편의 메서드)
   */
  on<T>(
    eventType: string,
    handler: EventHandler<T>,
  ): Unsubscribe;

  /**
   * 통계 조회
   */
  getStats(): EventBusStats;

  /**
   * Dead Letter 목록
   */
  getDeadLetters(): DeadLetterRecord[];
}

// Re-export Core SDK types
export type { EventEnvelope } from '@platform/core-sdk';
