import {Body,Controller,Get,Param,Patch,Query,UseGuards} from '@nestjs/common';
import {CurrentTenant} from '../common/request.decorator';
import {PermissionGuard} from '../common/permission.guard';
import {RequirePermission} from '../common/permissions';
import {TenantGuard} from '../common/tenant.guard';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {ExtensionsService} from './extensions.service';

@Controller('admin/extensions')
@UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
export class ExtensionsAdminController{
  constructor(private svc:ExtensionsService){}
  @RequirePermission('settings.read') @Get('targets') targets(){return this.svc.targets()}
  @RequirePermission('settings.read') @Get('installed') installed(@CurrentTenant() tenantId:string){return this.svc.installedExtensions(tenantId)}
  @RequirePermission('settings.read') @Get('resolve') resolve(@CurrentTenant() tenantId:string,@Query('target') target:string,@Query() q:any){return this.svc.resolveAdmin(tenantId,target,q)}
  @RequirePermission('settings.read') @Get('dashboard') dashboard(@CurrentTenant() tenantId:string,@Query() q:any){return this.svc.dashboard(tenantId,q)}
  @RequirePermission('settings.manage') @Patch(':extensionId') configure(@CurrentTenant() tenantId:string,@Param('extensionId') extensionId:string,@Body() body:any){return this.svc.configure(tenantId,extensionId,body)}
}

@Controller('storefront/:storeSlug/extensions')
export class ExtensionsPublicController{
  constructor(private svc:ExtensionsService){}
  @Get() resolve(@Param('storeSlug') storeSlug:string,@Query('target') target:string,@Query() q:any){return this.svc.resolvePublic(storeSlug,target,q)}
}
