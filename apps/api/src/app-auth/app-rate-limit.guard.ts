import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AppRateLimitGuard implements CanActivate {
  private local = new Map<string, { count: number; reset: number }>();
  constructor(private cache: CacheService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const installationId = String(req.appAuth?.installationId || 'unknown');
    const tokenId = String(req.appAuth?.tokenId || 'unknown');
    const key = `${installationId}:${tokenId}`;
    const configured = Number(process.env.APP_API_RATE_LIMIT_PER_MINUTE || 600);
    const limit = Number.isFinite(configured) ? Math.max(10, Math.min(10000, configured)) : 600;
    const windowSeconds = 60;
    const now = Date.now();
    const resetAt = now + windowSeconds * 1000;

    const n = await this.cache.incrementWindow(`app-api:ratelimit:${key}`, windowSeconds);
    if (n !== null) {
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - n)));
      if (n > limit) {
        res.setHeader('Retry-After', String(windowSeconds));
        throw new HttpException('App API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      return true;
    }

    let bucket = this.local.get(key);
    if (!bucket || bucket.reset <= now) bucket = { count: 0, reset: resetAt };
    bucket.count++;
    this.local.set(key, bucket);
    if (this.local.size > 10000) {
      for (const [k, v] of this.local) if (v.reset <= now) this.local.delete(k);
    }
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
    if (bucket.count > limit) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.reset - now) / 1000))));
      throw new HttpException('App API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
