import {Body,Controller,Delete,Get,Param,Patch,Post,Put,Query,Req,UseGuards} from '@nestjs/common';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';import {TenantGuard} from '../common/tenant.guard';import {PermissionGuard} from '../common/permission.guard';import {RequirePermission} from '../common/permissions';import {CurrentTenant} from '../common/request.decorator';import {MerchantBlogService} from './merchant-blog.service';
@Controller('admin/blog-v2') @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
export class MerchantBlogController{constructor(private readonly svc:MerchantBlogService){}
@RequirePermission('content.read') @Get('overview') overview(@CurrentTenant() t:string,@Query('storeId') s:string){return this.svc.overview(t,s)}
@RequirePermission('content.read') @Get('categories') categories(@CurrentTenant() t:string,@Query('storeId') s:string){return this.svc.categories(t,s)}
@RequirePermission('content.manage') @Post('categories') category(@CurrentTenant() t:string,@Body() b:any){return this.svc.saveCategory(t,b.storeId,b)}
@RequirePermission('content.manage') @Put('categories/:id') categoryEdit(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.saveCategory(t,b.storeId,b,id)}
@RequirePermission('content.manage') @Delete('categories/:id') categoryDelete(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.deleteCategory(t,s,id)}
@RequirePermission('content.read') @Get('authors') authors(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.authors(t,s,q)}
@RequirePermission('content.manage') @Post('authors') author(@CurrentTenant() t:string,@Body() b:any){return this.svc.saveAuthor(t,b.storeId,b)}
@RequirePermission('content.manage') @Put('authors/:id') authorEdit(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.saveAuthor(t,b.storeId,b,id)}
@RequirePermission('content.manage') @Delete('authors/:id') authorDelete(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.deleteAuthor(t,s,id)}
@RequirePermission('content.read') @Get('posts') posts(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.posts(t,s,q)}
@RequirePermission('content.read') @Get('posts/:id') post(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.post(t,s,id)}
@RequirePermission('content.manage') @Post('posts') postCreate(@CurrentTenant() t:string,@Req() req:any,@Body() b:any){return this.svc.savePost(t,b.storeId,b,undefined,req.user?.sub)}
@RequirePermission('content.manage') @Put('posts/:id') postEdit(@CurrentTenant() t:string,@Req() req:any,@Param('id') id:string,@Body() b:any){return this.svc.savePost(t,b.storeId,b,id,req.user?.sub)}
@RequirePermission('content.manage') @Delete('posts/:id') postDelete(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.deletePost(t,s,id)}
@RequirePermission('content.read') @Get('posts/:id/revisions') revisions(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.revisions(t,s,id)}
@RequirePermission('content.manage') @Post('posts/:id/revisions/:revisionId/restore') restore(@CurrentTenant() t:string,@Req() req:any,@Param('id') id:string,@Param('revisionId') revisionId:string,@Body() b:any){return this.svc.restoreRevision(t,b.storeId,id,revisionId,req.user?.sub)}
@RequirePermission('reviews.read') @Get('comments') comments(@CurrentTenant() t:string,@Query('storeId') s:string,@Query() q:any){return this.svc.comments(t,s,q)}
@RequirePermission('reviews.manage') @Patch('comments/:id') comment(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){return this.svc.moderateComment(t,b.storeId,id,b)}
@RequirePermission('reviews.manage') @Delete('comments/:id') commentDelete(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.deleteComment(t,s,id)}
}
