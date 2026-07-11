/**
 * Host Stubs + EventBus + MockPaymentProvider — Test/Demo only
 *
 * Billing/Media Engine hostAdapters 패턴 동일.
 * Payment Engine 전용: Organization + User + CustomDataPolicy + Provider Plugin.
 */

import type { EventEnvelope } from '@platform/core-sdk';
import type {
  IOrganizationVerifier,
  IUserVerifier,
  ICustomDataPolicyProvider,
  IPaymentProvider,
  IPaymentProviderResolver,
  ProviderAuthorizeInput,
  ProviderCaptureInput,
  ProviderVoidInput,
  ProviderRefundInput,
  ProviderTransactionResult,
} from '../interfaces/index.js';
import { Ok, Err, type Result } from '@platform/core-sdk';

// ═══════════════════════════════════════════
// Verifiers
// ═══════════════════════════════════════════

export class InMemoryOrganizationVerifier implements IOrganizationVerifier {
  private store = new Set<string>();
  add(tenantId: string, orgId: string): void { this.store.add(`${tenantId}::${orgId}`); }
  async verify(tenantId: string, orgId: string): Promise<boolean> {
    return this.store.has(`${tenantId}::${orgId}`);
  }
  clear(): void { this.store.clear(); }
}

export class InMemoryUserVerifier implements IUserVerifier {
  private store = new Set<string>();
  add(tenantId: string, userId: string): void { this.store.add(`${tenantId}::${userId}`); }
  async verify(tenantId: string, userId: string): Promise<boolean> {
    return this.store.has(`${tenantId}::${userId}`);
  }
  clear(): void { this.store.clear(); }
}

// ═══════════════════════════════════════════
// CustomDataPolicy
// ═══════════════════════════════════════════

interface PaymentTenantConfig {
  allowedTypes: readonly string[];
  maxPaymentsPerOrg: number;
  defaultCurrency: string;
  defaultTaxRate: number;
}

export class StaticPaymentPolicyProvider implements ICustomDataPolicyProvider {
  private tenantConfig = new Map<string, PaymentTenantConfig>();

  set(tenantId: string, config: Partial<PaymentTenantConfig>): void {
    const prev = this.tenantConfig.get(tenantId);
    this.tenantConfig.set(tenantId, {
      allowedTypes: config.allowedTypes ?? prev?.allowedTypes ?? ['one-time', 'recurring', 'installment'],
      maxPaymentsPerOrg: config.maxPaymentsPerOrg ?? prev?.maxPaymentsPerOrg ?? 10000,
      defaultCurrency: config.defaultCurrency ?? prev?.defaultCurrency ?? 'USD',
      defaultTaxRate: config.defaultTaxRate ?? prev?.defaultTaxRate ?? 0,
    });
  }

  async validateAttributes(
    _tenantId: string,
    _type: string,
    attributes: Record<string, unknown>,
  ): Promise<Result<Record<string, unknown>, Error>> {
    return Ok(attributes);
  }

  async getAllowedPaymentTypes(tenantId: string): Promise<readonly string[]> {
    return this.tenantConfig.get(tenantId)?.allowedTypes ?? ['one-time', 'recurring', 'installment'];
  }

  async getMaxPaymentsPerOrg(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.maxPaymentsPerOrg ?? 10000;
  }

  async getDefaultCurrency(tenantId: string): Promise<string> {
    return this.tenantConfig.get(tenantId)?.defaultCurrency ?? 'USD';
  }

  async getDefaultTaxRate(tenantId: string): Promise<number> {
    return this.tenantConfig.get(tenantId)?.defaultTaxRate ?? 0;
  }

  clear(): void { this.tenantConfig.clear(); }
}

// ═══════════════════════════════════════════
// Mock Payment Provider (Test/Demo)
// ═══════════════════════════════════════════

let mockTxnCounter = 0;

export class MockPaymentProvider implements IPaymentProvider {
  readonly providerId: string;
  readonly providerType: string;
  private shouldDecline = false;
  private shouldFail = false;
  private validSignatures = new Set<string>();

  constructor(providerId = 'mock-provider', providerType = 'card') {
    this.providerId = providerId;
    this.providerType = providerType;
  }

  setDecline(decline: boolean): void { this.shouldDecline = decline; }
  setFail(fail: boolean): void { this.shouldFail = fail; }
  addValidSignature(sig: string): void { this.validSignatures.add(sig); }

  async authorize(input: ProviderAuthorizeInput): Promise<Result<ProviderTransactionResult, Error>> {
    if (this.shouldFail) {
      return Err(new Error('Provider network error'));
    }
    mockTxnCounter += 1;
    const status = this.shouldDecline ? 'declined' : 'approved';
    return Ok({
      providerTransactionId: `mock-auth-${mockTxnCounter}`,
      status,
      declineReason: this.shouldDecline ? 'Insufficient funds' : null,
      providerFee: Math.round(input.amount * 0.029 * 100) / 100,
      rawResponse: { mock: true, amount: input.amount, currency: input.currencyCode },
    });
  }

  async capture(input: ProviderCaptureInput): Promise<Result<ProviderTransactionResult, Error>> {
    if (this.shouldFail) {
      return Err(new Error('Provider network error'));
    }
    mockTxnCounter += 1;
    return Ok({
      providerTransactionId: `mock-capture-${mockTxnCounter}`,
      status: 'approved',
      declineReason: null,
      providerFee: 0,
      rawResponse: { mock: true, captured: input.amount },
    });
  }

  async void(_input: ProviderVoidInput): Promise<Result<ProviderTransactionResult, Error>> {
    mockTxnCounter += 1;
    return Ok({
      providerTransactionId: `mock-void-${mockTxnCounter}`,
      status: 'approved',
      declineReason: null,
      providerFee: 0,
      rawResponse: { mock: true, voided: true },
    });
  }

  async refund(input: ProviderRefundInput): Promise<Result<ProviderTransactionResult, Error>> {
    mockTxnCounter += 1;
    return Ok({
      providerTransactionId: `mock-refund-${mockTxnCounter}`,
      status: 'approved',
      declineReason: null,
      providerFee: 0,
      rawResponse: { mock: true, refunded: input.amount },
    });
  }

  async verifyWebhookSignature(_payload: unknown, signature: string): Promise<Result<boolean, Error>> {
    return Ok(this.validSignatures.has(signature));
  }
}

export class InMemoryPaymentProviderResolver implements IPaymentProviderResolver {
  private providers = new Map<string, IPaymentProvider>();
  private defaultProvider: IPaymentProvider | null = null;

  register(provider: IPaymentProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  setDefault(provider: IPaymentProvider): void {
    this.defaultProvider = provider;
    this.providers.set(provider.providerId, provider);
  }

  async resolve(providerId: string): Promise<Result<IPaymentProvider, Error>> {
    const p = this.providers.get(providerId);
    if (!p) return Err(new Error(`Provider not found: ${providerId}`));
    return Ok(p);
  }

  async getDefault(_tenantId: string): Promise<Result<IPaymentProvider, Error>> {
    if (!this.defaultProvider) return Err(new Error('No default provider'));
    return Ok(this.defaultProvider);
  }
}

// ═══════════════════════════════════════════
// EventBus
// ═══════════════════════════════════════════

export interface RecordedEnvelope<T = unknown> {
  envelope: EventEnvelope<T>;
  recordedAt: number;
}

export class InMemoryEventBus {
  readonly emitted: RecordedEnvelope[] = [];

  async emit<T>(envelope: EventEnvelope<T>): Promise<void> {
    this.emitted.push({ envelope, recordedAt: Date.now() });
  }

  byType(eventType: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.eventType === eventType);
  }

  byAggregate(aggregateId: string): RecordedEnvelope[] {
    return this.emitted.filter((r) => r.envelope.aggregateId === aggregateId);
  }

  countByType(eventType: string): number {
    return this.byType(eventType).length;
  }

  clear(): void { this.emitted.length = 0; }
}
