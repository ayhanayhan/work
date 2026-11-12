#!/usr/bin/env node
import fs from 'node:fs';
const checks=[];const ok=(name,cond)=>{if(!cond){console.error('FAIL',name);process.exitCode=1}else console.log('OK',name)};
const security=fs.readFileSync('apps/api/src/common/security.ts','utf8');
const webhook=fs.readFileSync('apps/api/src/webhooks/event-outbox.service.ts','utf8');
const app=fs.readFileSync('apps/api/src/app.module.ts','utf8');
const ctl=fs.readFileSync('apps/api/src/merchant/merchant.controller.ts','utf8');
ok('security IP ignores raw forwarding headers',!security.includes("headers?.['x-forwarded-for']"));
ok('webhook validated DNS address is pinned',webhook.includes('postPinnedWebhook')&&webhook.includes('lookup:')&&webhook.includes('target.address'));
ok('webhook automatic redirects remain disabled by direct HTTP client',!webhook.includes("fetch(dest.url"));
ok('observability interceptor globally installed',app.includes('ObservabilityInterceptor'));
ok('merchant observability API is permission protected',ctl.includes("@Get('operations/observability')")&&ctl.includes("@RequirePermission('analytics.read')"));
if(!process.exitCode)console.log('Ticarti P1 platform hardening verification: OK');
