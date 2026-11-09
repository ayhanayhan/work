import {Body,Controller,Get,Patch,UseGuards} from '@nestjs/common';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';
import {WebsiteHelpService} from './website-help.service';

@Controller()
export class WebsiteHelpController {
 constructor(private readonly help:WebsiteHelpService){}
 @Get('public/website/help') publicHelp(){return this.help.publicHelp();}
 @UseGuards(SuperAdminAuthGuard)
 @Get('superadmin/website/help') adminHelp(){return this.help.get();}
 @UseGuards(SuperAdminAuthGuard)
 @Patch('superadmin/website/help') update(@Body() body:any){return this.help.save(body);}
}
