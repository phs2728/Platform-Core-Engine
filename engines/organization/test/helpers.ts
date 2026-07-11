/**
 * Test fixtures — 환경을 재현 가능한 상태로 초기화.
 *
 * ID generator는 deps 인스턴스 단위로 새 closure 생성 (module-level counter
 * 공유 ❌).
 */
import type { OrganizationUseCaseDeps } from '../src/use-cases/types.js';
import {
  InMemoryOrganizationRepository,
  InMemoryDepartmentRepository,
  InMemoryBranchRepository,
  InMemoryTeamRepository,
  InMemoryMembershipRepository,
  InMemoryOrganizationAuditRepository,
  InMemoryUserVerifier,
  InMemoryAddressVerifier,
  StaticOrganizationPolicyProvider,
  InMemoryEventBus,
} from '../src/index.js';

const fixedTime = new Date('2026-07-11T08:00:00.000Z');

export function makeClock() {
  let offset = 0;
  return {
    now: () => new Date(fixedTime.getTime() + offset++ * 1000),
  };
}

export function makeDeps(): OrganizationUseCaseDeps & {
  organizationRepo: InMemoryOrganizationRepository;
  departmentRepo: InMemoryDepartmentRepository;
  branchRepo: InMemoryBranchRepository;
  teamRepo: InMemoryTeamRepository;
  membershipRepo: InMemoryMembershipRepository;
  auditRepo: InMemoryOrganizationAuditRepository;
  eventBus: InMemoryEventBus;
  userVerifier: InMemoryUserVerifier;
  addressVerifier: InMemoryAddressVerifier;
  policyProvider: StaticOrganizationPolicyProvider;
  idGenerator: { generate(): string };
  clock: { now(): Date };
} {
  const organizationRepo = new InMemoryOrganizationRepository();
  const departmentRepo = new InMemoryDepartmentRepository();
  const branchRepo = new InMemoryBranchRepository();
  const teamRepo = new InMemoryTeamRepository();
  const membershipRepo = new InMemoryMembershipRepository();
  const auditRepo = new InMemoryOrganizationAuditRepository();
  const eventBus = new InMemoryEventBus();
  const userVerifier = new InMemoryUserVerifier();
  const addressVerifier = new InMemoryAddressVerifier();
  const policyProvider = new StaticOrganizationPolicyProvider();
  policyProvider.set('t-1', {
    maxMembers: 100,
    maxBranches: 50,
    maxDepartments: 100,
    allowedCountries: ['KR', 'US', 'JP', 'GE', 'TH', 'CN', 'TR', 'RU', 'DE', 'FR'],
  });

  // Unique ID generator — instance-scoped counter.
  let idCounter = 0;
  const idTimestamp = 1778563200000;
  const idGenerator = {
    generate(): string {
      idCounter += 1;
      return `id-${idTimestamp}-${idCounter}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    },
  };

  return {
    organizationRepo,
    departmentRepo,
    branchRepo,
    teamRepo,
    membershipRepo,
    auditRepo,
    eventBus,
    userVerifier,
    addressVerifier,
    policyProvider,
    idGenerator,
    clock: makeClock(),
  };
}
