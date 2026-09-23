import { Module } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
@Module({ controllers: [MediaController], providers: [MediaService, MerchantAuthGuard, TenantGuard, PermissionGuard], exports: [MediaService] })
export class MediaModule {}
