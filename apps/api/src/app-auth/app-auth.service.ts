import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppAuthService {
  constructor(private prisma: PrismaService) {}

  private hash(v: string) { return createHash('sha256').update(v).digest('hex'); }
  private opaque(prefix: string, bytes = 32) { return `${prefix}_${randomBytes(bytes).toString('base64url')}`; }
  private safeEqual(a: string, b: string) {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  }
  private async clientByPublicId(clientId: string) {
    return this.prisma.appClient.findUnique({ where: { clientId }, include: { app: true } });
  }
  private verifySecret(client: any, secret: string) {
    if (!secret || !this.safeEqual(client.clientSecretHash, this.hash(secret))) {
      throw new UnauthorizedException('Invalid app client credentials');
    }
  }
  private sanitizeClient(row: any) {
    return {
      id: row.id,
      appId: row.appId,
      name: row.name,
      clientId: row.clientId,
      redirectUris: row.redirectUris,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listClients(appId: string) {
    const app = await this.prisma.appDefinition.findUnique({ where: { id: appId }, select: { id: true } });
    if (!app) throw new NotFoundException('App not found');
    const rows = await this.prisma.appClient.findMany({ where: { appId }, orderBy: { createdAt: 'desc' } });
    return rows.map(x => this.sanitizeClient(x));
  }

  async createClient(appId: string, body: any) {
    const app = await this.prisma.appDefinition.findUnique({ where: { id: appId }, select: { id: true } });
    if (!app) throw new NotFoundException('App not found');
    const redirectUris: string[] = [...new Set<string>((Array.isArray(body?.redirectUris) ? body.redirectUris : [])
      .map((x: any) => String(x).trim()).filter(Boolean))];
    for (const uri of redirectUris) {
      let u: URL;
      try { u = new URL(uri); } catch { throw new BadRequestException(`Invalid redirect URI: ${uri}`); }
      if (!['https:', 'http:'].includes(u.protocol)) throw new BadRequestException('Redirect URI must use http or https');
      if (u.protocol === 'http:' && !['localhost', '127.0.0.1', '::1'].includes(u.hostname)) {
        throw new BadRequestException('HTTP redirect URI is only allowed for localhost development');
      }
      if (u.username || u.password) throw new BadRequestException('Redirect URI cannot contain credentials');
      u.hash = '';
      if (u.toString() !== uri && u.toString().replace(/\/$/, '') !== uri.replace(/\/$/, '')) {
        throw new BadRequestException('Redirect URI must be canonical');
      }
    }
    if (!redirectUris.length) throw new BadRequestException('At least one redirect URI is required');
    const clientId = this.opaque('ticarti_client', 18);
    const clientSecret = this.opaque('ticarti_secret', 32);
    const row = await this.prisma.appClient.create({
      data: {
        appId,
        name: String(body?.name || 'Default client').trim().slice(0, 120) || 'Default client',
        clientId,
        clientSecretHash: this.hash(clientSecret),
        redirectUris,
      },
    });
    return { ...this.sanitizeClient(row), clientSecret };
  }

  async rotateClientSecret(appId: string, id: string) {
    const row = await this.prisma.appClient.findFirst({ where: { id, appId } });
    if (!row) throw new NotFoundException('App client not found');
    const clientSecret = this.opaque('ticarti_secret', 32);
    await this.prisma.control().$transaction(async tx => {
      await tx.appClient.update({ where: { id }, data: { clientSecretHash: this.hash(clientSecret) } });
      await tx.appAccessToken.updateMany({ where: { appClientId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    return { ...this.sanitizeClient(row), clientSecret, revokedExistingTokens: true };
  }

  async setClientState(appId: string, id: string, enabled: boolean) {
    const row = await this.prisma.appClient.findFirst({ where: { id, appId } });
    if (!row) throw new NotFoundException('App client not found');
    await this.prisma.control().$transaction(async tx => {
      await tx.appClient.update({ where: { id }, data: { isActive: enabled } });
      if (!enabled) {
        await tx.appAccessToken.updateMany({ where: { appClientId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
    });
    return { ok: true, isActive: enabled };
  }

  async authorize(tenantId: string, body: any) {
    const client = await this.clientByPublicId(String(body?.clientId || ''));
    if (!client || !client.isActive) throw new NotFoundException('App client not found');
    const redirectUri = String(body?.redirectUri || '');
    if (!client.redirectUris.includes(redirectUri)) throw new BadRequestException('Redirect URI is not registered');
    const install = await this.prisma.appInstallation.findFirst({
      where: { tenantId, appId: client.appId, status: 'ACTIVE', enabled: true },
      include: { scopes: true },
    });
    if (!install) throw new BadRequestException('App is not installed and active for this store');
    const granted = new Set(install.scopes.map(x => x.scope));
    const requested = [...new Set<string>((Array.isArray(body?.scopes) ? body.scopes.map(String) : [...granted]).map((x: string) => x.trim()).filter(Boolean))];
    if (requested.some(x => !granted.has(x))) throw new BadRequestException('Requested scope has not been granted by the merchant');
    const challenge = String(body?.code_challenge || body?.codeChallenge || '');
    const method = String(body?.code_challenge_method || body?.codeChallengeMethod || 'S256');
    if (method !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) {
      throw new BadRequestException('OAuth PKCE S256 code_challenge is required');
    }
    const code = this.opaque('ticarti_code', 32);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.control().$transaction(async tx => {
      await tx.appAuthorizationCode.create({
        data: {
          codeHash: this.hash(code),
          installationId: install.id,
          appClientId: client.id,
          redirectUri,
          codeChallenge: challenge,
          scopes: requested,
          expiresAt,
        },
      });
      await tx.appLifecycleEvent.create({
        data: {
          tenantId,
          appId: client.appId,
          installationId: install.id,
          event: 'app.oauth.authorized',
          metadata: { clientId: client.clientId, scopes: requested },
        },
      });
    });
    return { code, state: body?.state ? String(body.state).slice(0, 512) : undefined, redirectUri, expiresAt };
  }

  async token(body: any) {
    const grant = String(body?.grant_type || body?.grantType || '');
    const client = await this.clientByPublicId(String(body?.client_id || body?.clientId || ''));
    if (!client || !client.isActive) throw new UnauthorizedException('Invalid app client');
    this.verifySecret(client, String(body?.client_secret || body?.clientSecret || ''));
    if (grant === 'authorization_code') return this.exchangeCode(client, body);
    if (grant === 'refresh_token') return this.refresh(client, body);
    throw new BadRequestException('Unsupported grant_type');
  }

  private async exchangeCode(client: any, body: any) {
    const rawCode = String(body?.code || '');
    const redirectUri = String(body?.redirect_uri || body?.redirectUri || '');
    const codeHash = this.hash(rawCode);
    const row = await this.prisma.appAuthorizationCode.findUnique({
      where: { codeHash },
      include: { installation: { include: { scopes: true } } },
    });
    if (!row || row.appClientId !== client.id || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired authorization code');
    }
    if (row.redirectUri !== redirectUri) throw new UnauthorizedException('Redirect URI mismatch');
    const verifier = String(body?.code_verifier || body?.codeVerifier || '');
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new UnauthorizedException('Invalid PKCE code_verifier');
    const calculated = createHash('sha256').update(verifier, 'ascii').digest('base64url');
    if (!row.codeChallenge || !this.safeEqual(calculated, row.codeChallenge)) {
      throw new UnauthorizedException('PKCE verification failed');
    }

    if (row.installation.status !== 'ACTIVE' || !row.installation.enabled) throw new UnauthorizedException('App installation is not active');

    const granted = new Set(row.installation.scopes.map(x => x.scope));
    const effectiveScopes = row.scopes.filter(scope => granted.has(scope));
    const accessToken = this.opaque('ticarti_at', 32);
    const refreshToken = this.opaque('ticarti_rt', 40);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.control().$transaction(async tx => {
      const claimed = await tx.appAuthorizationCode.updateMany({
        where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new UnauthorizedException('Authorization code has already been used');
      await tx.appAccessToken.create({
        data: {
          installationId: row.installationId,
          appClientId: client.id,
          accessTokenHash: this.hash(accessToken),
          refreshTokenHash: this.hash(refreshToken),
          scopes: effectiveScopes,
          expiresAt,
          refreshExpiresAt,
        },
      });
      await tx.appLifecycleEvent.create({
        data: {
          tenantId: row.installation.tenantId,
          appId: row.installation.appId,
          installationId: row.installationId,
          event: 'app.oauth.token_issued',
          metadata: { clientId: client.clientId, scopes: effectiveScopes },
        },
      });
    });

    return {
      token_type: 'Bearer',
      access_token: accessToken,
      expires_in: 3600,
      refresh_token: refreshToken,
      refresh_expires_in: 30 * 24 * 60 * 60,
      scope: effectiveScopes.join(' '),
    };
  }

  private async refresh(client: any, body: any) {
    const raw = String(body?.refresh_token || body?.refreshToken || '');
    const oldRefreshHash = this.hash(raw);
    const row = await this.prisma.appAccessToken.findUnique({
      where: { refreshTokenHash: oldRefreshHash },
      include: { installation: { include: { scopes: true } } },
    });
    if (!row || row.appClientId !== client.id || row.revokedAt || row.refreshExpiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (row.installation.status !== 'ACTIVE' || !row.installation.enabled) throw new UnauthorizedException('App installation is not active');

    const granted = new Set(row.installation.scopes.map(x => x.scope));
    const effectiveScopes = row.scopes.filter(scope => granted.has(scope));
    const accessToken = this.opaque('ticarti_at', 32);
    const refreshToken = this.opaque('ticarti_rt', 40);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const rotated = await this.prisma.appAccessToken.updateMany({
      where: {
        id: row.id,
        appClientId: client.id,
        refreshTokenHash: oldRefreshHash,
        revokedAt: null,
        refreshExpiresAt: { gt: new Date() },
      },
      data: {
        accessTokenHash: this.hash(accessToken),
        refreshTokenHash: this.hash(refreshToken),
        scopes: effectiveScopes,
        expiresAt,
        refreshExpiresAt,
        lastUsedAt: new Date(),
      },
    });
    if (rotated.count !== 1) throw new UnauthorizedException('Refresh token has already been rotated');

    await this.prisma.appLifecycleEvent.create({
      data: {
        tenantId: row.installation.tenantId,
        appId: row.installation.appId,
        installationId: row.installationId,
        event: 'app.oauth.token_refreshed',
        metadata: { clientId: client.clientId, scopes: effectiveScopes },
      },
    });

    return {
      token_type: 'Bearer',
      access_token: accessToken,
      expires_in: 3600,
      refresh_token: refreshToken,
      refresh_expires_in: 30 * 24 * 60 * 60,
      scope: effectiveScopes.join(' '),
    };
  }

  async authenticateAccessToken(raw: string) {
    const row = await this.prisma.appAccessToken.findUnique({
      where: { accessTokenHash: this.hash(raw) },
      include: { installation: { include: { scopes: true } }, client: true },
    });
    if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now() || !row.client.isActive || row.installation.status !== 'ACTIVE' || !row.installation.enabled) {
      throw new UnauthorizedException('Invalid or expired app access token');
    }

    // A merchant may revoke an app scope after a token was issued. Never trust the
    // token snapshot alone; intersect it with the installation's live grants.
    const granted = new Set(row.installation.scopes.map(x => x.scope));
    const effectiveScopes = row.scopes.filter(scope => granted.has(scope));
    await this.prisma.appAccessToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);

    return {
      tokenId: row.id,
      tenantId: row.installation.tenantId,
      appId: row.installation.appId,
      installationId: row.installationId,
      clientId: row.client.clientId,
      scopes: effectiveScopes,
    };
  }
}
