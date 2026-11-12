/** Provider-agnostic runtime contract. Does not import Stripe or process secrets. */
export type PaymentCapability = 'authorize'|'capture'|'cancel'|'partial-refund'|'webhook'|'reconcile';
export type PaymentOutcome = 'PENDING'|'SUCCEEDED'|'FAILED'|'UNKNOWN';
export interface ProviderResult { status: PaymentOutcome; providerReference?: string; rawReference?: string }
export interface PaymentContext { tenantId: string; connectionId: string; currency: string }
export interface PaymentProviderAdapter {
  readonly providerId: string;
  readonly capabilities: readonly PaymentCapability[];
  createPayment(context: PaymentContext, amountMinor: number, key: string): Promise<ProviderResult>;
  getPayment(context: PaymentContext, reference: string): Promise<ProviderResult>;
  capturePayment?(context: PaymentContext, reference: string, amountMinor: number, key: string): Promise<ProviderResult>;
  cancelPayment?(context: PaymentContext, reference: string, key: string): Promise<ProviderResult>;
  createRefund?(context: PaymentContext, reference: string, amountMinor: number, key: string): Promise<ProviderResult>;
  getRefund?(context: PaymentContext, reference: string): Promise<ProviderResult>;
  verifyWebhook?(context: PaymentContext, raw: Buffer, headers: Readonly<Record<string,string>>): Promise<ProviderResult>;
}
const idPattern = /^[a-z][a-z0-9-]{1,62}$/;
export class PaymentProviderRegistry {
  private readonly adapters = new Map<string, PaymentProviderAdapter>();
  private readonly activeConnections = new Map<string, Set<string>>();
  register(adapter: PaymentProviderAdapter): void {
    if (!idPattern.test(adapter.providerId) || this.adapters.has(adapter.providerId)) throw new Error('Invalid or duplicate provider identifier');
    this.adapters.set(adapter.providerId, adapter);
  }
  activate(tenantId: string, providerId: string): void {
    if (!tenantId || !this.adapters.has(providerId)) throw new Error('Unknown tenant or provider');
    const ids = this.activeConnections.get(tenantId) || new Set<string>();
    ids.add(providerId); this.activeConnections.set(tenantId, ids);
  }
  deactivate(tenantId: string, providerId: string): void { this.activeConnections.get(tenantId)?.delete(providerId); }
  resolve(tenantId: string, providerId: string, capability: PaymentCapability): PaymentProviderAdapter {
    if (!tenantId || !this.activeConnections.get(tenantId)?.has(providerId)) throw new Error('Provider inactive for tenant');
    const adapter = this.adapters.get(providerId);
    if (!adapter || !adapter.capabilities.includes(capability)) throw new Error('Provider capability unavailable');
    return adapter;
  }
}
