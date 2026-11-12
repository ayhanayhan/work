import {Body,Controller,Get,Param,Patch,Query,UseGuards} from '@nestjs/common';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {TenantGuard} from '../common/tenant.guard';
import {PermissionGuard} from '../common/permission.guard';
import {CurrentTenant} from '../common/request.decorator';
import {RequirePermission} from '../common/permissions';
import {B2BQuoteService} from './b2b-quote.service';

@Controller('admin/b2b/quotes')
@UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
export class B2BQuoteController {
  constructor(private readonly svc:B2BQuoteService){}

  @RequirePermission('customers.read')
  @Get()
  list(@CurrentTenant() tenantId:string,@Query('storeId') storeId:string,@Query('status') status?:string){
    return this.svc.list(tenantId,storeId,status);
  }

  @RequirePermission('customers.manage')
  @Patch(':id')
  update(@CurrentTenant() tenantId:string,@Param('id') id:string,@Body() body:any){
    return this.svc.update(tenantId,body.storeId,id,body);
  }
}
