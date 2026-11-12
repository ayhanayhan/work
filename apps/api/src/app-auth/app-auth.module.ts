import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { AppAuthService } from './app-auth.service';
import { AppApiGuard } from './app-api.guard';
import { AppScopeGuard } from './app-scope.guard';
import { AppRateLimitGuard } from './app-rate-limit.guard';
import { AppOAuthController } from './app-oauth.controller';
import { AppClientAdminController } from './app-client-admin.controller';
import { AppApiController } from './app-api.controller';
@Module({controllers:[AppOAuthController,AppClientAdminController,AppApiController],providers:[AppAuthService,AppApiGuard,AppScopeGuard,AppRateLimitGuard,MerchantAuthGuard,TenantGuard,PermissionGuard,SuperAdminAuthGuard],exports:[AppAuthService,AppApiGuard,AppScopeGuard,AppRateLimitGuard]})
export class AppAuthModule{}
