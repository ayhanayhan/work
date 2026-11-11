import assert from 'node:assert/strict';
import { MerchantCommerceService } from '../src/merchant/merchant-commerce.service';
import { MerchantController } from '../src/merchant/merchant.controller';

const products = [
  { id: 'p1', title: 'First', status: 'ACTIVE', brandId: 'b1', categories: [{ categoryId: 'c1' }] },
  { id: 'p2', title: 'Second', status: 'DRAFT', brandId: 'b2', categories: [] },
  { id: 'p3', title: 'Third', status: 'ACTIVE', brandId: 'b1', categories: [{ categoryId: 'c2' }] },
];
const orders = [
  { id: 'o1', number: '1001', status: 'CREATED', paymentStatus: 'PENDING', customer: { email: 'a@example.com' } },
  { id: 'o2', number: '1002', status: 'FULFILLED', paymentStatus: 'PAID', customer: { email: 'b@example.com' } },
];
const customers = [{ id: 'c1', groupId: 'g1', email: 'a@example.com' }, { id: 'c2', groupId: 'g2', email: 'b@example.com' }];
const merchant: any = {
  products: async (_tenant: string, store: string, q?: string) => {
    assert.equal(store, 's1');
    return q ? products.filter(x => x.title.toLowerCase().includes(q.toLowerCase())) : products;
  },
  orders: async (_tenant: string, store: string) => {
    assert.equal(store, 's1');
    return orders;
  },
  customers: async (_tenant: string, store: string) => {
    assert.equal(store, 's1');
    return customers;
  },
};

async function main() {
  const service = new MerchantCommerceService(merchant);
  const all = await service.products('t1', { storeId: 's1', status: 'ALL', brandId: 'ALL', categoryId: 'ALL', page: '1', limit: '2' });
  assert.equal(all.total, 3);
  assert.equal(all.items.length, 2);
  assert.equal(all.pages, 2);
  assert.equal(all.summary.active, 2);

  const secondPage = await service.products('t1', { storeId: 's1', status: 'ALL', page: '2', limit: '2' });
  assert.deepEqual(secondPage.items.map((x: any) => x.id), ['p3']);

  const selectedProducts = await service.products('t1', { storeId: 's1', status: 'ACTIVE', brandId: 'b1', categoryId: 'c2' });
  assert.deepEqual(selectedProducts.items.map((x: any) => x.id), ['p3']);

  const selectedOrder = await service.orders('t1', { storeId: 's1', status: 'ALL', paymentStatus: 'PAID', q: '1002' });
  assert.deepEqual(selectedOrder.items.map((x: any) => x.id), ['o2']);

  const allOrders = await service.orders('t1', { storeId: 's1', status: 'ALL', paymentStatus: 'ALL', fulfillmentStatus: 'ALL' });
  assert.equal(allOrders.total, 2);

  const selectedCustomers = await service.customers('t1', { storeId: 's1', groupId: 'g1', status: 'ALL' });
  assert.deepEqual(selectedCustomers.items.map((x: any) => x.id), ['c1']);

  // These routes must remain protected; do not replace them with Next.js redirects.
  for (const route of ['commerce/products', 'commerce/orders', 'commerce/customers']) {
    const metadata = Reflect.getMetadata('path', MerchantController.prototype[
      route === 'commerce/products' ? 'commerceProducts' :
      route === 'commerce/orders' ? 'commerceOrders' : 'commerceCustomers'
    ]);
    assert.equal(metadata, route);
  }
  console.log('Commerce native service contract checks passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
