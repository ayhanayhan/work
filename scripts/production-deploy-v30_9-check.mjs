#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());
const deploy = fs.readFileSync(path.join(root,'deploy-final.sh'),'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const checks = [
  ['v30.9 marker', deploy.includes('TICARTI_V30_9_DEPLOY_HARDENING=1')],
  ['curl prerequisite', deploy.includes('need curl')],
  ['step count fixed', deploy.includes('TOTAL=18')],
  ['previous revision captured', deploy.includes('PREVIOUS_REVISION="$(gcloud run services describe')],
  ['candidate stable tag enabled', deploy.includes('--tag "$CANDIDATE_TAG"')],
  ['candidate remains zero traffic', deploy.includes('--no-traffic')],
  ['candidate URL resolved', deploy.includes('CANDIDATE_URL=')],
  ['migration before candidate smoke', deploy.indexOf('next "Database schema/init job"') < deploy.indexOf('next "Candidate API smoke after migration"')],
  ['candidate smoke before traffic shift', deploy.indexOf('next "Candidate API smoke after migration"') < deploy.indexOf('next "Shift API traffic to candidate"')],
  ['health live smoke', deploy.includes('/v1/health/live')],
  ['health ready smoke', deploy.includes('/v1/health/ready')],
  ['traffic shift tracked', deploy.includes('TRAFFIC_SHIFTED=1')],
  ['post-shift API smoke', deploy.includes('next "Post-shift API smoke"')],
  ['automatic rollback exists', deploy.includes("API trafiği eski revision'a geri alınıyor")],
  ['rollback to previous 100%', deploy.includes('--to-revisions "$PREVIOUS_REVISION=100"')],
  ['App Hosting smoke exists', deploy.includes('next "App Hosting smoke"')],
  ['admin App Hosting smoke', deploy.includes('web_smoke "admin"')],
  ['storefront App Hosting smoke', deploy.includes('web_smoke "storefront"')],
  ['superadmin App Hosting smoke', deploy.includes('web_smoke "superadmin"')],
  ['success disables rollback', deploy.includes('DEPLOY_SUCCESS=1') && deploy.includes('trap - EXIT')],
  ['production E2E remains before image build', deploy.includes('node scripts/production-e2e-v30_8.mjs') && deploy.indexOf('node scripts/production-e2e-v30_8.mjs') < deploy.indexOf('next "API image build"')],
  ['root verifier wired', pkg.scripts?.['verify:production-deploy'] === 'node scripts/production-deploy-v30_9-check.mjs'],
];
let failed=false;
for (const [label,ok] of checks) {
  if (ok) console.log(`OK ${label}`);
  else { console.error(`FAIL ${label}`); failed=true; }
}
if (failed) process.exit(1);

const legacyHealthPath =
  /(?:^|["'`=\s])\/health\/(?:live|ready)(?:["'`\s]|$)/m;
if (legacyHealthPath.test(deploy)) {
  console.error('FAIL legacy unprefixed health smoke path remains');
  process.exit(1);
}
console.log('OK API health smoke uses /v1 prefix');


if (deploy.includes('status")=="ready"') || deploy.includes("status')=='ready'")) {
  console.error('FAIL readiness smoke still requires status=ready');
  process.exit(1);
}
if (!deploy.includes('assert d.get("ok") is True')) {
  console.error('FAIL health smoke no longer checks ok=true');
  process.exit(1);
}
console.log('OK readiness smoke contract uses HTTP success + ok=true');


if (!deploy.includes('web_smoke "admin" "$ADMIN_URL/admin/login"')) {
  console.error('FAIL admin App Hosting smoke does not use /admin/login');
  process.exit(1);
}
console.log('OK admin App Hosting smoke uses /admin/login');

console.log('Ticarti v30.9 production deploy hardening verification: OK');
