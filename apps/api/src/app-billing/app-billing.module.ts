import { Module } from '@nestjs/common';
import { AppAuthModule } from '../app-auth/app-auth.module';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { AppBillingService } from './app-billing.service';
import { AppBillingWorkerController, AppUsageBillingController, MerchantAppBillingController, SuperAdminAppBillingController } from './app-billing.controller';

@Module({imports:[AppAuthModule],controllers:[MerchantAppBillingController,AppUsageBillingController,SuperAdminAppBillingController,AppBillingWorkerController],providers:[AppBillingService,MerchantAuthGuard,TenantGuard,PermissionGuard,SuperAdminAuthGuard],exports:[AppBillingService]})
export class AppBillingModule{}
