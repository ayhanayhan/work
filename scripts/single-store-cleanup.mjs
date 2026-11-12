import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function arg(name) {
  const prefix = `--${name}=`;
  const row = process.argv.find(x => x.startsWith(prefix));
  return row ? row.slice(prefix.length).trim() : '';
}
const execute = process.argv.includes('--execute');
const email = arg('email').toLowerCase();
const keep = arg('keep');
const confirm = arg('confirm');

if (!email) {
  try {
    const users = await prisma.user.findMany({
      where: { memberships: { some: {} } },
      select: {
        email: true,
        memberships: {
          select: {
            tenantId: true,
            role: true,
            tenant: { select: { name:true, publicSlug:true, domain:true, createdAt:true, status:true } }
          }
        }
      }
    });
    const duplicates = users.filter(u => u.memberships.length > 1);
    if (!duplicates.length) {
      console.log('Birden fazla mağazaya bağlı merchant hesabı bulunamadı.');
    } else {
      for (const u of duplicates) {
        console.log('');
        console.log(`HESAP: ${u.email}`);
        console.table(u.memberships
          .sort((a,b)=>a.tenant.createdAt.getTime()-b.tenant.createdAt.getTime())
          .map(m=>({
            tenantId:m.tenantId,
            name:m.tenant.name,
            domain:m.tenant.domain || `${m.tenant.publicSlug}.ticarti.com`,
            role:m.role,
            status:m.tenant.status,
            createdAt:m.tenant.createdAt.toISOString()
          })));
      }
    }
    console.log('');
    console.log('Detayli dry-run: node scripts/single-store-cleanup.mjs --email=user@example.com');
    process.exit(0);
  } finally {
    await prisma.$disconnect();
  }
}

try {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          tenant: {
            include: {
              _count: { select: { products: true, orders: true, customers: true, memberships: true } }
            }
          }
        }
      }
    }
  });

  if (!user) {
    console.error(`Kullanici bulunamadi: ${email}`);
    process.exit(2);
  }

  const rows = user.memberships
    .map(m => ({
      membershipId: m.id,
      tenantId: m.tenantId,
      role: m.role,
      name: m.tenant.name,
      slug: m.tenant.slug,
      publicSlug: m.tenant.publicSlug,
      domain: m.tenant.domain || '',
      status: m.tenant.status,
      createdAt: m.tenant.createdAt,
      products: m.tenant._count.products,
      orders: m.tenant._count.orders,
      customers: m.tenant._count.customers,
      memberships: m.tenant._count.memberships,
    }))
    .sort((a,b)=>a.createdAt.getTime()-b.createdAt.getTime());

  console.table(rows.map(x => ({
    tenantId:x.tenantId,
    name:x.name,
    domain:x.domain || `${x.publicSlug}.ticarti.com`,
    role:x.role,
    status:x.status,
    createdAt:x.createdAt.toISOString(),
    products:x.products,
    orders:x.orders,
    customers:x.customers,
    members:x.memberships
  })));

  if (!execute) {
    console.log('');
    console.log('DRY RUN: hiçbir veri silinmedi.');
    console.log('Kalacak mağazanın tenantId değerini belirleyip --keep=<TENANT_ID> ile yeniden çalıştırın.');
    process.exit(0);
  }

  if (!keep || confirm !== 'DELETE-OTHER-STORES') {
    console.error('Silme için --keep=<TENANT_ID> ve --confirm=DELETE-OTHER-STORES zorunludur.');
    process.exit(2);
  }

  const keepRow = rows.find(x => x.tenantId === keep);
  if (!keepRow) {
    console.error('KEEP_TENANT_ID bu kullanıcıya bağlı değil; işlem durduruldu.');
    process.exit(2);
  }

  const remove = rows.filter(x => x.tenantId !== keep);
  if (!remove.length) {
    console.log('Silinecek ek mağaza yok.');
    process.exit(0);
  }

  const shared = remove.filter(x => x.memberships > 1);
  if (shared.length) {
    console.error('Silinecek mağazalardan birinde başka ekip üyeleri var. Güvenlik için işlem durduruldu:');
    console.table(shared.map(x => ({tenantId:x.tenantId,name:x.name,members:x.memberships})));
    process.exit(3);
  }

  console.log(`KALACAK: ${keepRow.name} (${keepRow.tenantId})`);
  console.log(`SILINECEK: ${remove.map(x => `${x.name} (${x.tenantId})`).join(', ')}`);

  await prisma.$transaction(async tx => {
    for (const row of remove) {
      await tx.tenant.delete({ where: { id: row.tenantId } });
    }
  }, { timeout: 120000 });

  const remaining = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { tenant: { select: { id:true,name:true,publicSlug:true,domain:true } } }
  });
  if (remaining.length !== 1 || remaining[0].tenantId !== keep) {
    throw new Error('Post-cleanup invariant failed: user does not have exactly the requested store.');
  }

  console.log('');
  console.log(`OK: ${remove.length} ek mağaza tenant verileriyle birlikte silindi.`);
  console.log(`Kalan mağaza: ${remaining[0].tenant.name} (${remaining[0].tenantId})`);
} finally {
  await prisma.$disconnect();
}
