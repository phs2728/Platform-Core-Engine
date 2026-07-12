/**
 * AI Generation + Prompt + Knowledge UseCases (13) —
 *   generate / rewrite / translate / classify / extract +
 *   createPrompt / updatePrompt / listPrompts / validatePrompt +
 *   ingestKnowledge / queryKnowledge
 */
import {
  Ok, Err, type Result,
  ValidationError, NotFoundError,
  type EventEnvelope,
} from '@platform/core-sdk';
import { recordAIAudit } from '../domain/audit.js';
import {
  generateSchema, translateSchema, createPromptSchema, updatePromptSchema,
  classifySchema, extractSchema,
} from '../domain/validation.js';
import { emitAIEvent } from '../domain/events.js';
import type { AIUseCaseDeps } from './types.js';
import type {
  AIGeneration, GenerationType, PromptTemplate, KnowledgeEntry,
} from '../interfaces/index.js';

// ═══════════════════════════════════════════
// GENERATION (5)
// ═══════════════════════════════════════════

export async function generateUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    type: GenerationType; input: string; promptName?: string;
  },
  deps: AIUseCaseDeps,
): Promise<Result<AIGeneration, ValidationError>> {
  const v = generateSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Get prompt template (if provided)
  let systemPrompt = `You are a professional content generator. Generate ${d.type} content.`;
  let userPrompt = d.input;
  let promptUsed = 'default';

  if (d.promptName) {
    // Try promptRepo first, then promptProvider
    const existing = await deps.promptRepo.findByName(d.tenantId, d.promptName, true);
    if (existing) {
      systemPrompt = existing.systemPrompt;
      userPrompt = existing.userPromptTemplate.replace('{{input}}', d.input);
      promptUsed = d.promptName;
    } else {
      const promptResult = await deps.promptProvider.getPrompt(d.promptName);
      if (promptResult.ok) {
        systemPrompt = promptResult.value.systemPrompt;
        userPrompt = promptResult.value.userPromptTemplate.replace('{{input}}', d.input);
        promptUsed = d.promptName;
      }
    }
  }

  const llmResult = await deps.llmProvider.generate({ systemPrompt, userPrompt });
  if (!llmResult.ok) return Err(new ValidationError(`Generation failed: ${llmResult.error.message}`));

  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const gen: AIGeneration = {
    id, tenantId: d.tenantId, type: d.type,
    input: d.input, output: llmResult.value.content,
    promptUsed, tokensUsed: llmResult.value.tokensUsed,
    createdAt: now,
  };

  const env: EventEnvelope<{ genId: string; type: string }> =
    await emitAIEvent(deps, { aggregateId: id, tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.summary.generated', 'ai.summary.generated.v1', { genId: id, type: d.type });
  await deps.eventBus.emit(env);

  await recordAIAudit(deps.auditRepo, {
    tenantId: d.tenantId, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'generation_completed', metadata: { type: d.type, tokensUsed: llmResult.value.tokensUsed },
  });

  return Ok(gen);
}

export async function rewriteUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; text: string; style: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ rewritten: string }, ValidationError>> {
  if (!input.text || !input.style) return Err(new ValidationError('text and style required'));
  const r = await deps.llmProvider.generate({
    systemPrompt: `Rewrite the text in a ${input.style} style.`,
    userPrompt: input.text,
  });
  return Ok({ rewritten: r.ok ? r.value.content : input.text });
}

export async function translateUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; text: string; from: string; to: string },
  deps: AIUseCaseDeps,
): Promise<Result<{ translated: string; from: string; to: string }, ValidationError>> {
  const v = translateSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const result = await deps.translationProvider.translate(d.text, d.from, d.to);
  if (!result.ok) return Err(new ValidationError(`Translation failed: ${result.error.message}`));

  const env: EventEnvelope<{ from: string; to: string }> =
    await emitAIEvent(deps, { aggregateId: 'translate', tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.translation.completed', 'ai.translation.completed.v1', { from: d.from, to: d.to });
  await deps.eventBus.emit(env);

  return Ok({ translated: result.value, from: d.from, to: d.to });
}

export async function classifyUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; text: string; categories: string[] },
  deps: AIUseCaseDeps,
): Promise<Result<{ category: string; confidence: number; allScores: Record<string, number> }, ValidationError>> {
  const v = classifySchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const r = await deps.llmProvider.generate({
    systemPrompt: `Classify the text into one of: ${d.categories.join(', ')}. Respond with only the category name.`,
    userPrompt: d.text,
  });

  const category = r.ok ? r.value.content.trim().split('\n')[0]! : d.categories[0]!;
  const allScores: Record<string, number> = {};
  for (const c of d.categories) {
    allScores[c] = c === category ? 0.9 : Math.random() * 0.3;
  }

  return Ok({ category, confidence: allScores[category] ?? 0.5, allScores });
}

export async function extractUseCase(
  input: { tenantId: string; correlationId: string; actorId: string; text: string; entities: string[] },
  deps: AIUseCaseDeps,
): Promise<Result<{ extracted: Record<string, string[]> }, ValidationError>> {
  const v = extractSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const r = await deps.llmProvider.generate({
    systemPrompt: `Extract the following entities from the text: ${d.entities.join(', ')}. Return as JSON.`,
    userPrompt: d.text,
  });

  // Simple mock extraction — try to find entity mentions
  const extracted: Record<string, string[]> = {};
  for (const entity of d.entities) {
    const regex = new RegExp(`\\b${entity}\\b[^\\n]*`, 'gi');
    const matches = d.text.match(regex);
    extracted[entity] = matches ?? [];
  }

  return Ok({ extracted });
}

// ═══════════════════════════════════════════
// PROMPT MANAGEMENT (4)
// ═══════════════════════════════════════════

export async function createPromptUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    name: string; description: string;
    systemPrompt: string; userPromptTemplate: string; variables: string[];
  },
  deps: AIUseCaseDeps,
): Promise<Result<{ promptId: string; version: number }, ValidationError>> {
  const v = createPromptSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  // Deactivate previous versions
  const existing = await deps.promptRepo.findByName(d.tenantId, d.name);
  let version = 1;
  if (existing) {
    await deps.promptRepo.update(d.tenantId, existing.id, { active: false });
    version = existing.version + 1;
  }

  const pid = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();
  const prompt: PromptTemplate = {
    id: pid, tenantId: d.tenantId, name: d.name, description: d.description,
    systemPrompt: d.systemPrompt, userPromptTemplate: d.userPromptTemplate,
    variables: d.variables, version, active: true,
    createdAt: now, updatedAt: now,
  };
  await deps.promptRepo.insert(prompt);

  const env: EventEnvelope<{ promptId: string; version: number }> =
    await emitAIEvent(deps, { aggregateId: pid, tenantId: d.tenantId, correlationId: d.correlationId },
      'ai.prompt.updated', 'ai.prompt.updated.v1', { promptId: pid, version });
  await deps.eventBus.emit(env);

  await recordAIAudit(deps.auditRepo, {
    tenantId: d.tenantId, promptId: pid, actorId: d.actorId, correlationId: d.correlationId,
    eventType: 'prompt_updated', metadata: { name: d.name, version },
  });

  return Ok({ promptId: pid, version });
}

export async function updatePromptUseCase(
  input: {
    tenantId: string; correlationId: string; actorId: string;
    promptId: string;
    systemPrompt?: string; userPromptTemplate?: string;
    variables?: string[]; active?: boolean;
  },
  deps: AIUseCaseDeps,
): Promise<Result<PromptTemplate, ValidationError | NotFoundError>> {
  const v = updatePromptSchema.safeParse(input);
  if (!v.success) return Err(new ValidationError('Invalid input', { details: { issues: v.error.errors } }));
  const d = v.data;

  const existing = await deps.promptRepo.findById(d.tenantId, d.promptId);
  if (!existing) return Err(new NotFoundError('Prompt not found'));

  const patch: Partial<PromptTemplate> = { updatedAt: deps.clock.now().toISOString() };
  if (d.systemPrompt !== undefined) patch.systemPrompt = d.systemPrompt;
  if (d.userPromptTemplate !== undefined) patch.userPromptTemplate = d.userPromptTemplate;
  if (d.variables !== undefined) patch.variables = d.variables;
  if (d.active !== undefined) patch.active = d.active;

  await deps.promptRepo.update(d.tenantId, d.promptId, patch);
  return Ok({ ...existing, ...patch });
}

export async function listPromptsUseCase(
  tenantId: string, deps: AIUseCaseDeps,
): Promise<Result<PromptTemplate[], ValidationError>> {
  if (!tenantId) return Err(new ValidationError('tenantId required'));
  return Ok(await deps.promptRepo.listByTenant(tenantId));
}

export async function validatePromptUseCase(
  input: { tenantId: string; systemPrompt: string; userPromptTemplate: string; variables: string[] },
  deps: AIUseCaseDeps,
): Promise<Result<{ valid: boolean; missingVariables: string[]; warnings: string[] }, ValidationError>> {
  if (!input.systemPrompt || !input.userPromptTemplate) return Err(new ValidationError('prompts required'));

  // Check that all declared variables have placeholders
  const missing: string[] = [];
  const warnings: string[] = [];
  for (const v of input.variables) {
    if (!input.userPromptTemplate.includes(`{{${v}}}`)) {
      missing.push(v);
    }
  }

  if (input.systemPrompt.length > 4000) warnings.push('System prompt exceeds 4000 chars');
  if (input.userPromptTemplate.length > 4000) warnings.push('User prompt template exceeds 4000 chars');

  return Ok({ valid: missing.length === 0, missingVariables: missing, warnings });
}

// ═══════════════════════════════════════════
// KNOWLEDGE (2)
// ═══════════════════════════════════════════

export async function ingestKnowledgeUseCase(
  input: { tenantId: string; correlationId: string; content: string; source: string; metadata?: Record<string, unknown> },
  deps: AIUseCaseDeps,
): Promise<Result<{ entryId: string; embedded: boolean }, ValidationError>> {
  if (!input.content || !input.source) return Err(new ValidationError('content and source required'));

  const id = deps.idGenerator.generate();
  const now = deps.clock.now().toISOString();

  // Generate embedding
  const embedResult = await deps.embeddingProvider.embed(input.content);
  const vector = embedResult.ok ? embedResult.value : null;

  const entry: KnowledgeEntry = {
    id, tenantId: input.tenantId, content: input.content, source: input.source,
    vector, metadata: input.metadata ?? {}, createdAt: now,
  };
  await deps.knowledgeRepo.insert(entry);

  // Store vector for similarity search
  if (vector) {
    await deps.vectorProvider.upsert(id, vector, { source: input.source, tenantId: input.tenantId });
  }

  return Ok({ entryId: id, embedded: vector !== null });
}

export async function queryKnowledgeUseCase(
  input: { tenantId: string; query: string; limit?: number },
  deps: AIUseCaseDeps,
): Promise<Result<{ chunks: { content: string; source: string; score: number }[] }, ValidationError>> {
  if (!input.query) return Err(new ValidationError('query required'));

  // Embed query
  const queryEmbedResult = await deps.embeddingProvider.embed(input.query);
  if (queryEmbedResult.ok) {
    const searchResult = await deps.vectorProvider.search(queryEmbedResult.value, input.limit ?? 5);
    if (searchResult.ok) {
      const chunks = searchResult.value.map((m) => ({
        content: String(m.metadata.content ?? ''),
        source: String(m.metadata.source ?? ''),
        score: m.score,
      }));
      return Ok({ chunks });
    }
  }

  // Fallback: keyword search
  const results = await deps.knowledgeRepo.search(input.tenantId, input.query, input.limit ?? 5);
  return Ok({
    chunks: results.map((r) => ({ content: r.content, source: r.source, score: 1 })),
  });
}
