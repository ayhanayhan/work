import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const abs = (p) => path.join(root, p);
const read = (p) => fs.readFileSync(abs(p), 'utf8');
const exists = (p) => fs.existsSync(abs(p));
const firstExisting = (paths) => paths.find(exists);

const live = read('apps/api/src/merchant/merchant-live.service.ts');
assert(!/orderItem\.|product\.|customer\./.test(live), 'live tracking must not join product/orderItem/customer');
assert(/take:\s*30/.test(live), 'live orders must be bounded');
assert(!/deleteMany/.test(live), 'live read endpoint must not perform cleanup writes');

const adminLive = firstExisting([
  'apps/admin/app/(protected)/live/page.tsx',
  'apps/admin/app/components/LiveTrackingView.tsx',
]);
assert(adminLive, 'admin live tracking UI missing');
{
  const s = read(adminLive);
  assert(/60_?000/.test(s), `${adminLive} must use 60s polling`);
  assert(/visibilityState|document\.hidden|visibilitychange/.test(s), `${adminLive} must pause when hidden`);
}

for (const p of [
  'apps/superadmin/app/components/SuperAdminApp.tsx',
  'apps/storefront/components/LiveTrackerBeacon.tsx',
]) {
  const s = read(p);
  assert(/60_?000/.test(s), `${p} must use 60s polling`);
  assert(/visibilityState|document\.hidden|visibilitychange/.test(s), `${p} must pause when hidden`);
}

// Legacy AI drawer was part of the pre-Metronic admin. If it still exists, keep its polling guard.
const legacyAi = 'apps/admin/app/components/AiAssistantDrawer.tsx';
if (exists(legacyAi)) {
  const s = read(legacyAi);
  assert(/60_?000/.test(s), `${legacyAi} must use 60s polling`);
  assert(/visibilityState|document\.hidden|visibilitychange/.test(s), `${legacyAi} must pause when hidden`);
} else {
  console.warn('[stabilization] legacy AiAssistantDrawer absent in Metronic admin; AI UI guard skipped until that module is reintroduced.');
}

const outbox = read('apps/api/src/webhooks/event-outbox.service.ts');
assert(!/setImmediate\s*\(/.test(outbox), 'outbox publishing must not run worker in API process');

// Yahoo FX must remain removed. Support both old SettingsV17 and the new Metronic settings tree.
const legacySettings = 'apps/admin/app/components/SettingsV17.tsx';
if (exists(legacySettings)) {
  assert(!/value=["']YAHOO["']/.test(read(legacySettings)), 'Yahoo FX option must be removed');
} else {
  const localization = firstExisting([
    'apps/admin/app/(protected)/settings/localization/page.tsx',
    'apps/admin/app/(protected)/settings/localization/content.tsx',
  ]);
  if (localization) assert(!/value=["']YAHOO["']/.test(read(localization)), 'Yahoo FX option must be removed');
}

const tcmb = read('apps/api/src/common/tcmb-rates.ts');
assert(/DOCTYPE\|<!ENTITY/.test(tcmb) && /kur listesi eksik/.test(tcmb), 'TCMB feed safety guard missing');

const prisma = read('apps/api/src/prisma/prisma.service.ts');
assert(/connection_limit/.test(prisma) && /PRISMA_CONNECTION_LIMIT/.test(prisma), 'DB pool cap missing');

const rate = read('apps/api/src/common/rate-limit.guard.ts');
assert(!/headers\[['"]x-forwarded-for/.test(rate), 'rate limiter must not parse forwarded header directly');

const billing = read('apps/api/src/billing/billing.service.ts');
assert(/ProviderPaymentReceipt|providerPaymentReceipt/.test(billing), 'cross-product provider receipt guard missing');
assert(/consumeCoupon/.test(billing), 'atomic coupon consumption missing');
assert(/fulfillPlatformPurchase/.test(billing), 'platform fulfillment missing');

const schema = read('apps/api/prisma/schema.prisma');
for (const model of ['BillingCoupon', 'PlatformPurchase', 'ProviderPaymentReceipt', 'EmailCreditPackage', 'EmailCreditWallet']) {
  assert(schema.includes(`model ${model}`), `missing ${model}`);
}

assert(exists('apps/superadmin/app/products/page.tsx'), 'superadmin products page missing');
assert(
  exists('apps/admin/app/billing/page.tsx') || exists('apps/admin/app/(protected)/account/billing/basic/page.tsx'),
  'merchant billing page missing',
);

const backup = fs.readdirSync(root).filter((x) => /backup/i.test(x) && x !== '.ticarti-patch-backup');
assert.equal(backup.length, 0, 'root backup trees remain: ' + backup.join(','));
if (exists('.ticarti-patch-backup')) console.warn('[stabilization] .ticarti-patch-backup is a patch safety backup and is ignored by this check.');

const controllers = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.controller.ts')) controllers.push(p);
  }
}
walk(abs('apps/api/src'));
for (const file of controllers) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.includes('MerchantAuthGuard') && s.includes('TenantGuard')) {
    assert(s.includes('PermissionGuard'), `${path.relative(root, file)} missing PermissionGuard`);
  }
}

console.log('stabilization-check: OK (Metronic admin compatible)');
