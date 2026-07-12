/**
 * Platform Validation Engine — Validation Schemas (zod)
 */

import { z } from '@platform/core-sdk';

export const validationStatusSchema = z.enum([
  'Pending', 'Running', 'Passed', 'Failed', 'Skipped', 'Aborted',
]);

export const validationTypeSchema = z.enum([
  'smoke', 'regression', 'certification', 'release', 'scenario', 'e2e',
]);

export const reportTypeSchema = z.enum([
  'validation', 'scenario', 'coverage', 'release', 'regression', 'certification', 'health',
]);

// Scenario CRUD
export const createScenarioSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  name: z.string().min(1).max(300),
  description: z.string().max(2000),
  category: z.string().min(1).max(100),
  type: validationTypeSchema,
  tags: z.array(z.string()).optional(),
  steps: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000),
    engineId: z.string().min(1).max(128),
    actionName: z.string().min(1).max(200),
    params: z.record(z.unknown()),
    expectations: z.array(z.object({
      type: z.string().min(1),
      description: z.string().max(500),
      validator: z.string().min(1),
      params: z.record(z.unknown()),
      required: z.boolean(),
    })),
    timeoutMs: z.number().int().min(100).max(300000),
    continueOnFailure: z.boolean(),
    sequence: z.number().int().min(0),
  })).min(1),
});

export const updateScenarioSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  scenarioId: z.string().min(1),
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  steps: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(1000),
    engineId: z.string().min(1).max(128),
    actionName: z.string().min(1).max(200),
    params: z.record(z.unknown()),
    expectations: z.array(z.object({
      type: z.string().min(1),
      description: z.string().max(500),
      validator: z.string().min(1),
      params: z.record(z.unknown()),
      required: z.boolean(),
    })),
    timeoutMs: z.number().int().min(100).max(300000),
    continueOnFailure: z.boolean(),
    sequence: z.number().int().min(0),
  })).min(1).optional(),
});

export const deleteScenarioSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  scenarioId: z.string().min(1),
});

export const getScenarioSchema = z.object({
  tenantId: z.string().min(1),
  scenarioId: z.string().min(1),
});

export const searchScenariosSchema = z.object({
  tenantId: z.string().min(1),
  category: z.string().max(100).optional(),
  type: validationTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['Draft', 'Active', 'Archived']).optional(),
  query: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

// Validation Run
export const runValidationSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  type: validationTypeSchema,
  scenarioIds: z.array(z.string().min(1)).min(1),
});

export const runScenarioSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  scenarioId: z.string().min(1),
});

// Certification
export const runCertificationSchema = z.object({
  tenantId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  engineId: z.string().min(1),
  engineVersion: z.string().min(1),
});

// Health
export const calculateHealthSchema = z.object({
  tenantId: z.string().min(1),
});
