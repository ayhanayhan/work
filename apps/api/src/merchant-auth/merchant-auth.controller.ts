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
