import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { SuperAdminService } from './superadmin.service';
import {BillingCouponAdminDto,CreditProductDto} from './superadmin-products.dto';
import {TenantPlacementService} from '../tenant-placement/tenant-placement.service';
import {InfrastructureCellDto,TenantPlacementDto} from '../tenant-placement/tenant-placement.dto';
import {TenantCellMigrationService} from '../tenant-placement/tenant-cell-migration.service';
import {CapacityPlannerService} from '../tenant-placement/capacity-planner.service';
import {CapacityPlanDto} from '../tenant-placement/capacity-planner.dto';
import {AutoRunTenantCellMigrationDto,FailTenantCellMigrationDto,PlanTenantCellMigrationDto} from '../tenant-placement/tenant-cell-migration.dto';
import {CellProvisioningService} from '../tenant-placement/cell-provisioning.service';
import {ProvisionCellDto} from '../tenant-placement/cell-provisioning.dto';

@Controller('superadmin')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminController {
  constructor(private svc: SuperAdminService,private placements:TenantPlacementService,private cellMigrations:TenantCellMigrationService,private capacity:CapacityPlannerService,private provisioning:CellProvisioningService) {}
  @Get('subscription-restrictions') restrictionSettings(){return this.svc.getRestrictionSettings()}
  @Patch('subscription-restrictions') restrictionSave(@Body() body:any){return this.svc.saveRestrictionSettings(body)}
  @Get('dashboard') dashboard() { return this.svc.dashboard(); }
  @Get('infrastructure') infrastructureOverview(){return this.placements.overview();}
  @Get('infrastructure/cells') infrastructureCells(){return this.placements.listCells();}
  @Post('infrastructure/cells') createInfrastructureCell(@Body() b:InfrastructureCellDto){return this.placements.saveCell(undefined,b);}
  @Patch('infrastructure/cells/:code') updateInfrastructureCell(@Param('code') code:string,@Body() b:InfrastructureCellDto){return this.placements.saveCell(code,b);}
  @Get('infrastructure/placements') infrastructurePlacements(@Query('q') q?:string,@Query('take') take?:string,@Query('cursor') cursor?:string){return this.placements.listPlacements({q,take:Number(take||100),cursor});}
  @Get('infrastructure/placements/:tenantId/runtime') infrastructureRuntime(@Param('tenantId') tenantId:string){return this.placements.runtime(tenantId);}
  @Patch('infrastructure/placements/:tenantId') updateInfrastructurePlacement(@Param('tenantId') tenantId:string,@Body() b:TenantPlacementDto){return this.placements.updatePlacement(tenantId,b as any);}
  @Get('infrastructure/readiness') infrastructureReadiness(){return this.placements.cellReadiness();}
  @Post('infrastructure/capacity/plan') infrastructureCapacityPlan(@Body() b:CapacityPlanDto){return this.capacity.plan(b);}
  @Post('infrastructure/capacity/apply') infrastructureCapacityApply(@Body() b:CapacityPlanDto){return this.capacity.apply(b);}
  @Post('infrastructure/capacity/distribution-preview') infrastructureCapacityDistributionPreview(@Body() b:CapacityPlanDto){return this.capacity.distributionPreview(b);}
  @Get('infrastructure/provisioning') infrastructureProvisioning(){return this.provisioning.list();}
  @Get('infrastructure/cells/:code/provisioning') infrastructureProvisioningStatus(@Param('code') code:string){return this.provisioning.status(code);}
  @Post('infrastructure/cells/:code/provision/preview') infrastructureProvisionPreview(@Param('code') code:string){return this.provisioning.preview(code);}
  @Post('infrastructure/cells/:code/provision') infrastructureProvision(@Param('code') code:string,@Body() b:ProvisionCellDto){return this.provisioning.start(code,b);}
  @Post('infrastructure/cells/:code/provision/reconcile') infrastructureProvisionReconcile(@Param('code') code:string){return this.provisioning.reconcile(code,false);}
  @Get('infrastructure/migrations') infrastructureMigrations(@Query('tenantId') tenantId?:string){return this.cellMigrations.list(tenantId);}
  @Post('infrastructure/migrations/:tenantId') planInfrastructureMigration(@Param('tenantId') tenantId:string,@Body() b:PlanTenantCellMigrationDto){return this.cellMigrations.plan(tenantId,b.targetCellCode);}
  @Post('infrastructure/migrations/:id/copying') markInfrastructureMigrationCopying(@Param('id') id:string){return this.cellMigrations.markCopying(id);}
  @Post('infrastructure/migrations/:id/prepare-routing') prepareInfrastructureMigrationRouting(@Param('id') id:string){return this.cellMigrations.prepareRoutingKeys(id);}
  @Post('infrastructure/migrations/:id/copy') copyInfrastructureMigration(@Param('id') id:string){return this.cellMigrations.copyInitial(id);}
  @Post('infrastructure/migrations/:id/delta-sync') deltaInfrastructureMigration(@Param('id') id:string){return this.cellMigrations.deltaSync(id);}
  @Post('infrastructure/migrations/:id/auto-run') autoRunInfrastructureMigration(@Param('id') id:string,@Body() b:AutoRunTenantCellMigrationDto){return this.cellMigrations.autoRun(id,Boolean(b?.cutover));}
  @Post('infrastructure/migrations/:id/rollback') rollbackInfrastructureMigration(@Param('id') id:string){return this.cellMigrations.rollback(id);}
  @Post('infrastructure/migrations/:id/verify') verifyInfrastructureMigration(@Param('id') id:string){return this.cellMigrations.verify(id);}
  @Post('infrastructure/migrations/:id/cutover') cutoverInfrastructureMigration(@Param('id') id:string){return this.cellMigrations.cutover(id);}
  @Post('infrastructure/migrations/:id/fail') failInfrastructureMigration(@Param('id') id:string,@Body() b:FailTenantCellMigrationDto){return this.cellMigrations.fail(id,b.message);}
  @Post('infrastructure/migrations/:id/cancel') cancelInfrastructureMigration(@Param('id') id:string){return this.cellMigrations.cancel(id);}
  @Get('system-audit') systemAudit() { return this.svc.systemAudit(); }
  @Get('store-deletion-requests') storeDeletionRequests(){return this.svc.storeDeletionRequests();}
  @Get('tenants') tenants(@Query('q') q?: string) { return this.svc.tenants(q); }
  @Get('tenants/:id') tenant(@Param('id') id: string) { return this.svc.tenant(id); }
  @Patch('tenants/:id') updateTenant(@Param('id') id: string, @Body() b: any) { return this.svc.updateTenant(id, b); }
  @Post('tenants/:id/subscription') setSub(@Param('id') id: string, @Body() b: any) { return this.svc.setSubscription(id, b); }
  @Get('users') users(@Query('q') q?: string) { return this.svc.users(q); }
  @Get('memberships') memberships() { return this.svc.memberships(); }
  @Patch('memberships/:id/status') membershipStatus(@Param('id') id:string,@Body() b:any) { return this.svc.setMembershipStatus(id,b); }
  @Delete('memberships/:id') deleteMembership(@Param('id') id:string) { return this.svc.deleteMembership(id); }
  @Get('currency-rates') currencyRates() { return this.svc.currencyRates(); }
  @Get('store-sectors') storeSectors() { return this.svc.storeSectors(); }
  @Patch('store-sectors') updateStoreSectors(@Body() b:any) { return this.svc.updateStoreSectors(b); }
  @Get('store-metadata') storeMetadata() { return this.svc.storeMetadata(); }
  @Post('currency-rates/refresh') refreshCurrencyRates(@Body() b:any) { return this.svc.refreshCurrencyRates(b); }
  @Get('products') platformProducts(){ return this.svc.platformProducts(); }
  @Post('products/credits/:kind') createCreditProduct(@Param('kind') kind:string,@Body() b:CreditProductDto){ return this.svc.saveCreditProduct(kind==='email'?'EMAIL':'AI',undefined,b); }
  @Patch('products/credits/:kind/:id') updateCreditProduct(@Param('kind') kind:string,@Param('id') id:string,@Body() b:CreditProductDto){ return this.svc.saveCreditProduct(kind==='email'?'EMAIL':'AI',id,b); }
  @Post('products/coupons') createBillingCoupon(@Body() b:BillingCouponAdminDto){ return this.svc.saveBillingCoupon(undefined,b); }
  @Patch('products/coupons/:id') updateBillingCoupon(@Param('id') id:string,@Body() b:BillingCouponAdminDto){ return this.svc.saveBillingCoupon(id,b); }
  @Get('plans') plans() { return this.svc.plans(); }
  @Post('plans') createPlan(@Body() b: any) { return this.svc.createPlan(b); }
  @Patch('plans/:id') updatePlan(@Param('id') id: string, @Body() b: any) { return this.svc.updatePlan(id, b); }
  @Get('reserved-subdomains') reservedSubdomains() { return this.svc.reservedSubdomains(); }
  @Post('reserved-subdomains') createReservedSubdomain(@Body() b: any) { return this.svc.createReservedSubdomain(b); }
  @Patch('reserved-subdomains/:id') updateReservedSubdomain(@Param('id') id:string,@Body() b:any) { return this.svc.updateReservedSubdomain(id,b); }
  @Delete('reserved-subdomains/:id') deleteReservedSubdomain(@Param('id') id:string) { return this.svc.deleteReservedSubdomain(id); }
  @Patch('subscriptions/:id') updateSub(@Param('id') id: string, @Body() b: any) { return this.svc.updateSubscription(id, b); }
  @Get('platform-locales') platformLocales() { return this.svc.platformLocales(); }
  @Get('apps') apps() { return this.svc.apps(); }
  @Post('apps/inspect-package') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:8*1024*1024,files:1,fields:8,parts:10,fieldNameSize:200,fieldSize:1048576}})) inspectAppPackage(@UploadedFile() file:any){return this.svc.inspectAppPackage(file);}
  @Post('apps/import-package') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:8*1024*1024,files:1,fields:8,parts:10,fieldNameSize:200,fieldSize:1048576}})) importAppPackage(@UploadedFile() file:any){return this.svc.importAppPackage(file);}
  @Post('apps') createApp(@Body() b: any) { return this.svc.createApp(b); }
  @Patch('apps/:id') updateApp(@Param('id') id: string, @Body() b: any) { return this.svc.updateApp(id, b); }
  @Post('apps/:id/plan-pricing') setAppPlanPricing(@Param('id') id: string, @Body() b: any) { return this.svc.setAppPlanPricing(id, b); }
  @Post('tenants/:tenantId/apps/:appId/grant') grantApp(@Param('tenantId') tenantId:string,@Param('appId') appId:string){ return this.svc.grantApp(tenantId,appId); }
  @Patch('tenants/:tenantId/apps/:appId') tenantApp(@Param('tenantId') tenantId:string,@Param('appId') appId:string,@Body() b:any){ return this.svc.updateTenantApp(tenantId,appId,b); }
  @Get('themes') themes(){ return this.svc.themes(); }
  @Get('theme-categories') themeCategories(){ return this.svc.themeCategories(); }
  @Patch('theme-categories') updateThemeCategories(@Body() b:any){ return this.svc.updateThemeCategories(b); }
  @Get('themes/categories') themeCategoriesAlias(){ return this.svc.themeCategories(); }
  @Patch('themes/categories') updateThemeCategoriesAlias(@Body() b:any){ return this.svc.updateThemeCategories(b); }
  @Post('themes/inspect')
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:30*1024*1024,files:1,fields:24,parts:26,fieldNameSize:200,fieldSize:1048576}}))
  inspectTheme(@UploadedFile() file:any){ return this.svc.inspectThemePackage(file); }
  @Post('themes/import')
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:30*1024*1024,files:1,fields:24,parts:26,fieldNameSize:200,fieldSize:1048576}}))
  importTheme(@UploadedFile() file:any,@Body() b:any){ return this.svc.importThemePackage(file,b); }
  @Post('themes') createTheme(@Body() b:any){ return this.svc.createTheme(b); }
  @Patch('themes/:id') updateTheme(@Param('id') id:string,@Body() b:any){ return this.svc.updateTheme(id,b); }
  @Delete('themes/:id') deleteTheme(@Param('id') id:string){ return this.svc.deleteTheme(id); }
  @Post('themes/:id/plan-pricing') themePlanPricing(@Param('id') id:string,@Body() b:any){ return this.svc.setThemePlanPricing(id,b); }
  @Post('tenants/:tenantId/themes/:themeId/grant') grantTheme(@Param('tenantId') tenantId:string,@Param('themeId') themeId:string){ return this.svc.grantTheme(tenantId,themeId); }
  @Post('themes/:id/module-toggle') themeModuleToggle(@Param('id') id:string,@Body() b:any){ return this.svc.toggleThemeModule(id,b); }


  @Get('geo')
  geo(@Query() query:any){return this.svc.geoNodes(query);}

  @Patch('geo/:id')
  updateGeo(@Param('id') id:string,@Body() body:any){return this.svc.updateGeoNode(id,body);}

  @Get('cloudflare-status') cloudflareStatus(){return {configured:!!process.env.CLOUDFLARE_PLATFORM_API_TOKEN,mode:'central-managed-zones',requiredSecret:'CLOUDFLARE_PLATFORM_API_TOKEN'};}
  @Get('platform-settings') platformSettings(){ return this.svc.platformSettings(); }
  @Patch('platform-settings') updatePlatformSettings(@Body() b:any){ return this.svc.updatePlatformSettings(b); }
  @Get('app-workspace') appWorkspace(){ return this.svc.appWorkspace(); }
  @Get('team') team(){ return this.svc.team(); }
  @Post('team') createTeamMember(@Body() b:any){ return this.svc.createTeamMember(b); }
  @Patch('team/:id') updateTeamMember(@Param('id') id:string,@Body() b:any){ return this.svc.updateTeamMember(id,b); }
  @Get('live-orders') liveOrders(@Query('limit') limit?:string){ return this.svc.liveOrders(limit); }
  @Get('platform-content') platformContent(){ return this.svc.platformContent(); }
  @Patch('platform-content') updatePlatformContent(@Body() b:any){ return this.svc.updatePlatformContent(b); }

}
