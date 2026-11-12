import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { CurrentTenant } from '../common/request.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CORE_EVENT_TOPICS } from './event-topics';
import { EventOutboxService } from './event-outbox.service';
import { WebhooksService } from './webhooks.service';
import {CreateWebhookDto} from './webhooks.dto';
@Controller('admin/webhooks')
@UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
export class WebhooksController {
  constructor(private service: WebhooksService,private events:EventOutboxService) {}
  @RequirePermission('settings.read') @Get() list(@CurrentTenant() tenantId: string) { return this.service.list(tenantId); }
  @RequirePermission('settings.read') @Get('topics') topics(){return {topics:CORE_EVENT_TOPICS};}
  @RequirePermission('settings.read') @Get('events') recent(@CurrentTenant() tenantId:string){return this.events.listRecent(tenantId)}
  @RequirePermission('settings.manage') @Post('deliveries/:id/retry') retry(@CurrentTenant() tenantId:string,@Param('id') id:string){return this.events.retryDelivery(tenantId,id)}
  @RequirePermission('settings.manage') @Post() create(@CurrentTenant() tenantId: string, @Body() body: CreateWebhookDto) { return this.service.create(tenantId, body); }
}
