import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { requestIp, securityHash } from '../common/security';
import { SuperAdminLoginDto } from './dto';

const DUMMY_HASH = bcrypt.hashSync('invalid-superadmin-password-placeholder', 14);
const ACCESS_TTL_SECONDS = 5 * 60;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function superAdminJwtSecret() {
  const value = String(process.env.SUPERADMIN_JWT_SECRET || '');
  if (process.env.NODE_ENV === 'production' && value.length < 48) throw new Error('SUPERADMIN_JWT_SECRET must be at least 48 characters');
  return value || 'dev-superadmin-jwt-secret-change-me-please-48-characters-minimum';
}

@Injectable()
export class SuperAdminAuthService {
  private readonly jwt = new JwtService({ secret: superAdminJwtSecret() });
  constructor(private readonly prisma: PrismaService) {}

  private tokenHash(value: string) { return createHash('sha256').update(value).digest('hex'); }

  private async assertLoginAllowed(email: string, req: any) {
    const emailHash = securityHash(email.toLowerCase())!;
    const ipHash = securityHash(requestIp(req));
    const since = new Date(Date.now() - 30 * 60_000);
    const failures = await this.prisma.securityEvent.count({
      where: {
        kind: 'superadmin_login', success: false, createdAt: { gte: since },
        OR: [{ emailHash }, ...(ipHash ? [{ ipHash }] : [])],
      },
    });
    if (failures >= 5) throw new HttpException('Too many failed login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    return { emailHash, ipHash };
  }

  async login(dto: SuperAdminLoginDto, req: any) {
    const email = dto.email.trim().toLowerCase();
    const sec = await this.assertLoginAllowed(email, req);
    const admin = await this.prisma.superAdmin.findUnique({ where: { email } });
    const ok = await bcrypt.compare(dto.password, admin?.passwordHash || DUMMY_HASH);
    const valid = !!admin && admin.isActive && ok;
    await this.prisma.securityEvent.create({ data: { kind: 'superadmin_login', emailHash: sec.emailHash, ipHash: sec.ipHash, success: valid } });
    if (!valid || !admin) throw new UnauthorizedException('Invalid credentials');
    if (bcrypt.getRounds(admin.passwordHash) < 14) {
      await this.prisma.superAdmin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(dto.password, 14) } });
    }
    await this.prisma.superAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    return this.issueSession(admin.id, admin.email, req);
  }

  private async issueSession(superAdminId: string, email: string, req: any) {
    const refreshToken = randomBytes(64).toString('base64url');
    const session = await this.prisma.superAdminSession.create({
      data: {
        superAdminId,
        refreshTokenHash: this.tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        ipHash: securityHash(requestIp(req)),
        userAgentHash: securityHash(req.headers?.['user-agent']),
      },
    });
    const old = await this.prisma.superAdminSession.findMany({ where: { superAdminId, revokedAt: null }, orderBy: { createdAt: 'desc' }, skip: 5, select: { id: true } });
    if (old.length) await this.prisma.superAdminSession.updateMany({ where: { id: { in: old.map(x => x.id) } }, data: { revokedAt: new Date() } });
    const accessToken = await this.jwt.signAsync(
      { sub: superAdminId, email, sid: session.id, kind: 'superadmin' },
      { expiresIn: ACCESS_TTL_SECONDS, issuer: 'commerce-api', audience: 'commerce-superadmin' },
    );
    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
  }

  async refresh(refreshToken: string, req: any) {
    const hash = this.tokenHash(refreshToken);
    const session = await this.prisma.superAdminSession.findFirst({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
        OR: [{ refreshTokenHash: hash }, { previousRefreshTokenHash: hash }],
      },
      include: { superAdmin: true },
    });
    if (!session || !session.superAdmin.isActive) throw new UnauthorizedException('Invalid refresh token');
    if (session.previousRefreshTokenHash === hash) {
      await this.prisma.superAdminSession.updateMany({ where: { superAdminId: session.superAdminId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.prisma.securityEvent.create({ data: { kind: 'superadmin_refresh_reuse', emailHash: securityHash(session.superAdmin.email), ipHash: securityHash(requestIp(req)), success: false } });
      throw new UnauthorizedException('Invalid refresh token');
    }
    const uaHash = securityHash(req.headers?.['user-agent']);
    if (session.userAgentHash && uaHash && session.userAgentHash !== uaHash) {
      await this.prisma.superAdminSession.updateMany({ where: { superAdminId: session.superAdminId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.prisma.securityEvent.create({ data: { kind: 'superadmin_refresh_ua_mismatch', emailHash: securityHash(session.superAdmin.email), ipHash: securityHash(requestIp(req)), success: false } });
      throw new UnauthorizedException('Invalid refresh token');
    }
    const next = randomBytes(64).toString('base64url');
    await this.prisma.superAdminSession.update({
      where: { id: session.id },
      data: {
        previousRefreshTokenHash: session.refreshTokenHash,
        refreshTokenHash: this.tokenHash(next),
        lastUsedAt: new Date(),
        ipHash: securityHash(requestIp(req)),
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: session.superAdminId, email: session.superAdmin.email, sid: session.id, kind: 'superadmin' },
      { expiresIn: ACCESS_TTL_SECONDS, issuer: 'commerce-api', audience: 'commerce-superadmin' },
    );
    return { accessToken, refreshToken: next, expiresIn: ACCESS_TTL_SECONDS };
  }

  async logout(refreshToken: string) {
    const hash = this.tokenHash(refreshToken);
    await this.prisma.superAdminSession.updateMany({
      where: { OR: [{ refreshTokenHash: hash }, { previousRefreshTokenHash: hash }], revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { loggedOut: true };
  }
}
