import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CheckoutSessionService {
  constructor(private readonly prisma: PrismaService) {}

  private cleanHost(value: unknown) {
    return String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').replace(/\.$/, '');
  }

  private storeOrigin(store: any) {
    const domain = this.cleanHost(store?.domain);
    if (domain) return `https://${domain}`;
    const publicSlug = String(store?.publicSlug || '').trim();
    return publicSlug ? `https://${publicSlug}.ticarti.com` : 'https://ticarti.com';
  }

  private checkoutOrigin(store: any) {
    const settings: any = store?.settings || {};
    const checkoutDomain = settings?.checkoutDomain || {};
    const configuredHost = this.cleanHost(checkoutDomain?.host);
    const configuredActive = String(checkoutDomain?.status || '').toUpperCase() === 'ACTIVE';
    if (configuredHost && configuredActive) return `https://${configuredHost}`;
    const fallback = String(process.env.CHECKOUT_PUBLIC_ORIGIN || 'https://checkout.ticarti.com').trim().replace(/\/$/, '');
    return fallback;
  }

  async create(body: any) {
    const cartToken = String(body?.cartToken || '').trim();
    if (!cartToken) throw new BadRequestException('Cart token required');

    const cart = await this.prisma.cart.findUnique({
      where: { token: cartToken },
      include: { store: true, items: { select: { id: true, isGift: true } } },
    });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'active') throw new BadRequestException('Cart is not active');
    if (!cart.items.some((item: any) => !item.isGift)) throw new BadRequestException('Cart is empty');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    await this.prisma.checkoutSession.updateMany({
      where: { cartId: cart.id, status: 'OPEN' },
      data: { status: 'SUPERSEDED' },
    });

    const origin = this.storeOrigin(cart.store);
    const checkoutOrigin = this.checkoutOrigin(cart.store);
    const requestedReturn = String(body?.returnUrl || '').trim();
    let returnUrl = origin;
    if (requestedReturn) {
      try {
        const parsed = new URL(requestedReturn);
        if (parsed.origin === origin) returnUrl = parsed.toString();
      } catch {}
    }

    const session = await this.prisma.checkoutSession.create({
      data: {
        storeId: cart.storeId,
        cartId: cart.id,
        customerId: cart.customerId || null,
        status: 'OPEN',
        locale: cart.store.locale || 'tr-TR',
        currency: cart.currency || cart.store.currency || 'TRY',
        storeOrigin: origin,
        checkoutOrigin,
        returnUrl,
        expiresAt,
      },
    });

    return {
      id: session.id,
      expiresAt: session.expiresAt,
      url: `${checkoutOrigin}/c/${session.id}`,
      storeOrigin: origin,
      checkoutOrigin,
    };
  }

  async resolve(id: string) {
    const session = await this.prisma.checkoutSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Checkout session not found');
    if (session.status !== 'OPEN') throw new GoneException('Checkout session is no longer active');
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.checkoutSession.update({ where: { id }, data: { status: 'EXPIRED' } }).catch(() => undefined);
      throw new GoneException('Checkout session expired');
    }

    const cart = await this.prisma.cart.findFirst({ where: { id: session.cartId, storeId: session.storeId }, select: { token: true, status: true } });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== 'active') throw new GoneException('Cart is no longer active');

    return {
      session: {
        id: session.id,
        storeId: session.storeId,
        locale: session.locale,
        currency: session.currency,
        storeOrigin: session.storeOrigin,
        checkoutOrigin: session.checkoutOrigin,
        returnUrl: session.returnUrl,
        expiresAt: session.expiresAt,
      },
      cartToken: cart.token,
    };
  }
}
