import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private redis: Redis | null = null;

  constructor() {
    const url = String(process.env.REDIS_URL || '').trim();

    if (!url) {
      console.log('[cache] REDIS_URL not configured; Redis cache disabled');
      return;
    }

    this.redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    this.redis.on('error', (err) => {
      console.warn('[cache] Redis unavailable:', err?.message || err);
    });
  }

  private async ready() {
    if (!this.redis) return false;

    if (this.redis.status === 'wait') {
      await this.redis.connect();
    }

    return this.redis.status === 'ready';
  }

  key(tenantId: string, scope: string, id: string) {
    return `tenant:${tenantId}:${scope}:${id}`;
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      if (!(await this.ready()) || !this.redis) return null;

      const v = await this.redis.get(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: any, ttl = 300) {
    try {
      if (!(await this.ready()) || !this.redis) return;

      await this.redis.set(
        key,
        JSON.stringify(value),
        'EX',
        Math.max(1, ttl),
      );
    } catch {}
  }

  async del(...keys: string[]) {
    if (!keys.length) return;

    try {
      if (!(await this.ready()) || !this.redis) return;
      await this.redis.del(...keys);
    } catch {}
  }

  async delPattern(pattern: string) {
    try {
      if (!(await this.ready()) || !this.redis) return;

      let cursor = '0';

      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          200,
        );

        cursor = next;

        if (keys.length) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch {}
  }

  async purgeTenant(tenantId: string) {
    return this.delPattern(`tenant:${tenantId}:*`);
  }

  async incrementWindow(
    key: string,
    windowSeconds: number,
  ): Promise<number | null> {
    try {
      if (!(await this.ready()) || !this.redis) return null;

      const count = await this.redis.incr(key);

      if (count === 1) {
        await this.redis.expire(
          key,
          Math.max(1, windowSeconds),
        );
      }

      return count;
    } catch {
      return null;
    }
  }

  async stats() {
    try {
      if (!(await this.ready()) || !this.redis) {
        return { connected: false, disabled: true };
      }

      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');

      return {
        connected: true,
        info,
        memory,
      };
    } catch {
      return { connected: false };
    }
  }

  async onModuleDestroy() {
    if (!this.redis) return;

    try {
      await this.redis.quit();
    } catch {}
  }
}
