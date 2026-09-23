import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { createHash } from 'crypto';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, { count: number; reset: number }>();
  constructor(private readonly cache: CacheService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const now = Date.now();
    const ip = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const path = String(req.route?.path || req.url || '');
    const isSuperAdminAuth = path.includes('superadmin-auth');
    const isMerchantAuth = path.includes('merchant-auth');
    const windowSeconds = 60;
    const limit = isSuperAdminAuth ? 10 : isMerchantAuth ? 20 : 300;
    const bucket = isSuperAdminAuth ? 'superadmin-auth' : isMerchantAuth ? 'merchant-auth' : 'api';
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
