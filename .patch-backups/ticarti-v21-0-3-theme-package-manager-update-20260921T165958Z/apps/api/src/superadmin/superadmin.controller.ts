import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { SuperAdminService } from './superadmin.service';

@Controller('superadmin')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminController {
  constructor(private svc: SuperAdminService) {}
  @Get('dashboard') dashboard() { return this.svc.dashboard(); }
  @Get('tenants') tenants(@Query('q') q?: string) { return this.svc.tenants(q); }
  @Get('tenants/:id') tenant(@Param('id') id: string) { return this.svc.tenant(id); }
  @Patch('tenants/:id') updateTenant(@Param('id') id: string, @Body() b: any) { return this.svc.updateTenant(id, b); }
  @Post('tenants/:id/subscription') setSub(@Param('id') id: string, @Body() b: any) { return this.svc.setSubscription(id, b); }
  @Get('users') users(@Query('q') q?: string) { return this.svc.users(q); }
  @Get('plans') plans() { return this.svc.plans(); }
  @Post('plans') createPlan(@Body() b: any) { return this.svc.createPlan(b); }
  @Patch('plans/:id') updatePlan(@Param('id') id: string, @Body() b: any) { return this.svc.updatePlan(id, b); }
  @Get('reserved-subdomains') reservedSubdomains() { return this.svc.reservedSubdomains(); }
  @Post('reserved-subdomains') createReservedSubdomain(@Body() b: any) { return this.svc.createReservedSubdomain(b); }
  @Patch('reserved-subdomains/:id') updateReservedSubdomain(@Param('id') id:string,@Body() b:any) { return this.svc.updateReservedSubdomain(id,b); }
  @Delete('reserved-subdomains/:id') deleteReservedSubdomain(@Param('id') id:string) { return this.svc.deleteReservedSubdomain(id); }
  @Patch('subscriptions/:id') updateSub(@Param('id') id: string, @Body() b: any) { return this.svc.updateSubscription(id, b); }
  @Get('apps') apps() { return this.svc.apps(); }
  @Post('apps') createApp(@Body() b: any) { return this.svc.createApp(b); }
  @Patch('apps/:id') updateApp(@Param('id') id: string, @Body() b: any) { return this.svc.updateApp(id, b); }
  @Post('apps/:id/plan-pricing') setAppPlanPricing(@Param('id') id: string, @Body() b: any) { return this.svc.setAppPlanPricing(id, b); }
  @Post('tenants/:tenantId/apps/:appId/grant') grantApp(@Param('tenantId') tenantId:string,@Param('appId') appId:string){ return this.svc.grantApp(tenantId,appId); }
  @Patch('tenants/:tenantId/apps/:appId') tenantApp(@Param('tenantId') tenantId:string,@Param('appId') appId:string,@Body() b:any){ return this.svc.updateTenantApp(tenantId,appId,b); }
  @Get('themes') themes(){ return this.svc.themes(); }
  @Post('themes') createTheme(@Body() b:any){ return this.svc.createTheme(b); }
  @Patch('themes/:id') updateTheme(@Param('id') id:string,@Body() b:any){ return this.svc.updateTheme(id,b); }
  @Post('themes/:id/plan-pricing') themePlanPricing(@Param('id') id:string,@Body() b:any){ return this.svc.setThemePlanPricing(id,b); }
  @Post('tenants/:tenantId/themes/:themeId/grant') grantTheme(@Param('tenantId') tenantId:string,@Param('themeId') themeId:string){ return this.svc.grantTheme(tenantId,themeId); }
  @Post('themes/:id/module-toggle') themeModuleToggle(@Param('id') id:string,@Body() b:any){ return this.svc.toggleThemeModule(id,b); }

}
