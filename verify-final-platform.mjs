import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const anyFile = (paths) => paths.some(exists);
const contains = (paths, needles) => paths.some((p) => {
  const s = read(p);
  return needles.every((n) => s.includes(n));
});
const walk = (rel) => {
  const base = path.join(ROOT, rel);
  const out = [];
  if (!fs.existsSync(base)) return out;
  const visit = (p) => {
    for (const e of fs.readdirSync(p, {withFileTypes:true})) {
      const f = path.join(p, e.name);
      if (e.isDirectory()) visit(f);
      else if (/\.(?:ts|tsx|js|jsx)$/.test(e.name)) out.push(f);
    }
  };
  visit(base);
  return out;
};
const readMany = (files) => files.map((f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');

function hasRealBillingProfile() {
  const service = read('apps/api/src/billing/billing.service.ts');
  const controller = read('apps/api/src/billing/billing.controller.ts');
  const billingUi = readMany(walk('apps/admin/app/(protected)/account/billing'));

  const serviceOk =
    /companyName/.test(service) &&
    /taxNumber/.test(service) &&
    /taxOffice/.test(service) &&
    /address(?:Text)?/.test(service) &&
    /tenant/i.test(service) &&
    /(findUnique|findFirst|findMany)/.test(service);

  const endpointOk = /@Get\s*\(\s*['"]admin\/billing\/account['"]\s*\)/.test(controller);
  const authOk = /MerchantAuthGuard/.test(controller) && /TenantGuard/.test(controller) && /PermissionGuard/.test(controller);
  const permissionOk = /RequirePermission\s*\(\s*['"]settings\.(?:read|manage)['"]\s*\)/.test(controller);
  const serviceCallOk = /this\.svc\.[A-Za-z0-9_]+\s*\(/.test(controller);
  const controllerOk = endpointOk && authOk && permissionOk && serviceCallOk;

  const uiEndpointOk = /\/admin\/billing\/account/.test(billingUi);
  const uiFieldsOk = /companyName/.test(billingUi) && /taxNumber/.test(billingUi) && /taxOffice/.test(billingUi);
  const uiRealDataOk = /(fetch\s*\(|request\s*\(|api\.|client\.)/.test(billingUi) && /(tenant|profile)/i.test(billingUi);
  const uiOk = uiEndpointOk && uiFieldsOk && uiRealDataOk;

  return serviceOk && controllerOk && uiOk;
}

const checks = [
  ['Step 5 support API', () => exists('apps/api/src/support/support.service.ts') && exists('apps/api/src/support/support.controller.ts')],
  ['Step 6 billing account API', () => exists('apps/api/src/billing/billing.service.ts') && exists('apps/api/src/billing/billing.controller.ts')],
  ['Step 6 billing profile', hasRealBillingProfile],
  ['Billing UI real API', () => /\/admin\/billing\/account/.test(readMany(walk('apps/admin/app/(protected)/account/billing')))],
  ['Checkout idempotency', () => contains(['apps/api/src/checkout/checkout.service.ts', 'apps/api/src/checkout/checkout.controller.ts', 'apps/api/src/merchant/merchant.service.ts'], ['idempot']) || contains(['apps/api/prisma/schema.prisma'], ['Idempot'])],
  ['Readiness probe', () => contains(['apps/api/src/health/health.controller.ts'], ['readiness']) || contains(['apps/api/src/health/health.controller.ts'], ['ready'])],
  ['Production readiness script', () => exists('scripts/verify-production-readiness.mjs')],
  ['V11 SEO scanner', () => contains(['apps/api/src/merchant/merchant.service.ts', 'apps/api/src/seo/seo.service.ts'], ['Seo']) || contains(['apps/api/prisma/schema.prisma'], ['SeoScan'])],
  ['V10 blog revisions', () => contains(['apps/api/prisma/schema.prisma'], ['BlogPostRevision'])],
  ['V9 automations', () => contains(['apps/api/prisma/schema.prisma'], ['MarketingAutomation']) || contains(['apps/api/src/merchant/merchant-growth.service.ts'], ['Automation'])],
  ['Warehouse transfer pool', () => contains(['apps/api/prisma/schema.prisma'], ['TransferRequirement']) || contains(['apps/api/src/merchant/merchant.service.ts'], ['TransferRequirement'])],
];

let failed = 0;
for (const [name, fn] of checks) {
  let ok = false;
  try { ok = !!fn(); } catch {}
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`\n${failed} final platform check(s) failed.`);
  process.exit(1);
}
console.log('\nTicarti final platform verification: OK');
