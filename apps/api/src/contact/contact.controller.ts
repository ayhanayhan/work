import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { ContactService } from './contact.service';

@Controller()
export class ContactController {
  constructor(private readonly svc: ContactService) {}

  @Post('public/contact')
  submit(@Body() body:any,@Req() req:any){
    const ip=String(req.headers['cf-connecting-ip']||req.headers['x-forwarded-for']||req.ip||'unknown').split(',')[0].trim();
    return this.svc.create(body,ip);
  }

  @Post('public/contact/callback')
  callback(@Body() body:any,@Req() req:any){
    const ip=String(req.headers['cf-connecting-ip']||req.headers['x-forwarded-for']||req.ip||'unknown').split(',')[0].trim();
    return this.svc.submitCallback(body,ip);
  }
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/contact/callbacks')
  callbackInbox(){return this.svc.callbackInbox()}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/contact/callbacks/:id')
  updateCallback(@Param('id') id:string,@Body() body:any){return this.svc.updateCallback(id,body)}
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/contact/callback-email-template')
  callbackEmailTemplate(){return this.svc.callbackEmailTemplate()}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/contact/callback-email-template')
  saveCallbackEmailTemplate(@Body() body:any){return this.svc.updateCallbackEmailTemplate(body)}
  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/contact')
  inbox(){return this.svc.inbox()}

  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/contact/:id')
  update(@Param('id') id:string,@Body() body:any){return this.svc.update(id,body)}

  @UseGuards(SuperAdminAuthGuard)
  @Delete('superadmin/contact/:id')
  remove(@Param('id') id:string){return this.svc.remove(id)}
}
