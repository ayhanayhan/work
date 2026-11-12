import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AppAuthService } from './app-auth.service';

@Injectable()
export class AppApiGuard implements CanActivate {
  constructor(private auth: AppAuthService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const h = String(req.headers?.authorization || '');
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) throw new UnauthorizedException('Bearer app access token required');
    req.appAuth = await this.auth.authenticateAccessToken(m[1].trim());

    // App API tenancy is derived exclusively from the token. If a caller also sends
    // a tenant/store header, require it to match so proxy/header confusion cannot
    // be used to cross tenant boundaries.
    const assertedTenant = String(req.headers?.['x-tenant-id'] || req.headers?.['x-store-id'] || '').trim();
    if (assertedTenant && assertedTenant !== req.appAuth.tenantId) {
      throw new ForbiddenException('Tenant header does not match app installation');
    }
    req.tenantId = req.appAuth.tenantId;
    req.appTenantId = req.appAuth.tenantId;
    return true;
  }
}
