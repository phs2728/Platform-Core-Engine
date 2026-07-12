/**
 * AI Assistant UseCases (6) — ask / chat / startConversation / endConversation / explain / reason
 *
 * 사장님 확립: AI는 판단을 돕는 역할만 한다. 최종 상태 변경은 비즈니스 엔진이 수행.
 */
import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordAIAudit } from '../domain/audit.js';
import { askSchema, chatSchema, startConversationSchema } from '../domain/validation.js';
import { emitAIEvent } from '../domain/events.js';
import type { AIUseCaseDeps } from './types.js';
import type {
  Conversation, ConversationMessage, AIContextRef,
} from '../interfaces/index.js';

// START CONVERSATION
export interface StartConversationInput {
  tenantId: string; correlationId: string; actorId: string;
  userId: string; assistantType: import('../interfaces/index.js').AssistantType;
}

export async function startConversationUseCase(
  input: StartConversationInput, deps: AIUseCaseDeps,
): Promise<Result<{ conversationId: string }, ValidationError>> {
  const v = startConversationSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const allowed = await deps.policyProvider.getAllowedAssistantTypes(d.tenantId);
  if (!allowed.includes(d.assistantType)) {
    return Err(new ValidationError(`Assistant type "${d.assistantType}" not allowed`));
  }

  const cid = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const conv: Conversation = {
    id: cid, tenantId: d.tenantId, userId: d.userId,
    assistantType: d.assistantType, messages: [], context: [],
    status: 'active', createdAt: now, updatedAt: now,
  };
  await deps.conversationRepo.insert(conv);

  const env: EventEnvelope<{ conversationId: string }> =
    await emitAIEvent(deps, { aggregateId: cid, tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.chat.started', 'ai.chat.started.v1', { conversationId: cid });
  await deps.eventBus.emit(env);

  return Ok({ conversationId: cid });
}

// ASK (single-turn question answering)
export async function askUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    question: string;
    assistantType?: import('../interfaces/index.js').AssistantType;
    context?: AIContextRef[];
  },
  deps: AIUseCaseDeps,
): Promise<Result<{ answer: string; tokensUsed: number }, ValidationError>> {
  const v = askSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Fetch AI context from Query Engine (via provider)
  const contextList: AIContextRef[] = d.context ?? [];

  // Get knowledge chunks for RAG
  const knowledgeResult = await deps.knowledgeProvider.query(d.tenantId, d.question, 3);
  const knowledgeText = knowledgeResult.ok ? knowledgeResult.value.map((c) => c.content).join('\n') : '';

  const systemPrompt = `You are a helpful ${d.assistantType ?? 'platform'} assistant. ${knowledgeText ? `Context:\n${knowledgeText}` : ''}`;
  const result = await deps.llmProvider.generate({
    systemPrompt,
    userPrompt: d.question,
    context: contextList,
  });

  if (!result.ok) {
    const failEnv = await emitAIEvent(deps, { aggregateId: 'ask', tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.failed', 'ai.failed.v1', { error: result.error.message });
    await deps.eventBus.emit(failEnv);
    return Err(new ValidationError(`LLM generation failed: ${result.error.message}`));
  }

  await recordAIAudit(deps.auditRepo, {
    tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'chat_completed', metadata: { type: 'ask', question: d.question, tokensUsed: result.value.tokensUsed },
  });

  return Ok({ answer: result.value.content, tokensUsed: result.value.tokensUsed });
}

// CHAT (multi-turn)
export async function chatUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    conversationId: string; message: string;
  },
  deps: AIUseCaseDeps,
): Promise<Result<{ reply: string; tokensUsed: number }, ValidationError | NotFoundError>> {
  const v = chatSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const conv = await deps.conversationRepo.findById(d.tenantId, d.conversationId);
  if (!conv) return Err(new NotFoundError('Conversation not found'));
  if (conv.status !== 'active') return Err(new ValidationError('Conversation is not active'));

  // Build chat messages
  const messages = [
    ...conv.messages.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: d.message },
  ];

  const result = await deps.llmProvider.chat({ messages, temperature: 0.7 });
  if (!result.ok) return Err(new ValidationError(`Chat failed: ${result.error.message}`));

  // Save messages
  const now = deps.clock.now().toISOString();
  const userMsg: ConversationMessage = {
    id: deps.idGenerator.generate(), role: 'user', content: d.message,
    tokensUsed: 0, metadata: {}, timestamp: now,
  };
  const aiMsg: ConversationMessage = {
    id: deps.idGenerator.generate(), role: 'assistant', content: result.value.message.content,
    tokensUsed: result.value.tokensUsed, metadata: {}, timestamp: now,
  };

  await deps.conversationRepo.update(d.tenantId, d.conversationId, {
    messages: [...conv.messages, userMsg, aiMsg], updatedAt: now,
  });

  const env: EventEnvelope<{ conversationId: string }> =
    await emitAIEvent(deps, { aggregateId: d.conversationId, tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.chat.completed', 'ai.chat.completed.v1', { conversationId: d.conversationId });
  await deps.eventBus.emit(env);

  await recordAIAudit(deps.auditRepo, {
    tenantId: d.tenantId, conversationId: d.conversationId, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'chat_completed', metadata: { tokensUsed: result.value.tokensUsed },
  });

  return Ok({ reply: result.value.message.content, tokensUsed: result.value.tokensUsed });
}

// END CONVERSATION
export async function endConversationUseCase(
  input: { tenantId: string; correlationId: string; conversationId: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ ended: boolean }, ValidationError | NotFoundError>> {
  const conv = await deps.conversationRepo.findById(input.tenantId, input.conversationId);
  if (!conv) return Err(new NotFoundError('Conversation not found'));

  await deps.conversationRepo.update(input.tenantId, input.conversationId, {
    status: 'ended', updatedAt: deps.clock.now().toISOString(),
  });

  return Ok({ ended: true });
}

// EXPLAIN (explain a concept or result)
export async function explainUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; topic: string; context?: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ explanation: string }, ValidationError>> {
  if (!input.topic) return Err(new ValidationError('topic required'));

  const result = await deps.llmProvider.generate({
    systemPrompt: 'You are an expert explainer. Provide clear, concise explanations.',
    userPrompt: `Explain: ${input.topic}${input.context ? `\nContext: ${input.context}` : ''}`,
  });

  if (!result.ok) return Err(new ValidationError(`Failed: ${result.error.message}`));
  return Ok({ explanation: result.value.content });
}

// REASON (chain-of-thought reasoning)
export async function reasonUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; problem: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ reasoning: string; conclusion: string }, ValidationError>> {
  if (!input.problem) return Err(new ValidationError('problem required'));

  const result = await deps.llmProvider.generate({
    systemPrompt: 'You are a logical reasoning engine. Think step by step, then provide a conclusion.',
    userPrompt: `Problem: ${input.problem}\n\nProvide step-by-step reasoning and a conclusion.`,
  });

  if (!result.ok) return Err(new ValidationError(`Failed: ${result.error.message}`));

  const content = result.value.content;
  const conclusionMatch = content.match(/(?:conclusion|therefore|thus)[\s:]+([^\n]+)/i);
  const conclusion = conclusionMatch ? conclusionMatch[1]! : content.slice(-200);

  return Ok({ reasoning: content, conclusion });
}
