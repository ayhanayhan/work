import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { CurrentTenant } from '../common/request.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { IntegrationsService } from './integrations.service';
import {CreateIntegrationDto,UpdateIntegrationDto} from './integrations.dto';
@Controller('admin/integrations')
@UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}
  @RequirePermission('settings.read') @Get() list(@CurrentTenant() tenantId: string) { return this.service.list(tenantId); }
  @RequirePermission('settings.manage') @Post() create(@CurrentTenant() tenantId: string, @Body() body: CreateIntegrationDto) { return this.service.create(tenantId, body); }
  @RequirePermission('settings.manage') @Patch(':id') update(@CurrentTenant() tenantId:string,@Param('id') id:string,@Body() body:UpdateIntegrationDto){ return this.service.update(tenantId,id,body); }
}
