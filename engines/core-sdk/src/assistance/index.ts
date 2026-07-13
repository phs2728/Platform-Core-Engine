/**
 * assistance/index.ts — Customer Assistance Layer
 *
 * Capability 6: Every generated website must support customer assistance.
 * NOT a chatbot — AI Concierge with context awareness.
 */

// ═══════════════════════════════════════════
// Assistance Channel
// ═══════════════════════════════════════════

export type AssistanceChannel =
  | 'ai-chat' | 'faq' | 'knowledge-base' | 'guided-search'
  | 'recommendation' | 'objection-handling' | 'human-contact'
  | 'live-chat' | 'appointment' | 'support-ticket';

export type ConversationIntent =
  | 'question' | 'objection' | 'comparison' | 'booking' | 'pricing'
  | 'support' | 'escalation' | 'recommendation' | 'feedback' | 'greeting';

export type EscalationLevel = 'ai' | 'guided' | 'human' | 'manager';

// ═══════════════════════════════════════════
// Conversation
// ═══════════════════════════════════════════

export interface ConversationMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly intent?: ConversationIntent | undefined;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface ConversationSession {
  readonly id: string;
  readonly tenantId: string;
  readonly visitorId: string;
  readonly locale: string;
  readonly currentPage?: string | undefined;
  readonly journeyStage?: string | undefined;
  readonly messages: ConversationMessage[];
  readonly context: ConversationContext;
  readonly escalationLevel: EscalationLevel;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ConversationContext {
  readonly detectedIntent?: ConversationIntent | undefined;
  readonly detectedObjections: string[];
  readonly detectedInterests: string[];
  readonly pageHistory: string[];
  readonly timeOnSite: number;
  readonly referralSource?: string | undefined;
  readonly deviceType: 'mobile' | 'tablet' | 'desktop';
}

// ═══════════════════════════════════════════
// Assistance Provider Interface
// ═══════════════════════════════════════════

export interface IAssistanceProvider {
  /** AI generates contextual response based on conversation + page + journey */
  generateResponse(session: ConversationSession, userMessage: string): Promise<AssistanceResponse>;
  /** Recommend next best action based on context */
  recommendNextAction(session: ConversationSession): Promise<NextActionRecommendation>;
  /** Detect if escalation to human is needed */
  shouldEscalate(session: ConversationSession): Promise<boolean>;
}

export interface AssistanceResponse {
  readonly message: string;
  readonly intent: ConversationIntent;
  readonly suggestedActions: SuggestedAction[];
  readonly shouldEscalate: boolean;
  readonly confidence: number;
  readonly evidenceRefs: string[];
}

export interface SuggestedAction {
  readonly type: 'link' | 'button' | 'form' | 'booking' | 'call' | 'faq';
  readonly label: string;
  readonly target: string;
  readonly priority: number;
}

export interface NextActionRecommendation {
  readonly action: string;
  readonly reason: string;
  readonly confidence: number;
  readonly journeyStage: string;
}

// ═══════════════════════════════════════════
// Escalation Strategy
// ═══════════════════════════════════════════

export interface EscalationRule {
  readonly trigger: 'repeated-question' | 'negative-sentiment' | 'complex-issue' | 'user-request' | 'conversion-risk' | 'ai-failure';
  readonly fromLevel: EscalationLevel;
  readonly toLevel: EscalationLevel;
  readonly description: string;
}

export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  { trigger: 'repeated-question', fromLevel: 'ai', toLevel: 'guided', description: '같은 질문 2회 반복 → 가이드 제공' },
  { trigger: 'negative-sentiment', fromLevel: 'ai', toLevel: 'human', description: '부정 감정 → 즉시 상담원 연결' },
  { trigger: 'complex-issue', fromLevel: 'guided', toLevel: 'human', description: '복잡한 문제 → 상담원 에스컬레이션' },
  { trigger: 'user-request', fromLevel: 'ai', toLevel: 'human', description: '사용자 요청 → 상담원 연결' },
  { trigger: 'conversion-risk', fromLevel: 'ai', toLevel: 'guided', description: '이탈 위험 → 가이드 제공' },
  { trigger: 'ai-failure', fromLevel: 'ai', toLevel: 'human', description: 'AI 응답 실패 → 상담원 연결' },
];

export function evaluateEscalation(
  session: ConversationSession,
  rules: EscalationRule[] = DEFAULT_ESCALATION_RULES,
): EscalationLevel {
  // Check for repeated questions
  const userMessages = session.messages.filter(m => m.role === 'user');
  const questionCounts = new Map<string, number>();
  for (const msg of userMessages) {
    const normalized = msg.content.toLowerCase().trim();
    questionCounts.set(normalized, (questionCounts.get(normalized) ?? 0) + 1);
  }
  const hasRepeated = [...questionCounts.values()].some(c => c >= 2);

  // Check for escalation triggers
  for (const rule of rules) {
    if (rule.fromLevel !== session.escalationLevel) continue;
    if (rule.trigger === 'repeated-question' && hasRepeated) return rule.toLevel;
    if (rule.trigger === 'user-request' && session.messages.some(m => m.content.toLowerCase().includes('상담원') || m.content.toLowerCase().includes('human'))) return rule.toLevel;
  }

  return session.escalationLevel;
}

// ═══════════════════════════════════════════
// Conversation Strategy
// ═══════════════════════════════════════════

export interface ConversationStrategy {
  readonly greetingMessage: string;
  readonly proactiveTriggers: { condition: string; message: string }[];
  readonly objectionResponses: Record<string, string>;
  readonly maxAiAttempts: number;
  readonly contextMemoryEnabled: boolean;
}

export const DEFAULT_CONVERSATION_STRATEGY: ConversationStrategy = {
  greetingMessage: '안녕하세요! 무엇을 도와드릴까요?',
  proactiveTriggers: [
    { condition: 'scroll-50-no-action', message: '혹시 궁금한 점이 있으신가요?' },
    { condition: 'pricing-page-30s', message: '가격에 대해 설명해 드릴까요?' },
    { condition: 'exit-intent', message: '잠깐! 특별한 할인이 있습니다.' },
  ],
  objectionResponses: {
    '가격': '가격에 대한 자세한 설명을 드리겠습니다.',
    '안전': '저희는 고객 안전을 최우선으로 합니다.',
    '환불': '환불 정책은 다음과 같습니다.',
  },
  maxAiAttempts: 3,
  contextMemoryEnabled: true,
};