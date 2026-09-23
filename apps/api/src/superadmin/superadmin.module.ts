import { Module } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminService } from './superadmin.service';
@Module({ controllers: [SuperAdminController], providers: [SuperAdminService, SuperAdminAuthGuard] })
export class SuperAdminModule {}
