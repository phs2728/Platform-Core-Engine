/**
 * Workflow Engine — 8-state Status Machine
 *
 * 사장님 확립 (2026-07-11) Phase 6:
 *   Draft → Active → Waiting → Paused → Completed
 *   Active → Cancelled (terminal) | Failed (terminal)
 *   Waiting → Cancelled | Failed | Expired (terminal)
 *   Paused → Cancelled | Failed
 *
 * Terminal: Cancelled, Failed, Expired, Completed
 *
 * 동일한 상태 맵이 Workflow(definition)와 Instance 모두에 적용된다.
 */

import { ConflictError, Err, Ok, type Result } from '@platform/core-sdk';

/**
 * Allowed status transitions for workflows and instances.
 *
 * Terminal states (Cancelled / Failed / Expired) have no outgoing transitions.
 * Completed is also terminal.
 */
export const WORKFLOW_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  Draft: ['Active', 'Cancelled'],
  Active: ['Waiting', 'Paused', 'Completed', 'Cancelled', 'Failed'],
  Waiting: ['Active', 'Paused', 'Completed', 'Cancelled', 'Failed', 'Expired'],
  Paused: ['Active', 'Waiting', 'Cancelled', 'Failed'],
  Completed: [],
  Cancelled: [],
  Failed: ['Active'],   // Failed can be retried back to Active
  Expired: [],
} as const;

/**
 * Validate a workflow/instance status transition.
 *
 * Returns Ok(true) if allowed, or Err(ConflictError) otherwise.
 * Same-status transitions are rejected.
 */
export function validateWorkflowStatusTransition(
  current: string,
  next: string,
): Result<true, ConflictError> {
  if (current === next) {
    return Err(new ConflictError(
      `Workflow is already in status "${current}"`,
      { details: { current, next } },
    ));
  }

  const allowed = WORKFLOW_TRANSITIONS[current] ?? [];
  if (allowed.length === 0) {
    return Err(new ConflictError(
      `Workflow in terminal status "${current}" cannot transition to "${next}"`,
      { details: { current, next, allowed } },
    ));
  }

  if (!allowed.includes(next)) {
    return Err(new ConflictError(
      `Workflow status transition "${current}" → "${next}" is not allowed`,
      { details: { current, next, allowed } },
    ));
  }
  return Ok(true);
}

/**
 * Whether a workflow/instance in the given status can be mutated
 * (tasks added, timers scheduled, references attached, etc.).
 *
 * Terminal states are immutable.
 */
export function isWorkflowMutable(status: string): boolean {
  return status !== 'Completed'
    && status !== 'Cancelled'
    && status !== 'Expired';
  // Failed is mutable (can retry → Active)
}

/**
 * Terminal status check.
 */
export function isTerminalStatus(status: string): boolean {
  return status === 'Completed'
    || status === 'Cancelled'
    || status === 'Failed'
    || status === 'Expired';
}

/**
 * Validate that a state transition is allowed by the Workflow Definition's
 * TransitionRule list (business-level state machine, separate from lifecycle status).
 */
export function validateStateTransition(
  definitionStates: readonly string[],
  definitionTransitions: ReadonlyArray<{ fromState: string; toState: string }>,
  fromState: string,
  toState: string,
): Result<true, ConflictError> {
  if (fromState === toState) {
    return Err(new ConflictError(
      `Already in state "${fromState}"`,
      { details: { fromState, toState } },
    ));
  }

  if (!definitionStates.includes(fromState)) {
    return Err(new ConflictError(
      `Unknown source state "${fromState}"`,
      { details: { fromState, toState, validStates: definitionStates } },
    ));
  }

  if (!definitionStates.includes(toState)) {
    return Err(new ConflictError(
      `Unknown target state "${toState}"`,
      { details: { fromState, toState, validStates: definitionStates } },
    ));
  }

  const found = definitionTransitions.some(
    (t) => t.fromState === fromState && t.toState === toState,
  );
  if (!found) {
    return Err(new ConflictError(
      `State transition "${fromState}" → "${toState}" is not defined in the workflow`,
      { details: { fromState, toState } },
    ));
  }
  return Ok(true);
}
