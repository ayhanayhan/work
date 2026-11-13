import {Body,Controller,Get,Headers,Param,Patch,Post,Query,Req,Res,UseGuards} from '@nestjs/common';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {TenantGuard} from '../common/tenant.guard';
import {PermissionGuard} from '../common/permission.guard';
import {RequirePermission} from '../common/permissions';
import {CurrentTenant} from '../common/request.decorator';
import {BillingService} from './billing.service';
import {tenantRestriction} from '../common/subscription-restriction';
import {PrismaService} from '../prisma/prisma.service';
import {IyzicoCallbackDto,IyzicoWebhookDto,PlatformCheckoutDto,PlanCheckoutDto,ThemeCheckoutDto} from './billing.dto';

type MerchantRequest={user:{sub:string};ip?:string};
type HttpResponse={setHeader:(name:string,value:string)=>void;type:(value:string)=>HttpResponse;send:(body:string)=>unknown;redirect:(status:number,url:string)=>unknown};

@Controller()
export class BillingController{
  constructor(private svc:BillingService,private prisma:PrismaService){}

  private sendPaymentPage(res:HttpResponse,title:string,content:string){
    // Iyzico CheckoutForm currently requires inline/eval-capable provider content. Keep that
    // exception isolated to this dedicated payment document, never to admin/storefront pages.
    res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','SAMEORIGIN');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy',"default-src 'none'; base-uri 'none'; form-action https:; frame-ancestors 'self'; connect-src https:; img-src https: data:; style-src https: 'unsafe-inline'; script-src https: 'unsafe-inline' 'unsafe-eval'; frame-src https:");
    return res.type('html').send(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title></head><body>${content}</body></html>`);
  }

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.read')
  @Get('admin/billing/catalog')
  catalog(@CurrentTenant() tenantId:string){return this.svc.catalog(tenantId)}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.read')
  @Get('admin/billing/plans')
  plans(@CurrentTenant() tenantId:string){return this.svc.merchantPlans(tenantId)}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.read')
  @Get('admin/billing/account')
  async account(@CurrentTenant() tenantId:string){return {...await this.svc.accountSummary(tenantId),restriction:await tenantRestriction(this.prisma,tenantId)}}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.manage')
  @Patch('admin/billing/subscription/cancel-at-period-end')
  cancelAtPeriodEnd(@CurrentTenant() tenantId:string){return this.svc.setCancelAtPeriodEnd(tenantId,true)}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.manage')
  @Patch('admin/billing/subscription/resume')
  resume(@CurrentTenant() tenantId:string){return this.svc.setCancelAtPeriodEnd(tenantId,false)}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.manage')
  @Post('admin/billing/preview')
  preview(@CurrentTenant() tenantId:string,@Body() body:PlatformCheckoutDto){return this.svc.previewPlatformPurchase(tenantId,body)}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.manage')
  @Post('admin/billing/checkout')
  platformStart(@CurrentTenant() tenantId:string,@Req() req:MerchantRequest,@Body() body:PlatformCheckoutDto){return this.svc.startPlatformPurchase(tenantId,req.user.sub,body,req.ip||'')}

  @Get('billing/iyzico/platform-pay/:id')
  async platformPay(@Param('id') id:string,@Res() res:HttpResponse){return this.sendPaymentPage(res,'Ticarti Güvenli Ödeme',await this.svc.platformPaymentPage(id))}

  @Post('billing/iyzico/platform-callback')
  async platformCallback(@Query('attempt') attempt:string,@Body() body:IyzicoCallbackDto,@Res() res:HttpResponse){const out=await this.svc.platformCallback(attempt,body.token);return res.redirect(303,out.redirect)}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.manage')
  @Post('admin/billing/iyzico/checkout')
  start(@CurrentTenant() tenantId:string,@Req() req:MerchantRequest,@Body() body:PlanCheckoutDto){return this.svc.start(tenantId,req.user.sub,body.planId,body,req.ip||'')}

  @Get('billing/iyzico/pay/:id')
  async pay(@Param('id') id:string,@Res() res:HttpResponse){return this.sendPaymentPage(res,'Ticarti Güvenli Ödeme',await this.svc.paymentPage(id))}

  @Post('billing/iyzico/callback')
  async callback(@Query('attempt') attempt:string,@Body() body:IyzicoCallbackDto,@Res() res:HttpResponse){const out=await this.svc.callback(attempt,body.token);return res.redirect(303,out.redirect)}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.manage')
  @Post('admin/billing/iyzico/theme-checkout')
  startTheme(@CurrentTenant() tenantId:string,@Req() req:MerchantRequest,@Body() body:ThemeCheckoutDto){return this.svc.startTheme(tenantId,req.user.sub,body.themeId,body,req.ip||'')}

  @Get('billing/iyzico/theme-pay/:id')
  async themePay(@Param('id') id:string,@Res() res:HttpResponse){return this.sendPaymentPage(res,'Ticarti Tema Ödemesi',await this.svc.themePaymentPage(id))}

  @Post('billing/iyzico/theme-callback')
  async themeCallback(@Query('attempt') attempt:string,@Body() body:IyzicoCallbackDto,@Res() res:HttpResponse){const out=await this.svc.themeCallback(attempt,body.token);return res.redirect(303,out.redirect)}

  @Post('billing/iyzico/webhook')
  iyzicoWebhook(@Headers('x-iyz-signature-v3') signature:string|undefined,@Body() body:IyzicoWebhookDto){return this.svc.iyzicoWebhook(signature,body)}
}
