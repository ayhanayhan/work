import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { MerchantCollectionsService } from './merchant-collections.service';

@Controller('admin')
@UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
export class MerchantCollectionsController {
  constructor(private readonly svc:MerchantCollectionsService){}

  @RequirePermission('products.read')
  @Get('collections')
  list(@CurrentTenant() tenantId:string,@Query('storeId') storeId:string){
    return this.svc.list(tenantId,storeId);
  }

  @RequirePermission('products.manage')
  @Post('collections')
  create(@CurrentTenant() tenantId:string,@Body() body:any){
    return this.svc.create(tenantId,body);
  }

  @RequirePermission('products.manage')
  @Patch('collections/:id')
  update(@CurrentTenant() tenantId:string,@Param('id') id:string,@Body() body:any){
    return this.svc.update(tenantId,id,body);
  }
}
