import {Body,Controller,Delete,Get,Param,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {TenantGuard} from '../common/tenant.guard';
import {PermissionGuard} from '../common/permission.guard';
import {RequirePermission} from '../common/permissions';
import {CurrentTenant} from '../common/request.decorator';
import {MerchantSeoService} from './merchant-seo.service';

@Controller('admin/seo-v2')
@UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
export class MerchantSeoController{
  constructor(private readonly svc:MerchantSeoService){}
  @RequirePermission('content.read') @Get('overview') overview(@CurrentTenant() t:string,@Query('storeId') s:string){return this.svc.overview(t,s)}
  @RequirePermission('content.manage') @Patch('settings') settings(@CurrentTenant() t:string,@Body() b:any){return this.svc.saveSettings(t,b.storeId,b)}
  @RequirePermission('content.read') @Get('scans') scans(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.scans(t,s,q)}
  @RequirePermission('content.manage') @Post('scans') scan(@CurrentTenant() t:string,@Req() req:any,@Body() b:any){return this.svc.requestScan(t,b.storeId,req.user?.sub)}
  @RequirePermission('content.read') @Get('issues') issues(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.issues(t,s,q)}
  @RequirePermission('content.manage') @Patch('issues/:id') issue(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.resolveIssue(t,b.storeId,id,b.resolved!==false)}
  @RequirePermission('content.read') @Get('redirects') redirects(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.redirects(t,s,q)}
  @RequirePermission('content.manage') @Post('redirects') addRedirect(@CurrentTenant() t:string,@Body() b:any){return this.svc.saveRedirect(t,b.storeId,b)}
  @RequirePermission('content.manage') @Patch('redirects/:id') editRedirect(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.saveRedirect(t,b.storeId,b,id)}
  @RequirePermission('content.manage') @Delete('redirects/:id') delRedirect(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.deleteRedirect(t,s,id)}
  @RequirePermission('content.read') @Get('404') notFound(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.notFound(t,s,q)}
  @RequirePermission('content.manage') @Post('404/:id/redirect') redirect404(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.redirectNotFound(t,b.storeId,id,b)}
}
