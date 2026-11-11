import {Controller, ForbiddenException, Get, Headers, HttpCode, Param, Post, Query, Req, Res, UnauthorizedException} from '@nestjs/common';
import {AppsService} from './apps.service';
import {MerchantAuthService} from '../merchant-auth/merchant-auth.service';
import {SYSTEM_ROLE_PERMISSIONS} from '../common/permissions';

/** Cookie-authenticated app.ticarti.com bridge. Never exposes admin bearer tokens. */
@Controller('merchant-auth/marketplace')
export class MarketplaceSessionController {
  constructor(private readonly auth:MerchantAuthService,private readonly apps:AppsService){}

  private async session(req:any){
    const cookieName=process.env.NODE_ENV==='production'?'__Host-commerce_admin_refresh':'commerce_admin_refresh';
    const parts=String(req.headers?.cookie||'').split(';');
    const raw=parts.find(part=>part.trim().startsWith(cookieName+'='));
    const token=raw?decodeURIComponent(raw.trim().slice(cookieName.length+1)):'';
    if(!token)throw new UnauthorizedException('Please sign in');
    return this.auth.browserSession(token,req);
  }
  private permission(m:any,key:'settings.read'|'settings.manage'){
    const allowed=m.role==='OWNER'?['*']:m.customRole?.permissions?.length?m.customRole.permissions:(SYSTEM_ROLE_PERMISSIONS[m.role]||[]);
    if(!allowed.includes('*')&&!allowed.includes(key))throw new ForbiddenException('Insufficient store permission');
  }
  private noCache(res:any){res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Origin');}
  @Get('store')
  async store(@Req() req:any,@Res({passthrough:true}) res:any,@Query('tenantId') tenantId?:string,@Headers('origin') origin?:string){
    this.noCache(res);
    if(origin!=='https://app.ticarti.com')throw new ForbiddenException('Invalid marketplace origin');
    const session=await this.session(req);
    const membership=(session.memberships||[]).find((m:any)=>m.tenantId===(tenantId||session.memberships[0]?.tenantId));
    if(!membership)throw new ForbiddenException('Store not available');
    this.permission(membership,'settings.read');
    const result=await this.apps.store(membership.tenantId);
    return {tenantId:membership.tenantId,items:result.items.map((app:any)=>({slug:app.slug,installed:app.installed,installStatus:app.installStatus,enabled:app.enabled,included:app.included,price:app.price,currency:app.currency,billingType:app.billingType}))};
  }
  @Post(':slug/install') @HttpCode(200)
  async install(@Req() req:any,@Res({passthrough:true}) res:any,@Param('slug') slug:string,@Query('tenantId') tenantId?:string,@Headers('origin') origin?:string){
    this.noCache(res);
    if(origin!=='https://app.ticarti.com')throw new ForbiddenException('Invalid marketplace origin');
    if(!/^[a-z0-9][a-z0-9-]{0,100}$/.test(slug))throw new ForbiddenException('Invalid app');
    const session=await this.session(req);
    const membership=(session.memberships||[]).find((m:any)=>m.tenantId===(tenantId||session.memberships[0]?.tenantId));
    if(!membership)throw new ForbiddenException('Store not available');
    this.permission(membership,'settings.manage');
    return this.apps.install(membership.tenantId,slug);
  }
}
