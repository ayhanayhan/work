import { Module } from '@nestjs/common';
import { SuperAdminAuthController } from './superadmin-auth.controller';
import { SuperAdminAuthService } from './superadmin-auth.service';

@Module({ controllers: [SuperAdminAuthController], providers: [SuperAdminAuthService], exports: [SuperAdminAuthService] })
export class SuperAdminAuthModule {}
