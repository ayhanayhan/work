import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
@Module({ controllers: [IntegrationsController], providers: [IntegrationsService, MerchantAuthGuard, TenantGuard], exports: [IntegrationsService] })
export class IntegrationsModule {}
