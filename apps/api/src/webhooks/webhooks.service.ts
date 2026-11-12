import {apiError} from '../i18n/api-error';
import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EventOutboxService } from './event-outbox.service';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService, private events: EventOutboxService) {}

  list(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { tenantId },
      select: { id: true, url: true, events: true, enabled: true, createdAt: true },
    });
  }

  async create(tenantId: string, body: { url: string; events: string[] }) {
    await this.events.assertSafeUrl(body.url);
    if (!Array.isArray(body.events) || !body.events.length || body.events.length > 100) throw new BadRequestException(apiError('webhook.events.invalid'));
    return this.prisma.webhookEndpoint.create({
      data: { tenantId, url: body.url, events: [...new Set(body.events.map(x=>String(x).trim().toLowerCase()))], secret: randomBytes(32).toString('hex') },
      select: { id: true, url: true, events: true, secret: true },
    });
  }

  emit(tenantId: string, event: string, payload: unknown) {
    return this.events.publish(tenantId,event,payload);
  }
}
