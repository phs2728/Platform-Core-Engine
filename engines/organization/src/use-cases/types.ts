/**
 * Organization Engine — Shared Use Case Deps
 *
 * 3-Layer DI (Host → Engine → Repository) — Sprint 2C-1 Identity Email MVP 패턴.
 */

import type {
  IClock,
  IIdGenerator,
  IEventBus,
  IOrganizationRepository,
  IDepartmentRepository,
  IBranchRepository,
  ITeamRepository,
  IMembershipRepository,
  IOrganizationAuditRepository,
  IUserVerifier,
  IAddressVerifier,
  IOrganizationPolicyProvider,
} from '../interfaces/index.js';

export interface OrganizationUseCaseDeps {
  organizationRepo: IOrganizationRepository;
  departmentRepo: IDepartmentRepository;
  branchRepo: IBranchRepository;
  teamRepo: ITeamRepository;
  membershipRepo: IMembershipRepository;
  auditRepo: IOrganizationAuditRepository;
  userVerifier: IUserVerifier;
  addressVerifier: IAddressVerifier;
  policyProvider: IOrganizationPolicyProvider;
  eventBus: IEventBus;
  idGenerator: IIdGenerator;
  clock: IClock;
}

/**
 * Minimal deps for use cases that don't touch the hierarchy
 * or membership. Use case inputs still get the wider deps for backward
 * compat — Host can provide no-op implementations for unused slots.
 */
export type AnyOrganizationUseCaseDeps = Partial<OrganizationUseCaseDeps> &
  Pick<OrganizationUseCaseDeps, 'organizationRepo' | 'auditRepo' | 'eventBus' | 'idGenerator' | 'clock'>;
