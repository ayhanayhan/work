import {Body,Controller,Get,Headers,NotFoundException,Param,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';
import {WebsiteService} from './website.service';

@Controller()
export class WebsiteController {
  constructor(private readonly svc:WebsiteService){}
  @Get('public/website/home')
  publicHome(@Query('lang') lang?:string){return this.svc.publicHome(lang||'tr')}
  @Get('public/website/faq')
  publicFaq(@Query('lang') lang?:string){return this.svc.publicFaq(lang||'tr')}
  @Get('public/website/seo')
  publicSeo(){return this.svc.publicWebsiteSeo()}
  @Get('public/website/locales')
  publicLocales(){return this.svc.activeLocales()}
  @Get('public/website/blog')
  publicBlog(@Query('lang') lang?:string){return this.svc.publicBlog(lang||'tr')}
  @Get('public/website/blog-comments/:slug')
  comments(@Param('slug') slug:string){return this.svc.blogComments(slug)}
  @Post('public/website/blog-comments')
  addComment(@Body() body:any,@Req() req:any){return this.svc.submitBlogComment(body,String(req.ip||'unknown'))}
  @Post('public/website/blog-callback')
  callback(@Body() body:any,@Req() req:any){return this.svc.submitBlogCallback(body,String(req.ip||'unknown'))}
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/website/blog-comments/pending')
  pendingComments(){return this.svc.pendingBlogComments()}
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/website/blog-callbacks')
  callbacks(){return this.svc.blogCallbackRequests()}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/website/blog-callbacks/:id/complete')
  completeCallback(@Param('id') id:string){return this.svc.completeBlogCallback(id)}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/website/blog-comments/:id')
  moderateComment(@Param('id') id:string,@Body() body:any){return this.svc.moderateBlogComment(id,body.status)}
  @Get('public/website/blog/:slug')
  async publicBlogPost(@Param('slug') slug:string,@Query('lang') lang?:string){
    const post=await this.svc.publicBlogPost(slug,lang||'tr');
    if(!post)throw new NotFoundException('Bu dilde yayımlanmış blog yazısı bulunamadı.');
    return post;
  }
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/website/seo')
  seo(){return this.svc.websiteSeo()}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/website/seo')
  updateSeo(@Body() body:any){return this.svc.updateWebsiteSeo(body)}
  @UseGuards(SuperAdminAuthGuard)
  @Post('superadmin/website/faq/seed-initial')
  seedInitialFaq(){return this.svc.seedInitialFaq()}
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
  @Post('superadmin/website/blog/seed-initial')
  seedInitialBlog(){return this.svc.importInitialBlog()}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/website/blog')
  updateBlog(@Body() body:any){return this.svc.updateBlog(body)}
}
