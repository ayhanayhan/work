import {Module} from '@nestjs/common';
import {WebsiteController} from './website.controller';
import {WebsiteService} from './website.service';
import {WebsitePagesController} from './website-pages.controller';
import {WebsitePagesService} from './website-pages.service';
import {WebsiteNavigationController} from './website-navigation.controller';
import {WebsiteNavigationService} from './website-navigation.service';
import {WebsiteToolsController} from './website-tools.controller';
import {WebsiteToolsService} from './website-tools.service';
import {WebsiteHelpController} from './website-help.controller';
import {WebsiteHelpService} from './website-help.service';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';

@Module({controllers:[WebsiteController,WebsitePagesController,WebsiteToolsController,WebsiteNavigationController,WebsiteHelpController],providers:[WebsiteService,WebsitePagesService,WebsiteToolsService,WebsiteNavigationService,WebsiteHelpService,SuperAdminAuthGuard]})
export class WebsiteModule {}
