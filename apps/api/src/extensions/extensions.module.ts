import {Module} from '@nestjs/common';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {TenantGuard} from '../common/tenant.guard';
import {PermissionGuard} from '../common/permission.guard';
import {ExtensionsAdminController,ExtensionsPublicController} from './extensions.controller';
import {ExtensionsService} from './extensions.service';
@Module({controllers:[ExtensionsAdminController,ExtensionsPublicController],providers:[ExtensionsService,MerchantAuthGuard,TenantGuard,PermissionGuard],exports:[ExtensionsService]})
export class ExtensionsModule{}
