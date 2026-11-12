import assert from 'node:assert/strict';
import { URL } from 'node:url';

const urlText=process.env.TICARTI_E2E_HTTP_URL || '';
if (!urlText) { console.error('BLOCKED: TICARTI_E2E_HTTP_URL required'); process.exit(2); }
const u=new URL(urlText);
if (u.protocol!=='https:' || u.username || u.password || u.search || u.hash || u.pathname!=='/') {
  console.error('BLOCKED: HTTPS base URL without query or path required'); process.exit(2);
}
if (!/^(?:[a-z0-9-]+---commerce-api-[a-z0-9-]+\.a\.run\.app|localhost\.invalid)$/i.test(u.hostname)) {
  console.error('BLOCKED: only explicitly tagged Cloud Run candidate host is permitted'); process.exit(2);
}
if (!/^(?:v3311candidate|v3314candidate|candidate-[a-z0-9-]+)---/.test(u.hostname)) {
  console.error('BLOCKED: unrecognized test/candidate tag'); process.exit(2);
}
for(const route of ['/v1/health/live','/v1/health/ready']){
  const response=await fetch(new URL(route,u),{signal:AbortSignal.timeout(15000),redirect:'error',headers:{'accept':'application/json'}});
  assert.equal(response.status,200,`${route} status`);
  const body=await response.json();
  assert.equal(body.ok,true,`${route} ok`);
  console.log('OK candidate HTTP',route);
}
console.log('Candidate HTTP health passed (NOT OAuth endpoint E2E)');
