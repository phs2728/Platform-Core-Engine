/**
 * contract_gen/ — Contract First Automation Pipeline
 *
 * Platform uses Zod. This module extends contract definitions to auto-generate:
 *   - OpenAPI 3.1 specs
 *   - JSON Schema exports
 *   - Typed SDKs (TypeScript, Swift, Kotlin, Flutter/Dart, frontend client)
 *   - AI prompt schemas (structured input/output for LLM tool use)
 *   - MCP (Model Context Protocol) tool definitions
 *
 * Source of truth = Zod-derived `ZodSchemaInfo`. Everything else is derived.
 *
 * @example
 * ```ts
 * import {
 *   generateContractPipeline,
 *   type ZodSchemaInfo,
 * } from './contract_gen/index.js';
 *
 * const userShape: ZodSchemaInfo = {
 *   name: 'User',
 *   version: '1.0.0',
 *   schemaShape: { id: 'string', email: 'string', age: 'number' },
 *   required: ['id', 'email'],
 *   optional: ['age'],
 * };
 *
 * const result = generateContractPipeline({
 *   input: [userShape],
 *   targets: ['openapi', 'typescript', 'mcp-tool', 'ai-prompt'],
 *   versionCompatibility: 'minor',
 * });
 * ```
 */

// ---------------------------------------------------------------------------
// Target catalog
// ---------------------------------------------------------------------------

export type ContractTarget =
  | 'openapi'
  | 'json-schema'
  | 'typescript'
  | 'swift'
  | 'kotlin'
  | 'flutter'
  | 'ai-prompt'
  | 'mcp-tool'
  | 'frontend-client';

export const ALL_CONTRACT_TARGETS: ContractTarget[] = [
  'openapi',
  'json-schema',
  'typescript',
  'swift',
  'kotlin',
  'flutter',
  'ai-prompt',
  'mcp-tool',
  'frontend-client',
];

// ---------------------------------------------------------------------------
// Core data structures
// ---------------------------------------------------------------------------

/**
 * A reduced, serializable description of a Zod schema.
 *
 * `schemaShape` maps field name → JSON-Schema-style primitive type string
 * (e.g. `"string"`, `"number"`, `"boolean"`, `"string[]"`).
 */
export interface ZodSchemaInfo {
  name: string;
  version: string;
  schemaShape: Record<string, string>;
  required: string[];
  optional: string[];
}

/** OpenAPI 3.1.0 document. */
export interface OpenAPISpec {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Record<string, unknown>>;
  components: Record<string, unknown>;
}

/** A standalone JSON Schema (draft 2020-12 compatible) object export. */
export interface JSONSchemaExport {
  title: string;
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
}

/** A single generated SDK source file for a given target platform. */
export interface SDKFile {
  target: ContractTarget;
  filename: string;
  content: string;
}

/** MCP (Model Context Protocol) tool definition. */
export interface MCPToolDef {
  name: string;
  description: string;
  inputSchema: JSONSchemaExport;
}

/** Structured schema pair used to drive AI / LLM tool prompts. */
export interface AIPromptSchema {
  name: string;
  description: string;
  inputSchema: JSONSchemaExport;
  outputSchema: JSONSchemaExport;
  examples: unknown[];
}

/** Declarative description of a full contract-generation run. */
export interface ContractGenerationPipeline {
  input: ZodSchemaInfo[];
  targets: ContractTarget[];
  versionCompatibility: 'major' | 'minor' | 'patch';
}

/** Output of a full contract-generation run. */
export interface ContractGenerationResult {
  openapi: OpenAPISpec | undefined;
  jsonSchemas: JSONSchemaExport[];
  sdks: SDKFile[];
  mcpTools: MCPToolDef[];
  aiPrompts: AIPromptSchema[];
}

// ---------------------------------------------------------------------------
// Type-shape → JSON Schema property conversion
// ---------------------------------------------------------------------------

/**
 * Convert a single `schemaShape` type token into a JSON Schema property
 * fragment. Supports primitives plus array-of-primitive notation (`"string[]"`).
 */
function shapeTypeToJSONProperty(typeToken: string): Record<string, unknown> {
  const trimmed = typeToken.trim();

  // Array of primitives, e.g. "string[]", "number[]"
  const arrayMatch = /^(.+?)\[\]$/.exec(trimmed);
  if (arrayMatch && arrayMatch[1]) {
    const inner = arrayMatch[1].trim();
    const itemType = primitiveToJsonSchemaType(inner);
    return {
      type: 'array',
      items: { type: itemType },
    };
  }

  const primitive = primitiveToJsonSchemaType(trimmed);
  return { type: primitive };
}

/** Map a free-form primitive name to a JSON Schema `type` value. */
function primitiveToJsonSchemaType(raw: string): string {
  const normalized = raw.toLowerCase();
  switch (normalized) {
    case 'string':
    case 'str':
    case 'text':
    case 'uuid':
    case 'email':
    case 'uri':
    case 'url':
    case 'date':
    case 'date-time':
    case 'datetime':
      return 'string';
    case 'number':
    case 'num':
    case 'float':
    case 'double':
    case 'decimal':
      return 'number';
    case 'int':
    case 'integer':
    case 'long':
      return 'integer';
    case 'bool':
    case 'boolean':
      return 'boolean';
    default:
      // Unknown / nested reference → treat as generic object
      return 'object';
  }
}

// ---------------------------------------------------------------------------
// ZodSchemaInfo → JSON Schema
// ---------------------------------------------------------------------------

/**
 * Convert a `ZodSchemaInfo` into a standalone JSON Schema object export.
 *
 * Required fields are listed in `required`; optional fields are present in
 * `properties` but omitted from `required` (per JSON Schema convention).
 */
export function zodToJSONSchema(info: ZodSchemaInfo): JSONSchemaExport {
  const properties: Record<string, unknown> = {};

  for (const [field, typeToken] of Object.entries(info.schemaShape)) {
    properties[field] = shapeTypeToJSONProperty(typeToken);
  }

  return {
    title: info.name,
    type: 'object',
    properties,
    required: [...info.required],
  };
}

// ---------------------------------------------------------------------------
// JSON Schema → OpenAPI 3.1
// ---------------------------------------------------------------------------

/**
 * Wrap a collection of JSON Schemas into an OpenAPI 3.1.0 document.
 *
 * Each schema is registered under `components.schemas` and a synthetic
 * `GET /{name}` path is generated so the document is self-describing and
 * usable by code generators / Swagger UI out of the box.
 */
export function jsonSchemaToOpenAPI(
  schemas: JSONSchemaExport[],
  title: string,
  version: string,
): OpenAPISpec {
  const componentsSchemas: Record<string, unknown> = {};
  const paths: Record<string, Record<string, unknown>> = {};

  for (const schema of schemas) {
    componentsSchemas[schema.title] = schema;

    const pathKey = `/${schema.title.toLowerCase()}`;
    paths[pathKey] = {
      get: {
        summary: `Retrieve a ${schema.title}`,
        operationId: `get${schema.title}`,
        responses: {
          '200': {
            description: `A ${schema.title} instance`,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${schema.title}`,
                },
              },
            },
          },
        },
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: { title, version },
    paths,
    components: { schemas: componentsSchemas },
  };
}

// ---------------------------------------------------------------------------
// Backward compatibility checking
// ---------------------------------------------------------------------------

/**
 * Compare two versions of a schema and report breaking changes.
 *
 * Breaking changes:
 *   - A previously required field was removed.
 *   - A previously required field became optional (weakened guarantee).
 *   - A field's type changed incompatibly.
 *
 * Non-breaking (allowed) changes:
 *   - New optional fields added.
 *   - A previously optional field became required (strengthens the contract
 *     for new producers, tolerated by the checker).
 *   - New required fields are *not* flagged as breaking for the old shape,
 *     since old payloads still validate under the old schema.
 */
export function checkBackwardCompatibility(
  oldShape: ZodSchemaInfo,
  newShape: ZodSchemaInfo,
): { compatible: boolean; breakingChanges: string[] } {
  const breakingChanges: string[] = [];

  const oldRequired = new Set(oldShape.required);
  const newRequired = new Set(newShape.required);
  const newShapeKeys = new Set(Object.keys(newShape.schemaShape));

  // 1. Removed required fields.
  for (const field of oldRequired) {
    if (!newShapeKeys.has(field)) {
      breakingChanges.push(
        `Required field "${field}" was removed from "${newShape.name}".`,
      );
    }
  }

  // 2. Required → optional (weakened guarantee for consumers expecting it).
  for (const field of oldRequired) {
    if (newShapeKeys.has(field) && !newRequired.has(field)) {
      breakingChanges.push(
        `Field "${field}" changed from required to optional in "${newShape.name}".`,
      );
    }
  }

  // 3. Type changes on surviving fields.
  for (const field of oldRequired) {
    const oldType = oldShape.schemaShape[field];
    const newType = newShape.schemaShape[field];
    if (oldType !== undefined && newType !== undefined && oldType !== newType) {
      breakingChanges.push(
        `Field "${field}" type changed from "${oldType}" to "${newType}" in "${newShape.name}".`,
      );
    }
  }

  return {
    compatible: breakingChanges.length === 0,
    breakingChanges,
  };
}

// ---------------------------------------------------------------------------
// SDK generators
// ---------------------------------------------------------------------------

/**
 * Generate a TypeScript interface file from a JSON Schema export.
 *
 * Primitive mapping is conservative: unknown types collapse to `unknown`.
 */
function generateTypeScriptSDK(schema: JSONSchemaExport): string {
  const lines: string[] = [
    `/** Auto-generated from contract "${schema.title}". Do not edit by hand. */`,
    `export interface ${schema.title} {`,
  ];

  const requiredSet = new Set(schema.required);
  for (const [field, prop] of Object.entries(schema.properties)) {
    const tsType = jsonPropertyToTypeScript(prop);
    const isRequired = requiredSet.has(field);
    const suffix = isRequired ? '' : '?';
    lines.push(`  ${field}${suffix}: ${tsType};`);
  }

  lines.push('}');
  return lines.join('\n');
}

/** Map a JSON Schema property fragment to a TypeScript type annotation. */
function jsonPropertyToTypeScript(prop: unknown): string {
  if (typeof prop !== 'object' || prop === null) return 'unknown';
  const obj = prop as Record<string, unknown>;
  const type = obj['type'];

  if (type === 'array') {
    const items = obj['items'];
    const itemType =
      typeof items === 'object' && items !== null
        ? jsonPropertyToTypeScript(items)
        : 'unknown';
    return `${itemType}[]`;
  }

  switch (type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'Record<string, unknown>';
    default:
      return 'unknown';
  }
}

/**
 * Generate a Swift `struct` (Codable) from a JSON Schema export.
 */
function generateSwiftSDK(schema: JSONSchemaExport): string {
  const requiredSet = new Set(schema.required);
  const fields = Object.entries(schema.properties).map(([field, prop]) => {
    const swiftType = jsonPropertyToSwift(prop);
    const isRequired = requiredSet.has(field);
    const suffix = isRequired ? '' : '?';
    return `    let ${field}: ${swiftType}${suffix}`;
  });

  return [
    `// Auto-generated from contract "${schema.title}".`,
    `import Foundation`,
    ``,
    `public struct ${schema.title}: Codable {`,
    ...fields,
    `}`,
  ].join('\n');
}

function jsonPropertyToSwift(prop: unknown): string {
  if (typeof prop !== 'object' || prop === null) return 'Any';
  const obj = prop as Record<string, unknown>;
  const type = obj['type'];

  if (type === 'array') {
    const items = obj['items'];
    const itemType =
      typeof items === 'object' && items !== null
        ? jsonPropertyToSwift(items)
        : 'Any';
    return `[${itemType}]`;
  }

  switch (type) {
    case 'string':
      return 'String';
    case 'number':
    case 'integer':
      return 'Double';
    case 'boolean':
      return 'Bool';
    default:
      return 'Any';
  }
}

/**
 * Generate a Kotlin `data class` from a JSON Schema export.
 */
function generateKotlinSDK(schema: JSONSchemaExport): string {
  const requiredSet = new Set(schema.required);
  const fields = Object.entries(schema.properties).map(([field, prop]) => {
    const kotlinType = jsonPropertyToKotlin(prop);
    const isRequired = requiredSet.has(field);
    const nullable = isRequired ? '' : '?';
    return `    val ${field}: ${kotlinType}${nullable}`;
  });

  return [
    `// Auto-generated from contract "${schema.title}".`,
    `package generated.contract`,
    ``,
    `data class ${schema.title}(`,
    fields.join(',\n'),
    `)`,
  ].join('\n');
}

function jsonPropertyToKotlin(prop: unknown): string {
  if (typeof prop !== 'object' || prop === null) return 'Any';
  const obj = prop as Record<string, unknown>;
  const type = obj['type'];

  if (type === 'array') {
    const items = obj['items'];
    const itemType =
      typeof items === 'object' && items !== null
        ? jsonPropertyToKotlin(items)
        : 'Any';
    return `List<${itemType}>`;
  }

  switch (type) {
    case 'string':
      return 'String';
    case 'number':
      return 'Double';
    case 'integer':
      return 'Int';
    case 'boolean':
      return 'Boolean';
    default:
      return 'Any';
  }
}

/**
 * Generate a Dart (Flutter) model class from a JSON Schema export.
 */
function generateFlutterSDK(schema: JSONSchemaExport): string {
  const requiredSet = new Set(schema.required);
  const fields = Object.entries(schema.properties).map(([field, prop]) => {
    const dartType = jsonPropertyToDart(prop);
    const isRequired = requiredSet.has(field);
    const nullable = isRequired ? '' : '?';
    return `  final ${dartType}${nullable} ${field};`;
  });

  const constructorParams = Object.entries(schema.properties).map(
    ([field, prop]) => {
      const dartType = jsonPropertyToDart(prop);
      const isRequired = requiredSet.has(field);
      const prefix = isRequired ? 'required ' : '';
      return `    ${prefix}this.${field},`;
    },
  );

  const name = schema.title;
  return [
    `// Auto-generated from contract "${name}".`,
    `// Dart (Flutter) model`,
    ``,
    `class ${name} {`,
    ...fields,
    ``,
    `  const ${name}({`,
    ...constructorParams,
    `  });`,
    `}`,
  ].join('\n');
}

function jsonPropertyToDart(prop: unknown): string {
  if (typeof prop !== 'object' || prop === null) return 'dynamic';
  const obj = prop as Record<string, unknown>;
  const type = obj['type'];

  if (type === 'array') {
    const items = obj['items'];
    const itemType =
      typeof items === 'object' && items !== null
        ? jsonPropertyToDart(items)
        : 'dynamic';
    return `List<${itemType}>`;
  }

  switch (type) {
    case 'string':
      return 'String';
    case 'number':
      return 'double';
    case 'integer':
      return 'int';
    case 'boolean':
      return 'bool';
    default:
      return 'dynamic';
  }
}

/**
 * Generate a lightweight typed frontend HTTP client (TypeScript) that mirrors
 * the schema's `GET /{name}` operation and returns typed responses.
 */
function generateFrontendClientSDK(schema: JSONSchemaExport): string {
  const name = schema.title;
  const lower = name.toLowerCase();
  return [
    `/** Auto-generated frontend client for "${name}". */`,
    `export interface ${name} {`,
    ...Object.entries(schema.properties).map(([field, prop]) => {
      const tsType = jsonPropertyToTypeScript(prop);
      const required = schema.required.includes(field);
      return `  ${field}${required ? '' : '?'}: ${tsType};`;
    }),
    `}`,
    ``,
    `export async function fetch${name}(baseURL: string, id: string): Promise<${name}> {`,
    `  const res = await fetch(\`\${baseURL}/${lower}/\${id}\`);`,
    `  if (!res.ok) throw new Error(\`Failed to fetch ${name}: \${res.status}\`);`,
    `  return (await res.json()) as ${name};`,
    `}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// MCP tool generation
// ---------------------------------------------------------------------------

/**
 * Derive an MCP tool definition from a schema. The tool accepts the schema as
 * its structured `inputSchema`.
 */
function generateMCPTool(schema: JSONSchemaExport): MCPToolDef {
  return {
    name: schema.title,
    description: `MCP tool for the ${schema.title} contract. Accepts an instance of ${schema.title} as structured input.`,
    inputSchema: schema,
  };
}

// ---------------------------------------------------------------------------
// AI prompt generation
// ---------------------------------------------------------------------------

/**
 * Derive an AI prompt schema. Input = the schema itself; output = a synthetic
 * confirmation/echo schema containing the primary key plus a `status` field.
 * `examples` is seeded with a single empty example that downstream prompt
 * builders can enrich.
 */
function generateAIPrompt(schema: JSONSchemaExport): AIPromptSchema {
  const primaryKey = schema.required[0];

  const outputProperties: Record<string, unknown> = {};
  if (primaryKey !== undefined) {
    outputProperties[primaryKey] =
      schema.properties[primaryKey] ?? { type: 'string' };
  }
  outputProperties['status'] = { type: 'string' };

  const outputRequired: string[] = [];
  if (primaryKey !== undefined) outputRequired.push(primaryKey);
  outputRequired.push('status');

  const outputSchema: JSONSchemaExport = {
    title: `${schema.title}Output`,
    type: 'object',
    properties: outputProperties,
    required: outputRequired,
  };

  return {
    name: schema.title,
    description: `AI tool schema for ${schema.title}. Use the input schema to validate tool invocations and the output schema to structure model responses.`,
    inputSchema: schema,
    outputSchema,
    examples: [{}],
  };
}

// ---------------------------------------------------------------------------
// Pipeline orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the full contract-first generation pipeline.
 *
 * Steps:
 *   1. Convert all `ZodSchemaInfo` inputs to JSON Schemas.
 *   2. Optionally produce an OpenAPI document (if 'openapi' is targeted).
 *   3. For each requested target, emit the corresponding artifacts.
 *
 * The `versionCompatibility` flag is recorded for downstream consumers; it
 * does not by itself filter output but is intended to gate publish steps.
 */
export function generateContractPipeline(
  pipeline: ContractGenerationPipeline,
): ContractGenerationResult {
  const { input, targets } = pipeline;

  // Step 1: derive JSON Schemas (always — they are the universal IR).
  const jsonSchemas: JSONSchemaExport[] = input.map((info) =>
    zodToJSONSchema(info),
  );

  const targetSet = new Set(targets);

  // Step 2: OpenAPI (only when requested).
  let openapi: OpenAPISpec | undefined;
  if (targetSet.has('openapi') && jsonSchemas.length > 0) {
    const first = input[0];
    const title = first ? `${first.name} API` : 'Generated API';
    const version = first ? first.version : '0.0.0';
    openapi = jsonSchemaToOpenAPI(jsonSchemas, title, version);
  }

  // Step 3: per-target SDK + tool + prompt generation.
  const sdks: SDKFile[] = [];
  const mcpTools: MCPToolDef[] = [];
  const aiPrompts: AIPromptSchema[] = [];

  for (const schema of jsonSchemas) {
    if (targetSet.has('json-schema')) {
      sdks.push({
        target: 'json-schema',
        filename: `${schema.title}.schema.json`,
        content: `${JSON.stringify(schema, null, 2)}\n`,
      });
    }

    if (targetSet.has('typescript')) {
      sdks.push({
        target: 'typescript',
        filename: `${schema.title}.ts`,
        content: `${generateTypeScriptSDK(schema)}\n`,
      });
    }

    if (targetSet.has('swift')) {
      sdks.push({
        target: 'swift',
        filename: `${schema.title}.swift`,
        content: `${generateSwiftSDK(schema)}\n`,
      });
    }

    if (targetSet.has('kotlin')) {
      sdks.push({
        target: 'kotlin',
        filename: `${schema.title}.kt`,
        content: `${generateKotlinSDK(schema)}\n`,
      });
    }

    if (targetSet.has('flutter')) {
      sdks.push({
        target: 'flutter',
        filename: `${schema.title}.dart`,
        content: `${generateFlutterSDK(schema)}\n`,
      });
    }

    if (targetSet.has('frontend-client')) {
      sdks.push({
        target: 'frontend-client',
        filename: `${schema.title}Client.ts`,
        content: `${generateFrontendClientSDK(schema)}\n`,
      });
    }

    if (targetSet.has('mcp-tool')) {
      mcpTools.push(generateMCPTool(schema));
    }

    if (targetSet.has('ai-prompt')) {
      aiPrompts.push(generateAIPrompt(schema));
    }
  }

  return {
    openapi,
    jsonSchemas,
    sdks,
    mcpTools,
    aiPrompts,
  };
}
