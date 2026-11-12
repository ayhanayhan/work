import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PersistentPaymentProviderResolver, type InstalledPaymentAdapters } from './persistent-provider-resolver';
import type { PaymentCapability, PaymentProviderAdapter } from './provider-registry';

/** Trusted payment ZIP loader registers vetted adapters here; no provider SDK is imported by Core. */
@Injectable()
export class PaymentAdapterRuntimeService implements InstalledPaymentAdapters {
  private readonly installed = new Map<string, PaymentProviderAdapter>();
  constructor(private readonly prisma: PrismaService) {}

  registerInstalled(adapter: PaymentProviderAdapter): void {
    if (!/^[a-z][a-z0-9-]{1,62}$/.test(adapter?.providerId || '') || this.installed.has(adapter.providerId)) {
      throw new Error('Invalid or duplicate installed payment adapter');
    }
    this.installed.set(adapter.providerId, adapter);
  }

  unregisterInstalled(providerId: string): void { this.installed.delete(providerId); }

  resolve(providerId: string, capability: PaymentCapability): PaymentProviderAdapter {
    const adapter = this.installed.get(providerId);
    if (!adapter || !adapter.capabilities.includes(capability)) throw new Error('Installed payment module/capability unavailable');
    return adapter;
  }

  async resolveForTenant(tenantId: string, connectionId: string, capability: PaymentCapability) {
    const resolver = new PersistentPaymentProviderResolver(this, this.prisma.integrationConnection);
    return resolver.resolve(tenantId, connectionId, capability);
  }
}
