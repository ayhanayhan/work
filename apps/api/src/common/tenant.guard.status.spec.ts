import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TenantGuard } from './tenant.guard';

function fixture(status: string, membershipExists = true) {
  let placementCalls = 0;
  const prisma: any = {
    control: () => ({ membership: { findUnique: async () => membershipExists
      ? { tenant: { status }, customRole: null } : null } }),
    setTenantRouting: () => undefined,
  };
  const placements: any = {
    resolve: async () => { placementCalls++; return { cellCode: 'primary', cellStatus: 'ACTIVE' }; },
  };
  const guard = new TenantGuard(prisma, placements);
  const request: any = { headers: { 'x-tenant-id': 'seuty' }, user: { sub: 'owner' }, method: 'GET' };
  const ctx: any = { switchToHttp: () => ({ getRequest: () => request }) };
  return { guard, request, ctx, get placementCalls() { return placementCalls; } };
}

for (const status of ['SUSPENDED', 'CANCELLED', 'DELETION_PENDING', 'DELETED']) {
  test(`TenantGuard blocks ${status} store without resolving placement`, async () => {
    const f = fixture(status);
    await assert.rejects(() => f.guard.canActivate(f.ctx), /Tenant is not active/);
    assert.equal(f.placementCalls, 0);
    assert.equal(f.request.tenantId, undefined);
  });
}

for (const status of ['ACTIVE', 'TRIAL']) {
  test(`TenantGuard allows ${status} store`, async () => {
    const f = fixture(status);
    assert.equal(await f.guard.canActivate(f.ctx), true);
    assert.equal(f.request.tenantId, 'seuty');
  });
}

test('TenantGuard blocks missing membership', async () => {
  const f = fixture('ACTIVE', false);
  await assert.rejects(() => f.guard.canActivate(f.ctx), /No access to tenant/);
});

test('TenantGuard rejects invalid tenant identifier', async () => {
  const f = fixture('ACTIVE');
  f.request.headers['x-tenant-id'] = 'invalid.tenant';
  await assert.rejects(() => f.guard.canActivate(f.ctx), /Valid x-tenant-id/);
});
