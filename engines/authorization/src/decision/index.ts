/**
 * Decision Module — Authorization Decision Engine (#1 CTO 리뷰 반영)
 *
 * 사장님 CTO 확립:
 * "Decision Engine이 모든 Resolver를 orchestration 해야 한다."
 *
 * Architecture:
 *
 *   Authorization Request
 *         ↓
 *   Decision Engine (orchestrator)
 *         ├→ Role Resolver
 *         ├→ Permission Resolver
 *         ├→ Policy Resolver
 *         ├→ Condition Evaluator
 *         ├→ Cache
 *         ├→ Audit (reason 필수)
 *         └→ explain()
 *
 * Public API:
 *   authorize()  — 전체 권한 확인 (+ Audit)
 *   can()        — 권한 있음? (boolean)
 *   cannot()     — 권한 없음? (boolean)
 *   evaluate()   — 상세 평가 (Resolution 포함)
 *   explain()    — 권한 결정의 상세 근거 (#8 CTO 리뷰)
 */

import type {
  AuthorizationRequest,
  AuthorizationDecision,
  Decision,
  DecisionReason,
  ReasonCode,
  ExplainResult,
  IRoleRepository,
  IRolePermissionRepository,
  IRoleAssignmentRepository,
  IPolicyRepository,
  IAuditLogRepository,
  IClock,
  IIdGenerator,
  PolicyEffect,
} from '../interfaces/index.js';
import { evaluateCondition } from '../conditions/index.js';
import { resolveAll, type ResolutionResult } from '../resolver/index.js';
import { DecisionCache } from '../cache/index.js';

// ═══════════════════════════════════════════
// Decision Engine Dependencies
// ═══════════════════════════════════════════

export interface DecisionEngineDeps {
  roleRepository: IRoleRepository;
  rolePermissionRepository: IRolePermissionRepository;
  roleAssignmentRepository: IRoleAssignmentRepository;
  policyRepository: IPolicyRepository;
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
  /** Optional cache — 없으면 캐싱하지 않음 */
  cache?: DecisionCache;
}

// ═══════════════════════════════════════════
// Internal: Build Decision Reason (#6 CTO 리뷰)
// ═══════════════════════════════════════════

function buildReason(
  code: ReasonCode,
  detail: string,
  source: string,
): DecisionReason {
  return { code, detail, source };
}

// ═══════════════════════════════════════════
// Internal: Core Evaluation (캐시/audit 없는 순수 평가)
// ═══════════════════════════════════════════

interface RawEvaluation {
  decision: AuthorizationDecision;
  resolution: ResolutionResult;
  // explain()용 추가 정보
  policiesEvaluated: Array<{ name: string; effect: PolicyEffect; conditionMet: boolean | null }>;
  conditionsEvaluated: Array<{ condition: string; met: boolean }>;
}

async function evaluateInternal(
  request: AuthorizationRequest,
  deps: DecisionEngineDeps,
): Promise<RawEvaluation> {
  const startTime = Date.now();

  // Phase 1: Resolve (Role → Permission → Policy)
  const resolution = await resolveAll(
    deps.roleRepository,
    deps.rolePermissionRepository,
    deps.roleAssignmentRepository,
    deps.policyRepository,
    request,
  );

  const policiesEvaluated: Array<{ name: string; effect: PolicyEffect; conditionMet: boolean | null }> = [];
  const conditionsEvaluated: Array<{ condition: string; met: boolean }> = [];
  const matchedRules: string[] = [];

  // Phase 2: Policy deny 확인 (deny가 allow보다 항상 우선)
  for (const policy of resolution.policies) {
    if (policy.effect !== 'deny') continue;

    let conditionMet: boolean | null = null;
    if (policy.condition) {
      conditionMet = evaluateCondition(policy.condition, request);
      conditionsEvaluated.push({
        condition: `${policy.name}:deny`,
        met: conditionMet,
      });
    }

    policiesEvaluated.push({ name: policy.name, effect: 'deny', conditionMet });

    if (!policy.condition || conditionMet) {
      matchedRules.push(`policy:${policy.name}:deny`);
      return {
        decision: {
          decision: 'deny',
          reason: `Denied by policy: ${policy.name}`,
          reasonDetail: buildReason(
            'denied_by_policy',
            `Access denied by policy '${policy.name}'. This policy explicitly blocks '${request.permission}'.`,
            `policy:${policy.name}`,
          ),
          matchedRules,
          conditions: [],
          evaluationTimeMs: Date.now() - startTime,
        },
        resolution,
        policiesEvaluated,
        conditionsEvaluated,
      };
    }
  }

  // Phase 3: Permission 매칭 + Condition 평가
  let hasAllow = false;
  let allowSource = '';
  const pendingConditions: string[] = [];

  for (const rp of resolution.matchingPermissions) {
    matchedRules.push(`role_permission:${rp.permissionKey}`);

    if (rp.condition) {
      // Role-Permission condition 평가
      const condition: import('../interfaces/index.js').PolicyCondition = {
        requireOwnership: rp.condition.includes('own_'),
      };
      if (request.resource?.type !== undefined) {
        condition.resourceType = request.resource.type;
      }
      const met = evaluateCondition(condition, request);
      conditionsEvaluated.push({ condition: rp.condition, met });

      if (met) {
        hasAllow = true;
        allowSource = `role_permission:${rp.permissionKey}`;
      } else {
        pendingConditions.push(rp.condition);
      }
    } else {
      hasAllow = true;
      allowSource = `role_permission:${rp.permissionKey}`;
    }
  }

  // Phase 4: Policy allow 확인
  for (const policy of resolution.policies) {
    if (policy.effect !== 'allow') continue;

    let conditionMet: boolean | null = null;
    if (policy.condition) {
      conditionMet = evaluateCondition(policy.condition, request);
      conditionsEvaluated.push({
        condition: `${policy.name}:allow`,
        met: conditionMet,
      });
    }

    policiesEvaluated.push({ name: policy.name, effect: 'allow', conditionMet });
    matchedRules.push(`policy:${policy.name}:allow`);

    if (!policy.condition || conditionMet) {
      hasAllow = true;
      allowSource = `policy:${policy.name}`;
    }
  }

  // Phase 5: Decision
  const elapsedMs = Date.now() - startTime;

  let decision: Decision;
  let reason: string;
  let reasonDetail: DecisionReason;

  if (hasAllow) {
    decision = 'allow';
    // Role에서 허용인지 Policy에서 허용인지 구분
    if (allowSource.startsWith('role_permission:')) {
      reason = `Allowed by role permission: ${allowSource.replace('role_permission:', '')}`;
      reasonDetail = buildReason(
        'allowed_by_role',
        `Access granted through role permission '${allowSource.replace('role_permission:', '')}'. The user's role includes this permission.`,
        allowSource,
      );
    } else {
      reason = `Allowed by policy: ${allowSource.replace('policy:', '')}`;
      reasonDetail = buildReason(
        'allowed_by_policy',
        `Access granted through policy '${allowSource.replace('policy:', '')}'. An allow policy matched this request.`,
        allowSource,
      );
    }
  } else if (resolution.assignments.length === 0) {
    decision = 'deny';
    reason = 'No role assignments';
    reasonDetail = buildReason(
      'no_role_assignments',
      `User '${request.accountId}' has no role assignments in tenant '${request.tenantId}'. Assign a role to grant access.`,
      'none',
    );
  } else if (pendingConditions.length > 0) {
    decision = 'conditional';
    reason = `Condition not met: ${pendingConditions.join(', ')}`;
    reasonDetail = buildReason(
      'condition_not_met',
      `Permission '${request.permission}' was found but conditions were not satisfied: ${pendingConditions.join(', ')}. Check resource ownership, attributes, or time restrictions.`,
      pendingConditions.join(', '),
    );
  } else {
    decision = 'deny';
    reason = `Missing permission: ${request.permission}`;
    reasonDetail = buildReason(
      'no_matching_permission',
      `No role or policy grants permission '${request.permission}' to user '${request.accountId}'. Add this permission to an assigned role or create an allow policy.`,
      'none',
    );
  }

  return {
    decision: {
      decision,
      reason,
      reasonDetail,
      matchedRules,
      conditions: pendingConditions,
      evaluationTimeMs: elapsedMs,
    },
    resolution,
    policiesEvaluated,
    conditionsEvaluated,
  };
}

// ═══════════════════════════════════════════
// Decision Engine — Public API
// ═══════════════════════════════════════════

/**
 * evaluate() — 상세 평가 (Resolution 포함, Audit 없음)
 *
 * Cache를 확인하고, miss면 평가 후 캐시에 저장.
 */
export async function evaluate(
  request: AuthorizationRequest,
  deps: DecisionEngineDeps,
): Promise<{ decision: AuthorizationDecision; resolution: ResolutionResult }> {
  // Cache check
  if (deps.cache) {
    const cached = deps.cache.get(request);
    if (cached) {
      // 캐시 hit — resolution은 빈 객체 (캐시에는 decision만 저장)
      return {
        decision: cached,
        resolution: {
          assignments: [],
          roles: [],
          permissions: [],
          matchingPermissions: [],
          policies: [],
        },
      };
    }
  }

  const raw = await evaluateInternal(request, deps);

  // Cache store
  if (deps.cache) {
    deps.cache.set(request, raw.decision);
  }

  return { decision: raw.decision, resolution: raw.resolution };
}

/**
 * authorize() — 전체 권한 확인 + Audit (#6 reason 필수 기록)
 */
export async function authorize(
  request: AuthorizationRequest,
  deps: DecisionEngineDeps,
): Promise<AuthorizationDecision> {
  // Cache check (authorize도 캐시 활용)
  if (deps.cache) {
    const cached = deps.cache.get(request);
    if (cached) {
      // 캐시 hit 시에도 Audit은 기록 (frequency tracking)
      await deps.auditLogRepository.insert({
        tenantId: request.tenantId,
        accountId: request.accountId,
        eventType: cached.decision === 'deny' ? 'authorization_denied' : 'authorization_allowed',
        metadata: {
          permission: request.permission,
          decision: cached.decision,
          reason: cached.reasonDetail.detail,  // #6 reason 필수
          reasonCode: cached.reasonDetail.code,
          matchedRules: cached.matchedRules,
          cached: true,
        },
      });
      return cached;
    }
  }

  const raw = await evaluateInternal(request, deps);

  // Cache store
  if (deps.cache) {
    deps.cache.set(request, raw.decision);
  }

  // #6 Audit — Reason을 반드시 남김
  await deps.auditLogRepository.insert({
    tenantId: request.tenantId,
    accountId: request.accountId,
    eventType: raw.decision.decision === 'deny' ? 'authorization_denied' : 'authorization_allowed',
    metadata: {
      permission: request.permission,
      decision: raw.decision.decision,
      reason: raw.decision.reasonDetail.detail,      // 사람이 읽을 수 있는 이유
      reasonCode: raw.decision.reasonDetail.code,     // 구조화된 코드
      reasonSource: raw.decision.reasonDetail.source, // 어디서 결정되었는지
      matchedRules: raw.decision.matchedRules,
      roles: raw.resolution.roles.map((r) => r.name),
      evaluationTimeMs: raw.decision.evaluationTimeMs,
    },
  });

  return raw.decision;
}

/**
 * can() — 권한 있음? (단순 boolean)
 */
export async function can(
  request: AuthorizationRequest,
  deps: DecisionEngineDeps,
): Promise<boolean> {
  const decision = await authorize(request, deps);
  return decision.decision === 'allow';
}

/**
 * cannot() — 권한 없음? (단순 boolean)
 */
export async function cannot(
  request: AuthorizationRequest,
  deps: DecisionEngineDeps,
): Promise<boolean> {
  const decision = await authorize(request, deps);
  return decision.decision === 'deny';
}

/**
 * explain() — 권한 결정의 상세 근거 (#8 CTO 리뷰)
 *
 * 운영자가 "이 사용자가 왜 이 권한이 없는가?"를
 * 한눈에 파악할 수 있다.
 *
 * 예:
 *   ALLOW
 *   because
 *   Role: Manager
 *   Policy: BookingPolicy
 *   Condition: OwnerOnly (met)
 *   Permission: booking.update
 */
export async function explain(
  request: AuthorizationRequest,
  deps: DecisionEngineDeps,
): Promise<ExplainResult> {
  // explain은 캐시를 사용하지 않는다 (항상 최신 상태 평가)
  const raw = await evaluateInternal(request, deps);

  return {
    decision: raw.decision.decision,
    reason: raw.decision.reasonDetail,
    roles: raw.resolution.roles.map((r) => r.name),
    matchedPermissions: raw.resolution.matchingPermissions.map((rp) => rp.permissionKey),
    policiesEvaluated: raw.policiesEvaluated,
    conditionsEvaluated: raw.conditionsEvaluated,
    evaluationTimeMs: raw.decision.evaluationTimeMs,
  };
}
