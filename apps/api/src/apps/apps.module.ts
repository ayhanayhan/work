import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AppsController } from './apps.controller';
import { MarketplaceSessionController } from './marketplace-session.controller';
import { MerchantAuthModule } from '../merchant-auth/merchant-auth.module';
import { AppsService } from './apps.service';

@Module({imports:[IntegrationsModule,MerchantAuthModule],controllers:[AppsController,MarketplaceSessionController],providers:[AppsService,MerchantAuthGuard,TenantGuard,PermissionGuard],exports:[AppsService]})
export class AppsModule {}
