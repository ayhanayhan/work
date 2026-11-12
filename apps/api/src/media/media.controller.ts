import { Body, Controller, Delete, Get, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { MediaService } from './media.service';

@Controller()
export class MediaController {
  constructor(private svc: MediaService) {}

  @Get('platform-media/:id/content')
  async platformContent(@Param('id') id:string,@Res() res:any){const out=await this.svc.platformContent(id);res.setHeader('Content-Type',out.mimeType);res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.setHeader('X-Content-Type-Options','nosniff');return res.send(out.data);}

  @Get('media/:id/content')
  async content(@Param('id') id: string, @Query('size') size: string, @Query('format') format: string, @Res() res: any) {
    const { asset, data } = await this.svc.content(id, size || 'master', format || 'webp');
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.send(data);
  }

  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('media.read')
  @Get('admin/media')
  list(@CurrentTenant() t: string, @Query('storeId') s: string) { return this.svc.list(t, s); }

  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('media.manage')
  @Post('admin/media/upload')
  @UseInterceptors(FileInterceptor('file', { limits:{fileSize:12 * 1024 * 1024,files:1,fields:24,parts:26,fieldNameSize:200,fieldSize:1048576} }))
  upload(@CurrentTenant() t: string, @Query('storeId') s: string, @UploadedFile() file: any, @Query('alt') alt?: string, @Query('folder') folder?: string) { return this.svc.upload(t, s, file, alt, folder); }

  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('media.read')
  @Get('admin/media/folders')
  folders(@CurrentTenant() t:string,@Query('storeId') s:string){return this.svc.folders(t,s);}

  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('media.manage')
  @Post('admin/media/folders')
  createFolder(@CurrentTenant() t:string,@Body() b:any){return this.svc.createFolder(t,b.storeId,b.name);}

  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('media.manage')
  @Delete('admin/media/folders/:id')
  deleteFolder(@CurrentTenant() t:string,@Param('id') id:string,@Query('storeId') s:string){return this.svc.deleteFolder(t,s,id);}

  @UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
  @RequirePermission('media.manage')
  @Delete('admin/media/:id')
  remove(@CurrentTenant() t: string, @Param('id') id: string, @Query('storeId') s: string) { return this.svc.remove(t, s, id); }
}
