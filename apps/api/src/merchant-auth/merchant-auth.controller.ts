import { randomBytes, timingSafeEqual } from 'crypto';
import { Body, Controller, ForbiddenException, Get, HttpCode, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { MerchantAuthService } from './merchant-auth.service';
import {
  MerchantForgotPasswordDto,
  MerchantGoogleDto,
  MerchantHandoffDto,
  MerchantLoginDto,
  MerchantRefreshDto,
  MerchantRegisterDto,
  MerchantResetPasswordDto,
} from './dto';

@Controller('merchant-auth')
export class MerchantAuthController {
  constructor(private readonly auth: MerchantAuthService) {}

  private cookieName() { return process.env.NODE_ENV === 'production' ? '__Host-commerce_admin_refresh' : 'commerce_admin_refresh'; }
  private readCookie(req: any, name: string) {
    const raw = String(req.headers?.cookie || '');
    for (const part of raw.split(';')) {
      const [key, ...value] = part.trim().split('=');
      if (key === name) return decodeURIComponent(value.join('='));
    }
    return '';
  }
  private assertClient(req: any, allowLanding = false) {
    const client = String(req.headers?.['x-auth-client'] || '');
    const allowed = allowLanding ? ['merchant-admin', 'merchant-landing'] : ['merchant-admin'];
    if (!allowed.includes(client)) throw new ForbiddenException('Invalid auth client');
    if (process.env.NODE_ENV === 'production' && String(req.headers?.['sec-fetch-site'] || '') === 'cross-site') throw new ForbiddenException('Cross-site auth request blocked');
    return client;
  }
  private noStore(res: any) { res.setHeader('Cache-Control', 'no-store, max-age=0'); res.setHeader('Pragma', 'no-cache'); }
  private setRefresh(res: any, token: string) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    const days = Math.max(30, Number(process.env.MERCHANT_REFRESH_TTL_DAYS || 90));
    res.setHeader('Set-Cookie', `${this.cookieName()}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${days * 86400}${secure}`);
  }
  private clearRefresh(res: any) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${this.cookieName()}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`);
  }
  private browserResponse(result: any, res: any) {
    if (!result?.refreshToken) { this.noStore(res); return result; }
    const { refreshToken, ...safe } = result;
    this.setRefresh(res, refreshToken);
    this.noStore(res);
    return safe;
  }


  @Get('providers')
  async providers(@Res({ passthrough: true }) res:any) {
    this.noStore(res);
    return this.auth.publicProviders();
  }

  private socialCookies(res:any,provider:'google'|'linkedin',state:string,verifier:string){
    const secure=process.env.NODE_ENV==='production'?'; Secure':'';
    res.setHeader('Set-Cookie',[
      `__Host-ticarti_${provider}_state=${encodeURIComponent(state)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600${secure}`,
      `__Host-ticarti_${provider}_pkce=${encodeURIComponent(verifier)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600${secure}`,
    ]);
  }
  private clearSocialCookies(res:any,provider:'google'|'linkedin'){
    const secure=process.env.NODE_ENV==='production'?'; Secure':'';
    res.setHeader('Set-Cookie',[
      `__Host-ticarti_${provider}_state=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
      `__Host-ticarti_${provider}_pkce=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
    ]);
  }


  private socialSignupCookie(res:any,identityToken:string){
    const secure=process.env.NODE_ENV==='production'?'; Secure':'';
    const previous=res.getHeader('Set-Cookie');
    res.setHeader('Set-Cookie',[
      ...(Array.isArray(previous)?previous:previous?[String(previous)]:[]),
      `__Host-ticarti_social_signup=${encodeURIComponent(identityToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600${secure}`
    ]);
  }
  private clearSignupCookie(res:any) {
    const secure=process.env.NODE_ENV==='production'?'; Secure':'';
    const previous=res.getHeader('Set-Cookie');
    res.setHeader('Set-Cookie',[
      ...(Array.isArray(previous)?previous:previous?[String(previous)]:[]),
      `__Host-ticarti_social_signup=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`
    ]);
  }
  @Get('social/pending')
  async pendingSocial(@Req() req:any,@Res({passthrough:true}) res:any) {
    this.noStore(res);
    const token=this.readCookie(req,'__Host-ticarti_social_signup');
    if(!token) return {active:false};
    try {const p=await this.auth.verifySocialRegistration(token);return {active:true,provider:p.provider,name:p.name,email:p.email};}
    catch{return {active:false}}
  }
  @Post('social/register') @HttpCode(200)
  async registerSocial(@Req() req:any,@Res({passthrough:true}) res:any,@Body() dto:any){
    this.assertClient(req,true);this.noStore(res);
    const token=this.readCookie(req,'__Host-ticarti_social_signup');
    if(!token)throw new UnauthorizedException('Social registration expired');
    const result=await this.auth.registerSocial(token,dto,req);
    this.clearSignupCookie(res);
    return result;
  }

  @Get('google/start')
  async startGoogle(@Res() res:any) {
    this.noStore(res);
    const state=randomBytes(32).toString('base64url');
    const verifier=randomBytes(48).toString('base64url');
    const url=await this.auth.googleAuthUrl(state,verifier);
    this.socialCookies(res,'google',state,verifier);
    res.redirect(302,url);
  }

  @Get('google/callback')
  async finishGoogle(@Query('code') code:string,@Query('state') state:string,@Req() req:any,@Res() res:any) {
    this.noStore(res);
    const expected=this.readCookie(req,'__Host-ticarti_google_state');
    const verifier=this.readCookie(req,'__Host-ticarti_google_pkce');
    this.clearSocialCookies(res,'google');
    if(!code||!state||!expected||!verifier){
      res.redirect(303,'https://login.ticarti.com/?socialError=invalid_state');return;
    }
    const a=Buffer.from(state),b=Buffer.from(expected);
    if(a.length!==b.length||!timingSafeEqual(a,b)){
      res.redirect(303,'https://login.ticarti.com/?socialError=invalid_state');return;
    }
    try{
      const result=await this.auth.googleCallback(code,verifier);
      if('identity' in result){this.socialSignupCookie(res,await this.auth.signSocialRegistration(result.identity));res.redirect(303,'https://login.ticarti.com/register?social=google');return;}
      res.setHeader('Referrer-Policy','no-referrer');
      res.redirect(303,'https://login.ticarti.com/?socialHandoff='+encodeURIComponent(result.handoffCode));
    }catch{
      res.redirect(303,'https://login.ticarti.com/?socialError=login_failed');
    }
  }

  @Get('linkedin/start')
  async startLinkedin(@Res() res:any) {
    this.noStore(res);
    const state=randomBytes(32).toString('base64url');
    const verifier=randomBytes(48).toString('base64url');
    const url=await this.auth.linkedinAuthUrl(state,verifier);
    this.socialCookies(res,'linkedin',state,verifier);
    res.redirect(302,url);
  }

  @Get('linkedin/callback')
  async finishLinkedin(@Query('code') code:string,@Query('state') state:string,@Req() req:any,@Res() res:any) {
    this.noStore(res);
    const expected=this.readCookie(req,'__Host-ticarti_linkedin_state');
    const verifier=this.readCookie(req,'__Host-ticarti_linkedin_pkce');
    this.clearSocialCookies(res,'linkedin');
    if(!code||!state||!expected||!verifier){
      res.redirect(303,'https://login.ticarti.com/?socialError=invalid_state');return;
    }
    const a=Buffer.from(state),b=Buffer.from(expected);
    if(a.length!==b.length||!timingSafeEqual(a,b)){
      res.redirect(303,'https://login.ticarti.com/?socialError=invalid_state');return;
    }
    try{
      const result=await this.auth.linkedinCallback(code,verifier);
      if('identity' in result){this.socialSignupCookie(res,await this.auth.signSocialRegistration(result.identity));res.redirect(303,'https://login.ticarti.com/register?social=linkedin');return;}
      res.setHeader('Referrer-Policy','no-referrer');
      res.redirect(303,'https://login.ticarti.com/?socialHandoff='+encodeURIComponent(result.handoffCode));
    }catch{
      res.redirect(303,'https://login.ticarti.com/?socialError=login_failed');
    }
  }

  @Post('linkedin/complete') @HttpCode(200)
  async completeLinkedin(@Body() dto:MerchantHandoffDto,@Req() req:any,@Res({passthrough:true}) res:any) {
    this.assertClient(req,true);this.noStore(res);
    return this.auth.consumeSocialHandoff(dto.code);
  }

  @Get('subdomain-availability')
  async subdomainAvailability(@Query('subdomain') subdomain: string) {
    return this.auth.subdomainAvailability(subdomain);
  }

  @Post('register') @HttpCode(200)
  async register(@Body() dto: MerchantRegisterDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const client = this.assertClient(req, true);
    return this.browserResponse(await this.auth.register(dto, req, client === 'merchant-landing'), res);
  }

  @Post('login') @HttpCode(200)
  async login(@Body() dto: MerchantLoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const client = this.assertClient(req, true);
    if (client === 'merchant-landing') { this.noStore(res); return this.auth.loginHandoff(dto, req); }
    return this.browserResponse(await this.auth.login(dto, req), res);
  }

  @Post('google') @HttpCode(200)
  async google(@Body() dto: MerchantGoogleDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const client = this.assertClient(req, true);
    return this.browserResponse(await this.auth.googleLogin(dto, req, client === 'merchant-landing'), res);
  }

  @Post('handoff') @HttpCode(200)
  async handoff(@Body() dto: MerchantHandoffDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req);
    return this.browserResponse(await this.auth.exchangeHandoff(dto.code, req), res);
  }


  @Get('session')
  async session(@Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req, true); this.noStore(res);
    const token = this.readCookie(req, this.cookieName());
    if (!token) throw new UnauthorizedException('Session required');
    return this.auth.browserSession(token, req, false);
  }

  @Post('resume') @HttpCode(200)
  async resume(@Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req, true); this.noStore(res);
    const token = this.readCookie(req, this.cookieName());
    if (!token) throw new UnauthorizedException('Session required');
    return this.auth.browserSession(token, req, true);
  }

  @Post('password/forgot') @HttpCode(200)
  async forgot(@Body() dto: MerchantForgotPasswordDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req, true); this.noStore(res);
    return this.auth.forgotPassword(dto, req);
  }

  @Post('password/reset') @HttpCode(200)
  async reset(@Body() dto: MerchantResetPasswordDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req, true); this.noStore(res);
    return this.auth.resetPassword(dto, req);
  }

  @Post('refresh') @HttpCode(200)
  async refresh(@Body() dto: MerchantRefreshDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req); this.noStore(res);
    const token = dto.refreshToken || this.readCookie(req, this.cookieName());
    if (!token) throw new UnauthorizedException('Refresh session required');
    try { return this.browserResponse(await this.auth.refresh(token, req), res); }
    catch (error) { this.clearRefresh(res); throw error; }
  }

  @Post('logout') @HttpCode(200)
  async logout(@Body() dto: MerchantRefreshDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req); this.noStore(res);
    const token = dto.refreshToken || this.readCookie(req, this.cookieName());
    if (token) await this.auth.logout(token);
    this.clearRefresh(res);
    return { loggedOut: true };
  }
}
