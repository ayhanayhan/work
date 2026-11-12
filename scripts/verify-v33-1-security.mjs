import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
const read=(f)=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const svc=read('apps/api/src/app-auth/app-auth.service.ts');
const prisma=read('apps/api/prisma/schema.prisma');
const sql=read('apps/api/prisma/migrations/20261009163000_oauth_pkce_s256/migration.sql');
assert.match(svc,/codeChallenge: challenge/);assert.match(svc,/row\.codeChallenge/);
assert.match(svc,/method !== 'S256'/);assert.match(svc,/PKCE verification failed/);
assert.match(prisma,/codeChallenge\s+String\?/);assert.match(sql,/ALTER TABLE/);
for(const f of ['apps/admin/components/extensions/AdminExtensionHost.tsx','apps/storefront/components/ExtensionHost.tsx']){
  const t=read(f);assert.match(t,/sandbox="allow-forms allow-scripts allow-popups"/);
  assert.doesNotMatch(t,/allow-same-origin/);
}
assert.match(read('apps/api/src/extensions/extensions.service.ts'),/URL must not contain credentials or fragment/);
const verifier=randomBytes(32).toString('base64url');const challenge=createHash('sha256').update(verifier,'ascii').digest('base64url');
assert.equal(challenge.length,43);
assert.notEqual(challenge,createHash('sha256').update(verifier+'changed').digest('base64url'));
console.log('OK security static regression / OAuth PKCE S256 vector / iframe isolation');
