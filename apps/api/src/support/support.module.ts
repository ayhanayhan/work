import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
@Module({ controllers: [SupportController], providers: [SupportService, MerchantAuthGuard, SuperAdminAuthGuard, TenantGuard] })
export class SupportModule {}
