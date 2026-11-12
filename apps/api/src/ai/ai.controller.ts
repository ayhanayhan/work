import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CurrentTenant } from '../common/request.decorator';
import { AiService } from './ai.service';
import { BillingService } from '../billing/billing.service';
import {AiChatDto,AiCreditPurchaseDto,AiExecuteDto,AiImageDto,AiPromptsDto,AiSettingsDto,AiTranslateDto} from './ai.dto';

type MerchantRequest={user:{sub:string};ip?:string};

@Controller('admin/ai')
@UseGuards(MerchantAuthGuard, TenantGuard, PermissionGuard)
export class AiController {
  constructor(private svc:AiService,private billing:BillingService){}
  @RequirePermission('settings.read') @Get('status') status(@CurrentTenant() t:string){return this.svc.status(t)}
  @RequirePermission('settings.manage') @Patch('settings') settings(@CurrentTenant() t:string,@Body() b:AiSettingsDto){return this.svc.saveSettings(t,b)}
  @RequirePermission('content.read') @Get('prompts') prompts(@CurrentTenant() t:string){return this.svc.prompts(t)}
  @RequirePermission('content.manage') @Patch('prompts') savePrompts(@CurrentTenant() t:string,@Body() b:AiPromptsDto){return this.svc.savePrompts(t,b)}
  @RequirePermission('settings.read') @Get('credits') credits(@CurrentTenant() t:string){return this.svc.credits(t)}
  @RequirePermission('products.read') @Get('image/status') imageStatus(@CurrentTenant() t:string){return this.svc.imageStatus(t)}
  @RequirePermission('settings.read') @Get('notifications') notifications(@CurrentTenant() t:string){return this.svc.notifications(t)}
  @RequirePermission('settings.manage') @Post('credits/purchase') purchase(@CurrentTenant() t:string,@Req() req:MerchantRequest,@Body() b:AiCreditPurchaseDto){return this.billing.startPlatformPurchase(t,req.user.sub,{kind:'AI_CREDIT',targetId:String(b.packageCode||''),couponCode:b.couponCode,buyer:b.buyer},req.ip||'')}
  @RequirePermission('content.manage') @Post('assistant') chat(@CurrentTenant() t:string,@Body() b:AiChatDto){return this.svc.chat(t,b)}
  @RequirePermission('content.manage') @Post('assistant/execute') execute(@CurrentTenant() t:string,@Body() b:AiExecuteDto){return this.svc.execute(t,b)}
  @RequirePermission('content.manage') @Post('translate') translate(@CurrentTenant() t:string,@Body() b:AiTranslateDto){return this.svc.translate(t,b)}
  @RequirePermission('media.manage') @Post('image') image(@CurrentTenant() t:string,@Body() b:AiImageDto){return this.svc.image(t,b)}
}
