/**
 * Test fixtures — Review Engine
 */

import type { ReviewUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryReviewRepository,
  InMemoryReplyRepository,
  InMemoryReportRepository,
  InMemoryReactionRepository,
  InMemoryHelpfulVoteRepository,
  InMemoryReputationRepository,
  InMemoryReviewAuditRepository,
  InMemoryOrganizationVerifier,
  InMemoryUserVerifier,
  InMemoryMediaVerifier,
  InMemoryTransactionVerifier,
  StaticReviewPolicyProvider,
  MockModerationHook,
  InMemoryEventBus,
} from '../src/index.js';

export function makeClock() {
  let offset = 0;
  const base = new Date('2026-07-11T08:00:00.000Z');
  return { now: () => new Date(base.getTime() + offset++ * 1000) };
}

export function makeDeps(): ReviewUseCaseDeps & {
  reviewRepo: InMemoryReviewRepository;
  replyRepo: InMemoryReplyRepository;
  reportRepo: InMemoryReportRepository;
  reactionRepo: InMemoryReactionRepository;
  helpfulRepo: InMemoryHelpfulVoteRepository;
  reputationRepo: InMemoryReputationRepository;
  auditRepo: InMemoryReviewAuditRepository;
  organizationVerifier: InMemoryOrganizationVerifier;
  userVerifier: InMemoryUserVerifier;
  mediaVerifier: InMemoryMediaVerifier;
  transactionVerifier: InMemoryTransactionVerifier;
  policyProvider: StaticReviewPolicyProvider;
  moderationHook: MockModerationHook;
  eventBus: InMemoryEventBus;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const reviewRepo = new InMemoryReviewRepository();
  const replyRepo = new InMemoryReplyRepository();
  const reportRepo = new InMemoryReportRepository();
  const reactionRepo = new InMemoryReactionRepository();
  const helpfulRepo = new InMemoryHelpfulVoteRepository();
  const reputationRepo = new InMemoryReputationRepository();
  const auditRepo = new InMemoryReviewAuditRepository();
  const eventBus = new InMemoryEventBus();
  const organizationVerifier = new InMemoryOrganizationVerifier();
  const userVerifier = new InMemoryUserVerifier();
  const mediaVerifier = new InMemoryMediaVerifier();
  const transactionVerifier = new InMemoryTransactionVerifier();
  const policyProvider = new StaticReviewPolicyProvider();
  const moderationHook = new MockModerationHook();

  policyProvider.set('t-1', {
    allowedTypes: ['item', 'service', 'experience', 'stay', 'default'],
    maxReviews: 1000,
    maxRating: 5,
    autoModeration: false,
    allowDuplicate: false,
  });

  organizationVerifier.add('t-1', 'org-1');
  userVerifier.add('t-1', 'user-1');
  userVerifier.add('t-1', 'user-2');
  userVerifier.add('t-1', 'user-3');
  mediaVerifier.add('t-1', 'media-1');
  transactionVerifier.add('t-1', 'scheduling', 'txn-1');
  transactionVerifier.add('t-1', 'catalog', 'ord-1');

  let idCounter = 0;
  const idGenerator = {
    generate(): string {
      idCounter += 1;
      return `id-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };

  return {
    reviewRepo, replyRepo, reportRepo, reactionRepo,
    helpfulRepo, reputationRepo, auditRepo, eventBus,
    organizationVerifier, userVerifier, mediaVerifier, transactionVerifier,
    policyProvider, moderationHook, idGenerator, clock: makeClock(),
  };
}

export function makeCreateInput(overrides?: Partial<{
  reviewerId: string;
  targetRef: string;
  targetType: string;
  ratingScore: number;
  title: string;
  content: string;
  language: string;
}>) {
  return {
    tenantId: 't-1',
    correlationId: 'c-1',
    actorId: 'user-1',
    organizationId: 'org-1',
    reviewerId: overrides?.reviewerId ?? 'user-1',
    targetRef: overrides?.targetRef ?? 'item-001',
    targetType: overrides?.targetType ?? 'item',
    title: overrides?.title ?? 'Great experience',
    content: overrides?.content ?? 'Really enjoyed this item, highly recommend!',
    ratingScore: overrides?.ratingScore ?? 5,
    language: overrides?.language ?? 'en',
  };
}
