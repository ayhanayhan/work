import { BadRequestException, Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppApiGuard } from './app-api.guard';
import { AppRateLimitGuard } from './app-rate-limit.guard';
import { AppScopeGuard } from './app-scope.guard';
import { RequireAppScopes } from './app-scopes';
@Controller('app-api')
@UseGuards(AppApiGuard,AppRateLimitGuard,AppScopeGuard)
export class AppApiController{
  constructor(private prisma:PrismaService){}
  @Get('context') context(@Req() req:any){return {tenantId:req.appAuth.tenantId,appId:req.appAuth.appId,installationId:req.appAuth.installationId,clientId:req.appAuth.clientId,scopes:req.appAuth.scopes}}
  @Get('products') @RequireAppScopes('products:read') products(@Req() req:any){return this.prisma.product.findMany({where:{storeId:req.appAuth.tenantId},select:{id:true,title:true,slug:true,status:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'desc'},take:50})}
  @Put('extensions/:key/data') async extensionData(@Req() req:any,@Param('key') key:string,@Body() body:any){
    const install=await this.prisma.appInstallation.findFirst({where:{id:req.appAuth.installationId,tenantId:req.appAuth.tenantId,appId:req.appAuth.appId,status:'ACTIVE',enabled:true},select:{id:true,installedVersionId:true}});if(!install?.installedVersionId)throw new BadRequestException('Active installed app version is required');
    const ext=await this.prisma.appExtension.findFirst({where:{appVersionId:install.installedVersionId,key:String(key),isActive:true}});if(!ext)throw new BadRequestException('Extension is not part of the installed app version');
    const granted=new Set<string>(req.appAuth.scopes||[]);const missing=ext.requiredScopes.filter((x:string)=>!granted.has(x));if(missing.length)throw new BadRequestException(`Missing extension scope: ${missing.join(', ')}`);
    const payload=body?.data===undefined?body:body.data;let bytes=0;try{bytes=Buffer.byteLength(JSON.stringify(payload??null),'utf8')}catch{throw new BadRequestException('Extension data must be JSON serializable')}if(bytes>262144)throw new BadRequestException('Extension data payload exceeds 256 KB');
    const ttl=Math.max(0,Math.min(86400,Number(body?.ttlSeconds??body?.ttl??900)));const generatedAt=new Date();const expiresAt=ttl?new Date(generatedAt.getTime()+ttl*1000):null;
    return this.prisma.appExtensionDataSnapshot.upsert({where:{installationId_extensionId:{installationId:install.id,extensionId:ext.id}},create:{installationId:install.id,extensionId:ext.id,data:(payload??null) as any,status:String(body?.status||'READY').slice(0,32),generatedAt,expiresAt},update:{data:(payload??null) as any,status:String(body?.status||'READY').slice(0,32),generatedAt,expiresAt}});
  }
}
