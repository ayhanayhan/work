import { Module } from '@nestjs/common';
import { AppAuthModule } from '../app-auth/app-auth.module';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { AppWebhooksController } from './app-webhooks.controller';
import { EventWorkerController } from './event-worker.controller';
import { EventOutboxService } from './event-outbox.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
@Module({ imports:[AppAuthModule],controllers: [WebhooksController,AppWebhooksController,EventWorkerController], providers: [WebhooksService,EventOutboxService, MerchantAuthGuard, TenantGuard], exports: [WebhooksService,EventOutboxService] })
export class WebhooksModule {}
