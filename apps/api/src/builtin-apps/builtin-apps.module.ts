import {Module} from '@nestjs/common';
import {PrismaModule} from '../prisma/prisma.module';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {TenantGuard} from '../common/tenant.guard';
import {PermissionGuard} from '../common/permission.guard';
import {BuiltinAppsService} from './builtin-apps.service';
import {BuiltinAppsAdminController} from './builtin-apps.admin.controller';
import {BuiltinAppsPublicController} from './builtin-apps.public.controller';
@Module({imports:[PrismaModule],controllers:[BuiltinAppsAdminController,BuiltinAppsPublicController],providers:[BuiltinAppsService,MerchantAuthGuard,TenantGuard,PermissionGuard],exports:[BuiltinAppsService]})
export class BuiltinAppsModule{}
