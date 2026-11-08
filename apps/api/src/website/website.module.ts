import {Module} from '@nestjs/common';
import {WebsiteController} from './website.controller';
import {WebsiteService} from './website.service';
import {WebsitePagesController} from './website-pages.controller';
import {WebsitePagesService} from './website-pages.service';
import {WebsiteToolsController} from './website-tools.controller';
import {WebsiteToolsService} from './website-tools.service';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';

@Module({controllers:[WebsiteController,WebsitePagesController,WebsiteToolsController],providers:[WebsiteService,WebsitePagesService,WebsiteToolsService,SuperAdminAuthGuard]})
export class WebsiteModule {}
