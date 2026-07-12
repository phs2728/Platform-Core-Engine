/**
 * Review Engine — Demo: Full Lifecycle
 *
 * 사장님 spec: Create → Publish → Reply → Helpful → Report → Resolve → Reputation
 */

import {
  createReviewUseCase, publishReviewUseCase, updateReviewUseCase,
  archiveReviewUseCase, restoreReviewUseCase,
  createReplyUseCase, markHelpfulUseCase, addReactionUseCase,
  reportReviewUseCase, resolveReportUseCase,
  changeRatingUseCase, calculateReputationUseCase, rebuildReputationUseCase,
  getAnalyticsUseCase,
  InMemoryReviewRepository, InMemoryReplyRepository, InMemoryReportRepository,
  InMemoryReactionRepository, InMemoryHelpfulVoteRepository, InMemoryReputationRepository,
  InMemoryReviewAuditRepository,
  InMemoryOrganizationVerifier, InMemoryUserVerifier,
  InMemoryMediaVerifier, InMemoryTransactionVerifier,
  StaticReviewPolicyProvider, MockModerationHook, InMemoryEventBus,
} from '../src/index.js';

async function main() {
  console.log('═══ Review Engine — Demo ═══\n');

  const reviewRepo = new InMemoryReviewRepository();
  const replyRepo = new InMemoryReplyRepository();
  const reportRepo = new InMemoryReportRepository();
  const reactionRepo = new InMemoryReactionRepository();
  const helpfulRepo = new InMemoryHelpfulVoteRepository();
  const reputationRepo = new InMemoryReputationRepository();
  const auditRepo = new InMemoryReviewAuditRepository();
  const eventBus = new InMemoryEventBus();
  const orgVerifier = new InMemoryOrganizationVerifier();
  const userVerifier = new InMemoryUserVerifier();
  const mediaVerifier = new InMemoryMediaVerifier();
  const txnVerifier = new InMemoryTransactionVerifier();
  const policyProvider = new StaticReviewPolicyProvider();
  const moderationHook = new MockModerationHook();

  policyProvider.set('demo', { allowedTypes: ['item', 'service', 'stay'], maxRating: 5 });
  orgVerifier.add('demo', 'org-demo');
  userVerifier.add('demo', 'user-a');
  userVerifier.add('demo', 'user-b');
  userVerifier.add('demo', 'user-c');
  txnVerifier.add('demo', 'scheduling', 'txn-001');

  let idSeq = 0;
  const deps = {
    reviewRepo, replyRepo, reportRepo, reactionRepo,
    helpfulRepo, reputationRepo, auditRepo, eventBus,
    organizationVerifier: orgVerifier, userVerifier: userVerifier,
    mediaVerifier, transactionVerifier: txnVerifier,
    policyProvider, moderationHook,
    idGenerator: { generate: () => `demo-${++idSeq}` },
    clock: { now: () => new Date('2026-07-11T08:00:00.000Z') },
  };

  const u = <T>(r: { ok: boolean; value?: T; error?: unknown }): T => {
    if (!r.ok) throw new Error(String((r.error as { message?: string })?.message ?? 'error'));
    return r.value as T;
  };

  // 1) Create Review (verified — has transaction ref)
  console.log('▶ 1) Create Review');
  const created = u(await createReviewUseCase(
    { tenantId: 'demo', correlationId: 'd-1', actorId: 'user-a',
      organizationId: 'org-demo', reviewerId: 'user-a',
      targetRef: 'item-001', targetType: 'item',
      title: 'Excellent quality!', content: 'Really enjoyed this, exceeded expectations.',
      ratingScore: 5, language: 'en',
      transactionRefs: [{ refType: 'scheduling', refId: 'txn-001', verified: false }] }, deps));
  console.log(`  ✓ reviewId = ${created.reviewId}\n`);

  // 2) Publish
  console.log('▶ 2) Publish Review');
  const published = u(await publishReviewUseCase(
    { tenantId: 'demo', correlationId: 'd-2', actorId: 'user-a', reviewId: created.reviewId }, deps));
  console.log(`  ✓ status = ${published.status}, verified = ${published.verified}\n`);

  // 3) Reply
  console.log('▶ 3) Create Reply (owner)');
  u(await createReplyUseCase(
    { tenantId: 'demo', correlationId: 'd-3', actorId: 'user-b',
      reviewId: created.reviewId, authorId: 'user-b', authorRole: 'owner',
      content: 'Thank you for your feedback!' }, deps));
  console.log(`  ✓ reply created\n`);

  // 4) Mark Helpful
  console.log('▶ 4) Mark Helpful');
  u(await markHelpfulUseCase(
    { tenantId: 'demo', correlationId: 'd-4', actorId: 'user-c',
      reviewId: created.reviewId, voterId: 'user-c', helpful: true }, deps));
  console.log(`  ✓ helpful vote added\n`);

  // 5) Add Reaction
  console.log('▶ 5) Add Reaction');
  u(await addReactionUseCase(
    { tenantId: 'demo', correlationId: 'd-5', actorId: 'user-c',
      reviewId: created.reviewId, userId: 'user-c', type: 'like' }, deps));
  console.log(`  ✓ reaction added\n`);

  // 6) Create second review for reputation
  console.log('▶ 6) Create second review');
  const created2 = u(await createReviewUseCase(
    { tenantId: 'demo', correlationId: 'd-6', actorId: 'user-b',
      organizationId: 'org-demo', reviewerId: 'user-b',
      targetRef: 'item-001', targetType: 'item',
      title: 'Good value', content: 'Solid item for the price.',
      ratingScore: 4, language: 'en' }, deps));
  u(await publishReviewUseCase(
    { tenantId: 'demo', correlationId: 'd-7', actorId: 'user-b', reviewId: created2.reviewId }, deps));
  console.log(`  ✓ second review published\n`);

  // 7) Calculate Reputation
  console.log('▶ 7) Calculate Reputation');
  const rep = u(await calculateReputationUseCase(
    { tenantId: 'demo', targetRef: 'item-001', targetType: 'item' }, deps));
  console.log(`  ✓ averageRating = ${rep.averageRating.toFixed(2)}, trustScore = ${rep.trustScore}\n`);

  // 8) Rebuild Reputation (persist)
  console.log('▶ 8) Rebuild Reputation');
  u(await rebuildReputationUseCase(
    { tenantId: 'demo', correlationId: 'd-8', actorId: 'admin',
      targetRef: 'item-001', targetType: 'item' }, deps));
  console.log(`  ✓ reputation persisted\n`);

  // 9) Get Analytics
  console.log('▶ 9) Get Analytics');
  const analytics = u(await getAnalyticsUseCase(
    { tenantId: 'demo', organizationId: 'org-demo' }, deps));
  console.log(`  ✓ totalReviews = ${analytics.totalReviews}, avg = ${analytics.averageRating.toFixed(2)}\n`);

  // 10) Report + Resolve
  console.log('▶ 10) Report → Resolve');
  const report = u(await reportReviewUseCase(
    { tenantId: 'demo', correlationId: 'd-9', actorId: 'user-c',
      reviewId: created2.reviewId, reporterId: 'user-c',
      reason: 'other', description: 'Not sure about this review' }, deps));
  console.log(`  ✓ reported`);
  u(await resolveReportUseCase(
    { tenantId: 'demo', correlationId: 'd-10', actorId: 'admin',
      reportId: report.id, resolution: 'dismissed' }, deps));
  console.log(`  ✓ resolved (dismissed)\n`);

  // Summary
  console.log('═══ Events Emitted ═══');
  const counts = new Map<string, number>();
  for (const r of eventBus.emitted) counts.set(r.envelope.eventType, (counts.get(r.envelope.eventType) ?? 0) + 1);
  for (const [type, count] of [...counts.entries()].sort()) console.log(`  ${type}: ${count}`);

  console.log('\n═══ Demo Complete ═══');
}

main().catch((e) => { console.error('Demo failed:', e); process.exit(1); });
