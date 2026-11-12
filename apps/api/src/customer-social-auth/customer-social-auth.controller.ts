import { Body, Controller, Get, Param, Patch, Query, Res, UseGuards , ForbiddenException} from '@nestjs/common';
import { MerchantAuthGuard } from '../merchant-auth/merchant-auth.guard';
import { SuperAdminAuthGuard } from '../superadmin-auth/superadmin-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { CurrentTenant } from '../common/request.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { RequirePermission } from '../common/permissions';
import { CustomerSocialAuthService } from './customer-social-auth.service';

@Controller()
export class CustomerSocialAuthController {
  constructor(private svc:CustomerSocialAuthService){}
  private setRefresh(res:any,token:string){const secure=process.env.NODE_ENV==='production'?'; Secure':'';const sameSite=String(process.env.AUTH_COOKIE_SAMESITE||'Lax');const path=String(process.env.CUSTOMER_AUTH_COOKIE_PATH||'/v1/storefront/customer');res.setHeader('Set-Cookie',`commerce_customer_refresh=${encodeURIComponent(token)}; HttpOnly; Path=${path}; SameSite=${sameSite}; Max-Age=${30*86400}${secure}`)}
  @Get('storefront/:storeSlug/auth/config') publicConfig(@Param('storeSlug') s:string){return this.svc.publicConfig(s)}
  @Get('storefront/:storeSlug/auth/:provider/start') async start(@Param('storeSlug') s:string,@Param('provider') p:any,@Query('return') r:string,@Res() res:any){return res.redirect(await this.svc.start(s,p,r))}
  @Get('storefront/:storeSlug/auth/:provider/callback') async callback(@Param('storeSlug') s:string,@Param('provider') p:any,@Query('code') c:string,@Query('state') st:string,@Res() res:any){const out=await this.svc.callback(s,p,c,st);this.setRefresh(res,out.refreshToken);return res.redirect(out.redirectUrl)}

  @UseGuards(SuperAdminAuthGuard)
  @Get('superadmin/customer-auth') superGet(){return this.svc.superadminGet()}
  @UseGuards(SuperAdminAuthGuard)
  @Patch('superadmin/customer-auth') superSave(@Body() b:any){return this.svc.superadminSave(b)}

  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.read')
  @Get('admin/store-settings/:id/customer-auth') merchantGet(@CurrentTenant() t:string,@Param('id') id:string){if(t!==id)throw new ForbiddenException();return this.svc.merchantGet(id)}
  @UseGuards(MerchantAuthGuard,TenantGuard,PermissionGuard)
  @RequirePermission('settings.manage')
  @Patch('admin/store-settings/:id/customer-auth') merchantSave(@CurrentTenant() t:string,@Param('id') id:string,@Body() b:any){if(t!==id)throw new ForbiddenException();return this.svc.merchantSave(id,b)}
}
