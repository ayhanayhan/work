import {Body,Controller,Get,Param,Patch,Query,UseGuards} from '@nestjs/common';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';
import {WebsitePagesService} from './website-pages.service';
@Controller()
export class WebsitePagesController{
  constructor(private readonly pages:WebsitePagesService){}
  @Get('public/website/pages/:id') publicPage(@Param('id') id:string,@Query('lang') lang?:string){return this.pages.publicRead(id,lang||'tr')}
  @UseGuards(SuperAdminAuthGuard) @Get('superadmin/website/pages') list(){return this.pages.list()}
  @UseGuards(SuperAdminAuthGuard) @Get('superadmin/website/pages/:id') get(@Param('id') id:string){return this.pages.read(id)}
  @UseGuards(SuperAdminAuthGuard) @Patch('superadmin/website/pages/:id') save(@Param('id') id:string,@Body() body:any){return this.pages.update(id,body)}
}
