import test from 'node:test';
import assert from 'node:assert/strict';
import { PaymentAdapterRuntimeService } from './payment-adapter-runtime.service';
import type { PaymentProviderAdapter } from './provider-registry';
const adapter: PaymentProviderAdapter = {
  providerId: 'test-plug', capabilities: ['authorize', 'reconcile'],
  async createPayment() { return { status: 'PENDING' }; },
  async getPayment() { return { status: 'UNKNOWN' }; },
};
test('Nest provider runtime: tenant-scoped Prisma connection authorizes installed module', async () => {
  const prisma: any = { integrationConnection: { async findFirst({ where, select }: any) {
    assert.equal(where.tenantId, 'shop-a'); assert.equal(where.type, 'PAYMENT');
    assert.equal(where.enabled, true); assert.equal(select.credentials, undefined);
    return { id: 'conn-a', tenantId: 'shop-a', type: 'PAYMENT', provider: 'test-plug', enabled: true };
  } } };
  const runtime = new PaymentAdapterRuntimeService(prisma);
  runtime.registerInstalled(adapter);
  assert.equal((await runtime.resolveForTenant('shop-a','conn-a','authorize')).adapter, adapter);
  assert.throws(() => runtime.registerInstalled(adapter), /duplicate/);
  runtime.unregisterInstalled('test-plug');
  await assert.rejects(runtime.resolveForTenant('shop-a','conn-a','authorize'), /unavailable/);
});
test('Nest provider runtime: missing tenant connection and unsupported capabilities fail closed', async () => {
  const prisma: any = { integrationConnection: { async findFirst() { return null; } } };
  const runtime = new PaymentAdapterRuntimeService(prisma);
  runtime.registerInstalled(adapter);
  await assert.rejects(runtime.resolveForTenant('shop-b','conn-a','authorize'), /unavailable/);
  assert.throws(() => runtime.resolve('test-plug','partial-refund'), /unavailable/);
});
