import { Body, Controller, ForbiddenException, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { SuperAdminAuthService } from './superadmin-auth.service';
import { SuperAdminLoginDto, SuperAdminRefreshDto } from './dto';

@Controller('superadmin-auth')
export class SuperAdminAuthController {
  constructor(private readonly auth: SuperAdminAuthService) {}

  private cookieName() { return process.env.NODE_ENV === 'production' ? '__Host-commerce_superadmin_refresh' : 'commerce_superadmin_refresh'; }
  private readCookie(req: any, name: string) {
    const raw = String(req.headers?.cookie || '');
    for (const part of raw.split(';')) {
      const [key, ...value] = part.trim().split('=');
      if (key === name) return decodeURIComponent(value.join('='));
    }
    return '';
  }
  private assertClient(req: any) {
    if (String(req.headers?.['x-auth-client'] || '') !== 'superadmin') throw new ForbiddenException('Invalid auth client');
    if (process.env.NODE_ENV === 'production' && String(req.headers?.['sec-fetch-site'] || '') === 'cross-site') throw new ForbiddenException('Cross-site auth request blocked');
  }
  private noStore(res: any) { res.setHeader('Cache-Control', 'no-store, max-age=0'); res.setHeader('Pragma', 'no-cache'); }
  private setRefresh(res: any, token: string) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${this.cookieName()}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${7 * 86400}${secure}`);
  }
  private clearRefresh(res: any) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${this.cookieName()}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`);
  }
  private browserResponse(result: any, res: any) {
    const { refreshToken, ...safe } = result;
    this.setRefresh(res, refreshToken);
    this.noStore(res);
    return safe;
  }

  @Post('login') @HttpCode(200)
  async login(@Body() dto: SuperAdminLoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req);
    return this.browserResponse(await this.auth.login(dto, req), res);
  }

  @Post('refresh') @HttpCode(200)
  async refresh(@Body() dto: SuperAdminRefreshDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req); this.noStore(res);
    const token = dto.refreshToken || this.readCookie(req, this.cookieName());
    if (!token) throw new UnauthorizedException('Refresh session required');
    try { return this.browserResponse(await this.auth.refresh(token, req), res); }
    catch (error) { this.clearRefresh(res); throw error; }
  }

  @Post('logout') @HttpCode(200)
  async logout(@Body() dto: SuperAdminRefreshDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    this.assertClient(req); this.noStore(res);
    const token = dto.refreshToken || this.readCookie(req, this.cookieName());
    if (token) await this.auth.logout(token);
    this.clearRefresh(res);
    return { loggedOut: true };
  }
}
