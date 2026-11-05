import {Controller,Get,Post,Param,Req,Res,UploadedFile,UseGuards,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {SuperAdminAuthGuard} from '../superadmin-auth/superadmin-auth.guard';
import {PlatformMediaService} from './platform-media.service';

@Controller()
export class PlatformMediaController {
  constructor(private readonly media:PlatformMediaService){}
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/media')
  list(){return this.media.list()}
  @UseGuards(SuperAdminAuthGuard)
  @Post('superadmin/media/upload')
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:8*1024*1024,files:1}}))
  upload(@UploadedFile() file:any,@Req() req:any){return this.media.upload(file,String(req.get('host')||''))}
  @Get('platform-media/:id')
  async image(@Param('id') id:string,@Res() res:any){
    const content=await this.media.content(id);
    res.setHeader('Content-Type','image/webp');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    res.send(content);
  }
}
