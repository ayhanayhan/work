import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Req, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { EmailService } from './email.service';

@Controller('admin/email')
@UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
export class MerchantEmailController {
  constructor(private readonly email:EmailService){}
  @RequirePermission('settings.read') @Get('settings') settings(@CurrentTenant() id:string){return this.email.settings(id)}
  @RequirePermission('settings.manage') @Put('settings') save(@CurrentTenant() id:string,@Body() b:any){return this.email.updateSettings(id,b)}
  @RequirePermission('settings.read') @Post('templates/preview') previewTemplate(@CurrentTenant() id:string,@Body() b:any){return this.email.templatePreview(id,b)}
  @RequirePermission('settings.manage') @Post('templates/test') testTemplate(@CurrentTenant() id:string,@Body() b:any){return this.email.testTemplate(id,b)}
  @RequirePermission('settings.read') @Get('domains') domains(@CurrentTenant() id:string){return this.email.settings(id).then(r=>r.domains)}
  @RequirePermission('settings.manage') @Post('domains') add(@CurrentTenant() id:string,@Body() b:any){return this.email.addDomain(id,b)}
  @RequirePermission('settings.manage') @Post('domains/:id/check') check(@CurrentTenant() tenantId:string,@Param('id') id:string){return this.email.checkDomain(tenantId,id)}
  @RequirePermission('settings.manage') @Delete('domains/:id') remove(@CurrentTenant() tenantId:string,@Param('id') id:string){return this.email.removeDomain(tenantId,id)}
  @RequirePermission('marketing.read') @Get('marketing/status') marketing(@CurrentTenant() id:string){return this.email.settings(id).then(r=>r.marketingPolicy)}
  @RequirePermission('marketing.read') @Get('marketing/usage') usage(@CurrentTenant() id:string){return this.email.usage(id)}
  @RequirePermission('marketing.manage') @Post('marketing/request-access') request(@CurrentTenant() id:string){return this.email.requestAccess(id)}
  @RequirePermission('marketing.read') @Get('campaigns') campaigns(@CurrentTenant() id:string){return this.email.campaigns(id)}
  @RequirePermission('marketing.read') @Get('campaigns/:id/report') report(@CurrentTenant() tenantId:string,@Param('id') id:string){return this.email.campaignReport(tenantId,id)}
  @RequirePermission('marketing.manage') @Post('campaigns') create(@CurrentTenant() id:string,@Body() b:any){return this.email.saveCampaign(id,b)}
  @RequirePermission('marketing.manage') @Put('campaigns/:id') edit(@CurrentTenant() tenantId:string,@Param('id') id:string,@Body() b:any){return this.email.saveCampaign(tenantId,b,id)}
  @RequirePermission('marketing.manage') @Post('campaigns/:id/schedule') schedule(@CurrentTenant() tenantId:string,@Param('id') id:string){return this.email.schedule(tenantId,id)}
  @RequirePermission('marketing.manage') @Post('campaigns/:id/pause') pause(@CurrentTenant() tenantId:string,@Param('id') id:string){return this.email.pauseCampaign(tenantId,id)}
}

@Controller('superadmin/email')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminEmailController {
  constructor(private readonly email:EmailService){}
  @Get('overview') overview(){return this.email.overview()}
  @Get('ses/config') sesConfig(){return this.email.sesConfiguration()}
  @Put('ses/config') saveSesConfig(@Body() body:any){return this.email.updateSesConfiguration(body)}
  @Post('ses/test') sesTest(@Body() body:any){return this.email.testSesEmail(body?.to)}
  @Patch('policy') policy(@Body() b:any){return this.email.setGlobal(b)}
  @Get('tenants') tenants(){return this.email.tenants()}
  @Get('tenants/:id') tenant(@Param('id') id:string){return this.email.tenantPolicy(id)}
  @Patch('tenants/:id') approve(@Param('id') id:string,@Body() b:any){return this.email.tenantPolicy(id,b)}
  @Post('tenants/:id/iys-import') importIys(@Param('id') id:string,@Body() b:any){return this.email.importIys(id,b)}
  @Post('transactional/unsuppress') unsuppress(@Body() b:any){return this.email.unsuppressTransactional(b.email,b.reason)}
}

@Controller('email')
export class PublicEmailController {
  constructor(private readonly email:EmailService){}
  @Post('sns') sns(@Body() body:unknown){return this.email.receiveSns(body)}
  @Post('sns/tx') snsTransactional(@Body() body:unknown){return this.email.receiveSns(body,'TX')}
  @Get('click/:token') async click(@Param('token') token:string,@Res() response:any){const url=await this.email.recordClick(token);response.redirect(302,url)}
  @Get('unsubscribe/:token') page(@Param('token') token:string,@Res() response:any){
    // GET is deliberately read-only: mailbox link scanners must not unsubscribe customers.
    response.type('html').send('<!doctype html><html lang="tr"><meta charset="utf-8"><title>E-posta aboneliği</title><body><h1>E-posta aboneliği</h1><form method="post"><button type="submit">Abonelikten çık</button></form></body></html>');
  }
  @Post('unsubscribe/:token') async unsubscribe(@Param('token') token:string,@Res() response:any){await this.email.unsubscribe(token);response.type('html').send('<!doctype html><html lang="tr"><meta charset="utf-8"><body><h1>Aboneliğiniz sonlandırıldı</h1></body></html>')}
}
