import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION, SYSTEM_ROLE_PERMISSIONS } from './permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSION, [ctx.getHandler(), ctx.getClass()]) || [];
    if (!required.length) return true;
    const req = ctx.switchToHttp().getRequest();
    const membership = req.membership;
    if (!membership) throw new ForbiddenException('Tenant membership required');
    const permissions = membership.role === 'OWNER'
      ? ['*']
      : (membership.customRole?.permissions?.length ? membership.customRole.permissions : SYSTEM_ROLE_PERMISSIONS[membership.role] || []);
    if (permissions.includes('*')) return true;
    if (!required.every(p => permissions.includes(p))) throw new ForbiddenException('Insufficient permission');

    return true;
  }
}
