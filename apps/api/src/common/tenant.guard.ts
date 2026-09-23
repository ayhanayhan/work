import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const tenantId = String(req.headers['x-tenant-id'] || '');
    if (!tenantId) throw new ForbiddenException('x-tenant-id header required');
    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId: req.user.sub, tenantId } },
      include: { customRole: true, tenant: { select: { status: true } } },
    });
    if (!membership) throw new ForbiddenException('No access to tenant');
    if (['SUSPENDED','CANCELLED'].includes(membership.tenant.status)) throw new ForbiddenException('Tenant is not active');
    req.tenantId = tenantId;
    req.membership = membership;
    return true;
  }
}
