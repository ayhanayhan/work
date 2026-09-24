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
  @Get('currency-rates') currencyRates() { return this.svc.currencyRates(); }
  @Post('currency-rates/refresh') refreshCurrencyRates(@Body() b:any) { return this.svc.refreshCurrencyRates(b); }
  @Get('plans') plans() { return this.svc.plans(); }
  @Post('plans') createPlan(@Body() b: any) { return this.svc.createPlan(b); }
  @Patch('plans/:id') updatePlan(@Param('id') id: string, @Body() b: any) { return this.svc.updatePlan(id, b); }
  @Get('reserved-subdomains') reservedSubdomains() { return this.svc.reservedSubdomains(); }
  @Post('reserved-subdomains') createReservedSubdomain(@Body() b: any) { return this.svc.createReservedSubdomain(b); }
  @Patch('reserved-subdomains/:id') updateReservedSubdomain(@Param('id') id:string,@Body() b:any) { return this.svc.updateReservedSubdomain(id,b); }
  @Delete('reserved-subdomains/:id') deleteReservedSubdomain(@Param('id') id:string) { return this.svc.deleteReservedSubdomain(id); }
  @Patch('subscriptions/:id') updateSub(@Param('id') id: string, @Body() b: any) { return this.svc.updateSubscription(id, b); }
  @Get('platform-locales') platformLocales() { return this.svc.platformLocales(); }
  @Get('platform-settings') platformSettings() { return this.svc.platformSettings(); }
  @Patch('platform-settings') updatePlatformSettings(@Body() b:any) { return this.svc.updatePlatformSettings(b); }
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
  @Get('themes/:id/skin-defaults') themeSkinDefaults(@Param('id') id:string){ return this.svc.themeSkinDefaults(id); }
  @Patch('themes/:id/skin-defaults/:skin') themeSkinDefaultsUpdate(@Param('id') id:string,@Param('skin') skin:string,@Body() b:any){ return this.svc.updateThemeSkinDefaults(id,skin,b); }
  @Delete('themes/:id/skin-defaults/:skin') themeSkinDefaultsReset(@Param('id') id:string,@Param('skin') skin:string){ return this.svc.resetThemeSkinDefaults(id,skin); }
  @Post('themes/:id/module-toggle') themeModuleToggle(@Param('id') id:string,@Body() b:any){ return this.svc.toggleThemeModule(id,b); }
  @Get('themes/:id/workspace') themeWorkspace(@Param('id') id:string){return this.svc.themeWorkspace(id);}
  @Patch('themes/:id/workspace/groups') themeWorkspaceGroups(@Param('id') id:string,@Body() b:any){return this.svc.updateThemeWorkspaceGroups(id,b);}
  @Patch('themes/:id/skins/:skin/catalog') themeSkinCatalogUpdate(@Param('id') id:string,@Param('skin') skin:string,@Body() b:any){return this.svc.updateThemeSkinCatalog(id,skin,b);}
  @Patch('themes/:id/skins/:skin/source') themeSkinSourceUpdate(@Param('id') id:string,@Param('skin') skin:string,@Body() b:any){return this.svc.updateThemeSkinSource(id,skin,b);}
  @Delete('themes/:id/skins/:skin/source') themeSkinSourceReset(@Param('id') id:string,@Param('skin') skin:string){return this.svc.resetThemeSkinSource(id,skin);}
  @Patch('themes/:id/modules/:type/catalog') themeModuleCatalogUpdate(@Param('id') id:string,@Param('type') type:string,@Body() b:any){return this.svc.updateThemeModuleCatalog(id,type,b);}


  @Get('geo')
  geo(@Query() query:any){return this.svc.geoNodes(query);}

  @Patch('geo/:id')
  updateGeo(@Param('id') id:string,@Body() body:any){return this.svc.updateGeoNode(id,body);}

}
