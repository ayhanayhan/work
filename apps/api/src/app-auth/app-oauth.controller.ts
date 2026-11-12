import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { AppAuthService } from './app-auth.service';
@Controller('app-oauth')
export class AppOAuthController{
  constructor(private svc:AppAuthService){}
  @Post('authorize') @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard) @RequirePermission('settings.manage') authorize(@CurrentTenant() tenantId:string,@Body() body:any){return this.svc.authorize(tenantId,body)}
  @Post('token') token(@Body() body:any){return this.svc.token(body)}
}
