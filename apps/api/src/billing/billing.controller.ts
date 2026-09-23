import {Body,Controller,Get,Param,Post,Query,Req,Res,UseGuards} from '@nestjs/common';
import {MerchantAuthGuard} from '../merchant-auth/merchant-auth.guard';
import {TenantGuard} from '../common/tenant.guard';
import {PermissionGuard} from '../common/permission.guard';
import {RequirePermission} from '../common/permissions';
import {CurrentTenant} from '../common/request.decorator';
import {BillingService} from './billing.service';
@Controller()
export class BillingController{
 constructor(private svc:BillingService){}
 @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard) @RequirePermission('settings.manage') @Post('admin/billing/iyzico/checkout') start(@CurrentTenant() t:string,@Req() req:any,@Body() b:any){return this.svc.start(t,req.user.sub,String(b.planId||''),b,req.ip||req.headers['x-forwarded-for']||'')}
 @Get('billing/iyzico/pay/:id') async pay(@Param('id') id:string,@Res() res:any){const content=await this.svc.paymentPage(id);res.removeHeader('X-Frame-Options');res.setHeader('Content-Security-Policy',"default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self'; img-src 'self' https: data:; style-src 'self' https: 'unsafe-inline'; script-src 'self' https: 'unsafe-inline' 'unsafe-eval'");res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticarti Güvenli Ödeme</title></head><body>${content}</body></html>`)}
 @Post('billing/iyzico/callback') async callback(@Query('attempt') attempt:string,@Body() b:any,@Res() res:any){const out=await this.svc.callback(attempt,String(b?.token||''));res.redirect(303,out.redirect)}
 @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard) @RequirePermission('settings.manage') @Post('admin/billing/iyzico/theme-checkout') startTheme(@CurrentTenant() t:string,@Req() req:any,@Body() b:any){return this.svc.startTheme(t,req.user.sub,String(b.themeId||''),b,req.ip||req.headers['x-forwarded-for']||'')}
 @Get('billing/iyzico/theme-pay/:id') async themePay(@Param('id') id:string,@Res() res:any){const content=await this.svc.themePaymentPage(id);res.removeHeader('X-Frame-Options');res.setHeader('Content-Security-Policy',"default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self'; img-src 'self' https: data:; style-src 'self' https: 'unsafe-inline'; script-src 'self' https: 'unsafe-inline' 'unsafe-eval'");res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticarti Tema Ödemesi</title></head><body>${content}</body></html>`)}
 @Post('billing/iyzico/theme-callback') async themeCallback(@Query('attempt') attempt:string,@Body() b:any,@Res() res:any){const out=await this.svc.themeCallback(attempt,String(b?.token||''));res.redirect(303,out.redirect)}

}
