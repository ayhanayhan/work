import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { COUNTRY_CODES, SUBDIVISIONS } from '../src/common/reference-data';
const prisma = new PrismaClient();

async function main() {
  for (const countryCode of COUNTRY_CODES) {
    const country = await prisma.geoNode.upsert({
      where: { key: countryCode },
      update: { countryCode, isActive: true },
      create: { key: countryCode, parentId: null, level: 'COUNTRY', countryCode, code: countryCode, name: countryCode, slug: countryCode.toLowerCase() },
    });
    const subdivisions = SUBDIVISIONS[countryCode] || [];
    for (let i=0;i<subdivisions.length;i++) {
      const item=subdivisions[i];
      const slug=item.name.toLocaleLowerCase(countryCode==='TR'?'tr-TR':'en-US').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      await prisma.geoNode.upsert({
        where:{ key:`${countryCode}:ADMIN1:${item.code}` },
        update:{name:item.name,code:item.code,sortOrder:i+1,isActive:true},
        create:{key:`${countryCode}:ADMIN1:${item.code}`,parentId:country.id,level:'ADMIN1',countryCode,code:item.code,name:item.name,slug,sortOrder:i+1},
      });
    }
  }

  const ownerPassword = String(process.env.SEED_OWNER_PASSWORD || '');
  const adminPassword = String(process.env.SEED_SUPERADMIN_PASSWORD || '');
  const superAdminEmail = String(process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@example.com').trim().toLowerCase();
  if (!ownerPassword || !adminPassword) throw new Error('SEED_OWNER_PASSWORD and SEED_SUPERADMIN_PASSWORD are required for seeding.');
  const ownerHash = await bcrypt.hash(ownerPassword, 13);
  const adminHash = await bcrypt.hash(adminPassword, 14);

  const plans = [
    { name: 'Start', code: 'start', monthlyPrice: 1490, yearlyPrice: 14900, trialDays: 14, maxStaff: 3, maxProducts: 1000, maxOrdersPerMonth: 1000, sortOrder: 1, features: { coupons: true, promotions: true, multiCurrency: true, loyalty: true, marketing: true, privacy: true, pages: true, reviews: true, customDomain: true } },
    { name: 'Grow', code: 'grow', monthlyPrice: 2990, yearlyPrice: 29900, trialDays: 14, maxStaff: 10, maxProducts: 10000, maxOrdersPerMonth: 10000, sortOrder: 2, features: { coupons: true, promotions: true, multiCurrency: true, loyalty: true, marketing: true, privacy: true, pages: true, reviews: true, customDomain: true, api: true, advancedReports: true } },
    { name: 'Scale', code: 'scale', monthlyPrice: 5990, yearlyPrice: 59900, trialDays: 14, maxStaff: 50, maxProducts: 100000, maxOrdersPerMonth: null, sortOrder: 3, features: { coupons: true, promotions: true, multiCurrency: true, loyalty: true, marketing: true, privacy: true, pages: true, reviews: true, customDomain: true, api: true, advancedReports: true, prioritySupport: true, b2b: true } },
  ];
  for (const p of plans) await prisma.plan.upsert({ where: { code: p.code }, update: p as any, create: p as any });

  await prisma.superAdmin.upsert({ where: { email: superAdminEmail }, update: { isActive: true, passwordHash: adminHash, passwordChangedAt: new Date() }, create: { email: superAdminEmail, name: 'Platform Admin', passwordHash: adminHash, isActive: true } });
  await prisma.user.updateMany({ where: { email: superAdminEmail }, data: { isSuperAdmin: false } });

  const ownerEmail = String(process.env.SEED_OWNER_EMAIL || 'owner@example.com').trim().toLowerCase();
  const user = await prisma.user.upsert({ where: { email: ownerEmail }, update: { passwordHash: ownerHash, isSuperAdmin: false }, create: { email: ownerEmail, name: 'Demo Owner', passwordHash: ownerHash, isSuperAdmin: false } });
  const tenant = await prisma.tenant.upsert({ where: { slug: 'demo-company' }, update: { status: 'ACTIVE', publicSlug: 'main' }, create: { name: 'Demo Store', companyName: 'Demo Company', slug: 'demo-company', publicSlug: 'main', status: 'ACTIVE', defaultCountry: 'TR' } });
  await prisma.membership.upsert({ where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } }, update: { role: 'OWNER' }, create: { userId: user.id, tenantId: tenant.id, role: 'OWNER' } });

  const store = await prisma.tenant.update({
    where: { id: tenant.id },
    data: { name: 'Demo Store', publicSlug: 'main', email: 'hello@example.com', phone: '+90 312 000 00 00', seoTitle: 'Demo Store', seoDescription: 'Modern e-ticaret demo mağazası', settings: { taxRate: 20, pricesIncludeTax: true, showStock: true, allowGuestCheckout: true, homeTitle: 'Yeni sezonu keşfet' } },
  });

  await prisma.warehouse.upsert({ where:{ storeId_code:{storeId:store.id,code:'main'} }, update:{isDefault:true,isActive:true}, create:{storeId:store.id,name:'Merkez Depo',code:'main',isDefault:true,isActive:true,priority:1,address:{source:'registered'}} });

  const activeSub = await prisma.subscription.findFirst({ where: { tenantId: tenant.id, status: { in: ['ACTIVE','TRIAL'] } } });
  if (!activeSub) {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: 'grow' } });
    await prisma.subscription.create({ data: { tenantId: tenant.id, planId: plan.id, status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000) } });
  }

  await prisma.shippingMethod.upsert({ where: { storeId_code: { storeId: store.id, code: 'standard' } }, update: {}, create: { storeId: store.id, name: 'Standart Kargo', code: 'standard', type: 'shipping', requiresAddress: true, price: 79.90, freeAbove: 1500, estimatedMinDays: 1, estimatedMaxDays: 4 } });
  await prisma.shippingMethod.upsert({ where: { storeId_code: { storeId: store.id, code: 'express' } }, update: {}, create: { storeId: store.id, name: 'Hızlı Teslimat', code: 'express', type: 'courier', requiresAddress: true, price: 149.90, estimatedMinDays: 1, estimatedMaxDays: 2, sortOrder: 2 } });
  await prisma.paymentMethod.upsert({ where: { storeId_code: { storeId: store.id, code: 'bank_transfer' } }, update: {}, create: { storeId: store.id, name: 'Havale / EFT', code: 'bank_transfer', type: 'manual', instructions: 'Ödeme açıklamasına sipariş numarasını ekleyiniz.' } });
  await prisma.paymentMethod.upsert({ where: { storeId_code: { storeId: store.id, code: 'cash_on_delivery' } }, update: {}, create: { storeId: store.id, name: 'Kapıda Ödeme', code: 'cash_on_delivery', type: 'cod' } });


  await prisma.storeLocale.upsert({ where: { storeId_locale: { storeId: store.id, locale: 'tr-TR' } }, update: { isDefault: true, isEnabled: true }, create: { storeId: store.id, locale: 'tr-TR', label: 'Türkçe', isDefault: true, isEnabled: true, sortOrder: 1 } });
  await prisma.storeLocale.upsert({ where: { storeId_locale: { storeId: store.id, locale: 'en-US' } }, update: { isEnabled: true }, create: { storeId: store.id, locale: 'en-US', label: 'English', isEnabled: true, sortOrder: 2 } });
  await prisma.checkoutConfig.upsert({ where: { storeId: store.id }, update: { singlePage: true }, create: { storeId: store.id, singlePage: true, allowGuestCheckout: true, requirePhone: true, stickyOrderSummary: true, requireTerms: true, requirePrivacyNotice: true, requireKvkkNotice: true } });

  await prisma.storeCurrency.upsert({ where: { storeId_code: { storeId: store.id, code: 'TRY' } }, update: { isDefault: true, exchangeRate: 1 }, create: { storeId: store.id, code: 'TRY', isDefault: true, exchangeRate: 1 } });
  await prisma.storeCurrency.upsert({ where: { storeId_code: { storeId: store.id, code: 'USD' } }, update: {}, create: { storeId: store.id, code: 'USD', exchangeRate: 0.03, isEnabled: true } });
  await prisma.storeAddress.upsert({ where: { storeId_key: { storeId: store.id, key: 'registered' } }, update: {}, create: { storeId: store.id, key: 'registered', label: 'Merkez', company: 'Demo Company', phone: '+90 312 000 00 00', address1: 'Örnek Mah. Demo Cad. No:1', district: 'Çankaya', city: 'Ankara', state: 'Ankara', country: 'TR', postalCode: '06000', isDefault: true } });
  await prisma.loyaltyProgram.upsert({ where: { storeId: store.id }, update: {}, create: { storeId: store.id, enabled: true, programName: 'Demo Rewards', pointsPerCurrencyUnit: 1, redemptionRate: 0.01 } });

  const women = await prisma.category.upsert({ where: { storeId_slug: { storeId: store.id, slug: 'kadin' } }, update: {}, create: { storeId: store.id, name: 'Kadın', slug: 'kadin', sortOrder: 1 } });
  const men = await prisma.category.upsert({ where: { storeId_slug: { storeId: store.id, slug: 'erkek' } }, update: {}, create: { storeId: store.id, name: 'Erkek', slug: 'erkek', sortOrder: 2 } });
  const brand = await prisma.brand.upsert({ where: { storeId_slug: { storeId: store.id, slug: 'north-studio' } }, update: {}, create: { storeId: store.id, name: 'North Studio', slug: 'north-studio' } });

  const productSeeds = [
    { title: 'Essential Oversize Tişört', slug: 'essential-oversize-tisort', categoryId: women.id, sku: 'NS-TS-001', price: 899, comparePrice: 1099, stock: 42, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Minimal Hoodie', slug: 'minimal-hoodie', categoryId: men.id, sku: 'NS-HD-001', price: 1499, comparePrice: 1799, stock: 25, image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Daily Canvas Çanta', slug: 'daily-canvas-canta', categoryId: women.id, sku: 'NS-BG-001', price: 749, comparePrice: null, stock: 64, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80' },
    { title: 'Classic Crewneck', slug: 'classic-crewneck', categoryId: men.id, sku: 'NS-SW-001', price: 1299, comparePrice: 1499, stock: 31, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1200&q=80' },
  ];
  for (const p of productSeeds) {
    const existing = await prisma.product.findUnique({ where: { storeId_slug: { storeId: store.id, slug: p.slug } } });
    if (!existing) await prisma.product.create({ data: { storeId: store.id, brandId: brand.id, title: p.title, slug: p.slug, status: 'ACTIVE', description: `${p.title} için kaliteli materyal, günlük kullanıma uygun modern tasarım.`, shortDescription: 'Günlük kullanıma uygun modern ve rahat tasarım.', tags: ['yeni','minimal'], seoTitle: p.title, images: { create: [{ url: p.image, alt: p.title, sortOrder: 0 }] }, categories: { create: [{ categoryId: p.categoryId }] }, variants: { create: [{ title: 'Standart', sku: p.sku, price: p.price, comparePrice: p.comparePrice, inventory: { create: { onHand: p.stock, lowStockAt: 5 } } }] } } });
  }

  await prisma.discount.upsert({ where: { storeId_code: { storeId: store.id, code: 'HOSGELDIN10' } }, update: {}, create: { storeId: store.id, name: 'Hoş Geldin İndirimi', code: 'HOSGELDIN10', type: 'PERCENTAGE', scope: 'ORDER', value: 10, minimumAmount: 500, isActive: true } });

  const promo = await prisma.promotion.findFirst({ where: { storeId: store.id, name: '2 Al 1 Öde Demo' } });
  if (!promo) await prisma.promotion.create({ data: { storeId: store.id, name: '2 Al 1 Öde Demo', status: 'ACTIVE', activation: 'AUTOMATIC', priority: 50, stackable: true, conditions: [{ type: 'total_quantity_min', value: 2 }], actions: [{ type: 'buy_x_pay_y', buyQuantity: 2, payQuantity: 1 }] } });

  const pages = [
    ['Hakkımızda','hakkimizda','Kaliteli ürünleri sade bir alışveriş deneyimiyle sunmak için buradayız.'],
    ['Teslimat ve İade','teslimat-iade','Siparişler 1-4 iş günü içinde kargoya verilir. İade taleplerinizi hesabınızdan oluşturabilirsiniz.'],
    ['Gizlilik Politikası','gizlilik-politikasi','Kişisel verileriniz yalnızca sipariş ve hizmet süreçlerinin yürütülmesi için işlenir.'],
  ];
  for (const [title, slug, body] of pages) await prisma.page.upsert({ where: { storeId_slug: { storeId: store.id, slug } }, update: {}, create: { storeId: store.id, title, slug, body, status: 'PUBLISHED' } });

  await prisma.menu.upsert({ where: { storeId_handle: { storeId: store.id, handle: 'main' } }, update: {}, create: { storeId: store.id, name: 'Ana Menü', handle: 'main', items: [{ label: 'Yeni', url: '/products' }, { label: 'Kadın', url: '/category/kadin' }, { label: 'Erkek', url: '/category/erkek' }, { label: 'Hakkımızda', url: '/pages/hakkimizda' }] } });
  const banner = await prisma.banner.findFirst({ where: { storeId: store.id, position: 'home_hero' } });
  if (!banner) await prisma.banner.create({ data: { storeId: store.id, title: 'Yeni sezon şimdi yayında', subtitle: 'Seçili ürünlerde sade tasarım, güçlü detaylar.', imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85', buttonText: 'Koleksiyonu keşfet', buttonUrl: '/products', position: 'home_hero' } });

  console.log({
    merchant: { email: ownerEmail, passwordSource: 'SEED_OWNER_PASSWORD', tenantId: tenant.id, siteId: store.id },
    superadmin: { email: superAdminEmail, passwordSource: 'SEED_SUPERADMIN_PASSWORD' },
    storefront: { slug: 'main' },
  });
}
main().finally(() => prisma.$disconnect());
