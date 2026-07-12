/**
 * Order Engine — Demo
 */
import {
  createOrderUseCase, addItemUseCase, submitOrderUseCase, approveOrderUseCase,
  confirmOrderUseCase, requestApprovalUseCase, approveUseCase,
  attachCatalogRefUseCase, attachPricingRefUseCase,
  getTimelineUseCase, completeOrderUseCase, closeOrderUseCase,
  InMemoryOrderRepository, InMemoryOrderItemRepository,
  InMemoryOrderTimelineRepository, InMemoryOrderApprovalRepository, InMemoryOrderAuditRepository,
  InMemoryOrganizationVerifier, StaticOrderPolicyProvider, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Order Engine — Demo ═══\n');
  const deps = {
    orderRepo: new InMemoryOrderRepository(),
    itemRepo: new InMemoryOrderItemRepository(),
    timelineRepo: new InMemoryOrderTimelineRepository(),
    approvalRepo: new InMemoryOrderApprovalRepository(),
    auditRepo: new InMemoryOrderAuditRepository(),
    eventBus: new InMemoryEventBus(),
    organizationVerifier: new InMemoryOrganizationVerifier(),
    policyProvider: new StaticOrderPolicyProvider(),
    idGenerator: { generate: () => `demo-${Math.random().toString(36).slice(2,8)}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };
  deps.organizationVerifier.add('demo', 'org-1');
  deps.policyProvider.set('demo', { allowedTypes: ['standard'] });
  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'err'));
    return r.value as T;
  };

  console.log('▶ 1) Create Order');
  const o = u(await createOrderUseCase(
    { tenantId: 'demo', correlationId: 'd1', actorId: 'admin', organizationId: 'org-1',
      type: 'standard', title: 'Equipment Order #100' }, deps));
  console.log(`  ✓ orderId=${o.orderId} number=${o.orderNumber}\n`);

  console.log('▶ 2) Add Items');
  u(await addItemUseCase(
    { tenantId: 'demo', correlationId: 'd2', actorId: 'admin', orderId: o.orderId,
      resourceType: 'catalog_item', resourceId: 'item-1', name: 'Projector', quantity: 2, unit: 'pcs' }, deps));
  u(await addItemUseCase(
    { tenantId: 'demo', correlationId: 'd3', actorId: 'admin', orderId: o.orderId,
      resourceType: 'service', resourceId: 'svc-1', name: 'Setup Service', quantity: 1, unit: 'hr' }, deps));
  console.log('  ✓ 2 items added\n');

  console.log('▶ 3) Attach References');
  u(await attachCatalogRefUseCase({ tenantId: 'demo', correlationId: 'd4', actorId: 'admin', orderId: o.orderId, catalogId: 'cat-1' }, deps));
  u(await attachPricingRefUseCase({ tenantId: 'demo', correlationId: 'd5', actorId: 'admin', orderId: o.orderId, pricingId: 'plan-1' }, deps));
  console.log('  ✓ catalog + pricing refs attached\n');

  console.log('▶ 4) Submit → Request Approval → Approve');
  u(await submitOrderUseCase({ tenantId: 'demo', correlationId: 'd6', actorId: 'admin', orderId: o.orderId }, deps));
  const appr = u(await requestApprovalUseCase({ tenantId: 'demo', correlationId: 'd7', actorId: 'admin', orderId: o.orderId, approverId: 'manager' }, deps));
  u(await approveUseCase({ tenantId: 'demo', correlationId: 'd8', actorId: 'manager', approvalId: appr.id }, deps));
  u(await approveOrderUseCase({ tenantId: 'demo', correlationId: 'd9', actorId: 'admin', orderId: o.orderId }, deps));
  console.log('  ✓ approved\n');

  console.log('▶ 5) Confirm → Complete → Close');
  u(await confirmOrderUseCase({ tenantId: 'demo', correlationId: 'd10', actorId: 'admin', orderId: o.orderId }, deps));
  console.log('  ✓ confirmed\n');

  console.log('▶ 6) Get Timeline');
  const tl = u(await getTimelineUseCase({ tenantId: 'demo', orderId: o.orderId }, deps));
  console.log(`  ${tl.length} entries:`);
  for (const e of tl) console.log(`    ${e.eventType}: ${e.description}`);

  console.log('\n═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of deps.eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [t, c] of [...counts.entries()].sort()) console.log(`  ${t}: ${c}`);
  console.log('\n═══ Demo Complete ═══');
}
main().catch((e) => { console.error(e); process.exit(1); });
