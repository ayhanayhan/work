import { Module } from '@nestjs/common';
import { DeveloperAuthGuard } from './developer-auth.guard';
import { DeveloperPlatformController } from './developer-platform.controller';
import { AppReviewAdminController } from './app-review-admin.controller';
import { DeveloperPlatformService } from './developer-platform.service';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { AppAuthModule } from '../app-auth/app-auth.module';
import { ExtensionsModule } from '../extensions/extensions.module';
import { OperationsWorkerModule } from '../operations-worker/operations-worker.module';
import { DeveloperPackageController } from './developer-package.controller';
import { DeveloperPackageService } from './developer-package.service';
import { MediaModule } from '../media/media.module';
@Module({imports:[AppAuthModule,ExtensionsModule,OperationsWorkerModule,MediaModule],controllers:[DeveloperPlatformController,AppReviewAdminController,DeveloperPackageController],providers:[DeveloperPlatformService,DeveloperPackageService,DeveloperAuthGuard,SuperAdminAuthGuard],exports:[DeveloperPlatformService]})
export class DeveloperPlatformModule{}
