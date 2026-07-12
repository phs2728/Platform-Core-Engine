/**
 * Review Engine — Shared Use Case Deps (3-Layer DI)
 */

import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IReviewRepository,
  IReplyRepository,
  IReportRepository,
  IReactionRepository,
  IHelpfulVoteRepository,
  IReputationRepository,
  IReviewAuditRepository,
  IOrganizationVerifier,
  IUserVerifier,
  IMediaVerifier,
  ITransactionVerifier,
  ICustomDataPolicyProvider,
  IModerationHook,
} from '../interfaces/index.js';

export interface ReviewUseCaseDeps {
  reviewRepo: IReviewRepository;
  replyRepo: IReplyRepository;
  reportRepo: IReportRepository;
  reactionRepo: IReactionRepository;
  helpfulRepo: IHelpfulVoteRepository;
  reputationRepo: IReputationRepository;
  auditRepo: IReviewAuditRepository;
  organizationVerifier: IOrganizationVerifier;
  userVerifier: IUserVerifier;
  mediaVerifier: IMediaVerifier;
  transactionVerifier: ITransactionVerifier;
  policyProvider: ICustomDataPolicyProvider;
  moderationHook: IModerationHook;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}
