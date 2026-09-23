import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { PrismaService } from '../prisma/prisma.service';

function isPrivateIp(address: string) {
  if (address === '::1' || address === '0:0:0:0:0:0:0:1') return true;
  if (address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true;
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a,b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { tenantId },
      select: { id: true, url: true, events: true, enabled: true, createdAt: true },
    });
  }

  private async assertSafeUrl(raw: string) {
    let url: URL;
    try { url = new URL(raw); } catch { throw new BadRequestException('Geçersiz webhook URL'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new BadRequestException('Webhook yalnızca HTTP(S) olabilir');
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new BadRequestException('Production webhook URL HTTPS olmalı');
    if (url.username || url.password) throw new BadRequestException('Webhook URL kullanıcı bilgisi içeremez');
    if (process.env.WEBHOOK_ALLOW_PRIVATE === 'true') return;

    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true }).catch(() => []);
    if (!addresses.length) throw new BadRequestException('Webhook host çözümlenemedi');
    if (addresses.some(x => isPrivateIp(x.address))) throw new BadRequestException('Private/local ağ adreslerine webhook gönderilemez');
  }

  async create(tenantId: string, body: { url: string; events: string[] }) {
    await this.assertSafeUrl(body.url);
    if (!Array.isArray(body.events) || !body.events.length || body.events.length > 50) throw new BadRequestException('Webhook event listesi geçersiz');
    return this.prisma.webhookEndpoint.create({
      data: { tenantId, url: body.url, events: [...new Set(body.events)], secret: randomBytes(32).toString('hex') },
      select: { id: true, url: true, events: true, secret: true },
    });
  }

  async emit(tenantId: string, event: string, payload: unknown) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({ where: { tenantId, enabled: true, events: { has: event } } });
    for (const ep of endpoints) {
      const delivery = await this.prisma.webhookDelivery.create({ data: { endpointId: ep.id, event, payload: payload as any } });
      const body = JSON.stringify({ id: delivery.id, event, createdAt: new Date().toISOString(), data: payload });
      const signature = createHmac('sha256', ep.secret).update(body).digest('hex');
      try {
        await this.assertSafeUrl(ep.url); // DNS rebinding'e karşı gönderim anında tekrar doğrula.
        const res = await fetch(ep.url, {
          method: 'POST',
          redirect: 'manual',
          signal: AbortSignal.timeout(10_000),
          headers: { 'content-type': 'application/json', 'x-commerce-signature': signature, 'x-commerce-event': event, 'user-agent': 'CommerceSaaS-Webhook/1.0' },
          body,
        });
        await this.prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { statusCode: res.status, attempts: 1, deliveredAt: res.ok ? new Date() : undefined, lastError: res.ok ? null : `HTTP ${res.status}` } });
      } catch (e: any) {
        await this.prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { attempts: 1, lastError: String(e?.message || 'delivery failed').slice(0, 500) } });
      }
    }
  }
}
