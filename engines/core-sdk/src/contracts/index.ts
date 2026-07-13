/**
 * contracts/index.ts — Contract Testing Framework
 *
 * Sprint A-4: Consumer Contract Tests + Provider Contract Tests
 */

// ═══════════════════════════════════════════
// Event Contract
// ═══════════════════════════════════════════

export interface EventContract {
  readonly eventType: string;
  readonly version: string;
  readonly schemaRef: string;
  readonly producerEngine: string;
  readonly payloadSchema: Record<string, unknown>;  // JSON Schema shape
}

export interface ContractRegistry {
  readonly contracts: Map<string, EventContract>;
  register(contract: EventContract): void;
  get(eventType: string, version?: string): EventContract | null;
  getAll(): EventContract[];
}

export class InMemoryContractRegistry implements ContractRegistry {
  readonly contracts = new Map<string, EventContract>();

  register(contract: EventContract): void {
    const key = `${contract.eventType}:${contract.version}`;
    this.contracts.set(key, contract);
  }

  get(eventType: string, version = '1.0.0'): EventContract | null {
    return this.contracts.get(`${eventType}:${version}`) ?? null;
  }

  getAll(): EventContract[] {
    return [...this.contracts.values()];
  }
}

// ═══════════════════════════════════════════
// Schema Compatibility Check
// ═══════════════════════════════════════════

export interface SchemaCompatibilityResult {
  readonly compatible: boolean;
  readonly breakingChanges: string[];
  readonly additiveChanges: string[];
}

export function checkSchemaCompatibility(
  oldSchema: Record<string, unknown>,
  newSchema: Record<string, unknown>,
): SchemaCompatibilityResult {
  const breakingChanges: string[] = [];
  const additiveChanges: string[] = [];
  const oldKeys = new Set(Object.keys(oldSchema));
  const newKeys = new Set(Object.keys(newSchema));

  // Removed fields = breaking
  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      breakingChanges.push(`Field '${key}' was removed`);
    }
  }

  // Added fields = additive (OK)
  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      additiveChanges.push(`Field '${key}' was added`);
    }
  }

  // Type changes = breaking
  for (const key of oldKeys) {
    if (newKeys.has(key)) {
      const oldType = typeof oldSchema[key];
      const newType = typeof newSchema[key];
      if (oldType !== newType) {
        breakingChanges.push(`Field '${key}' type changed from ${oldType} to ${newType}`);
      }
    }
  }

  return { compatible: breakingChanges.length === 0, breakingChanges, additiveChanges };
}

// ═══════════════════════════════════════════
// Consumer Contract Test
// ═══════════════════════════════════════════

export interface ConsumerContractTest {
  readonly name: string;
  readonly eventType: string;
  readonly version: string;
  readonly expectedFields: string[];
  readonly testPayload: unknown;
}

export interface ConsumerTestResult {
  readonly testName: string;
  readonly passed: boolean;
  readonly missingFields: string[];
}

export function runConsumerContractTest(
  test: ConsumerContractTest,
  actualPayload: Record<string, unknown>,
): ConsumerTestResult {
  const missingFields = test.expectedFields.filter(f => !(f in actualPayload));
  return {
    testName: test.name,
    passed: missingFields.length === 0,
    missingFields,
  };
}

// ═══════════════════════════════════════════
// Version Compatibility
// ═══════════════════════════════════════════

export function isVersionCompatible(consumerVersion: string, providerVersion: string): boolean {
  const [cMajor] = consumerVersion.split('.').map(Number);
  const [pMajor] = providerVersion.split('.').map(Number);
  // Major version must match for backward compatibility
  return cMajor === pMajor;
}