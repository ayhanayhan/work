#!/usr/bin/env node
import fs from 'node:fs';
const ok=(n,c)=>{if(!c){console.error('FAIL',n);process.exitCode=1}else console.log('OK',n)};
const ctl=fs.readFileSync('apps/api/src/merchant/merchant.controller.ts','utf8');
const svc=fs.readFileSync('apps/api/src/merchant/merchant.service.ts','utf8');
const menu=fs.readFileSync('apps/admin/config/menu.config.tsx','utf8');
const page=fs.readFileSync('apps/admin/app/(protected)/operations/page.tsx','utf8');
const cb=fs.readFileSync('cloudbuild-api.yaml','utf8');
ok('operations API permission protected',ctl.includes("@Get('operations/overview')")&&ctl.includes("@RequirePermission('analytics.read')"));
ok('operations API uses real payment data',svc.includes('paymentAttempt.count')&&svc.includes('stuckPayments'));
ok('operations API uses real inventory reservations',svc.includes('inventoryReservation.count'));
ok('operations API uses real webhook delivery data',svc.includes('eventDelivery.count'));
ok('operations dashboard navigation exists',menu.includes("path: '/operations'"));
ok('operations dashboard has API latency drill-down',page.includes('p95')&&page.includes('errorRate')&&page.includes('API performansı'));
ok('operations dashboard auto refresh exists',page.includes('setInterval')&&page.includes('30000'));
ok('cloud build runs P0 gate',cb.includes('verify:p0'));
ok('cloud build runs production migration gate',cb.includes('verify:production-migrations'));
ok('cloud build compiles API before image push',cb.includes("'@commerce/api'")&&cb.includes('build'));
if(!process.exitCode)console.log('Ticarti P2 production operations verification: OK');
