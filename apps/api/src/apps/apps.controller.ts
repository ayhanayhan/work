import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { AppsService } from './apps.service';

@Controller('admin/apps')
@UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
export class AppsController{
  constructor(private svc:AppsService){}
  @RequirePermission('settings.read') @Get('store') store(@CurrentTenant() tenantId:string){return this.svc.store(tenantId)}
  @RequirePermission('settings.read') @Get('installed') installed(@CurrentTenant() tenantId:string){return this.svc.installed(tenantId)}
  @RequirePermission('settings.read') @Get('installed/:slug') installedOne(@CurrentTenant() tenantId:string,@Param('slug') slug:string){return this.svc.installedOne(tenantId,slug)}
  @RequirePermission('settings.manage') @Post(':slug/install') install(@CurrentTenant() tenantId:string,@Param('slug') slug:string){return this.svc.install(tenantId,slug)}
  @RequirePermission('settings.manage') @Patch('installed/:slug/state') state(@CurrentTenant() tenantId:string,@Param('slug') slug:string,@Body() body:any){return this.svc.state(tenantId,slug,body)}
  @RequirePermission('settings.manage') @Patch('installed/:slug/settings') settings(@CurrentTenant() tenantId:string,@Param('slug') slug:string,@Body() body:any){return this.svc.saveSettings(tenantId,slug,body)}
  @RequirePermission('settings.manage') @Delete('installed/:slug') remove(@CurrentTenant() tenantId:string,@Param('slug') slug:string){return this.svc.remove(tenantId,slug)}
}
