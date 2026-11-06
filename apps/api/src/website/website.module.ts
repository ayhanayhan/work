import {Module} from '@nestjs/common';
import {WebsiteController} from './website.controller';
import {WebsiteService} from './website.service';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';

@Module({controllers:[WebsiteController],providers:[WebsiteService,SuperAdminAuthGuard]})
export class WebsiteModule {}
