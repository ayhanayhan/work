import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export type SuperAdminAuthUser = { sub: string; email: string; sid: string; kind: 'superadmin'; iss?: string; aud?: string | string[] };

function superAdminJwtSecret() {
  const value = String(process.env.SUPERADMIN_JWT_SECRET || '');
  if (process.env.NODE_ENV === 'production' && value.length < 48) throw new Error('SUPERADMIN_JWT_SECRET must be at least 48 characters');
  return value || 'dev-superadmin-jwt-secret-change-me-please-48-characters-minimum';
}

@Injectable()
export class SuperAdminAuthGuard implements CanActivate {
  private readonly jwt = new JwtService({ secret: superAdminJwtSecret() });
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('Bearer token required');
    try {
      const payload = await this.jwt.verifyAsync<SuperAdminAuthUser>(token, { issuer: 'commerce-api', audience: 'commerce-superadmin' });
      if (payload.kind !== 'superadmin' || !payload.sid) throw new Error('wrong token kind');
      const session = await this.prisma.superAdminSession.findFirst({
        where: { id: payload.sid, superAdminId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() }, superAdmin: { isActive: true } },
        select: { id: true },
      });
      if (!session) throw new Error('session revoked');
      req.superAdmin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid, expired or revoked superadmin token');
    }
  }
}
