import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { AppAuthService } from './app-auth.service';
@Controller('superadmin/apps/:appId/clients')
@UseGuards(SuperAdminAuthGuard)
export class AppClientAdminController{
  constructor(private svc:AppAuthService){}
  @Get() list(@Param('appId') appId:string){return this.svc.listClients(appId)}
  @Post() create(@Param('appId') appId:string,@Body() body:any){return this.svc.createClient(appId,body)}
  @Post(':id/rotate-secret') rotate(@Param('appId') appId:string,@Param('id') id:string){return this.svc.rotateClientSecret(appId,id)}
  @Patch(':id/state') state(@Param('appId') appId:string,@Param('id') id:string,@Body() body:any){return this.svc.setClientState(appId,id,body?.enabled!==false)}
}
