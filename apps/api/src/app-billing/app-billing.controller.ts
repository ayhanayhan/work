import { Body, Controller, Get, Param, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { AppApiGuard } from '../app-auth/app-api.guard';
import { AppRateLimitGuard } from '../app-auth/app-rate-limit.guard';
import { AppScopeGuard } from '../app-auth/app-scope.guard';
import { RequireAppScopes } from '../app-auth/app-scopes';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { AppBillingService } from './app-billing.service';

@Controller('admin/apps/billing')
@UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
export class MerchantAppBillingController{
  constructor(private svc:AppBillingService){}
  @Get() @RequirePermission('settings.read') summary(@CurrentTenant() tenantId:string){return this.svc.tenantSummary(tenantId)}
  @Get(':slug') @RequirePermission('settings.read') one(@CurrentTenant() tenantId:string,@Param('slug') slug:string){return this.svc.appStatus(tenantId,slug)}
}

@Controller('app-api/billing')
@UseGuards(AppApiGuard,AppRateLimitGuard,AppScopeGuard)
export class AppUsageBillingController{
  constructor(private svc:AppBillingService){}
  @Post('usage') @RequireAppScopes('billing:usage') usage(@Req() req:any,@Body() body:any){return this.svc.reportUsage(req.appAuth,body)}
}

@Controller('superadmin/app-billing')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminAppBillingController{
  constructor(private svc:AppBillingService){}
  @Post('charges/:id/mark-paid') paid(@Param('id') id:string,@Body() body:any){return this.svc.markChargePaid(id,body?.externalRef)}
}

@Controller('internal/app-billing')
export class AppBillingWorkerController{
  constructor(private svc:AppBillingService){}
  @Post('reconcile') reconcile(@Req() req:any,@Body() body:any){const expected=String(process.env.APP_BILLING_WORKER_TOKEN||process.env.EVENT_WORKER_TOKEN||'').trim();const got=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'').trim();if(!expected||got!==expected)throw new UnauthorizedException('Invalid billing worker token');return this.svc.reconcile(Number(body?.limit||100))}
}
