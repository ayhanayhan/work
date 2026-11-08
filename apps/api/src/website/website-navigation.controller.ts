import {Body,Controller,Get,Patch,Query,UseGuards} from '@nestjs/common';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';
import {WebsiteNavigationService} from './website-navigation.service';
@Controller()
export class WebsiteNavigationController{
 constructor(private readonly nav:WebsiteNavigationService){}
 @Get('public/website/navigation')
 publicNavigation(@Query('lang') lang?:string){return this.nav.publicNavigation(lang||'tr')}
 @UseGuards(SuperAdminAuthGuard)
 @Get('superadmin/website/navigation')
 adminNavigation(){return this.nav.get()}
 @UseGuards(SuperAdminAuthGuard)
 @Patch('superadmin/website/navigation')
 update(@Body() body:any){return this.nav.save(body)}
}
