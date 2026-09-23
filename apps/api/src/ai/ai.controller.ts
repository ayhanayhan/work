import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { AiService } from './ai.service';

@Controller('admin/ai')
@UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
export class AiController {
  constructor(private svc:AiService){}
  @RequirePermission('settings.read') @Get('status') status(@CurrentTenant() t:string){return this.svc.status(t)}
  @RequirePermission('settings.manage') @Patch('settings') settings(@CurrentTenant() t:string,@Body() b:any){return this.svc.saveSettings(t,b)}
  @RequirePermission('content.read') @Get('prompts') prompts(@CurrentTenant() t:string){return this.svc.prompts(t)}
  @RequirePermission('content.manage') @Patch('prompts') savePrompts(@CurrentTenant() t:string,@Body() b:any){return this.svc.savePrompts(t,b)}
  @RequirePermission('settings.read') @Get('credits') credits(@CurrentTenant() t:string){return this.svc.credits(t)}
  @RequirePermission('settings.manage') @Post('credits/purchase') purchase(@CurrentTenant() t:string,@Body() b:any){return this.svc.purchase(t,b)}
  @RequirePermission('content.manage') @Post('assistant') chat(@CurrentTenant() t:string,@Body() b:any){return this.svc.chat(t,b)}
  @RequirePermission('content.manage') @Post('assistant/execute') execute(@CurrentTenant() t:string,@Body() b:any){return this.svc.execute(t,b)}
  @RequirePermission('content.manage') @Post('translate') translate(@CurrentTenant() t:string,@Body() b:any){return this.svc.translate(t,b)}
  @RequirePermission('media.manage') @Post('image') image(@CurrentTenant() t:string,@Body() b:any){return this.svc.image(t,b)}
}
