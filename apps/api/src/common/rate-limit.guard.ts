import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, { count: number; reset: number }>();
  constructor(private readonly cache: CacheService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const now = Date.now();

    // Load-test bypass is intentionally fail-closed:
    // disabled unless LOADTEST_ENV=true, requires a strong server-side token,
    // and requires an exact constant-time header match.
    const loadTestEnv = String(process.env.LOADTEST_ENV || '').toLowerCase() === 'true';
    const loadTestToken = String(process.env.LOADTEST_BYPASS_TOKEN || '');
    const presentedLoadTestToken = String(req.headers?.['x-ticarti-loadtest-token'] || '');
    if (loadTestEnv && loadTestToken.length >= 48 && presentedLoadTestToken) {
      const expected = Buffer.from(loadTestToken);
      const presented = Buffer.from(presentedLoadTestToken);
      if (expected.length === presented.length && timingSafeEqual(expected, presented)) return true;
    }
    // req.ip is authoritative. Express only trusts forwarded hops when main.ts explicitly enables
    // a bounded trusted-proxy hop count; attacker supplied X-Forwarded-For is never parsed here.
    const ip = String(req.ip || req.socket?.remoteAddress || 'unknown').trim();
    const path = String(req.route?.path || req.url || '');
    const isSuperAdminAuth = path.includes('superadmin-auth');
    const isMerchantAuth = path.includes('merchant-auth');
    const isCustomerAuth = /customers\/(login|register)|customer\/(refresh|logout)/.test(path);
    const isThemePreview = path.includes('theme/render') && String(req.method||'GET').toUpperCase()==='POST';
    const isCheckout = /carts\/.+\/checkout/.test(path);
    const isCommentOrReview = /comments|reviews|questions/.test(path) && String(req.method||'GET').toUpperCase()!=='GET';
    const isHeartbeat = path.includes('live/heartbeat');
    const windowSeconds = 60;
    const limit = isSuperAdminAuth ? 10 : isMerchantAuth ? 20 : isCustomerAuth ? 20 : isThemePreview ? 60 : isCheckout ? 30 : isCommentOrReview ? 30 : isHeartbeat ? 120 : 300;
    const bucket = isSuperAdminAuth ? 'superadmin-auth' : isMerchantAuth ? 'merchant-auth' : isCustomerAuth ? 'customer-auth' : isThemePreview ? 'theme-preview' : isCheckout ? 'checkout' : isCommentOrReview ? 'ugc-write' : isHeartbeat ? 'heartbeat' : 'api';
    const ipHash=createHash('sha256').update(ip).digest('hex').slice(0,24);
    const redisCount=await this.cache.incrementWindow(`security:ratelimit:${bucket}:${ipHash}`,windowSeconds);
    if(redisCount!==null){ if(redisCount>limit)throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS); return true; }

    // Fail-safe local limiter when Redis is temporarily unavailable.
    const key = `${ipHash}:${bucket}`;
    let b = this.buckets.get(key);
    if (!b || b.reset <= now) b = { count: 0, reset: now + windowSeconds*1000 };
    b.count += 1; this.buckets.set(key, b);
    if (b.count > limit) throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    if (this.buckets.size > 20_000) for (const [k,v] of this.buckets) if (v.reset <= now) this.buckets.delete(k);
    return true;
  }
}
