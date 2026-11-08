import {Body,Controller,Get,Param,Patch,Query,UseGuards} from '@nestjs/common';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';
import {WebsiteToolsService} from './website-tools.service';

@Controller()
export class WebsiteToolsController{
 constructor(private readonly tools:WebsiteToolsService){}
 @UseGuards(SuperAdminAuthGuard)
 @Get('superadmin/website/tools')
 adminList(){return this.tools.snapshot()}
 @UseGuards(SuperAdminAuthGuard)
 @Patch('superadmin/website/tools')
 adminSave(@Body() body:any){return this.tools.save(body)}
 @Get('public/website/tools')
 publicList(@Query('lang') lang='tr'){return this.tools.publicList(lang)}
 @Get('public/website/tools/:slug')
 publicDetail(@Param('slug') slug:string,@Query('lang') lang='tr'){return this.tools.publicDetail(slug,lang)}
}
