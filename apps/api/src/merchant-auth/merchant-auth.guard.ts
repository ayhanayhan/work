import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export type MerchantAuthUser = { sub: string; email: string; sid: string; kind: 'merchant'; iss?: string; aud?: string | string[] };

function merchantJwtSecret() {
  const value = String(process.env.MERCHANT_JWT_SECRET || '');
  if (process.env.NODE_ENV === 'production' && value.length < 48) throw new Error('MERCHANT_JWT_SECRET must be at least 48 characters');
  return value || 'dev-merchant-jwt-secret-change-me-please-48-characters-minimum';
}

@Injectable()
export class MerchantAuthGuard implements CanActivate {
  private readonly jwt = new JwtService({ secret: merchantJwtSecret() });
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Bearer token required');
    try {
      const payload = await this.jwt.verifyAsync<MerchantAuthUser>(token, { issuer: 'commerce-api', audience: 'commerce-merchant-admin' });
      if (payload.kind !== 'merchant' || !payload.sid) throw new Error('wrong token kind');
      const session = await this.prisma.merchantSession.findFirst({ where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
      if (!session) throw new Error('session revoked');
      req.user = payload;
      req.merchantUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid, expired or revoked merchant token');
    }
  }
}
