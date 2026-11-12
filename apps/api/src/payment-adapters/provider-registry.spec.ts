import test from 'node:test';
import assert from 'node:assert/strict';
import { PaymentProviderRegistry, type PaymentProviderAdapter } from './provider-registry';
const fixture: PaymentProviderAdapter = {
  providerId:'test-provider', capabilities:['authorize','reconcile'],
  async createPayment(_ctx, _amount, key){return {status:'PENDING',providerReference:key};},
  async getPayment(){return {status:'SUCCEEDED'};}
};
test('provider module: explicit tenant activation and capability check', async()=>{
  const registry=new PaymentProviderRegistry();
  registry.register(fixture);
  assert.throws(()=>registry.resolve('merchant-a','test-provider','authorize'),/inactive/);
  registry.activate('merchant-a','test-provider');
  assert.equal(registry.resolve('merchant-a','test-provider','authorize'),fixture);
  assert.throws(()=>registry.resolve('merchant-b','test-provider','authorize'),/inactive/);
  assert.throws(()=>registry.resolve('merchant-a','test-provider','partial-refund'),/capability/);
  registry.deactivate('merchant-a','test-provider');
  assert.throws(()=>registry.resolve('merchant-a','test-provider','authorize'),/inactive/);
});
test('provider module: invalid/duplicate registrations rejected',()=>{
  const registry=new PaymentProviderRegistry();
  assert.throws(()=>registry.register({...fixture,providerId:'Stripe!'}),/Invalid/);
  registry.register(fixture);
  assert.throws(()=>registry.register(fixture),/duplicate/);
});
