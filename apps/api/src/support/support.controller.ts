import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { CurrentTenant } from '../common/request.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { SupportService } from './support.service';

@Controller()
export class SupportController {
  constructor(private svc: SupportService) {}

  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('support.read')
  @Get('admin/support/tickets') list(@CurrentTenant() t: string,@Query() q:any) { return this.svc.listTenant(t,q); }
  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('support.read')
  @Get('admin/support/tickets/:id') detail(@CurrentTenant() t:string,@Param('id')id:string){return this.svc.tenantDetail(t,id)}
  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('support.manage')
  @Post('admin/support/tickets') create(@CurrentTenant() t: string, @Req() req: any, @Body() b: any) { return this.svc.create(t, req.user.sub, b); }
  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('support.manage')
  @Post('admin/support/tickets/:id/messages') message(@CurrentTenant() t: string, @Req() req: any, @Param('id') id: string, @Body() b: any) { return this.svc.addMerchantMessage(t, id, req.user.sub, b); }
  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('support.manage')
  @Patch('admin/support/tickets/:id') merchantUpdate(@CurrentTenant()t:string,@Param('id')id:string,@Body()b:any){return this.svc.merchantUpdate(t,id,b)}

  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/support/tickets') all(@Query()q:any) { return this.svc.listAll(q); }
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/support/tickets/:id') supportDetail(@Param('id')id:string){return this.svc.supportDetail(id)}
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/support/agents') agents(){return this.svc.agents()}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/support/tickets/:id') update(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.svc.updateAsSupport(id, req.superAdmin.sub, b); }
  @UseGuards(SuperAdminAuthGuard)
  @Post('superadmin/support/tickets/:id/messages') supportMessage(@Req()req:any,@Param('id')id:string,@Body()b:any){return this.svc.addSupportMessage(id,req.superAdmin.sub,b)}
}
