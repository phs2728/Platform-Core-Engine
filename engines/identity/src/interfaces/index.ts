/**
 * Identity Engine — Public Interface
 *
 * 모든 Host application은 이 인터페이스들을 구현하여 주입.
 * 사장님 확립 (Sprint 2C-1) — Email 기반 Identity MVP 범위.
 */

export type {
  IClock,
  IIdGenerator,
  IPasswordHasher,
  ISessionSigner,
  SessionPayload,
  AccountRecord,
  IAccountRepository,
  SessionRecord,
  ISessionRepository,
  IEventBus,
} from './IClock.js';

export type { Result, EventEnvelope, NotFoundError } from '@platform/core-sdk';
