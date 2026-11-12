#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const migration = read('apps/api/prisma/production-migration-baseline.ts');
const auth = read('apps/api/src/app-auth/app-auth.service.ts');
const schema = read('apps/api/prisma/schema.prisma');
const sql = read('apps/api/prisma/migrations/20261009163000_oauth_pkce_s256/migration.sql');
function check(label, fn) { try { fn(); console.log('OK',label); } catch(e) { console.error('FAIL',label,e.message); process.exitCode=1; } }
check('strict migrations enforced for production',()=> {
  assert.match(migration,/process\.env\.NODE_ENV === 'production'/);
  assert.match(migration,/strict migration mode rejects non-contiguous migration history/);
  assert.match(migration,/strict migration mode rejects empty database bootstrap/);
  assert.ok(migration.indexOf('if (strictProduction)') < migration.indexOf('// Detect a truly empty schema'));
  assert.match(migration,/runPrisma\(\['migrate', 'deploy', '--schema', schema\]\)/);
});
check('PKCE S256 verifier test vector',()=>{
 const verifier='dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
 assert.equal(crypto.createHash('sha256').update(verifier,'ascii').digest('base64url'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
 const invalid='wrong-verifier-with-length-43-character-aaaaaaa';
 assert.notEqual(crypto.createHash('sha256').update(invalid,'ascii').digest('base64url'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
check('OAuth PKCE and one-time code enforcement source contracts',()=>{
 assert.match(auth,/codeChallenge/);
 assert.match(auth,/code_verifier|codeVerifier/);
 assert.match(auth,/PKCE verification failed/);
 assert.match(auth,/usedAt: null/);
 assert.match(auth,/expiresAt: \{ gt: new Date\(\) \}/);
 assert.match(auth,/claimed\.count !== 1/);
 assert.match(schema,/codeChallenge\s+String\?/);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS "codeChallenge" TEXT/);
});
check('app access token uses installation tenant and live scopes',()=>{
 assert.match(auth,/tenantId: row\.installation\.tenantId/);
 assert.match(auth,/const granted = new Set\(row\.installation\.scopes\.map/);
 assert.match(auth,/effectiveScopes = row\.scopes\.filter/);
 assert.match(auth,/row\.installation\.status !== 'ACTIVE'/);
});
console.log(process.exitCode ? 'Source contract checks failed' : 'Source contract checks passed (NOT E2E)');
