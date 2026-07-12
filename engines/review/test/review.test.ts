/**
 * Review Engine — Tests
 *
 * 사장님 확립: 최소 60+ PASS
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createReviewUseCase, updateReviewUseCase,
  publishReviewUseCase, archiveReviewUseCase, restoreReviewUseCase,
  deleteReviewUseCase, getReviewUseCase, searchReviewsUseCase, listReviewsUseCase,
  changeRatingUseCase, removeRatingUseCase,
  createReplyUseCase, deleteReplyUseCase, listRepliesUseCase,
  markHelpfulUseCase, removeHelpfulUseCase, addReactionUseCase,
  moderateReviewUseCase, approveReviewUseCase, rejectReviewUseCase, hideReviewUseCase,
  reportReviewUseCase, resolveReportUseCase,
  calculateReputationUseCase, getReputationUseCase, rebuildReputationUseCase,
  getAnalyticsUseCase,
} from '../src/index.js';
import { makeDeps, makeCreateInput } from './helpers.js';
import type { ReviewUseCaseDeps } from '../src/use-cases/types.js';

type Deps = ReturnType<typeof makeDeps>;

async function createAndPublish(deps: Deps, overrides?: Parameters<typeof makeCreateInput>[0]) {
  const created = await createReviewUseCase(makeCreateInput(overrides), deps);
  if (!created.ok) throw new Error(`createReview failed: ${JSON.stringify(created.error)}`);
  const pub = await publishReviewUseCase(
    { tenantId: 't-1', correlationId: 'c-pub', actorId: 'user-1', reviewId: created.value.reviewId },
    deps,
  );
  if (!pub.ok) throw new Error(`publishReview failed: ${JSON.stringify(pub.error)}`);
  return pub.value;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Review Core — Create (8 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Review Core — Create', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a review with status Pending', async () => {
    const r = await createReviewUseCase(makeCreateInput(), deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.reviewId).toBeDefined();
    const review = await deps.reviewRepo.findById('t-1', r.value.reviewId);
    expect(review).not.toBeNull();
    expect(review!.status).toBe('Pending');
    expect(review!.rating.score).toBe(5);
  });

  it('rejects unknown organization', async () => {
    const r = await createReviewUseCase(
      { ...makeCreateInput(), organizationId: 'unknown-org' }, deps,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects unknown reviewer', async () => {
    const r = await createReviewUseCase(
      { ...makeCreateInput(), reviewerId: 'unknown-user' }, deps,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate review (same reviewer + target)', async () => {
    await createReviewUseCase(makeCreateInput(), deps);
    const r2 = await createReviewUseCase(makeCreateInput(), deps);
    expect(r2.ok).toBe(false);
  });

  it('sets verified=true when transaction reference is valid', async () => {
    const r = await createReviewUseCase({
      ...makeCreateInput(),
      transactionRefs: [{ refType: 'scheduling', refId: 'txn-1', verified: false }],
    }, deps);
    expect(r.ok).toBe(true);
    const review = await deps.reviewRepo.findById('t-1', r.value!.reviewId);
    expect(review!.verified).toBe(true);
    expect(review!.rating.weight).toBe(2);
  });

  it('sets verified=false when transaction reference is unverified', async () => {
    const r = await createReviewUseCase({
      ...makeCreateInput(),
      transactionRefs: [{ refType: 'scheduling', refId: 'unknown-txn', verified: false }],
    }, deps);
    expect(r.ok).toBe(true);
    const review = await deps.reviewRepo.findById('t-1', r.value!.reviewId);
    expect(review!.verified).toBe(false);
    expect(review!.rating.weight).toBe(1);
  });

  it('rejects unallowed targetType', async () => {
    const r = await createReviewUseCase(
      { ...makeCreateInput(), targetType: 'forbidden_type' }, deps,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects rating exceeding maxRating', async () => {
    const r = await createReviewUseCase(
      { ...makeCreateInput(), ratingScore: 10 }, deps,
    );
    expect(r.ok).toBe(false);
  });

  it('emits review.created event', async () => {
    await createReviewUseCase(makeCreateInput(), deps);
    expect(deps.eventBus.countByType('review.created')).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Review Core — Update/Publish/Archive/Restore/Delete (8 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Review Core — Lifecycle', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('publishes a pending review', async () => {
    const created = await createReviewUseCase(makeCreateInput(), deps);
    const r = await publishReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-2', actorId: 'user-1', reviewId: created.value!.reviewId }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Published');
    expect(r.value!.publishedAt).not.toBeNull();
    expect(deps.eventBus.countByType('review.published')).toBe(1);
  });

  it('updates title and content', async () => {
    const review = await createAndPublish(deps);
    const r = await updateReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-3', actorId: 'user-1', reviewId: review.id,
        title: 'Updated title', content: 'Updated content' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.title).toBe('Updated title');
  });

  it('archives and restores a review', async () => {
    const review = await createAndPublish(deps);
    const ar = await archiveReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-4', actorId: 'user-1', reviewId: review.id }, deps,
    );
    expect(ar.ok).toBe(true);
    expect(ar.value!.status).toBe('Archived');

    const rr = await restoreReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-5', actorId: 'user-1', reviewId: review.id }, deps,
    );
    expect(rr.ok).toBe(true);
    expect(rr.value!.status).toBe('Published');
  });

  it('deletes a review (soft)', async () => {
    const review = await createAndPublish(deps);
    const r = await deleteReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-6', actorId: 'user-1', reviewId: review.id }, deps,
    );
    expect(r.ok).toBe(true);
    const deleted = await deps.reviewRepo.findById('t-1', review.id);
    expect(deleted!.status).toBe('Deleted');
  });

  it('cannot update archived review', async () => {
    const review = await createAndPublish(deps);
    await archiveReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-7', actorId: 'user-1', reviewId: review.id }, deps,
    );
    const r = await updateReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-8', actorId: 'user-1', reviewId: review.id, title: 'x' }, deps,
    );
    expect(r.ok).toBe(false);
  });

  it('cannot restore non-archived review', async () => {
    const created = await createReviewUseCase(makeCreateInput(), deps);
    const r = await restoreReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-9', actorId: 'user-1', reviewId: created.value!.reviewId }, deps,
    );
    expect(r.ok).toBe(false);
  });

  it('gets review by id', async () => {
    const review = await createAndPublish(deps);
    const r = await getReviewUseCase(
      { tenantId: 't-1', reviewId: review.id }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.id).toBe(review.id);
  });

  it('emits events for full lifecycle', async () => {
    const review = await createAndPublish(deps);
    await archiveReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-a', actorId: 'user-1', reviewId: review.id }, deps,
    );
    expect(deps.eventBus.countByType('review.created')).toBe(1);
    expect(deps.eventBus.countByType('review.published')).toBe(1);
    expect(deps.eventBus.countByType('review.archived')).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Search & List (5 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Search & List', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('searches by target', async () => {
    await createAndPublish(deps, { targetRef: 'item-A', reviewerId: 'user-1' });
    await createAndPublish(deps, { targetRef: 'item-B', reviewerId: 'user-2' });
    const r = await searchReviewsUseCase(
      { tenantId: 't-1', targetRef: 'item-A' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.total).toBe(1);
  });

  it('searches by rating range', async () => {
    await createAndPublish(deps, { ratingScore: 5, reviewerId: 'user-1' });
    await createAndPublish(deps, { ratingScore: 2, reviewerId: 'user-2' });
    const r = await searchReviewsUseCase(
      { tenantId: 't-1', minRating: 4 }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.total).toBe(1);
  });

  it('searches by status', async () => {
    await createAndPublish(deps, { reviewerId: 'user-1' });
    await createReviewUseCase(makeCreateInput({ reviewerId: 'user-2' }), deps); // stays Pending
    const r = await searchReviewsUseCase(
      { tenantId: 't-1', status: 'Published' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.total).toBe(1);
  });

  it('searches by text query', async () => {
    await createAndPublish(deps, { title: 'Amazing experience', reviewerId: 'user-1' });
    await createAndPublish(deps, { title: 'Terrible service', reviewerId: 'user-2' });
    const r = await searchReviewsUseCase(
      { tenantId: 't-1', query: 'amazing' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.total).toBe(1);
  });

  it('lists reviews by organization', async () => {
    await createAndPublish(deps, { reviewerId: 'user-1' });
    await createAndPublish(deps, { reviewerId: 'user-2' });
    const r = await listReviewsUseCase(
      { tenantId: 't-1', organizationId: 'org-1' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.total).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. Rating (4 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Rating', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('changes rating', async () => {
    const review = await createAndPublish(deps, { ratingScore: 5 });
    const r = await changeRatingUseCase(
      { tenantId: 't-1', correlationId: 'c-r1', actorId: 'user-1', reviewId: review.id, newScore: 3 }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.rating.score).toBe(3);
    expect(deps.eventBus.countByType('review.rating.changed')).toBe(1);
  });

  it('rejects rating exceeding maxRating', async () => {
    const review = await createAndPublish(deps);
    const r = await changeRatingUseCase(
      { tenantId: 't-1', correlationId: 'c-r2', actorId: 'user-1', reviewId: review.id, newScore: 10 }, deps,
    );
    expect(r.ok).toBe(false);
  });

  it('removes rating (set to 0)', async () => {
    const review = await createAndPublish(deps, { ratingScore: 5 });
    const r = await removeRatingUseCase(
      { tenantId: 't-1', correlationId: 'c-r3', actorId: 'user-1', reviewId: review.id }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.rating.score).toBe(0);
  });

  it('rejects rating change on deleted review', async () => {
    const review = await createAndPublish(deps);
    await deleteReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-r4', actorId: 'user-1', reviewId: review.id }, deps,
    );
    const r = await changeRatingUseCase(
      { tenantId: 't-1', correlationId: 'c-r5', actorId: 'user-1', reviewId: review.id, newScore: 3 }, deps,
    );
    expect(r.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. Reply (5 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Reply', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('creates a reply', async () => {
    const review = await createAndPublish(deps);
    const r = await createReplyUseCase(
      { tenantId: 't-1', correlationId: 'c-rp1', actorId: 'user-2',
        reviewId: review.id, authorId: 'user-2', authorRole: 'customer',
        content: 'Thanks for the review!' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.content).toBe('Thanks for the review!');
    expect(deps.eventBus.countByType('review.reply.created')).toBe(1);
  });

  it('increments replyCount on review', async () => {
    const review = await createAndPublish(deps);
    await createReplyUseCase(
      { tenantId: 't-1', correlationId: 'c-rp2', actorId: 'user-2',
        reviewId: review.id, authorId: 'user-2', authorRole: 'staff', content: 'Reply 1' }, deps,
    );
    const updated = await deps.reviewRepo.findById('t-1', review.id);
    expect(updated!.replyCount).toBe(1);
  });

  it('deletes a reply', async () => {
    const review = await createAndPublish(deps);
    const reply = await createReplyUseCase(
      { tenantId: 't-1', correlationId: 'c-rp3', actorId: 'user-2',
        reviewId: review.id, authorId: 'user-2', authorRole: 'staff', content: 'Reply' }, deps,
    );
    const r = await deleteReplyUseCase(
      { tenantId: 't-1', correlationId: 'c-rp4', actorId: 'user-2', replyId: reply.value!.id }, deps,
    );
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('review.reply.deleted')).toBe(1);
  });

  it('decrements replyCount on delete', async () => {
    const review = await createAndPublish(deps);
    const reply = await createReplyUseCase(
      { tenantId: 't-1', correlationId: 'c-rp5', actorId: 'user-2',
        reviewId: review.id, authorId: 'user-2', authorRole: 'staff', content: 'Reply' }, deps,
    );
    await deleteReplyUseCase(
      { tenantId: 't-1', correlationId: 'c-rp6', actorId: 'user-2', replyId: reply.value!.id }, deps,
    );
    const updated = await deps.reviewRepo.findById('t-1', review.id);
    expect(updated!.replyCount).toBe(0);
  });

  it('lists replies for a review', async () => {
    const review = await createAndPublish(deps);
    await createReplyUseCase(
      { tenantId: 't-1', correlationId: 'c-rp7', actorId: 'user-2',
        reviewId: review.id, authorId: 'user-2', authorRole: 'staff', content: 'R1' }, deps,
    );
    await createReplyUseCase(
      { tenantId: 't-1', correlationId: 'c-rp8', actorId: 'user-3',
        reviewId: review.id, authorId: 'user-3', authorRole: 'customer', content: 'R2' }, deps,
    );
    const r = await listRepliesUseCase('t-1', review.id, deps);
    expect(r.ok).toBe(true);
    expect(r.value!.length).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Helpful & Reaction (6 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Helpful & Reaction', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('marks a review as helpful', async () => {
    const review = await createAndPublish(deps);
    const r = await markHelpfulUseCase(
      { tenantId: 't-1', correlationId: 'c-h1', actorId: 'user-2',
        reviewId: review.id, voterId: 'user-2', helpful: true }, deps,
    );
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('review.helpful')).toBe(1);
    const updated = await deps.reviewRepo.findById('t-1', review.id);
    expect(updated!.helpfulCount).toBe(1);
  });

  it('rejects duplicate helpful vote', async () => {
    const review = await createAndPublish(deps);
    await markHelpfulUseCase(
      { tenantId: 't-1', correlationId: 'c-h2', actorId: 'user-2',
        reviewId: review.id, voterId: 'user-2', helpful: true }, deps,
    );
    const r2 = await markHelpfulUseCase(
      { tenantId: 't-1', correlationId: 'c-h3', actorId: 'user-2',
        reviewId: review.id, voterId: 'user-2', helpful: true }, deps,
    );
    expect(r2.ok).toBe(false);
  });

  it('removes helpful vote', async () => {
    const review = await createAndPublish(deps);
    await markHelpfulUseCase(
      { tenantId: 't-1', correlationId: 'c-h4', actorId: 'user-2',
        reviewId: review.id, voterId: 'user-2', helpful: true }, deps,
    );
    const r = await removeHelpfulUseCase(
      { tenantId: 't-1', correlationId: 'c-h5', actorId: 'user-2',
        reviewId: review.id, voterId: 'user-2' }, deps,
    );
    expect(r.ok).toBe(true);
    const updated = await deps.reviewRepo.findById('t-1', review.id);
    expect(updated!.helpfulCount).toBe(0);
  });

  it('adds a reaction', async () => {
    const review = await createAndPublish(deps);
    const r = await addReactionUseCase(
      { tenantId: 't-1', correlationId: 'c-rx1', actorId: 'user-2',
        reviewId: review.id, userId: 'user-2', type: 'like' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(deps.eventBus.countByType('review.reaction.added')).toBe(1);
    const updated = await deps.reviewRepo.findById('t-1', review.id);
    expect(updated!.reactionCounts.like).toBe(1);
  });

  it('rejects duplicate reaction of same type', async () => {
    const review = await createAndPublish(deps);
    await addReactionUseCase(
      { tenantId: 't-1', correlationId: 'c-rx2', actorId: 'user-2',
        reviewId: review.id, userId: 'user-2', type: 'like' }, deps,
    );
    const r2 = await addReactionUseCase(
      { tenantId: 't-1', correlationId: 'c-rx3', actorId: 'user-2',
        reviewId: review.id, userId: 'user-2', type: 'like' }, deps,
    );
    expect(r2.ok).toBe(false);
  });

  it('allows different reaction types from same user', async () => {
    const review = await createAndPublish(deps);
    await addReactionUseCase(
      { tenantId: 't-1', correlationId: 'c-rx4', actorId: 'user-2',
        reviewId: review.id, userId: 'user-2', type: 'like' }, deps,
    );
    const r2 = await addReactionUseCase(
      { tenantId: 't-1', correlationId: 'c-rx5', actorId: 'user-2',
        reviewId: review.id, userId: 'user-2', type: 'love' }, deps,
    );
    expect(r2.ok).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Report & Moderation (8 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Report & Moderation', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('reports a review', async () => {
    const review = await createAndPublish(deps);
    const r = await reportReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-rp1', actorId: 'user-2',
        reviewId: review.id, reporterId: 'user-2', reason: 'spam',
        description: 'This looks like spam' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Open');
    expect(deps.eventBus.countByType('review.reported')).toBe(1);
  });

  it('sets review status to Reported when published review is reported', async () => {
    const review = await createAndPublish(deps);
    await reportReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-rp2', actorId: 'user-2',
        reviewId: review.id, reporterId: 'user-2', reason: 'spam',
        description: 'spam' }, deps,
    );
    const updated = await deps.reviewRepo.findById('t-1', review.id);
    expect(updated!.status).toBe('Reported');
  });

  it('resolves a report as dismissed', async () => {
    const review = await createAndPublish(deps);
    const report = await reportReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-rp3', actorId: 'user-2',
        reviewId: review.id, reporterId: 'user-2', reason: 'other',
        description: 'test' }, deps,
    );
    const r = await resolveReportUseCase(
      { tenantId: 't-1', correlationId: 'c-rp4', actorId: 'user-1',
        reportId: report.value!.id, resolution: 'dismissed' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Dismissed');
  });

  it('resolves a report as hidden (hides review)', async () => {
    const review = await createAndPublish(deps);
    const report = await reportReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-rp5', actorId: 'user-2',
        reviewId: review.id, reporterId: 'user-2', reason: 'abuse',
        description: 'abusive content' }, deps,
    );
    await resolveReportUseCase(
      { tenantId: 't-1', correlationId: 'c-rp6', actorId: 'user-1',
        reportId: report.value!.id, resolution: 'hidden' }, deps,
    );
    const updated = await deps.reviewRepo.findById('t-1', review.id);
    expect(updated!.status).toBe('Hidden');
  });

  it('approves a review via moderation', async () => {
    const created = await createReviewUseCase(makeCreateInput(), deps);
    const r = await approveReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-md1', actorId: 'admin',
        reviewId: created.value!.reviewId }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Published');
    expect(r.value!.moderationAction).toBe('approve');
  });

  it('rejects a review via moderation', async () => {
    const created = await createReviewUseCase(makeCreateInput(), deps);
    const r = await rejectReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-md2', actorId: 'admin',
        reviewId: created.value!.reviewId }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Rejected');
  });

  it('hides a review via moderation', async () => {
    const review = await createAndPublish(deps);
    const r = await hideReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-md3', actorId: 'admin',
        reviewId: review.id }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Hidden');
  });

  it('moderation with note sets moderationNote', async () => {
    const review = await createAndPublish(deps);
    const r = await hideReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-md4', actorId: 'admin',
        reviewId: review.id, note: 'inappropriate language' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.moderationNote).toBe('inappropriate language');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 8. Reputation (5 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Reputation', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('calculates reputation from reviews', async () => {
    await createAndPublish(deps, { targetRef: 'item-X', ratingScore: 5, reviewerId: 'user-1' });
    await createAndPublish(deps, { targetRef: 'item-X', ratingScore: 3, reviewerId: 'user-2' });
    const r = await calculateReputationUseCase(
      { tenantId: 't-1', targetRef: 'item-X', targetType: 'item' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.totalReviews).toBe(2);
    expect(r.value!.averageRating).toBeGreaterThan(0);
  });

  it('rebuilds reputation and persists', async () => {
    await createAndPublish(deps, { targetRef: 'item-Y', ratingScore: 4, reviewerId: 'user-1' });
    const r = await rebuildReputationUseCase(
      { tenantId: 't-1', correlationId: 'c-rep1', actorId: 'admin',
        targetRef: 'item-Y', targetType: 'item' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.totalReviews).toBe(1);
    expect(deps.eventBus.countByType('review.reputation.updated')).toBe(1);

    // verify persisted
    const cached = await deps.reputationRepo.findByTarget('t-1', 'item-Y');
    expect(cached).not.toBeNull();
    expect(cached!.averageRating).toBe(4);
  });

  it('updates reputation on rebuild', async () => {
    await createAndPublish(deps, { targetRef: 'item-Z', ratingScore: 5, reviewerId: 'user-1' });
    await rebuildReputationUseCase(
      { tenantId: 't-1', correlationId: 'c-rep2', actorId: 'admin',
        targetRef: 'item-Z', targetType: 'item' }, deps,
    );
    // add another review
    await createAndPublish(deps, { targetRef: 'item-Z', ratingScore: 1, reviewerId: 'user-2' });
    const r = await rebuildReputationUseCase(
      { tenantId: 't-1', correlationId: 'c-rep3', actorId: 'admin',
        targetRef: 'item-Z', targetType: 'item' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.totalReviews).toBe(2);
  });

  it('getReputation returns null for unknown target', async () => {
    const r = await getReputationUseCase(
      { tenantId: 't-1', targetRef: 'unknown' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value).toBeNull();
  });

  it('trustScore is between 0 and 100', async () => {
    await createAndPublish(deps, { targetRef: 'item-T', ratingScore: 5, reviewerId: 'user-1' });
    await createAndPublish(deps, { targetRef: 'item-T', ratingScore: 4, reviewerId: 'user-2' });
    const r = await calculateReputationUseCase(
      { tenantId: 't-1', targetRef: 'item-T', targetType: 'item' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.trustScore).toBeGreaterThanOrEqual(0);
    expect(r.value!.trustScore).toBeLessThanOrEqual(100);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 9. Analytics (4 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Analytics', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('gets analytics for tenant', async () => {
    await createAndPublish(deps, { ratingScore: 5, reviewerId: 'user-1' });
    await createAndPublish(deps, { ratingScore: 3, reviewerId: 'user-2' });
    const r = await getAnalyticsUseCase(
      { tenantId: 't-1', organizationId: 'org-1' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.totalReviews).toBe(2);
    expect(r.value!.publishedReviews).toBe(2);
  });

  it('computes averageRating', async () => {
    await createAndPublish(deps, { ratingScore: 4, reviewerId: 'user-1' });
    await createAndPublish(deps, { ratingScore: 2, reviewerId: 'user-2' });
    const r = await getAnalyticsUseCase(
      { tenantId: 't-1', organizationId: 'org-1' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.averageRating).toBeGreaterThan(0);
  });

  it('returns topReviews sorted by helpfulCount', async () => {
    const r1 = await createAndPublish(deps, { reviewerId: 'user-1' });
    const r2 = await createAndPublish(deps, { reviewerId: 'user-2' });
    // make r2 more helpful
    await markHelpfulUseCase(
      { tenantId: 't-1', correlationId: 'c-a1', actorId: 'user-3',
        reviewId: r2.id, voterId: 'user-3', helpful: true }, deps,
    );
    const r = await getAnalyticsUseCase(
      { tenantId: 't-1', organizationId: 'org-1' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.topReviews[0]!.id).toBe(r2.id);
  });

  it('returns recentReviews sorted by createdAt desc', async () => {
    await createAndPublish(deps, { reviewerId: 'user-1' });
    await createAndPublish(deps, { reviewerId: 'user-2' });
    const r = await getAnalyticsUseCase(
      { tenantId: 't-1', organizationId: 'org-1' }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.recentReviews.length).toBe(2);
    // second one should be more recent (clock increments)
    expect(r.value!.recentReviews[0]!.createdAt >= r.value!.recentReviews[1]!.createdAt).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10. Audit (3 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Audit', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('records audit for create', async () => {
    await createReviewUseCase(makeCreateInput(), deps);
    const audit = await deps.auditRepo.findByTenant('t-1');
    expect(audit.length).toBe(1);
    expect(audit[0]!.eventType).toBe('review_created');
  });

  it('records audit for publish', async () => {
    const created = await createReviewUseCase(makeCreateInput(), deps);
    await publishReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-a', actorId: 'user-1', reviewId: created.value!.reviewId }, deps,
    );
    const audit = await deps.auditRepo.findByReview('t-1', created.value!.reviewId);
    expect(audit.length).toBe(2);
    expect(audit.some((a) => a.eventType === 'review_created')).toBe(true);
    expect(audit.some((a) => a.eventType === 'review_published')).toBe(true);
  });

  it('records audit for report', async () => {
    const review = await createAndPublish(deps);
    await reportReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-r', actorId: 'user-2',
        reviewId: review.id, reporterId: 'user-2', reason: 'spam',
        description: 'spam content' }, deps,
    );
    const audit = await deps.auditRepo.findByReview('t-1', review.id);
    expect(audit.some((a) => a.eventType === 'review_reported')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 11. Status Machine (4 tests)
// ════════════════════════════════════════════════════════════════════════════

describe('Status Machine', () => {
  let deps: Deps;
  beforeEach(() => { deps = makeDeps(); });

  it('Pending → Published is valid', async () => {
    const created = await createReviewUseCase(makeCreateInput(), deps);
    const r = await publishReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-s1', actorId: 'user-1', reviewId: created.value!.reviewId }, deps,
    );
    expect(r.ok).toBe(true);
  });

  it('Published → Archived → Published (restore) works', async () => {
    const review = await createAndPublish(deps);
    await archiveReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-s2', actorId: 'user-1', reviewId: review.id }, deps,
    );
    const r = await restoreReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-s3', actorId: 'user-1', reviewId: review.id }, deps,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.status).toBe('Published');
  });

  it('Published → Reported → Rejected (via resolveReport)', async () => {
    const review = await createAndPublish(deps);
    const report = await reportReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-s4', actorId: 'user-2',
        reviewId: review.id, reporterId: 'user-2', reason: 'fraud',
        description: 'fake review' }, deps,
    );
    const r = await resolveReportUseCase(
      { tenantId: 't-1', correlationId: 'c-s5', actorId: 'admin',
        reportId: report.value!.id, resolution: 'rejected' }, deps,
    );
    expect(r.ok).toBe(true);
    const updated = await deps.reviewRepo.findById('t-1', review.id);
    expect(updated!.status).toBe('Rejected');
  });

  it('Deleted is terminal', async () => {
    const review = await createAndPublish(deps);
    await deleteReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-s6', actorId: 'user-1', reviewId: review.id }, deps,
    );
    // cannot restore from Deleted (only from Archived)
    const r = await restoreReviewUseCase(
      { tenantId: 't-1', correlationId: 'c-s7', actorId: 'user-1', reviewId: review.id }, deps,
    );
    expect(r.ok).toBe(false);
  });
});
