/**
 * Permission Simulator UseCase (#7 CTO 리뷰 반영 — What-If 강화)
 *
 * 사장님 CTO 확립:
 * "Authorization Engine에는 반드시 Permission Simulator가 있어야 한다."
 *
 * CTO 리뷰:
 * "Simulator는 거의 엔터프라이즈 기능입니다.
 *  What if... User = Kim, Role = Guide, Permission = booking.cancel → Result?"
 *
 * 두 가지 모드:
 * 1. simulatePermissionsUseCase — 실제 사용자의 권한 시뮬레이션
 * 2. whatIfUseCase — 가상 시나리오 평가 (실제 데이터베이스 변경 없음)
 */

import {
  type SimulationRequest,
  type SimulationResult,
  type WhatIfRequest,
  type WhatIfResult,
  type Decision,
  type IRoleRepository,
  type IRoleAssignmentRepository,
  type IAuditLogRepository,
} from '../interfaces/index.js';
import { authorizeUseCase, type AuthorizeDeps } from './AuthorizeUseCase.js';

export interface SimulatorDeps extends AuthorizeDeps {}

// ═══════════════════════════════════════════
// 1. Permission Simulator (실제 사용자)
// ═══════════════════════════════════════════

/**
 * 실제 사용자의 권한을 시뮬레이션.
 * 운영 중 권한 문제 디버깅에 필수.
 *
 * 예:
 *   User → Guide → Can cancel booking? → YES/NO
 *   Manager → Can refund payment? → YES/NO
 */
export async function simulatePermissionsUseCase(
  request: SimulationRequest,
  deps: SimulatorDeps,
): Promise<SimulationResult> {
  // 1. 사용자의 Roles 조회
  const assignments = await deps.roleAssignmentRepository.findByAccount(
    request.tenantId,
    request.accountId,
  );

  const roleIds = assignments.map((a) => a.roleId);
  const roles: string[] = [];
  for (const roleId of roleIds) {
    const role = await deps.roleRepository.findById(request.tenantId, roleId);
    if (role) {
      roles.push(role.name);
    }
  }

  // 2. 각 Permission에 대해 authorize 실행
  const results: Array<{
    permission: string;
    decision: Decision;
    reason: string;
  }> = [];

  for (const permission of request.permissions) {
    const authRequest = {
      tenantId: request.tenantId,
      accountId: request.accountId,
      permission,
      ...(request.resource !== undefined ? { resource: request.resource } : {}),
    };

    const decision = await authorizeUseCase(authRequest, deps);
    results.push({
      permission,
      decision: decision.decision,
      reason: decision.reason,
    });
  }

  // 3. Audit
  await deps.auditLogRepository.insert({
    tenantId: request.tenantId,
    accountId: request.accountId,
    eventType: 'simulation_executed',
    metadata: {
      permissions: request.permissions,
      roles,
      results: results.map((r) => ({ p: r.permission, d: r.decision })),
    },
  });

  return {
    accountId: request.accountId,
    results,
    roles,
  };
}

// ═══════════════════════════════════════════
// 2. What-If Simulator (가상 시나리오) — #7 CTO 리뷰
// ═══════════════════════════════════════════

/**
 * What-If 시뮬레이션
 *
 * "User = Kim, Role = Guide, Permission = booking.cancel → Result?"
 *
 * 실제 데이터베이스를 변경하지 않고 가상 시나리오를 평가한다.
 * Role Assignment를 임시로 메모리에 생성하고 평가 후 폐기한다.
 */

/**
 * 임시 What-If 평가를 위한 가상 Role Assignment Repository
 */
class VirtualRoleAssignmentRepository {
  constructor(
    private readonly realRepo: IRoleAssignmentRepository,
    private readonly virtualRoleIds: Set<string>,
    private readonly tenantId: string,
  ) {}

  async findByAccount(_tenantId: string, _accountId: string) {
    // 실제 repo는 호출하지 않음 — 가상 roles만 반환
    // WhatIf에서는 accountId가 의미 없음 (가상 시나리오)
    return Array.from(this.virtualRoleIds).map((roleId) => ({
      id: `virtual-${roleId}`,
      tenantId: this.tenantId,
      accountId: 'virtual-user',
      roleId,
      scope: null,
      assignedAt: new Date().toISOString(),
      assignedBy: 'whatif',
      expiresAt: null,
    }));
  }
}

/**
 * What-If 시뮬레이션 실행
 *
 * 주어진 가상 Role들에 대해 권한을 평가한다.
 * 실제 사용자 데이터에 영향을 주지 않는다.
 */
export async function whatIfUseCase(
  request: WhatIfRequest,
  deps: SimulatorDeps,
): Promise<WhatIfResult> {
  // 가상 Role ID 집합
  const virtualRoleIds = new Set(request.roles);

  // 가상 Assignment Repository 생성 (실제 repo를 래핑)
  const virtualRepo = new VirtualRoleAssignmentRepository(
    deps.roleAssignmentRepository,
    virtualRoleIds,
    request.tenantId,
  );

  // 가상 deps 생성
  const virtualDeps: SimulatorDeps = {
    ...deps,
    roleAssignmentRepository: virtualRepo as unknown as import('../interfaces/index.js').IRoleAssignmentRepository,
  };

  // 각 Permission에 대해 평가 (가상 사용자)
  const results: Array<{
    permission: string;
    decision: Decision;
    reason: string;
  }> = [];

  for (const permission of request.permissions) {
    const authRequest = {
      tenantId: request.tenantId,
      accountId: 'virtual-user', // 가상 사용자
      permission,
      ...(request.resource !== undefined ? { resource: request.resource } : {}),
    };

    const decision = await authorizeUseCase(authRequest, virtualDeps);
    results.push({
      permission,
      decision: decision.decision,
      reason: decision.reason,
    });
  }

  // Audit
  await deps.auditLogRepository.insert({
    tenantId: request.tenantId,
    accountId: null,
    eventType: 'whatif_executed',
    metadata: {
      virtualRoles: request.roles,
      permissions: request.permissions,
      results: results.map((r) => ({ p: r.permission, d: r.decision })),
    },
  });

  return {
    roles: request.roles,
    results,
  };
}
