/**
 * Organization Engine — Public Interfaces
 *
 * 사장님 확립 (2026-07-11):
 *  - Host가 구현을 주입. Engine은 직접 DB/Cache/Email 호출 ❌.
 *  - 3-Layer DI: Host → Engine → Repository
 *  - 모든 도메인 타입 + Repository interface (IOrganization / IDepartment / IBranch / ITeam / IMembership / IAudit)
 */

import type { Result, EventEnvelope } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Core Infra (모든 Engine 공통)
// ═══════════════════════════════════════════

export interface IClock {
  now(): Date;
}

export interface IIdGenerator {
  generate(): string;
}

export interface IEventBus {
  emit<T>(envelope: EventEnvelope<T>): Promise<void>;
}

// ═══════════════════════════════════════════
// Engine-Specific Host Interfaces
// ═══════════════════════════════════════════

/**
 * 사용자 존재 검증 Host 인터페이스 (User Engine을 직접 import 하지 않음 — 의존 격리).
 * Membership 추가 시 또는 조직 Owner 검증 시 사용.
 * 구현은 보통 User Engine 조회.
 */
export interface IUserVerifier {
  /**
   * 주어진 tenantId + userId 조합이 실제 User Engine에 존재하는지 검증.
   * true = 존재, false = 미존재 (또는 다른 tenant 소속).
   */
  verify(tenantId: string, userId: string): Promise<boolean>;
}

/**
 * 주소 검증 Host 인터페이스 (Address Engine을 직접 import 하지 않음).
 * Organization Profile의 addressId가 유효한지 검증할 때 사용.
 */
export interface IAddressVerifier {
  verify(tenantId: string, addressId: string): Promise<boolean>;
}

/**
 * 정책 조회 Host 인터페이스 (Policy Engine을 직접 import 하지 않음).
 * 조직 정책(최대 직원 수, 최대 Branch 수 등) 조회.
 */
export interface IOrganizationPolicyProvider {
  getMaxMembers(tenantId: string): Promise<number>;
  getMaxBranches(tenantId: string): Promise<number>;
  getMaxDepartments(tenantId: string): Promise<number>;
  getAllowedOrganizationTypes(tenantId: string): Promise<readonly OrganizationType[]>;
  getAllowedCountries(tenantId: string): Promise<readonly string[]>;
}

// ═══════════════════════════════════════════
// Value Objects & Enums
// ═══════════════════════════════════════════

export type OrganizationStatus =
  | 'Pending'
  | 'Active'
  | 'Suspended'
  | 'Archived'
  | 'Deleted';

export type OrganizationType =
  | 'Commercial'
  | 'NonProfit'
  | 'Government'
  | 'Religious'
  | 'Educational'
  | 'Healthcare'
  | 'Marketplace'
  | 'Hospitality'
  | 'Logistics'
  | 'Technology'
  | 'Other';

/**
 * 7개 멤버십 타입. 사장님 spec §Membership Type.
 *
 * 권한 강도는 Authorization Engine이 결정 — 본 enum은 단순 분류 라벨.
 */
export type MembershipType =
  | 'Owner'
  | 'Administrator'
  | 'Manager'
  | 'Employee'
  | 'Contractor'
  | 'Member'
  | 'Guest';

export type HierarchyNodeType = 'organization' | 'branch' | 'department' | 'team';

/**
 * Organization Profile (Profile은 어디까지나 표면 정보).
 * raw Email/Phone/Address는 저장 ❌ — Identity/Address Engine 참조.
 */
export interface OrganizationProfile {
  displayName: string;       // 표시 이름 (필수)
  legalName?: string;        // 법적 이름
  businessNumber?: string;   // 사업자 등록번호 (Tenant 내 유니크)
  taxNumber?: string;        // 세금 번호 (Tenant 내 유니크)
  registrationNumber?: string;
  website?: string;          // URL
  logo?: string;             // URL (이미지는 외부 스토리지 참조 — 본 엔진은 raw 이미지 보관 ❌)
  brandColor?: string;       // HEX (#RRGGBB)
  industry?: string;         // 자유 텍스트 (Industry SSoT는 추후 표준화 RFC)
  description?: string;
  country?: string;          // ISO 3166-1 alpha-2
  primaryAddressId?: string; // Address Engine 참조
  primaryEmail?: string;     // 표시용 이메일 (검증 ❌)
  primaryPhone?: string;     // 표시용 전화 (검증 ❌)
}

/**
 * Organization Metadata — Tenant-scoped 임의 Key/Value.
 */
export type OrganizationMetadata = Record<string, unknown>;

/**
 * 최상위 Organization 엔터티.
 */
export interface Organization {
  id: string;
  tenantId: string;
  type: OrganizationType;
  status: OrganizationStatus;
  profile: OrganizationProfile;
  metadata: OrganizationMetadata;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  archivedAt: string | null;
  deletedAt: string | null;
}

/**
 * Branch — Organization 하위 단위 (accommodation branch, regional office 등).
 * parentType/parentId adjacency list 패턴.
 */
export interface Branch {
  id: string;
  tenantId: string;
  organizationId: string;
  parentType: HierarchyNodeType;
  parentId: string;            // organization | department (Branch 아래 Branch 가능)
  name: string;
  description?: string;
  primaryAddressId?: string;   // Address Engine 참조
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archivedAt: string | null;
}

/**
 * Department — 조직 내 부서. 무한 depth.
 */
export interface Department {
  id: string;
  tenantId: string;
  organizationId: string;
  parentType: HierarchyNodeType; // organization | department
  parentId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archivedAt: string | null;
}

/**
 * Team — 부서/지점 내의 소그룹.
 */
export interface Team {
  id: string;
  tenantId: string;
  organizationId: string;
  parentType: HierarchyNodeType; // department | branch | organization
  parentId: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archivedAt: string | null;
}

/**
 * Membership — User와 Organization의 관계.
 * userId는 UserReference 패턴 (Identity/User Engine의 ID).
 */
export interface Membership {
  id: string;
  tenantId: string;
  organizationId: string;
  userId: string;
  membershipType: MembershipType;
  departmentId: string | null;   // 선택적 소속 부서
  teamId: string | null;         // 선택적 소속 팀
  status: 'active' | 'suspended' | 'left';
  title?: string;                // 직책 (옵션)
  joinedAt: string;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════
// Search
// ═══════════════════════════════════════════

export interface OrganizationSearchCriteria {
  tenantId: string;
  query?: string;                 // displayName 부분일치
  type?: OrganizationType;
  status?: OrganizationStatus;
  industry?: string;
  country?: string;
  businessNumber?: string;
  taxNumber?: string;
  memberUserId?: string;          // 특정 user가 member인 조직
  limit?: number;
  offset?: number;
  sortBy?: 'displayName' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface OrganizationSearchResult {
  organizations: Organization[];
  total: number;
  limit: number;
  offset: number;
}

export interface MemberListCriteria {
  tenantId: string;
  organizationId: string;
  membershipType?: MembershipType;
  status?: Membership['status'];
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════
// Audit
// ═══════════════════════════════════════════

export type OrganizationAuditEventType =
  | 'organization_created'
  | 'organization_updated'
  | 'organization_profile_updated'
  | 'organization_archived'
  | 'organization_restored'
  | 'organization_deleted'
  | 'organization_status_changed'
  | 'organization_type_changed'
  | 'organization_member_added'
  | 'organization_member_removed'
  | 'organization_member_changed'
  | 'organization_branch_created'
  | 'organization_department_created'
  | 'organization_team_created'
  | 'organization_department_moved'
  | 'organization_team_moved'
  | 'organization_policy_violation';

export interface OrganizationAuditRecord {
  id: string;
  tenantId: string;
  organizationId: string;
  actorId: string;
  correlationId: string;
  eventType: OrganizationAuditEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ═══════════════════════════════════════════
// Repositories
// ═══════════════════════════════════════════

export interface IOrganizationRepository {
  insert(org: Organization): Promise<void>;
  findById(tenantId: string, id: string): Promise<Organization | null>;
  update(tenantId: string, id: string, patch: Partial<Organization>): Promise<void>;
  search(criteria: OrganizationSearchCriteria): Promise<OrganizationSearchResult>;
  /** 같은 Tenant 내 businessNumber 유일성 검증 (insert/update 시). */
  existsByBusinessNumber(tenantId: string, businessNumber: string, excludeId?: string): Promise<boolean>;
  /** 같은 Tenant 내 taxNumber 유일성 검증. */
  existsByTaxNumber(tenantId: string, taxNumber: string, excludeId?: string): Promise<boolean>;
}

export interface IDepartmentRepository {
  insert(dept: Department): Promise<void>;
  findById(tenantId: string, id: string): Promise<Department | null>;
  findByParent(tenantId: string, parentType: HierarchyNodeType, parentId: string): Promise<Department[]>;
  findByOrganization(tenantId: string, organizationId: string): Promise<Department[]>;
  update(tenantId: string, id: string, patch: Partial<Department>): Promise<void>;
}

export interface IBranchRepository {
  insert(branch: Branch): Promise<void>;
  findById(tenantId: string, id: string): Promise<Branch | null>;
  findByParent(tenantId: string, parentType: HierarchyNodeType, parentId: string): Promise<Branch[]>;
  findByOrganization(tenantId: string, organizationId: string): Promise<Branch[]>;
  update(tenantId: string, id: string, patch: Partial<Branch>): Promise<void>;
}

export interface ITeamRepository {
  insert(team: Team): Promise<void>;
  findById(tenantId: string, id: string): Promise<Team | null>;
  findByParent(tenantId: string, parentType: HierarchyNodeType, parentId: string): Promise<Team[]>;
  findByOrganization(tenantId: string, organizationId: string): Promise<Team[]>;
  update(tenantId: string, id: string, patch: Partial<Team>): Promise<void>;
}

export interface IMembershipRepository {
  insert(membership: Membership): Promise<void>;
  findById(tenantId: string, id: string): Promise<Membership | null>;
  findActive(tenantId: string, organizationId: string, userId: string): Promise<Membership | null>;
  /** 특정 조직 + user의 모든 (active + left) 멤버십 */
  findHistory(tenantId: string, organizationId: string, userId: string): Promise<Membership[]>;
  /** 같은 orgId 안에서 user 멤버십 검색 */
  listByOrg(tenantId: string, organizationId: string, criteria?: Omit<MemberListCriteria, 'tenantId' | 'organizationId'>): Promise<Membership[]>;
  /** user가 속한 조직 검색 */
  listByUser(tenantId: string, userId: string): Promise<Membership[]>;
  update(tenantId: string, id: string, patch: Partial<Membership>): Promise<void>;
  countActive(tenantId: string, organizationId: string): Promise<number>;
}

export interface IOrganizationAuditRepository {
  insert(record: Omit<OrganizationAuditRecord, 'id' | 'createdAt'>): Promise<OrganizationAuditRecord>;
  findByOrganization(tenantId: string, organizationId: string, limit?: number): Promise<OrganizationAuditRecord[]>;
  findByTenant(tenantId: string, limit?: number): Promise<OrganizationAuditRecord[]>;
}

// ═══════════════════════════════════════════
// Defaults & Constants (정적 상수 — value import 가능)
// ═══════════════════════════════════════════

export const DEFAULT_PROFILE: OrganizationProfile = {
  displayName: '',
};

export const DEFAULT_METADATA: OrganizationMetadata = {};

export const SUPPORTED_ORGANIZATION_TYPES: readonly OrganizationType[] = [
  'Commercial',
  'NonProfit',
  'Government',
  'Religious',
  'Educational',
  'Healthcare',
  'Marketplace',
  'Hospitality',
  'Logistics',
  'Technology',
  'Other',
] as const;

export const SUPPORTED_MEMBERSHIP_TYPES: readonly MembershipType[] = [
  'Owner',
  'Administrator',
  'Manager',
  'Employee',
  'Contractor',
  'Member',
  'Guest',
] as const;

export const SUPPORTED_ORGANIZATION_STATUSES: readonly OrganizationStatus[] = [
  'Pending',
  'Active',
  'Suspended',
  'Archived',
  'Deleted',
] as const;

/**
 * 허용된 Status 전이.
 *  Pending  → Active | Archived
 *  Active   → Suspended | Archived
 *  Suspended → Active | Archived
 *  Archived → Restored (= Active)
 *  Deleted  → (terminal)
 */
export const ALLOWED_STATUS_TRANSITIONS: Readonly<Record<OrganizationStatus, readonly OrganizationStatus[]>> = {
  Pending: ['Active', 'Archived'],
  Active: ['Suspended', 'Archived'],
  Suspended: ['Active', 'Archived'],
  Archived: [],
  Deleted: [],
} as const;

export { type Result, type EventEnvelope };
