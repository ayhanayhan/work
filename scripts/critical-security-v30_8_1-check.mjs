#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || process.cwd());
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

function ok(label, cond) {
  if (!cond) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${label}`);
  }
}

ok('seroval override pinned >=1.6.8', pkg.overrides?.seroval === '1.6.8');
ok('source-map-js override pinned 1.2.2', pkg.overrides?.['source-map-js'] === '1.2.2');

let tanstackFound = false;
for (const [k, v] of Object.entries(lock.packages || {})) {
  if (k.endsWith('node_modules/@tanstack/react-query-devtools')) {
    tanstackFound = true;
    ok('react-query-devtools resolved 5.104.1', v.version === '5.104.1');
  }
  if (k.endsWith('node_modules/@tanstack/query-devtools')) {
    ok('query-devtools resolved 5.104.1', v.version === '5.104.1');
  }
  if (k.endsWith('node_modules/seroval')) {
    ok(`safe seroval ${v.version}`, !/^0\./.test(v.version) && (
      Number(v.version.split('.')[0]) > 1 ||
      (Number(v.version.split('.')[0]) === 1 && (
        Number(v.version.split('.')[1]) > 6 ||
        (Number(v.version.split('.')[1]) === 6 && Number(v.version.split('.')[2]) >= 8)
      ))
    ));
  }
  if (k.endsWith('node_modules/source-map-js')) {
    const [a,b,c] = v.version.split('.').map(Number);
    ok(`safe source-map-js ${v.version}`, a > 1 || (a === 1 && (b > 2 || (b === 2 && c >= 2))));
  }
}
ok('TanStack devtools present and inspected', tanstackFound);

try {
  const raw = execFileSync('npm', ['audit', '--omit=dev', '--json'], { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
  const audit = JSON.parse(raw);
  const vulns = audit.vulnerabilities || {};
  const blocked = ['seroval','source-map-js','@kobalte/core','solid-js','@tanstack/query-devtools','@tanstack/react-query-devtools']
    .filter(name => vulns[name] && ['critical','high'].includes(vulns[name].severity));
  ok('no high/critical advisory in refreshed devtools chain', blocked.length === 0);
} catch (e) {
  const stdout = e.stdout ? String(e.stdout) : '';
  try {
    const audit = JSON.parse(stdout);
    const vulns = audit.vulnerabilities || {};
    const blocked = ['seroval','source-map-js','@kobalte/core','solid-js','@tanstack/query-devtools','@tanstack/react-query-devtools']
      .filter(name => vulns[name] && ['critical','high'].includes(vulns[name].severity));
    ok('no high/critical advisory in refreshed devtools chain', blocked.length === 0);
  } catch {
    console.error('FAIL production audit JSON unreadable');
    process.exitCode = 1;
  }
}

if (!process.exitCode) console.log('Ticarti v30.8.1 critical security refresh verification: OK');
