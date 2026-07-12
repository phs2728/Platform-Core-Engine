/** AI Engine — Validation Schemas */
import { z } from '@platform/core-sdk';

export const assistantTypeSchema = z.enum(['platform', 'booking', 'payment', 'review', 'organization', 'admin']);
export const insightTypeSchema = z.enum(['revenue', 'customer', 'booking', 'payment', 'inventory', 'review']);
export const predictionTypeSchema = z.enum(['demand_forecast', 'cancellation_risk', 'fraud_risk', 'low_stock', 'customer_churn', 'revenue_forecast']);
export const recommendationTypeSchema = z.enum(['related', 'similar', 'cross_sell', 'up_sell', 'next_best_action', 'personalized', 'trending', 'nearby']);
export const generationTypeSchema = z.enum(['reply', 'description', 'email', 'notification', 'report', 'summary', 'headline', 'tags']);

export const askSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  question: z.string().min(1).max(5000),
  assistantType: assistantTypeSchema.optional(),
  context: z.array(z.object({
    contextType: z.string(), targetRef: z.string(), summary: z.string(),
    facts: z.record(z.unknown()), sentiment: z.number().nullable(), riskLevel: z.string().nullable(),
  })).optional(),
});

export const chatSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  conversationId: z.string().min(1),
  message: z.string().min(1).max(5000),
});

export const startConversationSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  userId: z.string().min(1), assistantType: assistantTypeSchema,
});

export const recommendSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  type: recommendationTypeSchema, targetRef: z.string().min(1),
});

export const generateInsightSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  type: insightTypeSchema, targetRef: z.string().optional(),
});

export const predictSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  type: predictionTypeSchema, targetRef: z.string().optional(),
});

export const generateSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  type: generationTypeSchema, input: z.string().min(1).max(10000),
  promptName: z.string().optional(),
});

export const translateSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  text: z.string().min(1).max(10000), from: z.string().min(2), to: z.string().min(2),
});

export const createPromptSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  name: z.string().min(1).max(200), description: z.string().max(1000),
  systemPrompt: z.string().min(1).max(5000),
  userPromptTemplate: z.string().min(1).max(5000),
  variables: z.array(z.string()),
});

export const updatePromptSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  promptId: z.string().min(1),
  systemPrompt: z.string().optional(),
  userPromptTemplate: z.string().optional(),
  variables: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export const classifySchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  text: z.string().min(1).max(5000), categories: z.array(z.string()),
});

export const extractSchema = z.object({
  tenantId: z.string().min(1), correlationId: z.string().min(1), actorId: z.string().min(1),
  text: z.string().min(1).max(10000), entities: z.array(z.string()),
});
