import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { CurrentTenant } from '../common/request.decorator';
import { SupportService } from './support.service';

@Controller()
export class SupportController {
  constructor(private svc: SupportService) {}

  @UseGuards(MerchantAuthGuard, TenantGuard)
  @Get('admin/support/tickets') list(@CurrentTenant() t: string) { return this.svc.listTenant(t); }
  @UseGuards(MerchantAuthGuard, TenantGuard)
  @Post('admin/support/tickets') create(@CurrentTenant() t: string, @Req() req: any, @Body() b: any) { return this.svc.create(t, req.user.sub, b); }
  @UseGuards(MerchantAuthGuard, TenantGuard)
  @Post('admin/support/tickets/:id/messages') message(@CurrentTenant() t: string, @Req() req: any, @Param('id') id: string, @Body() b: any) { return this.svc.addMerchantMessage(t, id, req.user.sub, b.message); }

  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/support/tickets') all() { return this.svc.listAll(); }
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/support/tickets/:id') update(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.svc.updateAsSupport(id, req.superAdmin.sub, b); }
}
