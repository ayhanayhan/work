#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || process.cwd());
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

function ok(label, cond, detail='') {
  if (!cond) {
    console.error(`FAIL ${label}${detail ? `: ${detail}` : ''}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${label}${detail ? `: ${detail}` : ''}`);
  }
}

ok('source-map-js direct pin', pkg.dependencies?.['source-map-js'] === '1.2.2');
ok('source-map-js override follows direct pin', pkg.overrides?.['source-map-js'] === '$source-map-js');
ok('seroval override remains safe', pkg.overrides?.seroval === '1.6.8');

const sm = [];
const seroval = [];
for (const [k, v] of Object.entries(lock.packages || {})) {
  if (k.endsWith('node_modules/source-map-js')) sm.push({k, version:v.version});
  if (k.endsWith('node_modules/seroval')) seroval.push({k, version:v.version});
}

ok('source-map-js resolved in lock', sm.length > 0);
for (const x of sm) ok(`safe source-map-js ${x.version}`, x.version === '1.2.2', x.k);

ok('seroval resolved in lock', seroval.length > 0);
for (const x of seroval) {
  const parts = x.version.split('.').map(Number);
  const safe = parts[0] > 1 || (parts[0] === 1 && (parts[1] > 6 || (parts[1] === 6 && parts[2] >= 8)));
  ok(`safe seroval ${x.version}`, safe, x.k);
}

try {
  const stdout = execFileSync('npm', ['audit','--omit=dev','--json'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe']
  });
  const audit = JSON.parse(stdout);
  const vulns = audit.vulnerabilities || {};
  const names = ['source-map-js','seroval','@kobalte/core','solid-js','@tanstack/query-devtools','@tanstack/react-query-devtools'];
  const blocked = names.filter(n => vulns[n] && ['critical','high'].includes(vulns[n].severity));
  ok('no high/critical advisory in TanStack/source-map chain', blocked.length === 0, blocked.join(', '));
} catch (e) {
  try {
    const audit = JSON.parse(String(e.stdout || ''));
    const vulns = audit.vulnerabilities || {};
    const names = ['source-map-js','seroval','@kobalte/core','solid-js','@tanstack/query-devtools','@tanstack/react-query-devtools'];
    const blocked = names.filter(n => vulns[n] && ['critical','high'].includes(vulns[n].severity));
    ok('no high/critical advisory in TanStack/source-map chain', blocked.length === 0, blocked.join(', '));
  } catch {
    console.error('FAIL production audit JSON unreadable');
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log('Ticarti v30.8.2 source-map lock hotfix verification: OK');
}
