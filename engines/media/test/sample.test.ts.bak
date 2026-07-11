import { describe, it, expect } from 'vitest';
import { sampleActionUseCase } from '../src/index.js';

describe('TEMPLATE_TITLE Engine — Sample UseCase', () => {
  it('성공: Sample action', async () => {
    const result = await sampleActionUseCase(
      { tenantId: 't-1', correlationId: 'r-1' },
      {
        idGenerator: { generate: () => 'test-id' },
        clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
        eventBus: { events: [], async emit(e) { this.events.push(e); } },
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('test-id');
    }
  });

  it('실패: tenantId 없음', async () => {
    const result = await sampleActionUseCase(
      { tenantId: '', correlationId: 'r-1' },
      {
        idGenerator: { generate: () => 'test-id' },
        clock: { now: () => new Date() },
        eventBus: { events: [], async emit() {} },
      },
    );
    expect(result.ok).toBe(false);
  });
});
