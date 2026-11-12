import { Module } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { SuperAdminController } from './superadmin.controller';
import { PlatformPublicController } from './platform-public.controller';
import { SuperAdminService } from './superadmin.service';
import { MediaModule } from '../media/media.module';
import { ExtensionsModule } from '../extensions/extensions.module';
@Module({ imports:[MediaModule,ExtensionsModule], controllers: [SuperAdminController, PlatformPublicController], providers: [SuperAdminService, SuperAdminAuthGuard] })
export class SuperAdminModule {}
