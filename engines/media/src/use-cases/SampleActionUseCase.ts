/**
 * Media Engine — Sample UseCase Template
 *
 * 모든 UseCase는:
 * 1. Result<T,E> 반환 (Core SDK)
 * 2. PlatformError 계층 사용
 * 3. zod validation
 * 4. EventEnvelope 발행
 * 5. Audit 기록
 */

import { Ok, Err, type Result, ValidationError, type EventEnvelope, createEnvelope } from '@platform/core-sdk';
import type { IClock, IIdGenerator, IEventBus } from '../interfaces/index.js';

export interface SampleActionInput {
  tenantId: string;
  correlationId: string;
}

export interface SampleActionOutput {
  id: string;
  createdAt: string;
}

export interface SampleActionDeps {
  idGenerator: IIdGenerator;
  clock: IClock;
  eventBus: IEventBus;
}

export async function sampleActionUseCase(
  input: SampleActionInput,
  deps: SampleActionDeps,
): Promise<Result<SampleActionOutput, ValidationError>> {
  // 1. 검증
  if (!input.tenantId) {
    return Err(new ValidationError('tenantId required'));
  }

  // 2. 비즈니스 로직
  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  // 3. Event 발행
  const envelope: EventEnvelope<{ id: string }> = createEnvelope({
    eventId: deps.idGenerator.generate(),
    aggregateId: id,
    occurredAt: now,
    tenantId: input.tenantId,
    correlationId: input.correlationId,
    causationId: '',
    engine: 'media',
    eventType: 'media.action.completed',
    schemaRef: 'media.action.completed.v1',
    payload: { id },
  });
  await deps.eventBus.emit(envelope);

  // 4. Result 반환
  return Ok({ id, createdAt: now });
}
