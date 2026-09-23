import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';

@Module({imports:[IntegrationsModule],controllers:[AppsController],providers:[AppsService,MerchantAuthGuard,TenantGuard,PermissionGuard],exports:[AppsService]})
export class AppsModule {}
