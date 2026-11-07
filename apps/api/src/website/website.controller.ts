import {Body,Controller,Get,Headers,NotFoundException,Param,Patch,Query,UseGuards} from '@nestjs/common';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';
import {WebsiteService} from './website.service';

@Controller()
export class WebsiteController {
  constructor(private readonly svc:WebsiteService){}
  @Get('public/website/home')
  publicHome(@Query('lang') lang?:string){return this.svc.publicHome(lang||'tr')}
  @Get('public/website/faq')
  publicFaq(@Query('lang') lang?:string){return this.svc.publicFaq(lang||'tr')}
  @Get('public/website/locales')
  publicLocales(){return this.svc.activeLocales()}
  @Get('public/website/blog')
  publicBlog(@Query('lang') lang?:string){return this.svc.publicBlog(lang||'tr')}
  @Get('public/website/blog/:slug')
  async publicBlogPost(@Param('slug') slug:string,@Query('lang') lang?:string){
    const post=await this.svc.publicBlogPost(slug,lang||'tr');
    if(!post)throw new NotFoundException('Bu dilde yayımlanmış blog yazısı bulunamadı.');
    return post;
  }
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/website/home')
  home(){return this.svc.home()}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/website/home/:id')
  updateModule(@Param('id') id:string,@Body() body:any){return this.svc.updateModule(id,body)}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/website/home-order')
  reorderHome(@Body() body:any){return this.svc.reorderHome(body)}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/website/home-import')
  importHome(@Body() body:any){return this.svc.importHome(body)}
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/website/blog')
  blog(){return this.svc.blog()}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/website/blog')
  updateBlog(@Body() body:any){return this.svc.updateBlog(body)}
}
