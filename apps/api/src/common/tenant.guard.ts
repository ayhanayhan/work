import { CanActivate, ExecutionContext, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {tenantRestriction} from './subscription-restriction';
import {TenantPlacementService} from '../tenant-placement/tenant-placement.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService,private readonly placements:TenantPlacementService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const rawTenant = req.headers?.['x-tenant-id'];
    if (typeof rawTenant !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(rawTenant)) throw new ForbiddenException('Valid x-tenant-id header required');
    const userId = req.user?.sub;
    if (typeof userId !== 'string' || !userId || userId.length > 256) throw new ForbiddenException('Authenticated user required');
    const tenantId = rawTenant;
    const membership = await this.prisma.control().membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { customRole: true, tenant: { select: { status: true } } },
    });
    if (!membership) throw new ForbiddenException('No access to tenant');
    const route=String(req.originalUrl||req.url||'').split('?')[0];
    const billingAllowed=/\/(?:admin\/billing|billing\/iyzico)(?:\/|$)/.test(route);
    const recoveryAllowed=/\/(?:admin\/support|admin\/account|merchant-auth)(?:\/|$)/.test(route);
    const restriction=await tenantRestriction(this.prisma,tenantId);
    if(restriction.restricted&&!billingAllowed&&!recoveryAllowed)throw new ForbiddenException('SUBSCRIPTION_RESTRICTED');
    if(!['ACTIVE','TRIAL'].includes(membership.tenant.status)&&!billingAllowed&&!recoveryAllowed)throw new ForbiddenException('Tenant is not active');
    const policy=req.tenantRuntime||await this.placements.resolve(tenantId);
    const local=String(process.env.TICARTI_CELL_CODE||'primary').trim();
    const mode=String(process.env.CELL_ROUTING_MODE||'direct').trim().toLowerCase();
    if(String(process.env.CELL_ROUTING_ENFORCE||'').toLowerCase()==='true'&&mode!=='direct'&&policy.cellCode!==local)throw new ServiceUnavailableException(`Tenant is assigned to cell ${policy.cellCode}`);
    const method=String(req.method||'GET').toUpperCase();
    if(policy.cellStatus==='DISABLED')throw new ServiceUnavailableException(`Tenant cell is ${policy.cellStatus}`);
    if(policy.cellStatus==='READ_ONLY'&&!['GET','HEAD','OPTIONS'].includes(method))throw new ServiceUnavailableException(`Tenant cell is ${policy.cellStatus}`);
    this.prisma.setTenantRouting(policy);
    req.tenantRuntime=policy;
    req.tenantId = tenantId;
    req.membership = membership;
    return true;
  }
}
