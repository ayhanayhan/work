import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { CustomerSocialAuthController } from './customer-social-auth.controller';
import { CustomerSocialAuthService } from './customer-social-auth.service';

@Module({controllers:[CustomerSocialAuthController],providers:[CustomerSocialAuthService,MerchantAuthGuard,SuperAdminAuthGuard,TenantGuard,PermissionGuard]})
export class CustomerSocialAuthModule {}
