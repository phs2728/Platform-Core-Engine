/**
 * Core Authorization UseCase — 권한 확인 (Legacy Wrapper)
 *
 * 이 함수는 새 Decision Engine (decision/)의 authorize()로 위임한다.
 * 하위 호환성을 위해 유지된다.
 *
 * 사장님 CTO 리뷰 (2026-07-11):
 * "Decision Engine이 모든 Resolver를 orchestration 해야 한다."
 *
 * 새 코드는 decision/ 모듈의 authorize()를 직접 사용하는 것을 권장한다.
 */

import type {
  AuthorizationDecision,
  AuthorizationRequest,
  IRoleRepository,
  IRolePermissionRepository,
  IRoleAssignmentRepository,
  IPolicyRepository,
  IAuditLogRepository,
  IClock,
  IIdGenerator,
} from '../interfaces/index.js';
import { authorize as decisionAuthorize, type DecisionEngineDeps } from '../decision/index.js';

export interface AuthorizeDeps {
  roleRepository: IRoleRepository;
  rolePermissionRepository: IRolePermissionRepository;
  roleAssignmentRepository: IRoleAssignmentRepository;
  policyRepository: IPolicyRepository;
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * @deprecated Use decision/authorize() directly.
 *
 * Legacy authorizeUseCase — Decision Engine으로 위임.
 */
export async function authorizeUseCase(
  request: AuthorizationRequest,
  deps: AuthorizeDeps,
): Promise<AuthorizationDecision> {
  // DecisionEngineDeps는 AuthorizeDeps과 동일한 구조
  const decisionDeps: DecisionEngineDeps = {
    roleRepository: deps.roleRepository,
    rolePermissionRepository: deps.rolePermissionRepository,
    roleAssignmentRepository: deps.roleAssignmentRepository,
    policyRepository: deps.policyRepository,
    auditLogRepository: deps.auditLogRepository,
    clock: deps.clock,
    idGenerator: deps.idGenerator,
  };

  return decisionAuthorize(request, decisionDeps);
}
