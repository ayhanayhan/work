const API = process.env.API_URL || 'http://localhost:4000/v1';
const STORE = process.env.STORE_SLUG || 'main';
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!';
const SUPERADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'SuperAdmin123!';
let passed = 0;
async function request(path, options={}) {
  const r = await fetch(API + path, { ...options, headers: { 'content-type':'application/json', ...(options.headers||{}) } });
  const body = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(`${options.method||'GET'} ${path}: ${r.status} ${JSON.stringify(body)}`);
  return body;
}
async function test(name, fn) { try { const out=await fn(); passed++; console.log(`✓ ${name}`); return out; } catch(e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode=1; return null; } }

const boot = await test('Storefront bootstrap', ()=>request(`/storefront/${STORE}?currency=TRY`));
const products = await test('Product listing', ()=>request(`/storefront/${STORE}/products?currency=TRY`));
let cart;
if (products?.items?.[0]?.variants?.[0]) {
  cart = await test('Create cart', ()=>request(`/storefront/${STORE}/carts`,{method:'POST',body:JSON.stringify({currency:'TRY'})}));
  await test('Add item', ()=>request(`/storefront/carts/${cart.token}/items`,{method:'POST',body:JSON.stringify({variantId:products.items[0].variants[0].id,quantity:2})}));
  await test('Cart totals/promotions', ()=>request(`/storefront/carts/${cart.token}`));
  const shipping=boot?.shippingMethods?.[0], payment=boot?.paymentMethods?.[0];
  if (shipping && payment) await test('Guest checkout', ()=>request(`/storefront/carts/${cart.token}/checkout`,{method:'POST',body:JSON.stringify({email:`smoke-${Date.now()}@example.test`,firstName:'Smoke',lastName:'Test',phone:'+900000000000',shippingMethodId:shipping.id,paymentMethodId:payment.id,shippingAddress:{firstName:'Smoke',lastName:'Test',phone:'+900000000000',address1:'Test Address',city:'Ankara',state:'Ankara',country:'TR'},consents:{terms:true,privacy:true,kvkkNotice:true},consentVersions:{terms:'1.0',privacy:'1.0',kvkkNotice:'1.0'}})}));
}
const merchant = await test('Merchant login', ()=>request('/auth/login',{method:'POST',body:JSON.stringify({email:'owner@example.com',password:OWNER_PASSWORD})}));
if (merchant?.accessToken && merchant?.memberships?.[0]) {
  const m=merchant.memberships[0], store=m.site;
  if (store) await test('Merchant dashboard authorization', ()=>request(`/admin/dashboard?storeId=${store.id}`,{headers:{authorization:`Bearer ${merchant.accessToken}`,'x-tenant-id':m.tenantId}}));
}
const superadmin = await test('Super Admin login', ()=>request('/auth/login',{method:'POST',body:JSON.stringify({email:'superadmin@example.com',password:SUPERADMIN_PASSWORD})}));
if (superadmin?.accessToken) await test('Super Admin dashboard authorization', ()=>request('/superadmin/dashboard',{headers:{authorization:`Bearer ${superadmin.accessToken}`}}));

if (process.exitCode) { console.error(`\nSmoke test failed after ${passed} successful checks.`); process.exit(1); }
console.log(`\nAll ${passed} smoke checks passed.`);
