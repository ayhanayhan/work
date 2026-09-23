import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { WebhooksService } from './webhooks.service';
@Controller('admin/webhooks')
@UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
@RequirePermission('settings.manage')
export class WebhooksController {
  constructor(private service: WebhooksService) {}
  @Get() list(@CurrentTenant() tenantId: string) { return this.service.list(tenantId); }
  @Post() create(@CurrentTenant() tenantId: string, @Body() body: { url: string; events: string[] }) { return this.service.create(tenantId, body); }
}
