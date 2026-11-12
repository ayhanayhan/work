import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  private checkoutOrigin(store:any){ return this.storeOrigin(store); }

  async create(body: any) {
    const cartToken = String(body?.cartToken || '').trim();
    if (!cartToken) throw new BadRequestException('Cart token required');

    // A transaction-scoped advisory lock serializes session replacement per cart
    // across workers/replicas, without holding a lock after commit.
    return this.prisma.$transaction(async (tx:any) => {
      const cart = await tx.cart.findUnique({
        where: { token: cartToken },
        include: { store:true, items:{select:{id:true,isGift:true}} },
      });
      if (!cart) throw new NotFoundException('Cart not found');
      if (!['ACTIVE', 'TRIAL'].includes(String(cart.store?.status || ''))) throw new NotFoundException('Cart not found');
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${cart.id}, 0)) IS NULL AS lock_acquired`;
      // Recheck cart after acquiring the lock: a parallel checkout may have
      // completed or deactivated it while we were waiting.
      const current = await tx.cart.findUnique({where:{id:cart.id},select:{status:true}});
      if (current?.status !== 'active') throw new BadRequestException('Cart is not active');
      if (!cart.items.some((item:any) => !item.isGift)) throw new BadRequestException('Cart is empty');

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
      // Repeated requests for the same active cart reuse the same OPEN session.
      const existing = await tx.checkoutSession.findFirst({
        where: { cartId:cart.id, status:'OPEN', expiresAt:{gt:new Date()} },
        orderBy: { createdAt:'desc' },
      });
      if (existing) {
        return {
          id:existing.id, expiresAt:existing.expiresAt,
          url:`${origin}/checkout?session=${encodeURIComponent(existing.id)}`,
          storeOrigin:origin, checkoutOrigin,
        };
      }
      await tx.checkoutSession.updateMany({
        where: { cartId:cart.id, status:'OPEN' },
        data: { status:'SUPERSEDED' },
      });
      const expiresAt = new Date(Date.now()+30*60*1000);
      const session = await tx.checkoutSession.create({
        data: {
          storeId:cart.storeId, cartId:cart.id,
          customerId:cart.customerId || null, status:'OPEN',
          locale:cart.store.locale || 'tr-TR',
          currency:cart.currency || cart.store.currency || 'TRY',
          storeOrigin:origin, checkoutOrigin, returnUrl, expiresAt,
        },
      });
      return {
        id:session.id, expiresAt:session.expiresAt,
        url:`${origin}/checkout?session=${encodeURIComponent(session.id)}`,
        storeOrigin:origin, checkoutOrigin,
      };
    }, { timeout:15000 });
  }

  async resolve(id: string) {
    const session = await this.prisma.checkoutSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Checkout session not found');
    // Session URLs must not expose suspended stores, even if issued before closure.
    const activeStore = await this.prisma.tenant.findFirst({
      where: { id: session.storeId, status: { in: ['ACTIVE', 'TRIAL'] } },
      select: { id: true },
    });
    if (!activeStore) throw new NotFoundException('Checkout session not found');
    const cart = await this.prisma.cart.findFirst({
      where: { id: session.cartId, storeId: session.storeId },
      select: { token:true,status:true,store:{select:{id:true,name:true,publicSlug:true,domain:true,locale:true,currency:true,defaultCountry:true,logoUrl:true}} }
    });
    if (!cart) throw new NotFoundException('Cart not found');
    const storeOrigin=session.storeOrigin||this.storeOrigin(cart.store);
    const resetUrl=()=>{try{const u=new URL('/',storeOrigin);u.searchParams.set('ticarti_cart_reset',cart.token);return u.toString()}catch{return storeOrigin}};
    if(session.status==='COMPLETED'||cart.status!=='active')return{inactive:true,clearCart:true,cartToken:cart.token,redirectUrl:resetUrl()};
    if(session.status!=='OPEN')return{inactive:true,clearCart:false,cartToken:cart.token,redirectUrl:`${storeOrigin.replace(/\/$/,'')}/cart`};
    if(session.expiresAt.getTime()<=Date.now()){
      await this.prisma.checkoutSession.update({where:{id},data:{status:'EXPIRED'}}).catch(()=>undefined);
      return{inactive:true,clearCart:false,cartToken:cart.token,redirectUrl:`${storeOrigin.replace(/\/$/,'')}/cart`};
    }
    return {
      session:{id:session.id,storeId:session.storeId,locale:session.locale,currency:session.currency,storeOrigin,checkoutOrigin:storeOrigin,returnUrl:session.returnUrl,expiresAt:session.expiresAt},
      cartToken:cart.token,
      store:cart.store,
    };
  }

}
