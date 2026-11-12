import {Module} from '@nestjs/common';
import {BillingController} from './billing.controller';
import {BillingService} from './billing.service';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {TenantGuard} from '../common/tenant.guard';
import {PermissionGuard} from '../common/permission.guard';
import {AppsModule} from '../apps/apps.module';
@Module({imports:[AppsModule],controllers:[BillingController],providers:[BillingService,MerchantAuthGuard,TenantGuard,PermissionGuard],exports:[BillingService]})
export class BillingModule{}
