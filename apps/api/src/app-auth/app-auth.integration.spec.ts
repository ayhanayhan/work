import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { AppAuthService } from './app-auth.service';
import { AppApiGuard } from './app-api.guard';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const verifier = 'A'.repeat(43);
const challenge = createHash('sha256').update(verifier, 'ascii').digest('base64url');

function fixture(options: { expires?: boolean; tenant?: string; active?: boolean; scopes?: string[] } = {}) {
  const tenantId = options.tenant ?? 'store-A';
  const active = options.active ?? true;
  const scopes = options.scopes ?? ['read_products', 'read_orders'];
  const installation = { id: 'install-A', tenantId, appId: 'app-1', status: active ? 'ACTIVE' : 'UNINSTALLED', enabled: active, scopes: scopes.map(scope => ({ scope })) };
  const client = { id: 'client-1', clientId: 'public-1', clientSecretHash: hash('secret-1'), isActive: true, appId: 'app-1', app: { id: 'app-1' }, redirectUris: ['https://example.test/callback'] };
  const authCodes = new Map<string, any>();
  const tokens = new Map<string, any>();
  const calls: any[] = [];
  const tx: any = {
    appAuthorizationCode: {
      create: async ({ data }: any) => { const row = { id: 'code-1', ...data, installation, usedAt: null }; authCodes.set(data.codeHash, row); return row; },
      updateMany: async ({ where, data }: any) => { const row = [...authCodes.values()].find(x => x.id === where.id && !x.usedAt && x.expiresAt > new Date()); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }; },
    },
    appAccessToken: { create: async ({ data }: any) => { calls.push({ kind: 'token', data }); tokens.set(data.accessTokenHash, { id: 'token-1', ...data, client, installation, revokedAt: null }); return data; } },
    appLifecycleEvent: { create: async ({ data }: any) => { calls.push({ kind: 'event', data }); return data; } },
  };
  const prisma: any = {
    appClient: { findUnique: async () => client },
    appInstallation: { findFirst: async ({ where }: any) => where.tenantId === installation.tenantId && active ? installation : null },
    appAuthorizationCode: { findUnique: async ({ where }: any) => authCodes.get(where.codeHash) ?? null },
    appAccessToken: { findUnique: async ({ where }: any) => tokens.get(where.accessTokenHash) ?? null, update: async () => ({}) },
    control: () => ({ $transaction: async (fn: any) => fn(tx) }),
  };
  return { service: new AppAuthService(prisma), installation, client, authCodes, tokens, calls, prisma };
}
const authorize = (service: AppAuthService, challengeValue = challenge, tenantId = 'store-A') => service.authorize(tenantId, { clientId: 'public-1', redirectUri: 'https://example.test/callback', scopes: ['read_products'], code_challenge: challengeValue, code_challenge_method: 'S256' });
const exchange = (service: AppAuthService, code: string, code_verifier = verifier) => service.token({ grant_type: 'authorization_code', client_id: 'public-1', client_secret: 'secret-1', redirect_uri: 'https://example.test/callback', code, code_verifier });

test('PKCE: valid verifier succeeds and code cannot be reused', async () => {
  const f = fixture(); const { code } = await authorize(f.service);
  const issued = await exchange(f.service, code);
  assert.ok(issued.access_token); assert.equal(issued.scope, 'read_products');
  await assert.rejects(exchange(f.service, code), /Invalid or expired|already been used/);
  assert.equal(f.calls.filter(x => x.kind === 'token').length, 1);
});
test('PKCE: wrong and missing verifier rejected without consuming code', async () => {
  const f = fixture(); const { code } = await authorize(f.service);
  await assert.rejects(exchange(f.service, code, 'B'.repeat(43)), /PKCE verification failed/);
  await assert.rejects(exchange(f.service, code, ''), /Invalid PKCE/);
  assert.ok((await exchange(f.service, code)).access_token);
});
test('PKCE: challenge mandatory and tenant A cannot authorize tenant B installation', async () => {
  const f = fixture(); await assert.rejects(authorize(f.service, ''), /PKCE/);
  await assert.rejects(authorize(f.service, challenge, 'store-B'), /not installed/);
});
test('PKCE: expired authorization code rejected', async () => {
  const f = fixture(); const { code } = await authorize(f.service);
  f.authCodes.get(hash(code)).expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(exchange(f.service, code), /Invalid or expired/);
});
test('Installation disabled rejects issuance and existing access token', async () => {
  const f = fixture(); const { code } = await authorize(f.service); f.installation.enabled = false;
  await assert.rejects(exchange(f.service, code), /not active/);
  const g = fixture(); const c = await authorize(g.service); const t = await exchange(g.service, c.code);
  g.installation.enabled = false;
  await assert.rejects(g.service.authenticateAccessToken(t.access_token), /Invalid or expired/);
});
test('Scope removed after issuance is no longer included in token auth', async () => {
  const f = fixture(); const { code } = await authorize(f.service); const t = await exchange(f.service, code);
  f.installation.scopes = [];
  const resolved = await f.service.authenticateAccessToken(t.access_token);
  assert.equal(resolved.tenantId, 'store-A'); assert.deepEqual(resolved.scopes, []);
});
test('API guard uses installation tenant, rejects conflicting x-tenant-id and x-store-id', async () => {
  const f = fixture(); const { code } = await authorize(f.service); const t = await exchange(f.service, code);
  const guard = new AppApiGuard(f.service);
  const context = (headers: any) => { const req: any = { headers }; const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) }; return { ctx, req }; };
  const good = context({ authorization: `Bearer ${t.access_token}`, 'x-tenant-id': 'store-A' });
  assert.equal(await guard.canActivate(good.ctx), true); assert.equal(good.req.tenantId, 'store-A');
  for (const key of ['x-tenant-id', 'x-store-id']) {
    const bad = context({ authorization: `Bearer ${t.access_token}`, [key]: 'store-B' });
    await assert.rejects(guard.canActivate(bad.ctx), /Tenant header/);
  }
});
