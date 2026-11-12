import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://ticarti_gate:ticarti_gate@127.0.0.1:5432/ticarti_gate?schema=public',
};

const steps = [
  ['Final platform', ['node', ['verify-final-platform.mjs', '.']]],
  ['Production readiness', ['node', ['scripts/verify-production-readiness.mjs']]],
  ['Stabilization', ['node', ['scripts/stabilization-check.mjs']]],
  ['Core freeze', ['node', ['scripts/core-freeze-check.mjs']]],
  ['Metronic admin', ['node', ['scripts/verify-metronic-admin.mjs']]],
  ['v29.2 E2E commerce', ['node', ['scripts/e2e-commerce-v29_2-check.mjs']]],
  ['v30.0 production migrations', ['node', ['scripts/production-migration-v30-check.mjs']]],
  ['v30.1 reproducible API image', ['node', ['scripts/api-image-v30_1-check.mjs']]],
  ['v30.2 production concurrency', ['node', ['scripts/production-concurrency-v30_2-check.mjs']]],
  ['v30.3 payment webhooks', ['node', ['scripts/payment-webhook-v30_3-check.mjs']]],
  ['v30.4 tenant isolation', ['node', ['scripts/tenant-isolation-v30_4-check.mjs']]],
  ['v30.5 shipping rates', ['node', ['scripts/shipping-rates-v30_5-check.mjs']]],
  ['v30.6 B2B credit', ['node', ['scripts/b2b-credit-v30_6-check.mjs']]],
  ['v30.7 exchange completion', ['node', ['scripts/exchange-completion-v30_7-check.mjs']]],
  ['Production security audit', ['node', ['scripts/security-audit-v29_8.mjs']]],
  ['Prisma validate', ['npx', ['prisma', 'validate', '--schema', 'apps/api/prisma/schema.prisma']]],
  ['Prisma generate', ['npx', ['prisma', 'generate', '--schema', 'apps/api/prisma/schema.prisma']]],
];

const required = [
  'verify-final-platform.mjs',
  'scripts/verify-production-readiness.mjs',
  'scripts/e2e-commerce-v29_2-check.mjs',
  'scripts/production-migration-v30-check.mjs',
  'scripts/api-image-v30_1-check.mjs',
  'scripts/production-concurrency-v30_2-check.mjs',
  'scripts/payment-webhook-v30_3-check.mjs',
  'scripts/tenant-isolation-v30_4-check.mjs',
  'scripts/shipping-rates-v30_5-check.mjs',
  'scripts/b2b-credit-v30_6-check.mjs',
  'scripts/exchange-completion-v30_7-check.mjs',
  'scripts/security-audit-v29_8.mjs',
];

for (const file of required) {
  if (!fs.existsSync(file)) {
    console.error(`FAIL required production gate file missing: ${file}`);
    process.exit(1);
  }
}

console.log('== Ticarti v30.8 Production E2E Gate ==');
for (const [name, [cmd, args]] of steps) {
  console.log(`\n--- ${name} ---`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', env });
  if (result.error) {
    console.error(`FAIL ${name}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`FAIL ${name}: exit ${result.status}`);
    process.exit(result.status || 1);
  }
  console.log(`PASS ${name}`);
}

const adminScss = 'apps/admin/app/theme/scss/app.scss';
if (fs.existsSync(adminScss)) {
  const css = fs.readFileSync(adminScss, 'utf8');
  if (/@media\s*\([^)]*var\(--screen-lg\)/.test(css)) {
    console.warn('WARN known CSS warning budget: var(--screen-lg) is used in a media query; non-blocking, track for cleanup.');
  }
}

console.log('\nTicarti v30.8 Production E2E Gate: OK');
