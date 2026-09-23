import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';
@Module({ imports:[IntegrationsModule], controllers: [MerchantController], providers: [MerchantService, MerchantAuthGuard, TenantGuard, PermissionGuard], exports: [MerchantService] })
export class MerchantModule {}
