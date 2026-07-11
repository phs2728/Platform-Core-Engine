/**
 * TEMPLATE_TITLE Engine — Public Interfaces
 *
 * Host가 구현을 주입. Engine은 직접 DB/Cache/Email 호출 ❌.
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// Core infra (모든 Engine 공통)
export interface IClock { now(): Date; }
export interface IIdGenerator { generate(): string; }
export interface IEventBus { emit<T>(envelope: EventEnvelope<T>): Promise<void>; }

// TODO: Engine-specific interfaces here
