/**
 * Universal Event Bus — Demo
 */
import { InMemoryEventBus, createEnvelope, type EventEnvelope } from '../src/index.js';

async function main() {
  console.log('═══ Universal Event Bus — Demo ═══\n');

  const bus = new InMemoryEventBus();

  console.log('▶ 1) Subscribe to events');
  const received: EventEnvelope[] = [];
  bus.subscribe('user.created', async (env: EventEnvelope) => {
    received.push(env);
  });
  console.log('  ✓ subscribed to user.created\n');

  console.log('▶ 2) Publish Event');
  const env = createEnvelope({
    eventId: 'evt-1',
    aggregateId: 'user-1',
    occurredAt: new Date().toISOString(),
    tenantId: 'demo',
    correlationId: 'corr-1',
    causationId: '',
    engine: 'identity',
    eventType: 'user.created',
    schemaRef: 'user.created.v1',
    payload: { userId: 'user-1', email: 'tim@example.com' },
  });
  await bus.publish(env);
  console.log('  ✓ event published\n');

  console.log(`▶ 3) Verify (${received.length} received)`);
  console.log(`  ✓ handler got: ${received[0]?.eventType}\n`);

  console.log('▶ 4) Stats');
  const stats = bus.getStats();
  console.log(`  ✓ published: ${stats.totalPublished}, handlers: ${stats.totalHandlers}\n`);

  console.log('═══ Demo Complete ═══');
}
main().catch(console.error);
