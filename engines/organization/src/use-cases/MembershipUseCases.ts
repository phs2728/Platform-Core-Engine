/**
 * Membership UseCases
 *
 * 사장님 spec §Public API:
 *   addMember / removeMember / changeMembership / listMembers
 *
 * 사장님 확립 (Boundary Discipline):
 *   - User의 Profile/Preference는 User Engine에 위임
 *   - userId는 UserReference 패턴
 *   - Membership 변경마다 EventEnvelope 발행
 *   - 같은 User를 다시 추가 가능 (status=active로 soft-rejoin)
 */

import {
  Ok,
  Err,
  type Result,
  ValidationError,
  ConflictError,
  NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';

import { recordOrganizationAudit } from '../domain/audit.js';
import {
  addMemberSchema,
  removeMemberSchema,
  changeMembershipSchema,
  listMembersSchema,
} from '../domain/validation.js';
import { emitOrganizationEvent } from '../domain/events.js';
import { isMutable } from '../domain/statusTransition.js';
import type { OrganizationUseCaseDeps } from './types.js';
import type {
  Membership,
  MembershipType,
  MemberListCriteria,
} from '../interfaces/index.js';

// ════════════════════════════════════════════════════════════════════════════
// ADD MEMBER
// ════════════════════════════════════════════════════════════════════════════

export interface AddMemberInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  userId: string;
  membershipType: MembershipType;
  departmentId?: string;
  teamId?: string;
  title?: string;
}

export type AddMemberError = ValidationError | NotFoundError | ConflictError;

export async function addMemberUseCase(
  input: AddMemberInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Membership, AddMemberError>> {
  const validation = addMemberSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid addMember input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  // 1) 조직 존재 및 mutable 확인
  const org = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!org) {
    return Err(new NotFoundError('Organization not found', {
      details: { organizationId: data.organizationId },
    }));
  }
  if (!isMutable(org.status)) {
    return Err(new ConflictError(
      `Cannot add member — organization status is "${org.status}"`,
      { details: { status: org.status } },
    ));
  }

  // 2) User 검증 (User Engine)
  const userExists = await deps.userVerifier.verify(data.tenantId, data.userId);
  if (!userExists) {
    return Err(new NotFoundError('User not found', {
      details: { userId: data.userId },
    }));
  }

  // 3) Active 멤버십 중복 검사
  const existingActive = await deps.membershipRepo.findActive(
    data.tenantId, data.organizationId, data.userId,
  );
  if (existingActive) {
    return Err(new ConflictError(
      'User is already an active member of this organization',
      { details: { userId: data.userId, organizationId: data.organizationId } },
    ));
  }

  // 4) Policy — 최대 멤버 수
  const maxMembers = await deps.policyProvider.getMaxMembers(data.tenantId);
  const currentCount = await deps.membershipRepo.countActive(data.tenantId, data.organizationId);
  if (currentCount >= maxMembers) {
    return Err(new ConflictError(
      `Organization reached maximum members limit (${maxMembers})`,
      { details: { max: maxMembers, current: currentCount } },
    ));
  }

  // 5) 멤버십 생성
  const membershipId = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const baseMembership = {
    id: membershipId,
    tenantId: data.tenantId,
    organizationId: data.organizationId,
    userId: data.userId,
    membershipType: data.membershipType,
    departmentId: data.departmentId ?? null,
    teamId: data.teamId ?? null,
    status: 'active' as const,
    joinedAt: now,
    leftAt: null,
    createdAt: now,
    updatedAt: now,
  };
  // Conditional assignment for exactOptionalPropertyTypes: true
  if (data.title !== undefined) (baseMembership as { title?: string }).title = data.title;
  const membership = baseMembership as Membership;
  await deps.membershipRepo.insert(membership);

  // 6) Event + Audit
  const envelope: EventEnvelope<{
    organizationId: string;
    membershipId: string;
    userId: string;
    membershipType: MembershipType;
    tenantId: string;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.member.added',
    'organization.member.added.v1',
    {
      organizationId: data.organizationId,
      membershipId,
      userId: data.userId,
      membershipType: data.membershipType,
      tenantId: data.tenantId,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_member_added',
    metadata: {
      membershipId,
      userId: data.userId,
      membershipType: data.membershipType,
    },
  });

  return Ok(membership);
}

// ════════════════════════════════════════════════════════════════════════════
// REMOVE MEMBER (soft — sets status=left)
// ════════════════════════════════════════════════════════════════════════════

export interface RemoveMemberInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  userId: string;
}

export async function removeMemberUseCase(
  input: RemoveMemberInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<{ membershipId: string }, ValidationError | NotFoundError | ConflictError>> {
  const validation = removeMemberSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid removeMember input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const existing = await deps.membershipRepo.findActive(
    data.tenantId, data.organizationId, data.userId,
  );
  if (!existing) {
    return Err(new NotFoundError('Active membership not found', {
      details: { userId: data.userId, organizationId: data.organizationId },
    }));
  }

  const now = deps.clock.now().toISOString();
  await deps.membershipRepo.update(data.tenantId, existing.id, {
    status: 'left',
    leftAt: now,
    updatedAt: now,
  });

  const envelope: EventEnvelope<{
    organizationId: string;
    membershipId: string;
    userId: string;
    tenantId: string;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.member.removed',
    'organization.member.removed.v1',
    {
      organizationId: data.organizationId,
      membershipId: existing.id,
      userId: data.userId,
      tenantId: data.tenantId,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_member_removed',
    metadata: { membershipId: existing.id, userId: data.userId },
  });

  return Ok({ membershipId: existing.id });
}

// ════════════════════════════════════════════════════════════════════════════
// CHANGE MEMBERSHIP (type 변경)
// ════════════════════════════════════════════════════════════════════════════

export interface ChangeMembershipInput {
  tenantId: string;
  correlationId: string;
  actorId: string;
  organizationId: string;
  userId: string;
  newMembershipType: MembershipType;
  title?: string;
}

export async function changeMembershipUseCase(
  input: ChangeMembershipInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Membership, ValidationError | NotFoundError | ConflictError>> {
  const validation = changeMembershipSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid changeMembership input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const existing = await deps.membershipRepo.findActive(
    data.tenantId, data.organizationId, data.userId,
  );
  if (!existing) {
    return Err(new NotFoundError('Active membership not found'));
  }
  if (existing.membershipType === data.newMembershipType) {
    return Err(new ConflictError(
      `Membership already of type "${data.newMembershipType}"`,
      { details: { currentType: existing.membershipType } },
    ));
  }

  const now = deps.clock.now().toISOString();
  const patch: Partial<Membership> = {
    membershipType: data.newMembershipType,
    updatedAt: now,
  };
  if (data.title !== undefined) patch.title = data.title;

  await deps.membershipRepo.update(data.tenantId, existing.id, patch);

  const updated: Membership = { ...existing, ...patch };

  const envelope: EventEnvelope<{
    organizationId: string;
    membershipId: string;
    userId: string;
    previousType: MembershipType;
    newType: MembershipType;
    tenantId: string;
  }> = await emitOrganizationEvent(
    deps,
    {
      aggregateId: data.organizationId,
      tenantId: data.tenantId,
      correlationId: data.correlationId,
    },
    'organization.member.changed',
    'organization.member.changed.v1',
    {
      organizationId: data.organizationId,
      membershipId: existing.id,
      userId: data.userId,
      previousType: existing.membershipType,
      newType: data.newMembershipType,
      tenantId: data.tenantId,
    },
  );
  await deps.eventBus.emit(envelope);

  await recordOrganizationAudit(deps.auditRepo, {
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    actorId: data.actorId,
    correlationId: data.correlationId,
    eventType: 'organization_member_changed',
    metadata: {
      membershipId: existing.id,
      userId: data.userId,
      previousType: existing.membershipType,
      newType: data.newMembershipType,
    },
  });

  return Ok(updated);
}

// ════════════════════════════════════════════════════════════════════════════
// LIST MEMBERS
// ════════════════════════════════════════════════════════════════════════════

export interface ListMembersInput {
  tenantId: string;
  organizationId: string;
  membershipType?: MembershipType;
  status?: Membership['status'];
  limit?: number;
  offset?: number;
}

export async function listMembersUseCase(
  input: ListMembersInput,
  deps: OrganizationUseCaseDeps,
): Promise<Result<Membership[], ValidationError | NotFoundError>> {
  const validation = listMembersSchema.safeParse(input);
  if (!validation.success) {
    return Err(new ValidationError('Invalid listMembers input', {
      details: { issues: validation.error.errors },
    }));
  }
  const data = validation.data;

  const org = await deps.organizationRepo.findById(data.tenantId, data.organizationId);
  if (!org) {
    return Err(new NotFoundError('Organization not found'));
  }

  const criteria: Omit<MemberListCriteria, 'tenantId' | 'organizationId'> = {
    ...(data.membershipType !== undefined ? { membershipType: data.membershipType } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.limit !== undefined ? { limit: data.limit } : {}),
    ...(data.offset !== undefined ? { offset: data.offset } : {}),
  };

  const list = await deps.membershipRepo.listByOrg(
    data.tenantId, data.organizationId, criteria,
  );
  return Ok(list);
}
