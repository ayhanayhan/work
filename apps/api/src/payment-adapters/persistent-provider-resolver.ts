import { type PaymentCapability, type PaymentContext, type PaymentProviderAdapter } from './provider-registry';

/** Only non-secret, tenant-scoped records. Never serialize credentials into responses or logs. */
export interface PaymentConnectionRecord {
  id: string;
  tenantId: string;
  type: string;
  provider: string;
  enabled: boolean;
}
export interface PaymentConnectionRepository {
  findFirst(args: {where: {id: string; tenantId: string; type: 'PAYMENT'; enabled: true}; select: {id:true;tenantId:true;type:true;provider:true;enabled:true}}): Promise<PaymentConnectionRecord | null>;
}
export interface InstalledPaymentAdapters {
  resolve(providerId: string, capability: PaymentCapability): PaymentProviderAdapter;
}
export class PersistentPaymentProviderResolver {
  constructor(private readonly installed: InstalledPaymentAdapters, private readonly connections: PaymentConnectionRepository) {}
  async resolve(tenantId: string, connectionId: string, capability: PaymentCapability): Promise<{adapter: PaymentProviderAdapter; context: PaymentContext}> {
    if (!tenantId || !connectionId) throw new Error('Tenant and connection are required');
    const row = await this.connections.findFirst({
      where: { id: connectionId, tenantId, type: 'PAYMENT', enabled: true },
      select: {id:true,tenantId:true,type:true,provider:true,enabled:true},
    });
    if (!row || row.tenantId !== tenantId || row.id !== connectionId || row.type !== 'PAYMENT' || !row.enabled) {
      throw new Error('Payment connection unavailable for tenant');
    }
    // Registry authorization is based on an installed adapter's capabilities, not an in-memory tenant activation flag.
    const adapter = this.installed.resolve(row.provider, capability);
    return {adapter, context:{tenantId, connectionId:row.id, currency:''}};
  }
}
