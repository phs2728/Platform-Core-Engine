/**
 * Condition Module — ABAC Condition Rules + Expression Engine (#4 CTO 리뷰 반영)
 *
 * 사장님 CTO 확립:
 * "Condition은 Expression 기반이 좋습니다.
 *  resource.owner == user.id && resource.status == DRAFT && time < 18:00
 *  처럼 AST로 평가 가능하게. 나중에 AI Policy까지 연결됩니다."
 *
 * Two layers:
 * 1. Structured conditions (resourceType, requireOwnership, attributes, timeRestriction)
 * 2. Expression-based conditions (general AST evaluation)
 *
 * Expression Grammar (간소화된 C-like):
 *   comparison := operand ('==' | '!=' | '<' | '<=' | '>' | '>=') operand
 *   logical    := comparison (('&&' | '||') comparison)*
 *   operand    := variable | literal | '(' logical ')'
 *   variable   := 'resource.type' | 'resource.owner' | 'resource.status' | 'user.id' | 'time.hour' | ...
 *   literal    := string | number | boolean
 */

import type { PolicyCondition, AuthorizationRequest } from '../interfaces/index.js';

// ═══════════════════════════════════════════
// Expression AST
// ═══════════════════════════════════════════

type ExprNode =
  | { kind: 'literal'; value: unknown }
  | { kind: 'variable'; path: string }
  | { kind: 'comparison'; op: '==' | '!=' | '<' | '<=' | '>' | '>='; left: ExprNode; right: ExprNode }
  | { kind: 'logical'; op: '&&' | '||'; left: ExprNode; right: ExprNode };

// ═══════════════════════════════════════════
// Expression Parser (recursive descent)
// ═══════════════════════════════════════════

class ExprParser {
  private pos = 0;

  constructor(private readonly tokens: string[]) {}

  parse(): ExprNode {
    const node = this.parseLogical();
    return node;
  }

  private peek(): string | undefined {
    return this.tokens[this.pos];
  }

  private consume(): string | undefined {
    return this.tokens[this.pos++];
  }

  private parseLogical(): ExprNode {
    let left = this.parseComparison();

    while (this.peek() === '&&' || this.peek() === '||') {
      const op = this.consume() as '&&' | '||';
      const right = this.parseComparison();
      left = { kind: 'logical', op, left, right };
    }

    return left;
  }

  private parseComparison(): ExprNode {
    const left = this.parseOperand();

    const next = this.peek();
    if (next === '==' || next === '!=' || next === '<' || next === '<=' || next === '>' || next === '>=') {
      const op = this.consume() as ExprNode extends { kind: 'comparison'; op: infer O } ? O : never;
      const right = this.parseOperand();
      return { kind: 'comparison', op, left, right };
    }

    return left;
  }

  private parseOperand(): ExprNode {
    const token = this.peek();

    // Parenthesized expression
    if (token === '(') {
      this.consume(); // '('
      const node = this.parseLogical();
      if (this.peek() === ')') this.consume(); // ')'
      return node;
    }

    // String literal: 'DRAFT', "active"
    if (token !== undefined && (token.startsWith("'") || token.startsWith('"'))) {
      this.consume();
      return { kind: 'literal', value: token.slice(1, -1) };
    }

    // Number literal
    if (token !== undefined && /^-?\d+(\.\d+)?$/.test(token)) {
      this.consume();
      return { kind: 'literal', value: parseFloat(token) };
    }

    // Boolean literal
    if (token === 'true') {
      this.consume();
      return { kind: 'literal', value: true };
    }
    if (token === 'false') {
      this.consume();
      return { kind: 'literal', value: false };
    }

    // Variable: resource.owner, user.id, time.hour, etc.
    if (token !== undefined && /^[a-zA-Z_]/.test(token)) {
      this.consume();
      // Check for property access: resource.owner
      let path = token;
      while (this.peek() === '.') {
        this.consume(); // '.'
        const prop = this.consume();
        if (prop !== undefined) path += `.${prop}`;
      }
      return { kind: 'variable', path };
    }

    // Fallback
    this.consume();
    return { kind: 'literal', value: null };
  }
}

/**
 * Tokenize expression string
 */
function tokenize(expr: string): string[] {
  // Insert spaces around operators, then split
  const spaced = expr
    .replace(/([()])/g, ' $1 ')
    .replace(/([!=<>]=?)/g, ' $1 ')
    .replace(/(&&|\|\|)/g, ' $1 ');
  return spaced.split(/\s+/).filter((t) => t.length > 0);
}

// ═══════════════════════════════════════════
// Expression Evaluator
// ═══════════════════════════════════════════

/**
 * Evaluation Context — Expression에서 접근 가능한 변수들
 */
export interface EvaluationContext {
  user: { id: string; [key: string]: unknown };
  resource: { type: string; id: string; owner?: string; [key: string]: unknown };
  time: { hour: number; day: number; timestamp: number };
  [key: string]: unknown;
}

/**
 * Request → Evaluation Context 변환
 */
export function buildEvaluationContext(request: AuthorizationRequest): EvaluationContext {
  const now = new Date();
  return {
    user: {
      id: request.accountId,
      ...(request.context ?? {}),
    },
    resource: request.resource
      ? {
          type: request.resource.type,
          id: request.resource.id,
          ...(request.resource.ownerId !== undefined ? { owner: request.resource.ownerId } : {}),
          ...(request.resource.attributes ?? {}),
        }
      : { type: '', id: '' },
    time: {
      hour: now.getHours(),
      day: now.getDay(),
      timestamp: now.getTime(),
    },
  };
}

/**
 * Variable 경로에서 값 추출
 *
 * 'resource.owner' → ctx.resource.owner
 * 'user.id' → ctx.user.id
 * 'time.hour' → ctx.time.hour
 */
function resolveVariable(path: string, ctx: EvaluationContext): unknown {
  const parts = path.split('.');
  let current: unknown = ctx;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * AST Node 평가
 */
function evaluateNode(node: ExprNode, ctx: EvaluationContext): unknown {
  switch (node.kind) {
    case 'literal':
      return node.value;

    case 'variable':
      return resolveVariable(node.path, ctx);

    case 'comparison': {
      const left = evaluateNode(node.left, ctx);
      const right = evaluateNode(node.right, ctx);

      switch (node.op) {
        case '==': return left === right;
        case '!=': return left !== right;
        case '<': {
          if (typeof left === 'number' && typeof right === 'number') return left < right;
          return false;
        }
        case '<=': {
          if (typeof left === 'number' && typeof right === 'number') return left <= right;
          return false;
        }
        case '>': {
          if (typeof left === 'number' && typeof right === 'number') return left > right;
          return false;
        }
        case '>=': {
          if (typeof left === 'number' && typeof right === 'number') return left >= right;
          return false;
        }
        default: return false;
      }
    }

    case 'logical': {
      const left = evaluateNode(node.left, ctx);
      const right = evaluateNode(node.right, ctx);

      switch (node.op) {
        case '&&': return left === true && right === true;
        case '||': return left === true || right === true;
        default: return false;
      }
    }

    default:
      return false;
  }
}

/**
 * Expression 문자열 평가
 *
 * @param expression Expression string (e.g., "resource.owner == user.id && resource.status == 'DRAFT'")
 * @param request Authorization request
 * @returns 평가 결과 (true/false)
 */
export function evaluateExpression(expression: string, request: AuthorizationRequest): boolean {
  try {
    const tokens = tokenize(expression);
    const parser = new ExprParser(tokens);
    const ast = parser.parse();
    const ctx = buildEvaluationContext(request);
    return evaluateNode(ast, ctx) === true;
  } catch {
    // Parse error → fail-safe (deny)
    return false;
  }
}

/**
 * Expression 검증 (컴파일 타임 / Policy 생성 시)
 */
export function validateExpression(expression: string): { valid: boolean; error?: string } {
  try {
    const tokens = tokenize(expression);
    const parser = new ExprParser(tokens);
    parser.parse();
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid expression' };
  }
}

// ═══════════════════════════════════════════
// Unified Condition Evaluator
// ═══════════════════════════════════════════

/**
 * 통합 Condition 평가 — 구조화된 조건 + Expression 동시 지원
 *
 * 평가 순서:
 * 1. resourceType (리소스 타입 제한)
 * 2. requireOwnership (소유권)
 * 3. attributes (속성 매칭)
 * 4. timeRestriction (시간 제한)
 * 5. expression (AST 평가) ← #4 CTO 리뷰
 * 6. evaluator (커스텀)
 */
export function evaluateCondition(
  condition: PolicyCondition,
  request: AuthorizationRequest,
): boolean {
  // 1. Resource type 제한
  if (condition.resourceType && request.resource?.type !== condition.resourceType) {
    return false;
  }

  // 2. Ownership 확인
  if (condition.requireOwnership) {
    if (!request.resource?.ownerId) return false;
    if (request.resource.ownerId !== request.accountId) return false;
  }

  // 3. 속성 매칭
  if (condition.attributes && request.resource?.attributes) {
    for (const [key, value] of Object.entries(condition.attributes)) {
      if (request.resource.attributes[key] !== value) {
        return false;
      }
    }
  }

  // 4. 시간 제한
  if (condition.timeRestriction) {
    const now = new Date();
    const hour = now.getHours();
    const startHour = parseInt(condition.timeRestriction.start.split(':')[0] ?? '0', 10);
    const endHour = parseInt(condition.timeRestriction.end.split(':')[0] ?? '23', 10);
    const inRange = startHour < endHour
      ? (hour >= startHour && hour < endHour)
      : (hour >= startHour || hour < endHour);
    if (!inRange) return false;
  }

  // 5. Expression 평가 (#4 CTO 리뷰)
  if (condition.expression) {
    if (!evaluateExpression(condition.expression, request)) return false;
  }

  return true;
}

// ═══════════════════════════════════════════
// Condition Builders
// ═══════════════════════════════════════════

/**
 * Ownership Rule: resource.ownerId === accountId
 */
export function ownershipCondition(): PolicyCondition {
  return { requireOwnership: true };
}

/**
 * Resource Type Rule: resource.type === expectedType
 */
export function resourceTypeCondition(resourceType: string): PolicyCondition {
  return { resourceType };
}

/**
 * Attribute Based Rule: resource.attributes[key] === value
 */
export function attributeCondition(attributes: Record<string, unknown>): PolicyCondition {
  return { attributes };
}

/**
 * Time Rule: 지정된 시간 범위 내에서만 허용
 */
export function timeRestrictionCondition(start: string, end: string): PolicyCondition {
  return { timeRestriction: { start, end } };
}

/**
 * Department Rule: 사용자의 department 속성이 일치해야 함
 */
export function departmentCondition(department: string): PolicyCondition {
  return { attributes: { department } };
}

/**
 * Expression Rule (#4 CTO 리뷰) — AST 기반 일반화된 조건
 *
 * 예: expressionCondition("resource.owner == user.id && resource.status == 'DRAFT' && time.hour < 18")
 */
export function expressionCondition(expression: string): PolicyCondition {
  return { expression };
}

/**
 * 복합 Condition (AND)
 */
export function andConditions(...conditions: PolicyCondition[]): PolicyCondition {
  const merged: PolicyCondition = {};
  for (const c of conditions) {
    if (c.resourceType) merged.resourceType = c.resourceType;
    if (c.requireOwnership) merged.requireOwnership = true;
    if (c.attributes) merged.attributes = { ...merged.attributes, ...c.attributes };
    if (c.timeRestriction) merged.timeRestriction = c.timeRestriction;
    if (c.expression) merged.expression = c.expression;
    if (c.evaluator) merged.evaluator = c.evaluator;
  }
  return merged;
}

/**
 * 시간 제한 평가 (독립 함수)
 */
export function evaluateTimeRestriction(
  start: string,
  end: string,
  now: Date = new Date(),
): boolean {
  const hour = now.getHours();
  const startHour = parseInt(start.split(':')[0] ?? '0', 10);
  const endHour = parseInt(end.split(':')[0] ?? '23', 10);
  return startHour < endHour
    ? (hour >= startHour && hour < endHour)
    : (hour >= startHour || hour < endHour);
}

/**
 * Ownership 평가 (독립 함수)
 */
export function evaluateOwnership(request: AuthorizationRequest): boolean {
  if (!request.resource?.ownerId) return false;
  return request.resource.ownerId === request.accountId;
}
