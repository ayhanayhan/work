import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
@Module({ controllers: [WebhooksController], providers: [WebhooksService, MerchantAuthGuard, TenantGuard], exports: [WebhooksService] })
export class WebhooksModule {}
