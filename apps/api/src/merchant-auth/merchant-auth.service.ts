import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { requestIp, securityHash } from '../common/security';
import {
  MerchantForgotPasswordDto,
  MerchantGoogleDto,
  MerchantLoginDto,
  MerchantRegisterDto,
  MerchantResetPasswordDto,
} from './dto';

const DUMMY_HASH = bcrypt.hashSync('invalid-password-placeholder', 13);
const ACCESS_TTL_SECONDS = Math.max(10 * 60, Number(process.env.MERCHANT_ACCESS_TTL_SECONDS || 30 * 60));
const REFRESH_TTL_DAYS = Math.max(30, Number(process.env.MERCHANT_REFRESH_TTL_DAYS || 90));
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 20 * 60 * 1000;
const HANDOFF_TTL_MS = 2 * 60 * 1000;

function merchantJwtSecret() {
  const value = String(process.env.MERCHANT_JWT_SECRET || '');
  if (process.env.NODE_ENV === 'production' && value.length < 48) throw new Error('MERCHANT_JWT_SECRET must be at least 48 characters');
  return value || 'dev-merchant-jwt-secret-change-me-please-48-characters-minimum';
}

@Injectable()
export class MerchantAuthService {
  private readonly jwt = new JwtService({ secret: merchantJwtSecret() });
  private readonly google = new OAuth2Client();
  constructor(private readonly prisma: PrismaService) {}

  private tokenHash(value: string) { return createHash('sha256').update(value).digest('hex'); }

  private async assertLoginAllowed(email: string, req: any) {
    const emailHash = securityHash(email.toLowerCase())!;
    const ipHash = securityHash(requestIp(req));
    const since = new Date(Date.now() - 15 * 60_000);
    const failures = await this.prisma.securityEvent.count({
      where: {
        kind: 'merchant_login', success: false, createdAt: { gte: since },
        OR: [{ emailHash }, ...(ipHash ? [{ ipHash }] : [])],
      },
    });
    if (failures >= 8) throw new HttpException('Too many failed login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    return { emailHash, ipHash };
  }

  private async assertResetAllowed(email: string, req: any) {
    const emailHash = securityHash(email.toLowerCase())!;
    const ipHash = securityHash(requestIp(req));
    const since = new Date(Date.now() - 60 * 60_000);
    const attempts = await this.prisma.securityEvent.count({
      where: {
        kind: 'merchant_password_reset_request',
        createdAt: { gte: since },
        OR: [{ emailHash }, ...(ipHash ? [{ ipHash }] : [])],
      },
    });
    if (attempts >= 5) throw new HttpException('Too many reset requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    return { emailHash, ipHash };
  }

  private async memberships(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            customRole: true,
            tenant: {
              include: {
                subscriptions: {
                  include: { plan: true },
                  where: { status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] } },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return {
      user,
      memberships: user.memberships.map(m => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantStatus: m.tenant.status,
        role: m.role,
        customRole: m.customRole ? { id: m.customRole.id, name: m.customRole.name, permissions: m.customRole.permissions } : null,
        subscription: m.tenant.subscriptions[0] || null,
        site: { id: m.tenant.id, name: m.tenant.name, slug: m.tenant.slug, publicSlug: m.tenant.publicSlug, domain: m.tenant.domain, currency: m.tenant.currency, logoUrl: m.tenant.logoUrl },
      })),
    };
  }

  private normalizeSubdomain(value: string) {
    return String(value || '').trim().toLowerCase()
      .replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's')
      .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  }

  async subdomainAvailability(value: string) {
    const slug = this.normalizeSubdomain(value);
    if (slug.length < 3 || slug.length > 63) return { slug, available: false, reason: 'Alt alan adı 3-63 karakter olmalı' };
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) return { slug, available: false, reason: 'Geçersiz alt alan adı' };
    const hardReserved = new Set(['www','login','superadmin','dev','api','admin','app','academy','cdn','ai']);
    if (hardReserved.has(slug)) return { slug, available: false, reason: 'Bu alt alan adı sistem tarafından ayrılmış' };
    const reserved = await this.prisma.reservedSubdomain.findUnique({ where: { value: slug }, select: { isActive: true, reason: true } });
    if (reserved?.isActive) return { slug, available: false, reason: reserved.reason || 'Bu alt alan adı kullanılamıyor' };
    const existing = await this.prisma.tenant.findFirst({ where: { OR: [{ publicSlug: slug }, { slug }] }, select: { id: true } });
    return { slug, available: !existing, reason: existing ? 'Bu mağaza adresi zaten kullanılıyor' : null };
  }

  private async createTenantForUser(tx: any, userId: string, companyName: string, options: { subdomain?: string; phone?: string; sector?: string; pricesIncludeTax?: boolean; planCode?: string } = {}) {
    const slugBase = this.normalizeSubdomain(options.subdomain || companyName) || 'store';
    const publicSlug = options.subdomain ? slugBase : `${slugBase}-${randomBytes(3).toString('hex')}`;
    const slug = publicSlug;
    const plan = options.planCode
      ? await tx.plan.findFirst({where:{code:options.planCode,isActive:true}})
      : await tx.plan.findFirst({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { monthlyPrice: 'asc' }] });
    if(!plan)throw new BadRequestException('Selected plan is unavailable');
    const trialDays = Math.max(1, Number(plan?.trialDays || 14));
    const trialEndsAt = new Date(Date.now() + trialDays * 86400000);
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        companyName,
        phone: options.phone || null,
        slug,
        publicSlug,
        status: 'TRIAL',
        trialEndsAt,
        defaultCountry: 'TR',
        settings: { taxRate: 20, pricesIncludeTax: options.pricesIncludeTax !== false, showStock: true, allowGuestCheckout: true, onboarding: { sector: options.sector || null, source: 'ticarti-landing' } },
      },
    });
    await tx.membership.create({ data: { userId, tenantId: tenant.id, role: 'OWNER' } });
    await tx.storeCurrency.create({ data: { storeId: tenant.id, code: 'TRY', isDefault: true, isEnabled: true, exchangeRate: 1 } });
    if (plan) await tx.subscription.create({ data: { tenantId: tenant.id, planId: plan.id, status: 'TRIAL', trialEndsAt } });
    await tx.shippingMethod.create({ data: { storeId: tenant.id, name: 'Standart Kargo', code: 'standard', price: 79.90, freeAbove: 1500, estimatedMinDays: 1, estimatedMaxDays: 4 } });
    await tx.paymentMethod.createMany({ data: [
      { storeId: tenant.id, name: 'Havale / EFT', code: 'bank_transfer', type: 'manual', instructions: 'Sipariş numaranızı açıklamaya yazarak banka hesabımıza ödeme yapabilirsiniz.' },
      { storeId: tenant.id, name: 'Kapıda Ödeme', code: 'cash_on_delivery', type: 'cod', fee: 0 },
    ] });
    return tenant;
  }

  async register(dto: MerchantRegisterDto, req: any, handoffOnly = false) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Bu e-posta adresi zaten kayıtlı');
    if (dto.subdomain) {
      const availability = await this.subdomainAvailability(dto.subdomain);
      if (!availability.available) throw new ConflictException(availability.reason || 'Bu mağaza adresi kullanılamıyor');
      dto.subdomain = availability.slug;
    }
    const passwordHash = await bcrypt.hash(dto.password, 13);
    const result = await this.prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { email, name: dto.name, passwordHash, isSuperAdmin: false, emailVerifiedAt: null } });
      const tenant = await this.createTenantForUser(tx, user.id, dto.companyName, { subdomain: dto.subdomain, phone: dto.phone, sector: dto.sector, pricesIncludeTax: dto.pricesIncludeTax,planCode:dto.planCode });
      return { user, tenant };
    });
    const memberships = [{
      tenantId: result.tenant.id, tenantName: result.tenant.name, tenantStatus: result.tenant.status,
      role: 'OWNER', customRole: null, subscription: null,
      site: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug, publicSlug: result.tenant.publicSlug, domain: result.tenant.domain, currency: result.tenant.currency },
    }];
    if (handoffOnly) return this.createHandoff(result.user.id, memberships);
    return this.issueSession(result.user.id, result.user.email, req, memberships);
  }

  private async passwordProfile(dto: MerchantLoginDto, req: any) {
    const email = dto.email.trim().toLowerCase();
    const sec = await this.assertLoginAllowed(email, req);
    const user = await this.prisma.user.findUnique({ where: { email }, include: { memberships: { select: { id: true } } } });
    const ok = await bcrypt.compare(dto.password, user?.passwordHash || DUMMY_HASH);
    const valid = !!user && !!user.passwordHash && ok && user.memberships.length > 0;
    await this.prisma.securityEvent.create({ data: { kind: 'merchant_login', emailHash: sec.emailHash, ipHash: sec.ipHash, success: valid } });
    if (!valid || !user) throw new UnauthorizedException('Invalid credentials');
    if (user.passwordHash && bcrypt.getRounds(user.passwordHash) < 13) {
      await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(dto.password, 13) } });
    }
    const profile = await this.memberships(user.id);
    return { user, memberships: profile.memberships };
  }

  private async createHandoff(userId:string,memberships:any[]) {
    const code = randomBytes(48).toString('base64url');
    await this.prisma.merchantAuthHandoff.create({
      data: { userId, tokenHash: this.tokenHash(code), expiresAt: new Date(Date.now() + HANDOFF_TTL_MS) },
    });
    return { handoffCode: code, expiresIn: Math.floor(HANDOFF_TTL_MS / 1000), memberships };
  }

  async login(dto: MerchantLoginDto, req: any) {
    const profile = await this.passwordProfile(dto, req);
    return this.issueSession(profile.user.id, profile.user.email, req, profile.memberships);
  }

  async loginHandoff(dto: MerchantLoginDto, req: any) {
    const profile = await this.passwordProfile(dto, req);
    return this.createHandoff(profile.user.id, profile.memberships);
  }


  private async oauthRow(key:string){
    const settings=await this.prisma.platformSetting.findUnique({where:{key:'auth_providers'}});
    const data:any=settings?.value&&typeof settings.value==='object'?settings.value:{};
    return (Array.isArray(data.providers)?data.providers:[]).find((x:any)=>String(x.key).toUpperCase()===key);
  }

  async publicProviders(){
    const [g,l]=await Promise.all([this.oauthRow('GOOGLE'),this.oauthRow('LINKEDIN')]);
    return {
      google:{enabled:g?.enabled===true&&!!g.clientId,clientId:g?.enabled===true?String(g.clientId||''):''},
      linkedin:{enabled:l?.enabled===true&&!!l.clientId}
    };
  }

  private async oauthSecretConfig(provider:'LINKEDIN'|'GOOGLE'){
    const row=await this.oauthRow(provider);
    if(row?.enabled!==true||!row.clientId)throw new ServiceUnavailableException(provider+' sign-in is not configured');
    const id=String(row.clientId).trim();
    const ref=String(row.clientSecretRef||'').trim();
    let secret=String(provider==='GOOGLE'?process.env.GOOGLE_CLIENT_SECRET||'':process.env.LINKEDIN_CLIENT_SECRET||'').trim();
    if(!secret&&ref)secret=String(process.env[ref]||process.env[ref.replace(/[^A-Za-z0-9_]/g,'_').toUpperCase()]||'').trim();
    if(!secret&&ref){
      const project=String(process.env.GOOGLE_CLOUD_PROJECT||process.env.GCLOUD_PROJECT||process.env.GCP_PROJECT||'').trim();
      const name=/^projects\/[^/]+\/secrets\/[^/]+\/versions\/[^/]+$/.test(ref)?ref:
        /^[A-Za-z0-9_-]+$/.test(ref)&&project?`projects/${project}/secrets/${ref}/versions/latest`:'';
      if(name){
        try{
          const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
          const client=await auth.getClient(),token=await client.getAccessToken();
          const r=await fetch('https://secretmanager.googleapis.com/v1/'+name+':access',{
            headers:{authorization:'Bearer '+token.token},signal:AbortSignal.timeout(7000)
          });
          if(r.ok){const data:any=await r.json();if(data?.payload?.data)secret=Buffer.from(data.payload.data,'base64').toString('utf8').trim();}
        }catch{}
      }
    }
    if(!secret)throw new ServiceUnavailableException(provider+' client secret is not available to the API service');
    return {id,secret};
  }


  async googleAuthUrl(state:string,verifier:string){
    const {id}=await this.oauthSecretConfig('GOOGLE');
    const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('response_type','code');
    url.searchParams.set('client_id',id);
    url.searchParams.set('redirect_uri','https://login.ticarti.com/api/v1/merchant-auth/google/callback');
    url.searchParams.set('scope','openid email profile');
    url.searchParams.set('state',state);
    url.searchParams.set('code_challenge',createHash('sha256').update(verifier).digest('base64url'));
    url.searchParams.set('code_challenge_method','S256');
    return url.toString();
  }

  async googleCallback(code:string,verifier:string){
    const {id,secret}=await this.oauthSecretConfig('GOOGLE');
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{
      method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({
        grant_type:'authorization_code',code,client_id:id,client_secret:secret,
        redirect_uri:'https://login.ticarti.com/api/v1/merchant-auth/google/callback',
        code_verifier:verifier
      }),signal:AbortSignal.timeout(10000)
    });
    if(!tokenResponse.ok)throw new UnauthorizedException('Google authorization rejected');
    const tokens:any=await tokenResponse.json();
    if(!tokens?.id_token)throw new UnauthorizedException('Invalid Google token');
    const verified=await this.google.verifyIdToken({idToken:tokens.id_token,audience:id});
    const payload=verified.getPayload();
    const email=String(payload?.email||'').trim().toLowerCase();
    if(!payload?.sub||!email||payload.email_verified!==true)throw new UnauthorizedException('Google email not verified');
    const user=await this.prisma.user.findFirst({where:{OR:[{googleSub:payload.sub},{email}]},include:{memberships:{select:{id:true}}}});
    if(!user)return {identity:{provider:'GOOGLE',email,name:String(payload.name||email.split('@')[0]),sub:payload.sub}};
    if(!user.memberships.length)throw new UnauthorizedException('No merchant membership');
    if(user.googleSub&&user.googleSub!==payload.sub)throw new UnauthorizedException('Google identity mismatch');
    if(!user.googleSub)await this.prisma.user.update({where:{id:user.id},data:{googleSub:payload.sub,emailVerifiedAt:new Date()}});
    const profile=await this.memberships(user.id);
    return this.createHandoff(user.id,profile.memberships);
  }

  async linkedinAuthUrl(state:string,verifier:string){
    const {id}=await this.oauthSecretConfig('LINKEDIN');
    const challenge=createHash('sha256').update(verifier).digest('base64url');
    const url=new URL('https://www.linkedin.com/oauth/v2/authorization');
    url.searchParams.set('response_type','code');
    url.searchParams.set('client_id',id);
    url.searchParams.set('redirect_uri','https://login.ticarti.com/api/v1/merchant-auth/linkedin/callback');
    url.searchParams.set('state',state);
    url.searchParams.set('scope','openid profile email');
    url.searchParams.set('code_challenge',challenge);
    url.searchParams.set('code_challenge_method','S256');
    return url.toString();
  }

  async linkedinCallback(code:string,verifier:string){
    const {id,secret}=await this.oauthSecretConfig('LINKEDIN');
    const body=new URLSearchParams({
      grant_type:'authorization_code',code,client_id:id,client_secret:secret,
      redirect_uri:'https://login.ticarti.com/api/v1/merchant-auth/linkedin/callback',
      code_verifier:verifier
    });
    const tokenResponse=await fetch('https://www.linkedin.com/oauth/v2/accessToken',{
      method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,
      signal:AbortSignal.timeout(10000)
    });
    if(!tokenResponse.ok)throw new UnauthorizedException('LinkedIn authorization was rejected');
    const token:any=await tokenResponse.json();
    if(!token?.access_token)throw new UnauthorizedException('LinkedIn authorization failed');
    const profileResponse=await fetch('https://api.linkedin.com/v2/userinfo',{
      headers:{authorization:'Bearer '+String(token.access_token)},signal:AbortSignal.timeout(10000)
    });
    if(!profileResponse.ok)throw new UnauthorizedException('LinkedIn profile verification failed');
    const profile:any=await profileResponse.json();
    const email=String(profile.email||'').trim().toLowerCase();
    if(profile.email_verified!==true||!email||!String(profile.sub||''))
      throw new UnauthorizedException('LinkedIn verified email required');
    const user=await this.prisma.user.findUnique({where:{email},select:{id:true}});
    if(!user)return {identity:{provider:'LINKEDIN',email,name:String(profile.name||email.split('@')[0]),sub:String(profile.sub)}};
    const members=await this.memberships(user.id);
    if(!members.memberships.length)throw new UnauthorizedException('No merchant membership');
    return this.createHandoff(user.id,members.memberships);
  }


  async signSocialRegistration(identity:{provider:string;email:string;name:string;sub:string}) {
    return this.jwt.signAsync(identity,{expiresIn:'10m',issuer:'commerce-api',audience:'ticarti-social-registration'});
  }
  async verifySocialRegistration(token:string) {
    try {
      const p=await this.jwt.verifyAsync(token,{issuer:'commerce-api',audience:'ticarti-social-registration'});
      if(!['GOOGLE','LINKEDIN'].includes(p.provider)||!p.email||!p.sub)throw new Error('Invalid social identity');
      return {provider:String(p.provider),email:String(p.email).toLowerCase(),name:String(p.name||''),sub:String(p.sub)};
    }catch{throw new UnauthorizedException('Social registration expired; please sign in again')}
  }
  async registerSocial(token:string,details:{companyName:string;subdomain:string;phone?:string;sector?:string;pricesIncludeTax?:boolean;planCode?:string},req:any) {
    const identity=await this.verifySocialRegistration(token);
    if(!details.companyName||details.companyName.trim().length<2||details.companyName.length>160)throw new BadRequestException('Invalid store name');
    const availability=await this.subdomainAvailability(details.subdomain);
    if(!availability.available)throw new ConflictException(availability.reason||'Store address unavailable');
    const result=await this.prisma.$transaction(async tx=>{
      const existing=await tx.user.findUnique({where:{email:identity.email}});
      if(existing)throw new ConflictException('An account with this email already exists');
      const user=await tx.user.create({data:{
        email:identity.email,name:identity.name||identity.email.split('@')[0],
        passwordHash:null,googleSub:identity.provider==='GOOGLE'?identity.sub:null,
        emailVerifiedAt:new Date(),isSuperAdmin:false
      }});
      const tenant=await this.createTenantForUser(tx,user.id,details.companyName.trim(),{
        subdomain:availability.slug,phone:String(details.phone||'').slice(0,40),
        sector:String(details.sector||'').slice(0,80),pricesIncludeTax:details.pricesIncludeTax,planCode:details.planCode
      });
      return {user,tenant};
    });
    return this.createHandoff(result.user.id,[{
      tenantId:result.tenant.id,tenantName:result.tenant.name,tenantStatus:result.tenant.status,
      site:{name:result.tenant.name,publicSlug:result.tenant.publicSlug,domain:result.tenant.domain}
    }]);
  }

  async consumeSocialHandoff(code:string){
    const row=await this.prisma.merchantAuthHandoff.findFirst({
      where:{tokenHash:this.tokenHash(code),usedAt:null,expiresAt:{gt:new Date()}},
      select:{id:true,userId:true}
    });
    if(!row)throw new UnauthorizedException('Expired social sign-in');
    const updated=await this.prisma.merchantAuthHandoff.updateMany({where:{id:row.id,usedAt:null},data:{usedAt:new Date()}});
    if(updated.count!==1)throw new UnauthorizedException('Expired social sign-in');
    const profile=await this.memberships(row.userId);
    return this.createHandoff(row.userId,profile.memberships);
  }

  async googleLogin(dto: MerchantGoogleDto, req: any, handoffOnly = false) {
    const provider=await this.oauthRow('GOOGLE');
    const clientId=provider?.enabled===true?String(provider.clientId||'').trim():'';
    if (!clientId) throw new ServiceUnavailableException('Google sign-in is not configured');
    let payload: any;
    try {
      const ticket = await this.google.verifyIdToken({ idToken: dto.credential, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      await this.prisma.securityEvent.create({ data: { kind: 'merchant_google_login', ipHash: securityHash(requestIp(req)), success: false } });
      throw new UnauthorizedException('Invalid Google credential');
    }
    const email = String(payload?.email || '').trim().toLowerCase();
    const sub = String(payload?.sub || '');
    const name = String(payload?.name || '').trim() || email.split('@')[0] || 'Merchant';
    if (!email || !sub || payload?.email_verified !== true) throw new UnauthorizedException('Google email must be verified');

    let user = await this.prisma.user.findFirst({ where: { OR: [{ googleSub: sub }, { email }] }, include: { memberships: { select: { id: true } } } });
    if (user?.googleSub && user.googleSub !== sub) throw new UnauthorizedException('Google account does not match this user');

    if (!user) {
      if (!dto.companyName) return { requiresRegistration: true, profile: { email, name } };
      user = await this.prisma.$transaction(async tx => {
        const created = await tx.user.create({ data: { email, name, passwordHash: null, googleSub: sub, emailVerifiedAt: new Date(), isSuperAdmin: false } });
        await this.createTenantForUser(tx, created.id, dto.companyName!);
        return tx.user.findUniqueOrThrow({ where: { id: created.id }, include: { memberships: { select: { id: true } } } });
      });
    } else {
      const updates: any = {};
      if (!user.googleSub) updates.googleSub = sub;
      if (!user.emailVerifiedAt) updates.emailVerifiedAt = new Date();
      if (!user.name && name) updates.name = name;
      if (Object.keys(updates).length) user = await this.prisma.user.update({ where: { id: user.id }, data: updates, include: { memberships: { select: { id: true } } } });
      if (!user.memberships.length) {
        if (!dto.companyName) return { requiresRegistration: true, profile: { email, name } };
        await this.prisma.$transaction(tx => this.createTenantForUser(tx, user!.id, dto.companyName!));
      }
    }

    const profile = await this.memberships(user.id);
    if (!profile.memberships.length) throw new UnauthorizedException('No merchant membership');
    await this.prisma.securityEvent.create({ data: { kind: 'merchant_google_login', emailHash: securityHash(email), ipHash: securityHash(requestIp(req)), success: true } });

    if (handoffOnly) return this.createHandoff(user.id, profile.memberships);

    return this.issueSession(user.id, user.email, req, profile.memberships);
  }

  async exchangeHandoff(code: string, req: any) {
    const tokenHash = this.tokenHash(code);
    const row = await this.prisma.merchantAuthHandoff.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!row) throw new UnauthorizedException('Invalid or expired handoff');
    const profile = await this.memberships(row.userId);
    if (!profile.memberships.length) throw new UnauthorizedException('Invalid handoff');
    const consumed = await this.prisma.merchantAuthHandoff.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) throw new UnauthorizedException('Invalid or expired handoff');
    return this.issueSession(row.userId, row.user.email, req, profile.memberships);
  }

  async forgotPassword(dto: MerchantForgotPasswordDto, req: any) {
    const email = dto.email.trim().toLowerCase();
    const sec = await this.assertResetAllowed(email, req);
    const user = await this.prisma.user.findUnique({ where: { email }, include: { memberships: { select: { id: true } } } });
    await this.prisma.securityEvent.create({ data: { kind: 'merchant_password_reset_request', emailHash: sec.emailHash, ipHash: sec.ipHash, success: !!user?.memberships.length } });
    if (!user || !user.memberships.length) return { ok: true };

    const token = randomBytes(48).toString('base64url');
    const tokenHash = this.tokenHash(token);
    await this.prisma.$transaction(async tx => {
      await tx.merchantPasswordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      await tx.merchantPasswordReset.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
    });

    const base = String(process.env.MERCHANT_ADMIN_URL || '').replace(/\/$/, '');
    if (base) {
      const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;
      const sent = await this.sendResetEmail(user.email, user.name, url);
      if (!sent && process.env.NODE_ENV !== 'production') return { ok: true, devResetUrl: url };
    }
    return { ok: true };
  }

  private async sendResetEmail(email: string, name: string | null, url: string) {
    const key = String(process.env.RESEND_API_KEY || '');
    const from = String(process.env.MAIL_FROM || '');
    if (!key || !from) {
      if (process.env.NODE_ENV !== 'production') console.info(`[merchant-password-reset] ${url}`);
      return false;
    }
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [email],
          subject: 'Parolanızı sıfırlayın',
          text: `${name ? `${name},\n\n` : ''}Mağaza yönetim parolanızı sıfırlamak için aşağıdaki bağlantıyı kullanın. Bağlantı 20 dakika geçerlidir.\n\n${url}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`,
        }),
      });
      return r.ok;
    } catch {
      return false;
    }
  }

  async resetPassword(dto: MerchantResetPasswordDto, req: any) {
    const tokenHash = this.tokenHash(dto.token);
    const row = await this.prisma.merchantPasswordReset.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!row) throw new BadRequestException('Invalid or expired reset link');
    const passwordHash = await bcrypt.hash(dto.password, 13);
    await this.prisma.$transaction(async tx => {
      const consumed = await tx.merchantPasswordReset.updateMany({
        where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new BadRequestException('Invalid or expired reset link');
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
      await tx.merchantPasswordReset.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } });
      await tx.merchantSession.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    await this.prisma.securityEvent.create({ data: { kind: 'merchant_password_reset_complete', emailHash: securityHash(row.user.email), ipHash: securityHash(requestIp(req)), success: true } });
    return { ok: true };
  }

  private async issueSession(userId: string, email: string, req: any, memberships: any[]) {
    const refreshToken = randomBytes(64).toString('base64url');
    const uaHash = securityHash(req.headers?.['user-agent']);
    const session = await this.prisma.merchantSession.create({
      data: {
        userId,
        refreshTokenHash: this.tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        ipHash: securityHash(requestIp(req)),
        userAgentHash: uaHash,
      },
    });
    const old = await this.prisma.merchantSession.findMany({ where: { userId, revokedAt: null }, orderBy: { createdAt: 'desc' }, skip: 10, select: { id: true } });
    if (old.length) await this.prisma.merchantSession.updateMany({ where: { id: { in: old.map(x => x.id) } }, data: { revokedAt: new Date() } });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, sid: session.id, kind: 'merchant' },
      { expiresIn: ACCESS_TTL_SECONDS, issuer: 'commerce-api', audience: 'commerce-merchant-admin' },
    );
    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS, memberships };
  }

  async refresh(refreshToken: string, req: any) {
    const hash = this.tokenHash(refreshToken);
    const session = await this.prisma.merchantSession.findFirst({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
        OR: [{ refreshTokenHash: hash }, { previousRefreshTokenHash: hash }],
      },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException('Invalid refresh token');
    if (session.previousRefreshTokenHash === hash) {
      await this.prisma.merchantSession.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.prisma.securityEvent.create({ data: { kind: 'merchant_refresh_reuse', emailHash: securityHash(session.user.email), ipHash: securityHash(requestIp(req)), success: false } });
      throw new UnauthorizedException('Invalid refresh token');
    }
    const uaHash = securityHash(req.headers?.['user-agent']);
    if (session.userAgentHash && uaHash && session.userAgentHash !== uaHash) {
      await this.prisma.merchantSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      await this.prisma.securityEvent.create({ data: { kind: 'merchant_refresh_ua_mismatch', emailHash: securityHash(session.user.email), ipHash: securityHash(requestIp(req)), success: false } });
      throw new UnauthorizedException('Invalid refresh token');
    }
    const next = randomBytes(64).toString('base64url');
    const rotated = await this.prisma.merchantSession.updateMany({
      where: { id: session.id, revokedAt: null, refreshTokenHash: hash },
      data: {
        previousRefreshTokenHash: session.refreshTokenHash,
        refreshTokenHash: this.tokenHash(next),
        lastUsedAt: new Date(),
        ipHash: securityHash(requestIp(req)),
      },
    });
    if (rotated.count !== 1) {
      await this.prisma.merchantSession.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.prisma.securityEvent.create({ data: { kind: 'merchant_refresh_reuse', emailHash: securityHash(session.user.email), ipHash: securityHash(requestIp(req)), success: false } });
      throw new UnauthorizedException('Invalid refresh token');
    }
    const profile = await this.memberships(session.userId);
    if (!profile.memberships.length) {
      await this.prisma.merchantSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Invalid session');
    }
    const accessToken = await this.jwt.signAsync(
      { sub: session.userId, email: session.user.email, sid: session.id, kind: 'merchant' },
      { expiresIn: ACCESS_TTL_SECONDS, issuer: 'commerce-api', audience: 'commerce-merchant-admin' },
    );
    return { accessToken, refreshToken: next, expiresIn: ACCESS_TTL_SECONDS, memberships: profile.memberships };
  }

  async browserSession(refreshToken: string, req: any, withHandoff = false) {
    const hash = this.tokenHash(refreshToken);
    const session = await this.prisma.merchantSession.findFirst({
      where: { revokedAt: null, expiresAt: { gt: new Date() }, refreshTokenHash: hash },
      include: { user: true },
    });
    if (!session) throw new UnauthorizedException('Invalid session');
    const uaHash = securityHash(req.headers?.['user-agent']);
    if (session.userAgentHash && uaHash && session.userAgentHash !== uaHash) throw new UnauthorizedException('Invalid session');
    const profile = await this.memberships(session.userId);
    if (!profile.memberships.length) throw new UnauthorizedException('Invalid session');
    await this.prisma.merchantSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date(), ipHash: securityHash(requestIp(req)) } });
    const base:any = { authenticated: true, user: { id: profile.user.id, name: profile.user.name, email: profile.user.email }, memberships: profile.memberships };
    if (withHandoff) Object.assign(base, await this.createHandoff(session.userId, profile.memberships));
    return base;
  }

  async logout(refreshToken: string) {
    const hash = this.tokenHash(refreshToken);
    await this.prisma.merchantSession.updateMany({
      where: { OR: [{ refreshTokenHash: hash }, { previousRefreshTokenHash: hash }], revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { loggedOut: true };
  }
}
