import { Module } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
import { PlatformMediaService } from './platform-media.service';
import { PlatformMediaController } from './platform-media.controller';
@Module({ controllers: [SuperAdminController, PlatformMediaController], providers: [SuperAdminService, SuperAdminAuthGuard, PlatformMediaService] })
export class SuperAdminModule {}
