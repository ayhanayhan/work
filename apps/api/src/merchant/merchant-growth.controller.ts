import {Body,Controller,Delete,Get,Param,Patch,Post,Put,Query,UseGuards} from '@nestjs/common';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';import {TenantGuard} from '../common/tenant.guard';import {PermissionGuard} from '../common/permission.guard';import {RequirePermission} from '../common/permissions';import {CurrentTenant} from '../common/request.decorator';import {MerchantGrowthService} from './merchant-growth.service';
@Controller('admin/growth') @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
export class MerchantGrowthController{constructor(private readonly svc:MerchantGrowthService){}
@RequirePermission('marketing.read') @Get('overview') overview(@CurrentTenant() t:string,@Query('storeId') s:string){return this.svc.overview(t,s)}
@RequirePermission('marketing.read') @Get('segments') segments(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.segments(t,s,q)}
@RequirePermission('marketing.manage') @Post('segments') segment(@CurrentTenant() t:string,@Body() b:any){return this.svc.saveSegment(t,b.storeId,b)}
@RequirePermission('marketing.manage') @Put('segments/:id') segmentEdit(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.saveSegment(t,b.storeId,b,id)}
@RequirePermission('marketing.manage') @Delete('segments/:id') segmentDelete(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.deleteSegment(t,s,id)}
@RequirePermission('marketing.read') @Get('campaigns') campaigns(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.campaigns(t,s,q)}
@RequirePermission('marketing.manage') @Post('campaigns') campaign(@CurrentTenant() t:string,@Body() b:any){return this.svc.saveCampaign(t,b.storeId,b)}
@RequirePermission('marketing.manage') @Put('campaigns/:id') campaignEdit(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.saveCampaign(t,b.storeId,b,id)}
@RequirePermission('marketing.manage') @Delete('campaigns/:id') campaignDelete(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.deleteCampaign(t,s,id)}
@RequirePermission('marketing.manage') @Post('campaigns/:id/launch') launch(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.launchCampaign(t,b.storeId,id)}
@RequirePermission('marketing.manage') @Post('campaigns/:id/pause') pause(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.pauseCampaign(t,b.storeId,id)}
@RequirePermission('marketing.read') @Get('automations') automations(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.automations(t,s,q)}
@RequirePermission('marketing.manage') @Post('automations') automation(@CurrentTenant() t:string,@Body() b:any){return this.svc.saveAutomation(t,b.storeId,b)}
@RequirePermission('marketing.manage') @Put('automations/:id') automationEdit(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.saveAutomation(t,b.storeId,b,id)}
@RequirePermission('marketing.manage') @Patch('automations/:id/toggle') toggle(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.toggleAutomation(t,b.storeId,id,!!b.enabled)}
@RequirePermission('marketing.read') @Get('automations/:id/runs') runs(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string,@Query() q:any){return this.svc.automationRuns(t,s,id,q)}
@RequirePermission('marketing.manage') @Post('automations/:id/trigger') trigger(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.triggerAutomation(t,b.storeId,id,b)}
@RequirePermission('marketing.manage') @Post('automations/process') process(@CurrentTenant() t:string,@Body() b:any){return this.svc.processAutomationRuns(t,b.storeId,b.limit)}
@RequirePermission('marketing.read') @Get('loyalty') loyalty(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.loyalty(t,s,q)}
@RequirePermission('marketing.manage') @Patch('loyalty') loyaltySave(@CurrentTenant() t:string,@Body() b:any){return this.svc.updateLoyalty(t,b.storeId,b)}
@RequirePermission('marketing.manage') @Post('loyalty/adjust') loyaltyAdjust(@CurrentTenant() t:string,@Body() b:any){return this.svc.adjustLoyalty(t,b.storeId,b)}
@RequirePermission('marketing.read') @Get('affiliates') affiliates(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.affiliates(t,s,q)}
@RequirePermission('marketing.manage') @Post('affiliates') affiliate(@CurrentTenant() t:string,@Body() b:any){return this.svc.saveAffiliate(t,b.storeId,b)}
@RequirePermission('marketing.manage') @Put('affiliates/:id') affiliateEdit(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.saveAffiliate(t,b.storeId,b,id)}
@RequirePermission('marketing.manage') @Patch('affiliate-conversions/:id') conv(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.setConversionStatus(t,b.storeId,id,b.status)}
@RequirePermission('marketing.read') @Get('affiliate-payouts') payouts(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.affiliatePayouts(t,s,q)}
@RequirePermission('marketing.manage') @Post('affiliate-payouts') payout(@CurrentTenant() t:string,@Body() b:any){return this.svc.createPayout(t,b.storeId,b)}
@RequirePermission('marketing.manage') @Patch('affiliate-payouts/:id') payoutStatus(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.setPayoutStatus(t,b.storeId,id,b)}
}
