import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { CurrentTenant } from '../common/request.decorator';
import { IntegrationsService } from './integrations.service';
@Controller('admin/integrations')
@UseGuards(MerchantAuthGuard, TenantGuard)
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}
  @Get() list(@CurrentTenant() tenantId: string) { return this.service.list(tenantId); }
  @Post() create(@CurrentTenant() tenantId: string, @Body() body: any) { return this.service.create(tenantId, body); }
  @Patch(':id') update(@CurrentTenant() tenantId:string,@Param('id') id:string,@Body() body:any){ return this.service.update(tenantId,id,body); }
}
